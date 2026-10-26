const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const settle=()=>new Promise(resolve=>setTimeout(resolve,140));
async function setup({saved,prepare}={}){
  const errors=[],console=new VirtualConsole();console.on('jsdomError',error=>errors.push(error.message));
  const dom=new JSDOM(`<!doctype html><html lang="en"><head><style>body{color:#14253d;background:#fff}h1{font-size:30px}p{font-size:20px}a{color:#135}button{background:#eee}</style></head><body>
    <header style="position:sticky;top:0"><a href="#content">Home</a></header>
    <main id="content" style="filter:brightness(.9)"><h1 style="color:navy!important"><span>Welcome</span></h1>
    <p id="passage" style="color:rgb(20,40,60)!important">A complete paragraph for checking accessible reading preferences and reversible page effects.</p>
    <a id="first" href="#content">Read more</a><a id="second" href="#content">Read more</a>
    <button id="request" aria-label="Send request" tabindex="-2" style="background:#0b3970;color:white">Send</button><button hidden>Hidden action</button><button disabled>Disabled action</button>
    <div inert><a href="#content">Inert link</a></div><a id="image-link" href="#content"><img alt="Company logo"></a>
    <button aria-labelledby="action-name"></button><span id="action-name">Labelled action</span>
    <canvas id="chart"></canvas><iframe id="embed" title="Embedded media"></iframe><img id="animated" src="example.gif" alt="Animation">
    <video id="movie" autoplay></video></main></body></html>`,{url:'http://localhost:1434',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:console});
  const w=dom.window;
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  w.HTMLElement.prototype.scrollIntoView=function(){this.dataset.testScrolled='true';};
  w.HTMLElement.prototype.getClientRects=function(){return this.closest('[hidden]')?[]:[this.getBoundingClientRect()];};
  w.HTMLElement.prototype.getBoundingClientRect=function(){return {left:0,top:0,right:500,bottom:100,width:500,height:100};};
  w.document.elementFromPoint=()=>null;w.scrollBy=()=>{};w.scrollTo=()=>{};
  w.HTMLMediaElement.prototype.pause=function(){this.dataset.paused='true';};
  Object.defineProperty(w.document,'currentScript',{value:{src:'http://localhost:1434/widget.js'}});
  if(saved)w.localStorage.setItem('accessease.team.preferences.v2',JSON.stringify(saved));
  prepare?.(w);
  w.eval(fs.readFileSync(path.join(__dirname,'../dist/widget.js'),'utf8'));
  w.eval(fs.readFileSync(path.join(__dirname,'../dist/team-features.js'),'utf8'));
  for(let i=0;i<40&&!w.AccessEaseTeam;i++)await new Promise(resolve=>setTimeout(resolve,20));
  assert.ok(w.AccessEaseTeam);await settle();
  const root=w.AccessEase.root;
  return {w,root,errors,card:id=>root.querySelector(`[data-team-card="${id}"]`),toggle:async id=>{root.querySelector(`[data-team-card="${id}"] .card-enable`).click();await settle();},close(){w.close();}};
}

test('new profiles are reversible presentations and preserve independent visual preferences',async()=>{
  const t=await setup();
  try{
    t.w.AccessEaseTeam.setSettings({visual:{fontScale:1.2,theme:'dark'}});await settle();
    const original=t.w.AccessEaseTeam.getSettings().visual;
    await t.toggle('visuallyImpaired');
    assert.equal(t.w.getComputedStyle(t.w.document.querySelector('p')).fontSize,'26px');
    assert.deepEqual(t.w.AccessEaseTeam.getSettings().visual,original,'profile does not overwrite manual settings');
    assert.equal(t.w.document.querySelector('h1').style.outline,'2px solid currentColor');
    await t.toggle('visuallyImpaired');
    assert.equal(t.w.getComputedStyle(t.w.document.querySelector('p')).fontSize,'24px');
    assert.equal(t.w.document.querySelector('h1').style.outline,'');
    await t.toggle('cognitiveReading');
    assert.equal(t.w.document.querySelector('p').style.lineHeight,'1.8');
    assert.equal(t.w.document.querySelector('p').style.maxInlineSize,'70ch');
    const dynamic=t.w.document.createElement('p');dynamic.textContent='A newly loaded paragraph.';t.w.document.querySelector('main').append(dynamic);await settle();
    assert.equal(dynamic.style.maxInlineSize,'70ch','profile applies to content added after initialization');
    await t.toggle('cognitiveReading');
    assert.equal(t.w.document.querySelector('p').style.maxInlineSize,'');
    assert.deepEqual(t.w.AccessEaseTeam.getSettings().visual,original);
    assert.deepEqual(t.errors,[]);
  }finally{t.close();}
});

