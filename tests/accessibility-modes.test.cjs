const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');

test('the five main modes share their original controls, engines, search, translation and reset',async()=>{
  const errors=[],console=new VirtualConsole();
  console.on('jsdomError',error=>errors.push(error.message));
  const dom=new JSDOM('<html lang="en"><body><main><h1>Host website</h1><p>A clear passage to read at a comfortable pace.</p></main></body></html>',{
    url:'http://localhost:1439/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:console,
  });
  const w=dom.window,spoken=[],recognitions=[];
  const settle=()=>new Promise(resolve=>setTimeout(resolve,30));
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  w.HTMLElement.prototype.scrollIntoView=function(){};
  w.HTMLElement.prototype.getBoundingClientRect=function(){return {left:0,top:0,right:500,bottom:100,width:500,height:100};};
  w.document.elementFromPoint=()=>null;
  w.scrollBy=()=>{};w.scrollTo=()=>{};
  w.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
  w.speechSynthesis={speak:utterance=>spoken.push(utterance),cancel(){},getVoices:()=>[]};
  w.SpeechRecognition=class{
    constructor(){recognitions.push(this);}
    start(){this.started=true;}
    abort(){this.aborted=true;}
    stop(){}
  };
  Object.defineProperty(w.document,'currentScript',{value:{src:'http://localhost:1439/widget.js'}});
  try{
    w.eval(fs.readFileSync(path.join(__dirname,'../dist/widget.js'),'utf8'));
    const root=w.AccessEase.root,voice=root.querySelector('[data-setting="voice"]'),speech=root.querySelector('[data-setting="speech"]'),rate=root.querySelector('#rate');
    w.eval(fs.readFileSync(path.join(__dirname,'../dist/team-features.js'),'utf8'));
    for(let i=0;i<50&&!w.AccessEaseTeam;i++)await settle();
    assert.ok(w.AccessEaseTeam);
    const modes=root.querySelector('.settings-group');
    assert.equal(modes.dataset.category,'modes');
    assert.equal(modes.querySelector('.category-heading').textContent,'Accessibility modes');
    assert.equal(root.querySelector('.category-count,.category-icon'),null);
    const controls=[...modes.querySelector('.category-controls').children];
    assert.deepEqual(controls.slice(0,5).map(el=>el.dataset.setting||el.dataset.teamCard),['dyslexiaFont','voice','grayscale','speech','colorVisionMode']);
    assert.deepEqual(controls.slice(5).map(el=>el.dataset.teamCard),['visuallyImpaired','cognitiveReading']);
    const titles=controls.map(el=>el.querySelector('.card-title,strong,summary>span:not(.team-icon)').textContent);
    assert.deepEqual(titles.slice(0,5),['Dyslexia Mode','Voice Command','Grayscale Mode','Text to Speech','Color Blindness Mode']);
    const all=[...root.querySelectorAll('.tile,.select-row,.team-card')];
    assert.equal(all.length,61);
    assert.equal(new Set(all.map(el=>el.dataset.setting||el.dataset.teamCard||el.querySelector('select').id)).size,61);
    assert.equal(root.querySelector('[data-setting="voice"]'),voice,'moving the original button keeps its listeners');
    assert.equal(root.querySelector('[data-setting="speech"]'),speech);
    assert.equal(root.querySelector('#rate'),rate,'the original speed selector keeps its playback listener');
    const speechSetting=modes.querySelector('.speech-setting'),speedOptions=speechSetting.querySelector('.speech-options'),speedToggle=speechSetting.querySelector('.speech-options-toggle');
    assert.equal(rate.closest('.speech-setting'),speechSetting);
    assert.equal(root.querySelector('[data-category="reading"] #rate'),null);
    assert.equal(speedOptions.hidden,true,'speed options start compact so all five modes fit');
    speedToggle.click();
    assert.equal(speedOptions.hidden,false);
    assert.equal(speedToggle.getAttribute('aria-expanded'),'true');
    assert.equal(w.AccessEase.getSettings().speech,false,'opening speed options does not start speech');
    rate.value='1.1';rate.dispatchEvent(new w.Event('change',{bubbles:true}));
    assert.equal(w.AccessEase.getSettings().rate,1.1);
    speedToggle.click();assert.equal(speedOptions.hidden,true);

    const dyslexia=modes.querySelector('[data-team-card="dyslexiaFont"] .card-enable');
    dyslexia.click();await settle();
    assert.equal(w.AccessEaseTeam.getSettings().visual.dyslexiaFont,true);
    assert.equal(dyslexia.getAttribute('aria-checked'),'true');
    assert.match(w.document.querySelector('[data-uaw-style]').textContent,/OpenDyslexic/);
    dyslexia.click();await settle();
    assert.equal(w.AccessEaseTeam.getSettings().visual.dyslexiaFont,false);

    voice.click();
    assert.equal(w.AccessEase.getSettings().voice,true);
    assert.equal(recognitions[0].started,true);
    voice.click();
    assert.equal(w.AccessEase.getSettings().voice,false);
    assert.equal(recognitions[0].aborted,true);

    const gray=modes.querySelector('[data-team-card="grayscale"] .card-enable');
    gray.click();await settle();
    assert.equal(w.AccessEaseTeam.getSettings().visual.grayscale,true);
    assert.match(w.document.querySelector('main').style.filter,/grayscale\(1\)/);
    gray.click();await settle();
    assert.equal(w.AccessEaseTeam.getSettings().visual.grayscale,false);

    const range=w.document.createRange();range.selectNodeContents(w.document.querySelector('main p'));
    w.getSelection().removeAllRanges();w.getSelection().addRange(range);
    w.document.dispatchEvent(new w.Event('selectionchange'));
    speech.click();
    assert.equal(w.AccessEase.getSettings().speech,true);
    assert.equal(speedOptions.hidden,false,'enabling speech reveals its speed control');
    assert.equal(spoken.at(-1).text,'A clear passage to read at a comfortable pace.');
    assert.equal(spoken.at(-1).rate,1.1);
    rate.value='1.5';rate.dispatchEvent(new w.Event('change',{bubbles:true}));
    assert.equal(spoken.at(-1).rate,1.5,'nested speed changes still update active playback');
    speech.click();assert.equal(w.AccessEase.getSettings().speech,false);

    const palette=modes.querySelector('#team-color-mode');
    palette.value='protanopia';palette.dispatchEvent(new w.Event('change',{bubbles:true}));await settle();
    assert.equal(w.AccessEaseTeam.getSettings().visual.colorVisionMode,'protanopia');
    assert.equal(w.document.querySelector('main').style.getPropertyValue('--cv-primary'),'#005a9c');
    const search=root.querySelector('#team-search');
    for(const [query,id] of [['Dyslexia-Friendly Font','dyslexiaFont'],['Voice Commands','voice'],['Text-to-Speech','speech'],['Color Blindness Support','colorVisionMode']]){
      search.value=query;search.dispatchEvent(new w.Event('input'));
      assert.equal(modes.hidden,false);
      assert.equal(controls.filter(el=>!el.hidden).length,1);
      assert.equal(controls.find(el=>!el.hidden).dataset.setting||controls.find(el=>!el.hidden).dataset.teamCard,id);
    }
    search.value='';search.dispatchEvent(new w.Event('input'));
    speedToggle.click();assert.equal(speedOptions.hidden,true);
    search.value='reading speed';search.dispatchEvent(new w.Event('input'));
    assert.equal(modes.hidden,false);assert.equal(speechSetting.hidden,false);
    assert.equal(speedOptions.hidden,false,'search reveals the nested control without starting speech');
    assert.equal(w.AccessEase.getSettings().speech,false);
    search.value='';search.dispatchEvent(new w.Event('input'));
    assert.equal(speedOptions.hidden,true,'clearing search restores the chosen disclosure state');
    w.AccessEase.panelLanguage.setLanguage('ta');
    assert.equal(modes.querySelector('.category-heading').textContent,'அணுகல்தன்மை பயன்முறைகள்');
    assert.match(speedToggle.getAttribute('aria-label'),/விருப்பங்கள்/);
    search.value='வாசிப்பு வேகத்தை மாற்று';search.dispatchEvent(new w.Event('input'));
    assert.equal(speechSetting.hidden,false);assert.equal(speedOptions.hidden,false);
    search.value='';search.dispatchEvent(new w.Event('input'));
    w.AccessEase.panelLanguage.setLanguage('en');
    root.querySelector('.reset').click();await settle();
    const saved=w.AccessEaseTeam.getSettings();
    assert.equal(saved.visual.dyslexiaFont,false);assert.equal(saved.visual.grayscale,false);
    assert.equal(saved.visual.colorVisionMode,'default');assert.equal(saved.base.voice,false);assert.equal(saved.base.speech,false);
    assert.equal(saved.base.rate,1);assert.equal(rate.value,'1');assert.equal(speedOptions.hidden,true);
    assert.equal(w.document.querySelector('main').style.filter,'');
    assert.equal(w.document.querySelector('h1').textContent,'Host website');
    assert.deepEqual(errors,[]);
  }finally{w.close();}
});

