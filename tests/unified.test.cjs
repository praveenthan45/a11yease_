const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const project=path.join(__dirname,'..');

async function appearanceSetup(saved={},openPanel=true){
  const errors=[],console=new VirtualConsole();console.on('jsdomError',error=>errors.push(error.message));
  const dom=new JSDOM('<html lang="en"><body><main><h1 style="font-size:40px">Website title</h1><p style="font-size:16px">Website content</p></main></body></html>',{url:'http://localhost:1434/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:console});
  const w=dom.window,settle=()=>new Promise(resolve=>setTimeout(resolve,100));
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  w.HTMLElement.prototype.scrollIntoView=function(){};
  w.HTMLElement.prototype.getBoundingClientRect=function(){return {left:0,top:0,right:500,bottom:100,width:500,height:100};};
  w.HTMLElement.prototype.getClientRects=function(){return this.closest('[hidden]')?[]:[this.getBoundingClientRect()];};
  w.document.elementFromPoint=()=>null;w.scrollBy=()=>{};w.scrollTo=()=>{};
  Object.defineProperty(w.document,'currentScript',{value:{src:'http://localhost:1434/widget.js'}});
  for(const [key,value] of Object.entries(saved))w.localStorage.setItem(key,value);
  for(const file of ['widget.js','team-features.js'])w.eval(fs.readFileSync(path.join(project,'dist',file),'utf8'));
  for(let i=0;i<30&&!w.AccessEaseTeam;i++)await settle();
  assert.ok(w.AccessEaseTeam);await settle();
  if(openPanel)w.AccessEase.open();
  return {w,root:w.AccessEase.root,settle,errors};
}

test('Reset all closes the panel and saves cleared preferences before reloading the website',async()=>{
  const t=await appearanceSetup();let saved;
  try{
    t.w.localStorage.setItem('website-preference','keep');
    t.w.AccessEaseTeam.setSettings({
      base:{align:'center',focus:true,sticky:true},
      visual:{theme:'dark',fontScale:1.4,dyslexiaFont:true},
      tools:{progress:true},additional:{cognitiveDisability:true,cursor:'dark'},
      assist:{visual:{enabled:true,brightness:125},motion:{pauseAnimations:true},reader:{auditEnabled:true},forms:{passwordToggle:true}},
    });
    await t.settle();
    assert.notEqual(t.root.querySelector('.count').textContent,'0 active');
    t.w.history.replaceState(null,'','/learning-demo.html?course=2#reading');
    const currentURL=t.w.location.href;
    t.w.sessionStorage.setItem('accessease.voice.navigation.v1',JSON.stringify({origin:t.w.location.origin,expiresAt:Date.now()+300000}));
    t.root.querySelector('.reset').click();
    assert.equal(t.root.querySelector('.panel').hidden,true);
    assert.equal(t.root.querySelector('.launcher').getAttribute('aria-expanded'),'false');
    assert.equal(t.root.querySelector('.count').textContent,'0 active');
    // jsdom reports the reload request instead of performing browser navigation.
    assert.deepEqual(t.errors,['Not implemented: navigation (except hash changes)']);
    assert.equal(t.w.location.href,currentURL);
    assert.equal(JSON.parse(t.w.sessionStorage.getItem('accessease.reset.reload.v1')).href,currentURL);
    assert.equal(t.w.sessionStorage.getItem('accessease.voice.navigation.v1'),null);
    const assist=JSON.parse(t.w.localStorage.getItem('accessease.team.assist.v2.settings'));
    assert.equal(assist.visual.enabled,false);
    assert.equal(assist.motion.pauseAnimations,false);
    assert.equal(assist.reader.auditEnabled,false);
    assert.equal(assist.forms.passwordToggle,false);
    saved=Object.fromEntries(Array.from({length:t.w.localStorage.length},(_,i)=>t.w.localStorage.key(i)).map(key=>[key,t.w.localStorage.getItem(key)]));
  }finally{t.w.close();}
  const reopened=await appearanceSetup(saved,false);
  try{
    assert.equal(reopened.root.querySelector('.panel').hidden,true);
    assert.equal(reopened.root.querySelector('.count').textContent,'0 active');
    assert.equal(reopened.w.AccessEase.getSettings().align,'original');
    assert.equal(reopened.w.AccessEaseTeam.getSettings().visual.fontScale,1);
    assert.equal(reopened.w.AccessEaseTeam.getSettings().visual.dyslexiaFont,false);
    assert.equal(reopened.w.AccessEaseTeam.getSettings().additional.cognitiveDisability,false);
    assert.equal(reopened.w.AccessEaseTeam.getSettings().tools.progress,false);
    assert.equal(reopened.w.localStorage.getItem('website-preference'),'keep');
    assert.deepEqual(reopened.errors,[]);
  }finally{reopened.w.close();}
});

test('Brightness mode shows and persists the selected Muted preset after combining visual adjustments',async()=>{
  const t=await appearanceSetup();let saved;
  try{
    const card=t.root.querySelector('[data-team-card="visuals"]');
    assert.equal(card.querySelector('.card-title').textContent,'Brightness mode');
    card.querySelector('.card-enable').click();await t.settle();
    const select=async id=>{card.querySelector(`input[type=radio][value="${id}"]`).click();await t.settle();};
    await select('brighter');await select('muted');
    assert.equal(t.w.AccessEaseTeam.getSettings().assist.visual.brightness,125,'Muted preserves the existing brightness');
    assert.equal(t.w.AccessEaseTeam.getSettings().assist.visual.saturation,60);
    const muted=card.querySelector('input[value="muted"]');
    assert.equal(muted.checked,true);assert.equal(muted.closest('label').dataset.selected,'true');
    assert.equal(muted.closest('label').querySelector('.visual-preset-check').hidden,false);
    assert.equal(card.querySelector('input[value="brighter"]').checked,false);
    assert.match(t.w.document.documentElement.style.filter,/brightness\(1.25\).*saturate\(0.6\)/);
    assert.equal(t.w.AccessEase.host.style.filter,'','the widget is not counter-filtered out of the chosen visual adjustment');
    await select('dimmer');assert.equal(card.querySelector('input[value="dimmer"]').checked,true);
    await select('muted');assert.equal(muted.checked,true);
    const search=t.root.querySelector('#team-search');search.value='saturation';search.dispatchEvent(new t.w.Event('input'));
    assert.equal(card.hidden,false,'the renamed setting remains searchable by saturation');
    search.value='';search.dispatchEvent(new t.w.Event('input'));
    await new Promise(resolve=>setTimeout(resolve,350));
    saved=Object.fromEntries(Array.from({length:t.w.localStorage.length},(_,i)=>t.w.localStorage.key(i)).map(key=>[key,t.w.localStorage.getItem(key)]));
    assert.deepEqual(t.errors,[]);
  }finally{t.w.close();}
  const reopened=await appearanceSetup(saved);
  try{
    const card=reopened.root.querySelector('[data-team-card="visuals"]');
    assert.equal(card.querySelector('input[value="muted"]').checked,true,'the selected preset survives a new page instance');
    assert.equal(card.querySelector('input[value="muted"]').closest('label').querySelector('.visual-preset-check').hidden,false);
    reopened.w.AccessEase.reset();await reopened.settle();
    assert.equal(card.querySelector('input[value="default"]').checked,true);
    assert.equal(reopened.w.document.documentElement.style.filter,'');
    assert.equal(reopened.w.AccessEase.host.style.filter,'');
    assert.deepEqual(reopened.errors,[]);
  }finally{reopened.w.close();}
});

test('widget appearance follows themes, typography, colour and cursor preferences without hiding control state',async()=>{
  const t=await appearanceSetup();
  try{
    const host=t.w.AccessEase.host,panel=t.root.querySelector('.panel'),label=t.root.querySelector('[data-team-card="dyslexiaFont"] .card-title');
    label.style.fontSize='14px';label.style.lineHeight='20px';
    const icon=t.root.querySelector('[data-team-card="dyslexiaFont"] svg').outerHTML;
    t.w.AccessEaseTeam.setSettings({visual:{theme:'dark',fontScale:1.5,dyslexiaFont:true,spacingPreset:'comfortable',letterSpacing:.06,wordSpacing:.12,lineHeight:1.7,paragraphSpacing:1},additional:{saturation:'low',cursor:'dark'}});await t.settle();
    assert.equal(host.style.getPropertyValue('--ae-bg'),'#101827');
    assert.equal(host.style.getPropertyValue('--ae-text'),'#E8EEF9');
    assert.equal(label.style.fontSize,'14px','widget labels retain their original size');
    assert.equal(label.style.lineHeight,'20px','website spacing does not resize settings labels');
    assert.equal(t.w.document.querySelector('h1').style.fontSize,'60px','text scaling still applies to the website');
    assert.doesNotMatch(t.root.querySelector('[data-uaw-style]').textContent,/letter-spacing:|word-spacing:|margin-block-end:/,'website spacing stays outside the settings panel');
    assert.match(label.style.fontFamily,/OpenDyslexic/,'Dyslexia font also applies to settings labels');
    assert.match(panel.style.filter,/saturate\(0.5\)/);
    assert.equal(t.root.querySelector('[data-team-card="dyslexiaFont"] svg').outerHTML,icon,'icons remain intact');
    const presentation=t.root.querySelector('[data-widget-appearance]');
    assert.match(presentation.textContent,/cursor:url/);
    t.w.AccessEase.setSettings({align:'center'});assert.match(presentation.textContent,/text-align:center/);
    t.w.AccessEaseTeam.setSettings({visual:{theme:'contrast',grayscale:true}});await t.settle();
    assert.equal(host.style.getPropertyValue('--ae-bg'),'#000000');
    assert.equal(host.style.getPropertyValue('--ae-primary'),'#FFFF00');
    assert.equal(host.style.getPropertyValue('--ae-on-primary'),'#000000','selected switch thumbs contrast with their yellow track');
    assert.equal(host.style.getPropertyValue('--ae-on-buttons'),'#000000','high contrast header and reset labels stay visible');
    assert.match(panel.style.filter,/grayscale\(1\)/);
    t.w.AccessEaseTeam.setSettings({visual:{},additional:{textColor:'#008080',backgroundColor:'#FFFFFF',titleColor:'#800000'}});await t.settle();
    assert.equal(host.style.getPropertyValue('--ae-text'),'#008080');
    assert.equal(host.style.getPropertyValue('--ae-heading'),'#800000');
    t.w.AccessEase.reset();await t.settle();
    assert.equal(label.style.fontSize,'14px');assert.equal(label.style.fontFamily,'');
    assert.equal(panel.style.filter,'');assert.doesNotMatch(presentation.textContent,/cursor:url|text-align:center/);
    assert.equal(host.style.getPropertyValue('--ae-bg'),'#F8FAFC');
    assert.equal(host.style.getPropertyValue('--ae-text'),'#14253D');
    assert.deepEqual(t.errors,[]);
  }finally{t.w.close();}
});

test('caption parser uses supplied text and strips cue markup',async()=>{
  const {parseVtt}=await import('../integration/helpers.js');
  assert.deepEqual(parseVtt('WEBVTT\n\n1\n00:00.000 --> 00:02.000\n<v Alice>Hello &amp; welcome.</v>\n\n00:02.000 --> 00:04.000\nSecond line.'),['Hello & welcome.','Second line.']);
});
test('summary only extracts source sentences and deduplicates paragraphs',async()=>{
  const {summarize}=await import('../integration/helpers.js');
  const text='Accessible learning makes useful information easier for everyone to read. Clear headings help people move through a page with confidence.';
  const result=summarize([text,text]);
  assert.ok(result.length>0&&result.length<=5);
  assert.equal(result.length,new Set(result).size);
  result.forEach(sentence=>assert.ok(text.includes(sentence)));
});
test('preference import rejects unrelated files and wrong versions',async()=>{
  const {validateImport}=await import('../integration/helpers.js');
  assert.throws(()=>validateImport({version:1,settings:{}}));
  assert.throws(()=>validateImport({kind:'other',version:2,settings:{}}));
  assert.deepEqual(validateImport({kind:'accessease-preferences',version:2,settings:{visual:{fontScale:1.5}}}),{visual:{fontScale:1.5}});
});
test('all four modules share one launcher, reset and sanitized import',async()=>{
  const errors=[];
  const vc=new VirtualConsole();vc.on('jsdomError',error=>errors.push(error.message));
  const dom=new JSDOM('<!doctype html><html lang="en"><head><style>h1{font-size:40px}p{font-size:20px}</style></head><body><main id="main-content"><h1>Sample learning page</h1><p>A complete example paragraph with useful information for every curious reader.</p><a href="#main-content">Read more</a></main></body></html>',{url:'http://localhost:1434/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
  const w=dom.window;
  w.localStorage.setItem('accessease.team.assist.v2.settings',JSON.stringify({reader:{auditEnabled:true},forms:{passwordToggle:true}}));
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
  w.HTMLElement.prototype.scrollIntoView=function(){};
  w.scrollBy=()=>{};w.scrollTo=()=>{};
  Object.defineProperty(w.document,'currentScript',{value:{src:'http://localhost:1434/widget.js'}});
  try{
    w.eval(fs.readFileSync(path.join(project,'dist/widget.js'),'utf8'));
    w.eval(fs.readFileSync(path.join(project,'dist/team-features.js'),'utf8'));
    for(let i=0;i<30&&!w.AccessEaseTeam;i++)await new Promise(resolve=>setTimeout(resolve,20));
    assert.ok(w.AccessEaseTeam,'combined feature API initialized');
    const root=w.AccessEase.root;
    assert.equal(w.document.querySelectorAll('#accessease-widget').length,1);
    assert.equal(root.querySelectorAll('.launcher').length,1);
    assert.equal(root.querySelectorAll('.team-card').length,48);
    assert.equal(root.querySelector('.total').textContent,'61 settings');
    const categories=[...root.querySelectorAll('.settings-group')];
    assert.equal(categories.length,9);
    const controls=[...root.querySelectorAll('.tile,.select-row,.team-card')];
    assert.equal(controls.length,61);
    assert.ok(controls.every(control=>control.closest('.category-controls')),'every original setting belongs to a category');
    const ids=controls.map(control=>control.dataset.setting||control.dataset.teamCard||control.querySelector('select').id);
    assert.equal(new Set(ids).size,61,'no duplicate or missing setting cards');
    const screenReader=root.querySelector('[data-team-card="screen-reader"] .card-enable');
    const passwordToggle=root.querySelector('[data-team-card="password"] .card-enable');
    await new Promise(resolve=>setTimeout(resolve,40));
    assert.equal(screenReader.getAttribute('aria-checked'),'false');
    assert.equal(passwordToggle.getAttribute('aria-checked'),'false');
    assert.equal(root.querySelector('.count').textContent,'0 active','old enabled defaults are migrated before user enables a setting');
    assert.equal(w.localStorage.getItem('accessease.team.activation-defaults.v1'),'1');
    screenReader.click();
    await new Promise(resolve=>setTimeout(resolve,40));
    assert.equal(screenReader.getAttribute('aria-checked'),'true');
    assert.equal(root.querySelector('.count').textContent,'1 active','enabled screen reader adds to active count');
    screenReader.click();
    passwordToggle.click();
    await new Promise(resolve=>setTimeout(resolve,40));
    assert.equal(root.querySelector('.count').textContent,'1 active','enabled password control adds to active count');
    passwordToggle.click();
    await new Promise(resolve=>setTimeout(resolve,40));
    assert.equal(root.querySelector('.count').textContent,'0 active','disabled password control does not add to active count');
    screenReader.click();
    passwordToggle.click();
    await new Promise(resolve=>setTimeout(resolve,40));
    assert.equal(root.querySelector('.category-filters'),null);
    assert.equal(root.querySelector('.panel-size-controls'),null);
    const search=root.querySelector('#team-search');
    search.value='reading speed';search.dispatchEvent(new w.Event('input',{bubbles:true}));
    assert.equal(root.querySelector('#rate').closest('.select-row').hidden,false);
    assert.equal(root.querySelector('[data-team-card="fontScale"]').hidden,true);
    search.value='Pause Animations';search.dispatchEvent(new w.Event('input',{bubbles:true}));
    assert.equal(root.querySelector('[data-team-card="pause-animations"]').closest('.settings-group').hidden,false,'page-guide searches can find settings outside the selected category');
    search.value='no matching setting';search.dispatchEvent(new w.Event('input',{bubbles:true}));
    assert.equal(root.querySelector('.team-empty').hidden,false);
    search.value='';search.dispatchEvent(new w.Event('input',{bubbles:true}));
    const fontCard=root.querySelector('[data-team-card="fontScale"]');
    fontCard.open=true;
    fontCard.querySelector('[aria-label="Increase Text Size"]').click();
    await new Promise(resolve=>setTimeout(resolve,40));
    assert.ok(w.AccessEaseTeam.getSettings().visual.fontScale>1,'React button handlers work through category portals');
    root.querySelector('[data-setting="focus"]').click();
    assert.equal(w.AccessEase.getSettings().focus,true,'original button listeners remain attached');
    const align=root.querySelector('#align');align.value='center';align.dispatchEvent(new w.Event('change',{bubbles:true}));
    assert.equal(w.AccessEase.getSettings().align,'center','original dropdown listeners remain attached');
    w.AccessEase.reset();
    await new Promise(resolve=>setTimeout(resolve,40));
    assert.equal(root.querySelector('.count').textContent,'0 active','reset leaves no active settings');
    assert.equal(screenReader.getAttribute('aria-checked'),'false');
    assert.equal(passwordToggle.getAttribute('aria-checked'),'false');
    assert.equal(w.document.querySelector('#a11y-floating-btn'),null);
    assert.equal(root.querySelector('[data-team-card="fontScale"] summary').getAttribute('aria-label'),'Text Size options');
    w.AccessEase.open();
    const modal=w.document.createElement('dialog');modal.setAttribute('open','');root.append(modal);
    modal.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,composed:true}));
    assert.equal(root.querySelector('.panel').hidden,false,'confirmation owns Escape');
    modal.remove();
    w.AccessEaseTeam.setSettings({base:{align:'right',voice:true,rate:99},visual:{fontScale:1.5,theme:'dark'},tools:{progress:true},assist:{visual:{enabled:true,brightness:125}}});
    await new Promise(resolve=>setTimeout(resolve,80));
    assert.equal(w.AccessEase.getSettings().voice,false);
    assert.equal(w.AccessEase.getSettings().rate,1);
    assert.equal(w.AccessEaseTeam.getSettings().visual.fontScale,1.5);
    assert.equal(w.AccessEaseTeam.getSettings().assist.visual.brightness,125);
    assert.equal(w.getComputedStyle(w.document.querySelector('h1')).fontSize,'60px');
    assert.ok(root.querySelector('.count').textContent!=='0 active');
    w.AccessEase.reset();
    await new Promise(resolve=>setTimeout(resolve,80));
    assert.equal(root.querySelector('.count').textContent,'0 active','reset clears the active count after imported settings');
    assert.equal(w.AccessEaseTeam.getSettings().visual.theme,'default');
    assert.equal(w.AccessEaseTeam.getSettings().tools.progress,false);
    assert.equal(w.AccessEase.getSettings().align,'original');
    assert.equal(w.AccessEaseTeam.getSettings().assist.visual.enabled,false);
    assert.equal(w.getComputedStyle(w.document.querySelector('h1')).fontSize,'40px');
    assert.deepEqual(errors,[]);
  }finally{w.close();}
});
