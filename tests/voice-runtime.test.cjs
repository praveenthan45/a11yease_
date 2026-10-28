const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');

const widget=fs.readFileSync(path.join(__dirname,'../dist/widget.js'),'utf8');

function setup(getUserMedia,{trackInput=false,devices=[],rejectTrack=false,continuation=null,preferences=null}={}){
  const errors=[];
  const console=new VirtualConsole();console.on('jsdomError',error=>errors.push(error.message));
  const dom=new JSDOM('<!doctype html><html lang="en"><head></head><body><main><h1>Voice test</h1><button id="save">Save bookmark</button></main></body></html>',{
    url:'http://localhost:1434/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:console
  });
  const w=dom.window, sessions=[],pageScroll=[];
  class Recognition{
    constructor(){sessions.push(this);}
    start(track){this.track=track;if(track&&rejectTrack)throw new TypeError('Audio track input unavailable');this.started=true;}
    abort(){this.aborted=true;}
    stop(){this.stopped=true;}
  }
  w.SpeechRecognition=Recognition;
  Object.defineProperty(w.navigator,'mediaDevices',{value:{getUserMedia,enumerateDevices:async()=>devices}});
  if(trackInput)Object.defineProperty(w.navigator,'userAgent',{value:'Mozilla/5.0 Windows Chrome/145.0.0.0 Safari/537.36'});
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  w.HTMLElement.prototype.getClientRects=function(){return [{}];};
  w.HTMLElement.prototype.scrollIntoView=function(){};
  w.scrollBy=options=>pageScroll.push(options.top);
  Object.defineProperty(w.document,'currentScript',{value:{src:'http://localhost:1434/widget.js'}});
  if(continuation)w.sessionStorage.setItem('accessease.voice.navigation.v1',continuation);
  if(preferences)w.localStorage.setItem('accessease.preferences.v1',JSON.stringify(preferences));
  w.eval(widget);
  const root=w.AccessEase.root;
  root.querySelector('.launcher').click();
  return {dom,w,root,sessions,pageScroll,errors};
}

function speech(session,index,transcript){
  const results=Array.from({length:index+1},()=>{const result=[{transcript:''}];result.isFinal=false;return result;});
  results[index]=[{transcript}];results[index].isFinal=true;
  session.onresult({resultIndex:index,results});
}

function resultClock(w){
  const timers=new Map();let id=0;
  w.setTimeout=(callback,delay)=>{timers.set(++id,{callback,delay});return id;};
  w.clearTimeout=timer=>timers.delete(timer);
  return {timers,tick(delay){const entry=[...timers].find(([,timer])=>timer.delay===delay);assert.ok(entry,`timer for ${delay}ms exists`);timers.delete(entry[0]);entry[1].callback();}};
}