test('text, title and background swatches apply independently and reset restores original important styles',async()=>{
  const t=await setup();
  try{
    const choose=async(id,name)=>{t.card(id).querySelector(`[aria-label="${name}"]`).click();await settle();};
    await choose('textColor','Dark red');
    assert.equal(t.w.document.querySelector('#passage').style.color,'rgb(128, 0, 0)');
    assert.equal(t.w.document.querySelector('#request').style.color,'rgb(255, 255, 255)','custom text colors keep button labels readable on their backgrounds');
    assert.equal(t.w.document.querySelector('h1').style.color,'navy','text colors do not override title colors');
    await choose('titleColor','Blue');
    assert.equal(t.w.document.querySelector('h1').style.color,'rgb(0, 0, 255)');
    assert.equal(t.w.document.querySelector('h1 span').style.color,'rgb(0, 0, 255)');
    await choose('backgroundColor','Yellow');
    assert.equal(t.w.document.body.style.backgroundColor,'rgb(255, 255, 0)');
    assert.equal(t.card('textColor').querySelector('[aria-label="Dark red"]').getAttribute('aria-pressed'),'true');
    assert.equal(t.w.document.querySelector('#passage').style.color,'rgb(128, 0, 0)');
    t.card('titleColor').querySelector('.restore-color').click();await settle();
    assert.equal(t.w.document.querySelector('h1').style.color,'navy');
    assert.equal(t.w.document.querySelector('#passage').style.color,'rgb(128, 0, 0)');
    await t.toggle('highlightTitles');assert.equal(t.w.document.querySelector('h1').style.outline,'2px solid currentColor');
    t.root.querySelector('.reset').click();await settle();
    assert.equal(t.w.document.querySelector('#passage').style.color,'rgb(20, 40, 60)');
    assert.equal(t.w.document.querySelector('#passage').style.getPropertyPriority('color'),'important');
    assert.equal(t.w.document.querySelector('h1').style.color,'navy');
    assert.equal(t.w.document.querySelector('h1').style.getPropertyPriority('color'),'important');
    assert.equal(t.w.document.body.style.backgroundColor,'');
    assert.equal(t.w.document.querySelector('h1').style.outline,'');
    assert.equal(t.w.AccessEaseTeam.getSettings().additional.textColor,'');
    assert.deepEqual(t.errors,[]);
  }finally{t.close();}
});

test('saturation and large cursors are exclusive within their pairs and compose with existing grayscale',async()=>{
  const t=await setup();
  try{
    const main=t.w.document.querySelector('main');
    await t.toggle('highSaturation');assert.equal(main.style.filter,'brightness(.9) saturate(1.7)');
    assert.equal(t.w.document.documentElement.style.filter,'','no filter is added around the widget');
    await t.toggle('lowSaturation');assert.equal(main.style.filter,'brightness(.9) saturate(0.5)');
    assert.equal(t.card('highSaturation').querySelector('.card-enable').getAttribute('aria-checked'),'false');
    await t.toggle('grayscale');assert.match(main.style.filter,/saturate\(0.5\).*grayscale\(1\)/);
    await t.toggle('lowSaturation');assert.match(main.style.filter,/grayscale\(1\)/);assert.doesNotMatch(main.style.filter,/saturate/);
    await t.toggle('darkCursor');assert.match(decodeURIComponent(main.style.cursor),/fill="#14253D"/);
    await t.toggle('lightCursor');assert.match(decodeURIComponent(main.style.cursor),/fill="#FFFFFF"/);
    assert.equal(t.card('darkCursor').querySelector('.card-enable').getAttribute('aria-checked'),'false');
    await t.toggle('lightCursor');assert.equal(main.style.cursor,'');
    await t.toggle('grayscale');assert.equal(main.style.filter,'brightness(.9)');
    assert.deepEqual(t.errors,[]);
  }finally{t.close();}
});

