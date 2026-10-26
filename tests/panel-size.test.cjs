const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');

test('old panel sizes are discarded and moving the panel never fixes its dimensions',async()=>{
  const errors=[],console=new VirtualConsole();
  console.on('jsdomError',error=>errors.push(error.message));
  const dom=new JSDOM('<html lang="en"><body><main><h1>Host website</h1></main></body></html>',{
    url:'http://localhost:1439/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:console,
  });
  const w=dom.window;
  w.innerWidth=1280;w.innerHeight=800;
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  w.HTMLElement.prototype.scrollIntoView=function(){};
  w.document.elementFromPoint=()=>null;
  w.scrollBy=()=>{};w.scrollTo=()=>{};
  Object.defineProperty(w.document,'currentScript',{value:{src:'http://localhost:1439/widget.js'}});
  const oldKey='accessease.panel.geometry.v1',positionKey='accessease.panel.position.v1';
  const profiles='[{"name":"Keep this profile","settings":{}}]';
  w.localStorage.setItem(oldKey,JSON.stringify({left:10,top:10,width:1200,height:1000}));
  w.localStorage.setItem('accessease.team.profiles.v2',profiles);
  try{
    for(const name of ['widget.js','team-features.js'])w.eval(fs.readFileSync(path.join(__dirname,'../dist',name),'utf8'));
    for(let i=0;i<50&&w.AccessEase?.root.querySelector('.top').tabIndex!==0;i++)await new Promise(resolve=>setTimeout(resolve,20));
    const root=w.AccessEase.root,panel=root.querySelector('.panel'),header=panel.querySelector('.top');
    assert.equal(header.tabIndex,0,'panel movement initialized');
    assert.equal(w.localStorage.getItem(oldKey),null,'legacy width and height cannot return');
    assert.equal(root.querySelector('.panel-resize'),null,'no pointer or keyboard resize handles');
    assert.equal(panel.style.width,'');assert.equal(panel.style.height,'');
    panel.getBoundingClientRect=()=>({
      left:panel.style.left?Number.parseFloat(panel.style.left):845,
      top:panel.style.top?Number.parseFloat(panel.style.top):15,width:420,height:770,
    });
    w.AccessEase.open();
    await new Promise(resolve=>setTimeout(resolve,0));
    header.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));
    assert.equal(panel.style.left,'830px');
    header.dispatchEvent(new w.MouseEvent('pointerdown',{button:0,clientX:850,clientY:50,bubbles:true}));
    header.dispatchEvent(new w.MouseEvent('pointermove',{clientX:800,clientY:80,bubbles:true}));
    header.dispatchEvent(new w.MouseEvent('pointerup',{clientX:800,clientY:80,bubbles:true}));
    assert.equal(panel.style.left,'780px','header dragging still moves the panel');
    assert.equal(panel.style.width,'','dragging cannot freeze the responsive width');
    assert.equal(panel.style.height,'','dragging cannot freeze the responsive height');
    assert.deepEqual(Object.keys(JSON.parse(w.localStorage.getItem(positionKey))).sort(),['left','top']);
    w.innerWidth=320;w.innerHeight=568;w.dispatchEvent(new w.Event('resize'));
    assert.equal(panel.style.left,'');assert.equal(panel.style.top,'');
    assert.equal(header.tabIndex,-1,'mobile bottom sheet cannot be dragged off-screen');
    header.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));
    assert.equal(panel.style.left,'');
    w.AccessEase.close();w.innerWidth=1280;w.innerHeight=800;w.dispatchEvent(new w.Event('resize'));
    w.AccessEase.open();await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(panel.style.left,'780px','desktop position returns when reopening');
    assert.equal(panel.style.width,'');assert.equal(panel.style.height,'');
    assert.equal(w.localStorage.getItem('accessease.team.profiles.v2'),profiles);
    assert.deepEqual(errors,[]);
  }finally{w.close();}
});