test('Navigation keeps the saved Voice Command switch and Resume microphone action searchable and working',async()=>{
  const t=setup(()=>{},{preferences:{voiceRequested:true}});
  const voice=t.root.querySelector('[data-setting="voice"]'),wrapper=voice.closest('.voice-setting'),resume=wrapper.querySelector('.voice-resume');
  try{
    t.w.eval(fs.readFileSync(path.join(__dirname,'../dist/team-features.js'),'utf8'));
    for(let i=0;i<50&&!t.w.AccessEaseTeam;i++)await new Promise(resolve=>setTimeout(resolve,20));
    assert.ok(t.w.AccessEaseTeam);
    assert.equal(voice.closest('[data-category]').dataset.category,'navigation');
    assert.equal(wrapper.dataset.teamCard,'voice');
    assert.equal(t.root.querySelectorAll('[data-setting="voice"]').length,1);
    assert.equal(resume.hidden,false);assert.equal(t.sessions.length,0,'moving a saved preference never opens the microphone');
    const search=t.root.querySelector('#team-search');
    search.value='Voice Commands';search.dispatchEvent(new t.w.Event('input'));
    assert.equal(wrapper.hidden,false);assert.equal(voice.closest('.settings-group').hidden,false);
    assert.equal(voice.closest('.category-controls').hidden,false,'search expands Navigation to reach the voice control');
    search.value='Text Size';search.dispatchEvent(new t.w.Event('input'));
    assert.equal(wrapper.hidden,true,'search filters the entire saved voice control');
    search.value='';search.dispatchEvent(new t.w.Event('input'));
    assert.equal(wrapper.hidden,false);
    resume.click();assert.equal(t.sessions.length,1);assert.equal(t.sessions[0].started,true);assert.equal(t.w.AccessEase.getSettings().voice,true);
    speech(t.sessions[0],0,'Settings');
    t.w.AccessEase.panelLanguage.setLanguage('ta');
    const transcript=t.root.querySelector('.footer .voice-transcript');
    assert.ok(transcript&&!transcript.closest('[hidden]'),'spoken text stays in the visible footer outside Navigation');
    assert.equal(t.root.querySelector('.body').contains(transcript),false,'scrolling settings cannot move the transcript out of view');
    assert.equal(transcript.querySelector('.voice-transcript-text').textContent,'Settings','panel translation preserves the exact spoken words');
    voice.click();assert.equal(t.sessions[0].aborted,true);assert.equal(t.w.AccessEase.getSettings().voice,false);
    assert.equal(JSON.parse(t.w.localStorage.getItem('accessease.preferences.v1')).voiceRequested,false);
    assert.equal(t.root.querySelector('[data-setting="voice"]'),voice,'moving the control retains its original listeners');
    assert.deepEqual(t.errors,[]);
  }finally{t.w.close();}
});

test('speech ending requests a final transcript and runs a completed command once',()=>{
  const t=setup(()=>{}),clock=resultClock(t.w);
  try{
    t.root.querySelector('[data-setting="voice"]').click();
    const session=t.sessions[0];session.onaudiostart();session.onspeechstart();
    const partial=[{transcript:'scroll do'}];partial.isFinal=false;
    session.onresult({resultIndex:0,results:[partial]});
    session.onspeechend();clock.tick(1500);
    assert.equal(session.stopped,true,'graceful stop asks Chrome to finalize speech');
    assert.equal(session.aborted,undefined);
    assert.equal(t.root.querySelector('.body').scrollTop,0,'partial words never execute');
    speech(session,0,'scroll down');speech(session,0,'scroll down');
    assert.deepEqual(t.pageScroll,[450],'complete result scrolls the website once');
    assert.ok(![...clock.timers.values()].some(timer=>[1500,3000,8000].includes(timer.delay)));
    session.onend();clock.tick(200);
    assert.equal(t.sessions.length,2,'listening resumes after graceful finalization');
  }finally{t.w.close();}
});

test('Hearing with no final result reconnects instead of remaining stuck and Stop cancels recovery',()=>{
  const t=setup(()=>{}),clock=resultClock(t.w);
  try{
    t.root.querySelector('[data-setting="voice"]').click();
    const old=t.sessions[0];old.onaudiostart();old.onspeechstart();
    const stale=old.onresult;
    clock.tick(8000);
    assert.equal(old.aborted,true);
    assert.match(t.root.querySelector('.status').textContent,/Reconnecting automatically/);
    assert.equal(t.w.AccessEase.getSettings().voice,true);
    clock.tick(200);
    const next=t.sessions[1];next.onaudiostart();
    const final=[{transcript:'scroll down'}];final.isFinal=true;
    stale({resultIndex:0,results:[final]});
    assert.deepEqual(t.pageScroll,[],'retired callbacks cannot execute commands');
    speech(next,0,'scroll down');
    assert.deepEqual(t.pageScroll,[450]);
    next.onspeechstart();next.onspeechend();clock.tick(1500);clock.tick(3000);
    assert.match(t.root.querySelector('.status').textContent,/Reconnecting automatically/);
    t.root.querySelector('.voice-indicator button').click();
    assert.equal(clock.timers.size,0);
    assert.deepEqual(t.errors,[]);
  }finally{t.w.close();}
});