test('link navigation uses accessible names, live content and unique targets without activating page actions',async()=>{
  const t=await setup();
  try{
    const select=t.root.querySelector('#ae-link-navigation');
    const names=()=>[...select.options].map(option=>option.textContent);
    assert.ok(names().includes('Home'));assert.ok(names().includes('Company logo'));assert.ok(names().includes('Labelled action'));
    assert.ok(names().includes('Read more (1)'));assert.ok(names().includes('Read more (2)'));
    assert.ok(!names().some(name=>/Hidden action|Disabled action|Inert link|Open accessibility/.test(name)));
    const late=t.w.document.createElement('button');late.textContent='New action';t.w.document.querySelector('main').append(late);await settle();assert.ok(names().includes('New action'));
    let clicks=0;const request=t.w.document.querySelector('#request');request.addEventListener('click',()=>clicks++);
    t.w.AccessEase.open();select.value=[...select.options].find(option=>option.textContent==='Send request').value;select.dispatchEvent(new t.w.Event('change',{bubbles:true}));
    assert.equal(t.root.querySelector('.panel').hidden,true);assert.equal(t.w.document.activeElement,request);
    assert.equal(request.dataset.testScrolled,'true');assert.equal(clicks,0,'choosing a control does not submit or activate it');
    assert.equal(request.hasAttribute('data-ae-navigation-target'),true);
    t.w.document.querySelector('#first').focus();assert.equal(request.getAttribute('tabindex'),'-2');assert.equal(request.hasAttribute('data-ae-navigation-target'),false);
    late.remove();await settle();assert.ok(!names().includes('New action'));
    t.w.AccessEase.panelLanguage.setLanguage('ta');await settle();
    assert.ok(names().includes('Home'),'page control names retain their original wording in translated panels');
    assert.deepEqual(t.errors,[]);
  }finally{t.close();}
});

test('additional preferences survive reload, validate imported values and reset with the shared action',async()=>{
  const saved={visual:{fontScale:1.2},additional:{textColor:'#008080',titleColor:'#800000',cursor:'light',saturation:'high',cognitiveReading:true,epilepsySafe:true}};
  const t=await setup({saved});
  try{
    assert.equal(t.w.AccessEaseTeam.getSettings().additional.textColor,'#008080');
    assert.equal(Object.hasOwn(t.w.AccessEaseTeam.getSettings().additional,'epilepsySafe'),false,'retired mode is absent from active preferences');
    assert.equal(Object.hasOwn(JSON.parse(t.w.localStorage.getItem('accessease.team.preferences.v2')).additional,'epilepsySafe'),false,'retired preference is removed from saved data');
    assert.equal(t.card('epilepsySafe'),null,'retired mode has no setting control');
    assert.equal(t.w.document.querySelector('#passage').style.color,'rgb(0, 128, 128)');
    assert.match(decodeURIComponent(t.w.document.querySelector('main').style.cursor),/fill="#FFFFFF"/);
    await t.toggle('highlightTitles');
    const stored=JSON.parse(t.w.localStorage.getItem('accessease.team.preferences.v2'));
    assert.equal(stored.additional.highlightTitles,true);assert.equal(stored.additional.textColor,'#008080');
    t.w.AccessEaseTeam.setSettings({additional:{textColor:'red;display:none',backgroundColor:'url(javascript:bad)',cursor:'broken',saturation:99,epilepsySafe:'true'}});await settle();
    const invalid=t.w.AccessEaseTeam.getSettings().additional;
    assert.equal(invalid.textColor,'');assert.equal(invalid.backgroundColor,'');assert.equal(invalid.cursor,'default');assert.equal(invalid.saturation,'normal');assert.equal(Object.hasOwn(invalid,'epilepsySafe'),false);
    t.w.AccessEaseTeam.setSettings({visual:{fontScale:1.1}});await settle();assert.equal(t.w.AccessEaseTeam.getSettings().additional.cognitiveReading,false,'older exports remain compatible');
    t.w.AccessEase.reset();await settle();
    assert.equal(t.w.AccessEaseTeam.getSettings().additional.highlightTitles,false);assert.equal(t.root.querySelector('.count').textContent,'0 active');
    assert.deepEqual(t.errors,[]);
  }finally{t.close();}
});