test('category expansion preserves settings, search restores the chosen layout, and all setting icons are distinct',async()=>{
  const errors=[],console=new VirtualConsole();
  console.on('jsdomError',error=>errors.push(error.message));
  const dom=new JSDOM('<html lang="en"><body><main><p style="font-size:20px">Host website content.</p></main></body></html>',{
    url:'http://localhost:1439/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:console,
  });
  const w=dom.window;
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  w.HTMLElement.prototype.scrollIntoView=function(){};
  w.scrollBy=()=>{};w.scrollTo=()=>{};w.document.elementFromPoint=()=>null;
  Object.defineProperty(w.document,'currentScript',{value:{src:'http://localhost:1439/widget.js'}});
  const settle=()=>new Promise(resolve=>setTimeout(resolve,30));
  try{
    for(const file of ['widget.js','team-features.js'])w.eval(fs.readFileSync(path.join(__dirname,'../dist',file),'utf8'));
    for(let i=0;i<50&&!w.AccessEaseTeam;i++)await settle();
    assert.ok(w.AccessEaseTeam);
    const root=w.AccessEase.root,groups=[...root.querySelectorAll('.settings-group')];
    for(const group of groups){
      const toggle=group.querySelector('.category-toggle'),controls=group.querySelector('.category-controls');
      if(group.dataset.category==='modes'){
        assert.equal(toggle,null,'the main five modes have a static heading');
        assert.equal(group.querySelector('.category-expander'),null);
        assert.equal(controls.hidden,false);assert.equal(controls.children.length,5);
        continue;
      }
      assert.equal(toggle.tagName,'BUTTON');assert.equal(toggle.type,'button');
      assert.equal(toggle.getAttribute('aria-controls'),controls.id);
      assert.equal(toggle.getAttribute('aria-expanded'),String(group.dataset.category==='modes'));
      assert.equal(controls.hidden,group.dataset.category!=='modes');
    }
    const cards=[...root.querySelectorAll('.tile,.select-row,.team-card')];
    assert.equal(cards.length,61);
    const signatures=new Map();
    for(const card of cards){
      const id=card.dataset.setting||card.dataset.teamCard||card.querySelector('select').id;
      const svg=card.querySelector('.team-icon svg,.icon svg');
      assert.ok(svg&&svg.children.length,`A relevant icon is rendered for ${id}`);
      assert.equal(svg.getAttribute('aria-hidden'),'true');
      const geometry=JSON.stringify([...svg.children].map(el=>[el.localName,[...el.attributes].map(attr=>[attr.name,attr.value.replace(/[\s,]+/g,' ').trim()]).sort()]));
      assert.equal(signatures.has(geometry),false,`${id} must not reuse the icon for ${signatures.get(geometry)}`);
      signatures.set(geometry,id);
    }
    w.AccessEaseTeam.setSettings({base:{align:'center'},visual:{fontScale:1.2},tools:{progress:true},assist:{}});await settle();
    const snapshot=JSON.stringify(w.AccessEaseTeam.getSettings());
    const modes=groups[0],vision=root.querySelector('[data-category="vision"]'),reading=root.querySelector('[data-category="reading"]');
    modes.querySelector('.category-heading').click();
    assert.equal(modes.querySelector('.category-controls').hidden,false);
    vision.querySelector('.category-toggle').click();
    assert.equal(vision.querySelector('.category-controls').hidden,false);
    const search=root.querySelector('#team-search');search.value='Text Size';search.dispatchEvent(new w.Event('input'));
    assert.equal(reading.hidden,false);
    assert.equal(reading.querySelector('.category-controls').hidden,false,'matching settings are reachable without opening their category first');
    reading.querySelector('.category-toggle').click();
    assert.equal(reading.querySelector('.category-controls').hidden,true);
    search.value='';search.dispatchEvent(new w.Event('input'));
    assert.equal(reading.querySelector('.category-controls').hidden,true,'search does not overwrite the previous closed state');
    assert.equal(modes.querySelector('.category-controls').hidden,false,'the five main modes stay expanded after search');
    assert.equal(vision.querySelector('.category-controls').hidden,false,'search restores the previous open state');
    assert.equal(JSON.stringify(w.AccessEaseTeam.getSettings()),snapshot,'category controls never change feature preferences');
    assert.ok(cards.every(card=>card.isConnected),'collapsing categories keeps all feature controls mounted');
    assert.deepEqual(errors,[]);
  }finally{w.close();}
});