test('voice scrolls the website with settings open and accepts explicit settings scrolling and button phrases',()=>{
  const t=setup(()=>{});let clicked=0;
  try{
    t.w.document.querySelector('#save').addEventListener('click',()=>clicked++);
    t.root.querySelector('[data-setting="voice"]').click();t.sessions[0].onaudiostart();
    speech(t.sessions[0],0,'scroll down');speech(t.sessions[0],1,'scroll up');
    speech(t.sessions[0],2,'Hey A11yEase, can you please scroll the website down?');
    assert.deepEqual(t.pageScroll,[450,-450,450]);
    assert.equal(t.root.querySelector('.body').scrollTop,0);
    speech(t.sessions[0],3,'scroll settings down');
    assert.equal(t.root.querySelector('.body').scrollTop,450);
    speech(t.sessions[0],4,'scroll up in the settings');
    assert.equal(t.root.querySelector('.body').scrollTop,0);
    assert.deepEqual(t.pageScroll,[450,-450,450],'explicit panel commands leave the website in place');
    speech(t.sessions[0],5,'click the button Save bookmark');
    speech(t.sessions[0],6,'click Save bookmark button please');
    speech(t.sessions[0],6,'click Save bookmark button please');
    assert.equal(clicked,2,'both button phrases work and duplicate results never click twice');
    assert.equal(t.root.querySelector('.footer .voice-transcript-text').textContent,'click Save bookmark button please');
    assert.deepEqual(t.errors,[]);
  }finally{t.w.close();}
});

test('voice can activate visible custom buttons and links outside the keyboard tab order',()=>{
  const t=setup(()=>{}),clicked=[];
  try{
    for(const [role,name] of [['button','Continue'],['link','Our services']]){
      const item=t.w.document.createElement('div');item.setAttribute('role',role);item.textContent=name;
      item.addEventListener('click',()=>clicked.push(name));t.w.document.querySelector('main').append(item);
    }
    t.root.querySelector('[data-setting="voice"]').click();t.sessions[0].onaudiostart();
    speech(t.sessions[0],0,'click Continue button');speech(t.sessions[0],1,'click the link Our services');
    assert.deepEqual(clicked,['Continue','Our services']);
    assert.deepEqual(t.errors,[]);
  }finally{t.w.close();}
});

test('repeated missing transcripts stop with an actionable message',()=>{
  const t=setup(()=>{}),clock=resultClock(t.w);
  try{
    t.root.querySelector('[data-setting="voice"]').click();
    for(let i=0;i<3;i++){
      t.sessions[i].onaudiostart();t.sessions[i].onspeechstart();clock.tick(8000);
      if(i<2)clock.tick(200);
    }
    assert.equal(t.w.AccessEase.getSettings().voice,false);
    assert.match(t.root.querySelector('.status').textContent,/Chrome is not returning complete words/);
    assert.equal(clock.timers.size,0);
  }finally{t.w.close();}
});

