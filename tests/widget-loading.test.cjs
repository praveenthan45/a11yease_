const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,readdirSync}=require('node:fs');
const path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const project=process.env.TEST_APP_ROOT||path.join(__dirname,'..');
const source=name=>readFileSync(path.join(project,'dist',name),'utf8');
const settle=()=>new Promise(resolve=>setTimeout(resolve,25));

function setup(){
  const errors=[],virtualConsole=new VirtualConsole();
  virtualConsole.on('jsdomError',error=>errors.push(error.message));
  const dom=new JSDOM('<body><main><h1>Client website</h1><button>Host button</button></main></body>',{url:'https://client.example/article',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole});
  const w=dom.window;
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  const script=w.document.createElement('script');
  script.src='https://widget.example/install/embed.js';script.dataset.key='test-key';
  Object.defineProperty(w.document,'currentScript',{value:script});
  const widgetScripts=()=>[...w.document.head.querySelectorAll('script')].filter(script=>script.src.endsWith('/widget.js'));
  return {dom,w,errors,widgetScripts};
}

test('embed overlaps public downloads with validation without executing an unapproved widget',async()=>{
  const t=setup();let resolveValidation,request;
  t.w.fetch=(url,options)=>{request={url:String(url),options};return new Promise(resolve=>{resolveValidation=resolve;});};
  try{
    t.w.eval(source('embed.js'));
    const hints=[...t.w.document.querySelectorAll('link[rel="preload"]')];
    assert.equal(hints.length,2);
    assert.deepEqual(hints.map(hint=>hint.href),['https://widget.example/install/widget.js','https://widget.example/install/accessibility-badge.png?v=20261106-compact']);
    assert.equal(t.widgetScripts().length,0,'preloading does not execute the script');
    assert.equal(request.options.headers['X-AccessEase-Key'],'test-key');
    assert.equal(request.options.credentials,'omit');
    assert.ok(request.options.signal);
    assert.equal(request.url,'https://widget.example/install/api/widget/validate');
    t.w.eval(source('embed.js'));
    assert.equal(t.w.document.querySelectorAll('link[rel="preload"]').length,2,'duplicate embed is ignored');
    resolveValidation({ok:true,json:async()=>({ok:true})});await settle();
    assert.equal(t.widgetScripts().length,1);
    assert.equal(t.widgetScripts()[0].async,true);
    t.widgetScripts()[0].dispatchEvent(new t.w.Event('load'));
    assert.equal(t.w.document.querySelectorAll('link[rel="preload"]').length,0);
    assert.deepEqual(t.errors,[]);
  }finally{t.dom.window.close();}
});

test('revoked, rejected and unreachable keys never execute the preloaded widget',async()=>{
  for(const result of [{ok:false},{ok:true,json:async()=>({ok:false})},new Error('Network unavailable')]){
    const t=setup();
    t.w.fetch=()=>result instanceof Error?Promise.reject(result):Promise.resolve(result);
    try{
      t.w.eval(source('embed.js'));await settle();
      assert.equal(t.widgetScripts().length,0);
      assert.equal(t.w.document.querySelectorAll('link[rel="preload"]').length,0);
      assert.equal(t.w.__accessEaseEmbedLoading,false,'a later attempt can retry');
      assert.equal(t.w.document.querySelector('h1').textContent,'Client website');
      assert.deepEqual(t.errors,[]);
    }finally{t.dom.window.close();}
  }
});

test('settings load after the landing page, or immediately for interaction and saved preferences',async()=>{
  for(const mode of ['load','interaction','api','shortcut','saved']){
    const t=setup(),loads=[];
    Object.defineProperty(t.w.document,'readyState',{value:'loading'});
    const add=t.w.addEventListener.bind(t.w);
    t.w.addEventListener=(name,listener,...args)=>name==='load'?loads.push(listener):add(name,listener,...args);
    if(mode==='saved')t.w.localStorage.setItem('accessease.team.preferences.v2',JSON.stringify({visual:{theme:'dark'}}));
    const teams=()=>[...t.w.document.querySelectorAll('script')].filter(script=>script.src.includes('team-features.js'));
    try{
      t.w.eval(source('widget.js'));await settle();
      assert.ok(t.w.AccessEase.root.querySelector('.launcher img'));
      if(mode!=='saved')assert.equal(teams().length,0,'optional UI is not part of the page load');
      if(mode==='load')loads.forEach(listener=>listener());
      if(mode==='interaction')t.w.AccessEase.root.querySelector('.launcher').click();
      if(mode==='api')t.w.AccessEase.open();
      if(mode==='shortcut')t.w.document.dispatchEvent(new t.w.KeyboardEvent('keydown',{key:'a',ctrlKey:true,altKey:true,bubbles:true}));
      await settle();
      assert.equal(teams().length,1);
      assert.equal(teams()[0].async,true);
      assert.equal(teams()[0].fetchPriority,'low');
      loads.forEach(listener=>listener());t.w.AccessEase.root.querySelector('.launcher').dispatchEvent(new t.w.Event('pointerenter'));
      assert.equal(teams().length,1,'interaction and page load cannot download twice');
      assert.equal(t.w.AccessEase.root.querySelector('.top .logo img').getAttribute('loading'),'lazy');
      assert.equal(t.w.AccessEase.root.querySelector('.top .plug-wordmark').getAttribute('loading'),'lazy');
      assert.deepEqual(t.errors,[]);
    }finally{t.dom.window.close();}
  }
});

test('hosted fonts are separate, same-directory-aware assets and the standalone source is unchanged',()=>{
  const bundle=source('team-features.js');
  assert.doesNotMatch(bundle,/data:font\/woff2;base64/,'unused fonts do not inflate the JS download');
  assert.ok(Buffer.byteLength(bundle)<1000000);
  const fonts=readdirSync(path.join(project,'dist/assets')).filter(name=>/^OpenDyslexic-.+\.woff2$/.test(name));
  assert.equal(fonts.length,4);
  for(const font of fonts){
    assert.match(font,/-[A-Za-z0-9_-]{8,}\.woff2$/);
    assert.ok(bundle.includes(font));
    assert.ok(readFileSync(path.join(project,'dist/assets',font)).length>10000);
  }
  assert.match(bundle,/document\.currentScript/);
  const sdkFonts=readFileSync(path.join(project,'visual-accessibility-widget/src/engine/dyslexiaFont.js'),'utf8');
  assert.doesNotMatch(sdkFonts,/no-inline/,'the portable SDK still embeds fonts');
});