test('voice chooses the single on-screen matching link instead of its off-screen footer duplicate',()=>{
  const t=setup(()=>{});const clicked=[];
  try{
    const header=t.w.document.createElement('a');header.href='#header';header.textContent='Digital Solutions';
    const footer=t.w.document.createElement('a');footer.href='#footer';footer.textContent='Digital Solutions';
    const rect=top=>({left:20,right:180,top,bottom:top+40,width:160,height:40});
    header.getBoundingClientRect=()=>rect(100);
    footer.getBoundingClientRect=()=>rect(2400);
    header.addEventListener('click',event=>{event.preventDefault();clicked.push('header');});
    footer.addEventListener('click',event=>{event.preventDefault();clicked.push('footer');});
    t.w.document.body.prepend(header);t.w.document.body.append(footer);
    t.root.querySelector('[data-setting="voice"]').click();t.sessions[0].onaudiostart();
    speech(t.sessions[0],0,'click digital solutions');
    assert.deepEqual(clicked,['header']);
    assert.doesNotMatch(t.root.querySelector('.status').textContent,/Found 2/);
    footer.getBoundingClientRect=()=>rect(200);
    speech(t.sessions[0],1,'click digital solutions');
    assert.deepEqual(clicked,['header'],'two on-screen controls still require disambiguation');
    assert.match(t.root.querySelector('.status').textContent,/Found 2/);
    footer.getBoundingClientRect=()=>rect(2400);
    speech(t.sessions[0],2,'click second digital solutions');
    assert.deepEqual(clicked,['header','footer'],'explicit ordinal can select the off-screen duplicate');
    header.getBoundingClientRect=()=>rect(-200);
    speech(t.sessions[0],3,'click digital solutions');
    assert.match(t.root.querySelector('.status').textContent,/Found 2/,'no visible match preserves the ambiguity check');
  }finally{t.w.close();}
});

test('active voice resumes on the next same-origin page and still executes commands',()=>{
  const first=setup(()=>{});let second;
  try{
    first.root.querySelector('[data-setting="voice"]').click();
    first.sessions[0].onaudiostart();
    first.w.dispatchEvent(new first.w.PageTransitionEvent('pagehide'));
    assert.equal(first.sessions[0].aborted,true,'old page releases recognition');
    assert.equal(first.sessions[0].onend,null,'old callbacks cannot restart capture');
    const continuation=first.w.sessionStorage.getItem('accessease.voice.navigation.v1');
    assert.ok(continuation);
    second=setup(()=>{},{continuation});
    assert.equal(second.w.AccessEase.getSettings().voice,true);
    assert.equal(second.sessions.length,1);
    assert.equal(second.sessions[0].started,true);
    second.sessions[0].onaudiostart();
    second.w.AccessEase.close();
    speech(second.sessions[0],0,'scroll down');
    assert.deepEqual(second.pageScroll,[450]);
    assert.equal(second.w.sessionStorage.getItem('accessease.voice.navigation.v1'),null,'continuation is consumed once');
    second.root.querySelector('.voice-indicator button').click();
    second.w.dispatchEvent(new second.w.PageTransitionEvent('pagehide'));
    assert.equal(second.w.sessionStorage.getItem('accessease.voice.navigation.v1'),null,'explicit Stop does not resume on navigation');
    assert.deepEqual(second.errors,[]);
  }finally{first.w.close();second?.w.close();}
});

test('voice continuation supports back-forward restoration and rejects stale or other-origin records',()=>{
  const t=setup(()=>{});
  try{
    t.root.querySelector('[data-setting="voice"]').click();
    t.sessions[0].onaudiostart();
    t.w.dispatchEvent(new t.w.PageTransitionEvent('pagehide',{persisted:true}));
    t.w.dispatchEvent(new t.w.PageTransitionEvent('pageshow',{persisted:true}));
    assert.equal(t.sessions.length,2);
    assert.equal(t.w.AccessEase.getSettings().voice,true);
    t.sessions[1].onaudiostart();
    t.root.querySelector('.voice-indicator button').click();
    t.w.dispatchEvent(new t.w.PageTransitionEvent('pageshow',{persisted:true}));
    assert.equal(t.sessions.length,2,'back-forward restore after Stop stays off');
  }finally{t.w.close();}
  for(const record of [
    {origin:'http://localhost:1434',expiresAt:Date.now()-1000},
    {origin:'https://another.example',expiresAt:Date.now()+60000},
    {origin:'http://localhost:1434',expiresAt:null},
  ]){
    const fresh=setup(()=>{},{continuation:JSON.stringify(record)});
    try{assert.equal(fresh.sessions.length,0);assert.equal(fresh.w.AccessEase.getSettings().voice,false);}
    finally{fresh.w.close();}
  }
});

test('one recognizer opens the microphone, hears speech, scrolls, and clicks a named button',async()=>{
  let permissionProbe=0,clicked=0;
  const t=setup(()=>{permissionProbe++;throw Error('unexpected extra microphone request');});
  try{
    t.w.document.querySelector('#save').addEventListener('click',()=>clicked++);
    t.root.querySelector('[data-setting="voice"]').click();
    assert.match(t.root.querySelector('.status').textContent,/Starting microphone/);
    assert.equal(permissionProbe,0,'speech recognition owns the microphone without a separate permission probe');
    assert.equal(t.sessions.length,1);
    assert.equal(t.sessions[0].started,true);
    assert.equal(t.root.querySelector('[data-setting="voice"]').dataset.voicePhase,'starting');
    t.sessions[0].onstart();
    assert.match(t.root.querySelector('.status').textContent,/Waiting for microphone audio/);
    t.sessions[0].onaudiostart();
    assert.equal(t.root.querySelector('[data-setting="voice"]').dataset.voicePhase,'listening');
    const transcripts=[...t.root.querySelectorAll('.voice-transcript')];
    assert.equal(transcripts.length,2,'spoken words have an inline and a floating display');
    assert.ok(transcripts.every(output=>!output.hidden&&output.querySelector('.voice-transcript-label').textContent==='Voice Command: '),'listening status is visible before the first recognized word');
    const interim=[{transcript:'scroll do'}];interim.isFinal=false;
    t.sessions[0].onresult({resultIndex:0,results:[interim]});
    assert.match(t.root.querySelector('.status').textContent,/Hearing “scroll do”/);
    assert.ok(transcripts.every(output=>!output.hidden&&output.querySelector('.voice-transcript-text').textContent==='scroll do'),'both displays update while the user speaks');
    assert.equal(t.root.querySelector('.body').scrollTop,0,'interim words do not run commands');
    speech(t.sessions[0],0,'scroll down');
    assert.ok(transcripts.every(output=>output.querySelector('.voice-transcript-text').textContent==='scroll down'),'final words remain visible after command feedback');
    assert.equal(t.root.querySelector('.body').scrollTop,0,'website commands leave the open settings panel in place');
    assert.deepEqual(t.pageScroll,[450],'website scrolls even while settings are open');
    speech(t.sessions[0],1,'click on the Save bookmark button');
    assert.equal(clicked,1,'named page button is activated');
    assert.equal(t.root.querySelector('.panel').hidden,true,'page button is revealed');
    assert.equal(t.root.querySelector('.voice-indicator').hidden,false,'listening remains visible after closing settings');
    assert.equal(t.root.querySelector('.voice-indicator .voice-transcript-text').textContent,'click on the Save bookmark button','the floating display keeps the actual spoken words');
    speech(t.sessions[0],2,'scroll down');
    assert.deepEqual(t.pageScroll,[450,450],'page also scrolls after settings are closed');
    speech(t.sessions[0],3,'click missing button');
    assert.match(t.root.querySelector('.voice-indicator-text').textContent,/No available button/,'unmatched commands stay visible outside settings');
    assert.ok(transcripts.every(output=>output.querySelector('.voice-transcript-text').textContent==='click missing button'),'unmatched speech is also shown');
    t.root.querySelector('.voice-indicator button').click();
    assert.equal(t.sessions[0].aborted,true);
    assert.equal(t.root.querySelector('.voice-indicator').hidden,true);
    assert.ok(transcripts.every(output=>output.hidden&&!output.querySelector('.voice-transcript-text').textContent),'stopping clears both spoken-word displays');
    assert.deepEqual(t.errors,[]);
  }finally{t.w.close();}
});

function microphone(label,deviceId){
  const track={label,kind:'audio',readyState:'live',stopped:false,getSettings:()=>({deviceId}),stop(){this.stopped=true;this.readyState='ended';}};
  return {track,getTracks:()=>[track],getAudioTracks:()=>[track]};
}
const settle=()=>new Promise(resolve=>setTimeout(resolve,0));
for(const failure of ['throw','network','audio-capture','end','timeout']){
  test(`track input ${failure} falls back to native capture and executes a spoken command`,async()=>{
    const stream=microphone('Microphone','physical');let requests=0;
    const t=setup(async()=>{requests++;return stream;},{trackInput:true,rejectTrack:failure==='throw'});
    try{
      if(failure==='timeout'){
        const schedule=t.w.setTimeout.bind(t.w);let firstStartup=true;
        t.w.setTimeout=(callback,delay,...args)=>{
          if(delay===10000&&firstStartup){firstStartup=false;return schedule(callback,5,...args);}
          return schedule(callback,delay,...args);
        };
      }
      t.root.querySelector('[data-setting="voice"]').click();await settle();
      const first=t.sessions[0],lateResult=first.onresult;
      if(failure==='end')first.onend();
      else if(failure==='timeout')await new Promise(resolve=>setTimeout(resolve,25));
      else if(failure!=='throw')first.onerror({error:failure});
      assert.equal(first.aborted,true);assert.equal(stream.track.stopped,true);
      assert.match(t.root.querySelector('.status').textContent,/browser default microphone/);
      await new Promise(resolve=>setTimeout(resolve,250));
      assert.equal(t.sessions.length,2);assert.equal(t.sessions[1].track,undefined);
      assert.equal(requests,1,'fallback must not reopen the rejected track capture');
      t.sessions[1].onaudiostart();
      lateResult?.({resultIndex:0,results:[]});
      speech(t.sessions[1],0,'scroll down');
      assert.deepEqual(t.pageScroll,[450]);
      t.sessions[1].onend();await new Promise(resolve=>setTimeout(resolve,250));
      assert.equal(t.sessions[2].track,undefined,'normal reconnect stays on native capture');
      assert.equal(requests,1);
      t.root.querySelector('[data-setting="voice"]').click();
      assert.equal(t.sessions[2].aborted,true);assert.deepEqual(t.errors,[]);
    }finally{t.w.close();}
  });
}
test('silent virtual default is replaced with a physical microphone track and kept across reconnects',async()=>{
  const virtual=microphone('Default - Microphone (HitPaw Virtual Audio)','virtual'),physical=microphone('Microphone (Realtek Audio)','physical'),requests=[];
  const devices=[{kind:'audioinput',deviceId:'default',label:virtual.track.label},{kind:'audioinput',deviceId:'virtual',label:'HitPaw Virtual Audio'},{kind:'audioinput',deviceId:'physical',label:physical.track.label}];
  const t=setup(async options=>{requests.push(options);return requests.length===1?virtual:physical;},{trackInput:true,devices});
  try{
    const toggle=t.root.querySelector('[data-setting="voice"]');toggle.click();await settle();
    assert.equal(requests.length,2);assert.equal(requests[1].audio.deviceId.exact,'physical');
    assert.equal(virtual.track.stopped,true);assert.equal(physical.track.stopped,false);
    assert.equal(t.sessions[0].track,physical.track);
    assert.equal(t.root.querySelector('[aria-label="Voice microphone"]').value,'physical');
    t.sessions[0].onaudiostart();t.sessions[0].onerror({error:'no-speech'});
    await new Promise(resolve=>setTimeout(resolve,250));
    assert.equal(t.sessions[1].track,physical.track);assert.equal(requests.length,2,'reconnect reuses the open input');
    assert.equal(physical.track.stopped,false,'browser session endings do not cut the microphone stream');
    speech(t.sessions[1],0,'close settings');assert.equal(t.root.querySelector('.panel').hidden,true);
    t.root.querySelector('.voice-indicator button').click();
    assert.equal(physical.track.stopped,true);assert.equal(t.root.querySelector('.voice-input').hidden,true);
    assert.deepEqual(t.errors,[]);
  }finally{t.w.close();}
});
test('turning voice off while microphone permission is pending releases late audio without starting recognition',async()=>{
  let resolveInput;const stream=microphone('Real microphone','physical');
  const t=setup(()=>new Promise(resolve=>{resolveInput=resolve;}),{trackInput:true});
  try{
    const toggle=t.root.querySelector('[data-setting="voice"]');toggle.click();toggle.click();
    resolveInput(stream);await settle();
    assert.equal(stream.track.stopped,true);assert.equal(t.sessions.length,0);assert.equal(t.w.AccessEase.getSettings().voice,false);
  }finally{t.w.close();}
});
test('choosing a different microphone replaces the old track and device loss stops capture',async()=>{
  const first=microphone('Microphone one','one'),second=microphone('Microphone two','two'),requests=[];
  const devices=[{kind:'audioinput',deviceId:'one',label:first.track.label},{kind:'audioinput',deviceId:'two',label:second.track.label}];
  const t=setup(async options=>{requests.push(options);return requests.length===1?first:second;},{trackInput:true,devices});
  try{
    t.root.querySelector('[data-setting="voice"]').click();await settle();
    const select=t.root.querySelector('[aria-label="Voice microphone"]');select.value='two';select.dispatchEvent(new t.w.Event('change'));await settle();
    assert.equal(first.track.stopped,true);assert.equal(t.sessions[0].aborted,true);assert.equal(t.sessions[1].track,second.track);
    assert.equal(requests[1].audio.deviceId.exact,'two');
    second.track.onended();assert.equal(second.track.stopped,true);assert.equal(t.w.AccessEase.getSettings().voice,false);
    assert.match(t.root.querySelector('.status').textContent,/microphone disconnected/);
    assert.deepEqual(t.errors,[]);
  }finally{t.w.close();}
});

test('denied speech microphone access disables voice and explains the Chrome permission',async()=>{
  const t=setup(()=>{throw Error('unexpected extra microphone request');});
  try{
    t.root.querySelector('[data-setting="voice"]').click();
    t.sessions[0].onerror({error:'not-allowed'});
    assert.equal(t.w.AccessEase.getSettings().voice,false);
    assert.equal(t.root.querySelector('[data-setting="voice"]').getAttribute('aria-pressed'),'false');
    assert.match(t.root.querySelector('.status').textContent,/Allow the microphone in your browser site settings/);
    assert.deepEqual(t.errors,[]);
  }finally{t.w.close();}
});

test('interrupted microphone reconnects, accepts a command, and Stop cancels recovery',async()=>{
  const t=setup(()=>{throw Error('unexpected extra microphone request');});
  try{
    const toggle=t.root.querySelector('[data-setting="voice"]');
    toggle.click();t.sessions[0].onaudiostart();
    t.sessions[0].onerror({error:'aborted'});
    assert.equal(toggle.getAttribute('aria-pressed'),'true');
    assert.equal(toggle.dataset.voicePhase,'reconnecting');
    await new Promise(resolve=>t.w.setTimeout(resolve,250));
    assert.equal(t.sessions.length,2);t.sessions[1].onaudiostart();
    assert.equal(toggle.dataset.voicePhase,'listening');
    speech(t.sessions[1],0,'scroll down');
    assert.deepEqual(t.pageScroll,[450]);
    speech(t.sessions[1],1,'close settings');
    t.sessions[1].onerror({error:'network'});
    assert.equal(t.root.querySelector('.voice-indicator').hidden,false);
    assert.match(t.root.querySelector('.voice-indicator-text').textContent,/Reconnecting automatically/);
    t.root.querySelector('.voice-indicator button').click();
    assert.equal(t.w.AccessEase.getSettings().voice,false);
    assert.equal(toggle.getAttribute('aria-pressed'),'false');
    await new Promise(resolve=>t.w.setTimeout(resolve,1100));
    assert.equal(t.sessions.length,2,'Stop cancels a pending network retry');
    assert.deepEqual(t.errors,[]);
  }finally{t.w.close();}
});
