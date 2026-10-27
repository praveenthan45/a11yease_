import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
import {DEFAULT_SETTINGS,SPACING_PRESETS} from '../visual-accessibility-widget/src/engine/preferenceStore.js';
// The browser build resolves font assets. This test exercises the actual
// content engine and its restoration journal without loading unrelated fonts.
const source=readFileSync(new URL('../visual-accessibility-widget/src/engine/contentEngine.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
const reflowUrl=new URL('../visual-accessibility-widget/src/engine/textReflow.js',import.meta.url).href;
const dyslexiaUrl=new URL('../visual-accessibility-widget/src/engine/dyslexiaText.js',import.meta.url).href;
const {createContentEngine}=await import('data:text/javascript;base64,'+Buffer.from(`import {reflowText} from '${reflowUrl}';\nimport {applyDyslexiaText} from '${dyslexiaUrl}';\nconst dyslexiaFontCss='';\n${source}`).toString('base64'));

test('enlarged or spaced text puts floating navigation in flow and restores its layout',()=>{
  const dom=new JSDOM(`<body><div id="header-root"><header style="position:relative;height:0px"><nav style="position:absolute;top:4px!important"><div style="display:flex;flex-direction:row;flex-wrap:nowrap;height:80px"><ul style="display:flex;flex-direction:row;flex-wrap:nowrap;height:80px"><li><a style="display:flex;height:80px;white-space:nowrap">Digital Accessibility Transformation (DAT)</a><div id="dropdown" style="position:absolute;display:none;height:120px"><a>Accessibility Development</a></div></li><li><a>Digital Solutions</a></li></ul></div></nav></header></div><main><h1>Page content</h1></main><div id="widget" data-uaw-ignore></div></body>`,{pretendToBeVisual:true});
  const previous={};
  for(const key of ['window','document','HTMLElement','MutationObserver','getComputedStyle']) {
    previous[key]=globalThis[key];
    globalThis[key]=key==='getComputedStyle'?dom.window.getComputedStyle.bind(dom.window):dom.window[key];
  }
  const doc=dom.window.document;
  dom.window.HTMLElement.prototype.getClientRects=function(){return this.closest('#dropdown')?[]:[{width:500,height:80}];};
  dom.window.HTMLElement.prototype.getBoundingClientRect=function(){return {width:500,height:this.matches('header')?0:80,top:0,bottom:80};};
  const elements=[...doc.querySelectorAll('body *')],original=elements.map(el=>el.style.cssText);
  const engine=createContentEngine({host:doc.getElementById('widget')});
  try {
    for(const settings of [
      {fontScale:1.5},{fontScale:2},{fontScale:2},
      {spacingPreset:'comfortable',...SPACING_PRESETS.comfortable},
      {spacingPreset:'wide',...SPACING_PRESETS.wide},
      {spacingPreset:'custom',letterSpacing:0.2,lineHeight:2.5,customSpacingOverrides:['letterSpacing','lineHeight']},
    ]) {
      engine.apply({...DEFAULT_SETTINGS,...settings});
      assert.equal(doc.querySelector('nav').style.position,'relative');
      assert.equal(doc.querySelector('header').style.height,'auto');
      assert.equal(doc.querySelector('ul').style.height,'auto');
      assert.equal(doc.querySelector('a').style.whiteSpace,'normal');
      assert.equal(doc.querySelector('#dropdown').style.position,'absolute');
      assert.equal(doc.querySelector('#dropdown').style.display,'none');
      assert.equal(doc.querySelector('h1').style.position,'');
    }
    engine.apply({...DEFAULT_SETTINGS,fontScale:1});
    assert.deepEqual(elements.map(el=>el.style.cssText),original);
    assert.equal(doc.querySelector('nav').style.getPropertyPriority('top'),'important');
    doc.querySelector('nav').setAttribute('data-uaw-preserve-layout','');
    engine.apply({...DEFAULT_SETTINGS,fontScale:2});
    assert.equal(doc.querySelector('nav').style.position,'absolute','explicit layout opt-outs stay floating');
    assert.equal(doc.querySelector('header').style.height,'0px');
  } finally {
    engine.destroy();dom.window.close();
    for(const [key,value] of Object.entries(previous)) {if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
  }
});

test('dyslexia covers important headings and dynamic text, preserves icons, and restores styles',async()=>{
  const dom=new JSDOM(`<body><style>h1{font-family:Graphik!important}</style><header><nav><a style="min-height:80px">Menu</a><div style="position:absolute;display:none"><a style="min-height:80px">Dropdown</a></div></nav></header><main><h1 style="font-family:Arial!important">Heading <strong>bold</strong></h1><p>Paragraph</p><i style="font-family:unicons!important">&#xe900;</i><span data-uaw-icon>icon</span><label>Label<input placeholder="Input"></label><div id="late"></div></main><div id="widget" data-uaw-ignore>Widget</div></body>`,{pretendToBeVisual:true});
  const previous={};
  for(const key of ['window','document','HTMLElement','MutationObserver','getComputedStyle']) {
    previous[key]=globalThis[key];
    globalThis[key]=key==='getComputedStyle'?dom.window.getComputedStyle.bind(dom.window):dom.window[key];
  }
  const doc=dom.window.document;
  dom.window.HTMLElement.prototype.getClientRects=function(){return this.closest('[style*="display:none"]')?[]:[{width:500,height:80}];};
  dom.window.HTMLElement.prototype.getBoundingClientRect=()=>({width:500,height:80,top:0,bottom:80});
  const folded=doc.createElement('details');folded.innerHTML='<summary>More reading</summary><p>Previously hidden paragraph</p>';doc.querySelector('main').append(folded);
  const elements=[...doc.querySelectorAll('body *')],original=elements.map(el=>el.style.cssText);
  const engine=createContentEngine({host:doc.getElementById('widget')});
  try {
    engine.apply({...DEFAULT_SETTINGS,dyslexiaFont:true});
    for(const selector of ['h1','strong','p','label','input']) {
      assert.match(doc.querySelector(selector).style.fontFamily,/UAW OpenDyslexic/);
      assert.equal(doc.querySelector(selector).style.getPropertyPriority('font-family'),'important');
    }
    assert.equal(doc.querySelector('i').style.fontFamily,'unicons');
    assert.equal(doc.querySelector('[data-uaw-icon]').style.fontFamily,'');
    assert.equal(doc.querySelector('#widget').style.fontFamily,'');
    assert.equal(doc.querySelector('nav>a').style.minHeight,'80px','font mode preserves existing navigation dimensions');
    assert.equal(doc.querySelector('nav div a').style.minHeight,'80px');
    assert.equal(folded.querySelector('p').style.fontFamily,'','closed content waits until its real reading space is visible');
    folded.open=true;await new Promise(resolve=>setTimeout(resolve,140));
    assert.match(folded.querySelector('p').style.fontFamily,/UAW OpenDyslexic/);
    folded.open=false;await new Promise(resolve=>setTimeout(resolve,140));
    assert.equal(folded.querySelector('p').style.fontFamily,'');
    doc.getElementById('late').textContent='Dynamically loaded text';
    await new Promise(resolve=>setTimeout(resolve,140));
    assert.match(doc.getElementById('late').style.fontFamily,/UAW OpenDyslexic/);
    engine.apply({...DEFAULT_SETTINGS,dyslexiaFont:false});
    assert.deepEqual(elements.map(el=>el.style.cssText),original);
  } finally {
    engine.destroy();dom.window.close();
    for(const [key,value] of Object.entries(previous)) {if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
  }
});

test('dyslexia fits large headings while preserving readable body text, controls and nested text',()=>{
  const dom=new JSDOM(`<body><header style="height:80px"><nav style="position:absolute;height:80px"><a style="font-size:14px;line-height:20px;width:180px;display:block">Reading menu</a></nav></header>
    <main><h1 style="font-size:60px;line-height:72px;width:650px">One page.<br><em style="font-size:60px;line-height:72px">50 ways to explore.</em></h1>
    <h2 style="font-size:30px;line-height:36px;width:220px"><span style="font-size:30px;line-height:36px">Read </span><span style="font-size:30px;line-height:36px">better</span></h2>
    <p style="font-size:16px;line-height:24px;width:300px">A complete paragraph with enough words to wrap in its original reading space.</p>
    <label style="display:block;font-size:11px;line-height:18px;width:300px">SMALL LABEL</label>
    <div id="steps" style="display:flex;width:600px;font-size:11px;line-height:18px"><span style="display:block;width:180px;font-size:11px;line-height:18px">Choose a setting to begin.</span><span style="display:block;width:180px;font-size:11px;line-height:18px">Choose a setting to begin.</span><span style="display:block;width:180px;font-size:11px;line-height:18px">Choose a setting to begin.</span></div>
    <aside role="img"><span style="font-size:20px">Illustration text</span></aside>
    <i data-uaw-icon style="font-family:unicons">icon</i></main><div id="widget" data-uaw-ignore></div></body>`,{pretendToBeVisual:true});
  const w=dom.window,doc=w.document,previous={};
  for(const key of ['window','document','HTMLElement','MutationObserver','getComputedStyle']){previous[key]=globalThis[key];globalThis[key]=key==='getComputedStyle'?w.getComputedStyle.bind(w):w[key];}
  // Model a wider replacement font while using the real sizing, wrapping and restoration code.
  w.CanvasRenderingContext2D=function(){};
  w.HTMLCanvasElement.prototype.getContext=()=>({font:'',measureText(value){const size=parseFloat(this.font.match(/([\d.]+)px/)?.[1]||16);return {width:value.length*size*.55*(this.font.includes('OpenDyslexic')?1.6:1),actualBoundingBoxAscent:size*.8,actualBoundingBoxDescent:size*.2,fontBoundingBoxAscent:size,fontBoundingBoxDescent:size*.2};}});
  const fontSize=el=>parseFloat(w.getComputedStyle(el).fontSize)||16;
  const textWidth=(el,value)=>value.length*fontSize(el)*.55*(w.getComputedStyle(el).fontFamily.includes('OpenDyslexic')?1.6:1);
  const segments=el=>{const result=[0];for(const node of el.childNodes){if(node.nodeType===3)result[result.length-1]+=textWidth(el,node.textContent);else if(node.nodeName==='BR')result.push(0);else if(node.nodeType===1){const nested=segments(node);result[result.length-1]+=nested[0];result.push(...nested.slice(1));}}return result;};
  const available=el=>parseFloat(w.getComputedStyle(el).width)||parseFloat(w.getComputedStyle(el.parentElement||doc.body).width)||650;
  w.HTMLElement.prototype.getBoundingClientRect=function(){const width=available(this),style=w.getComputedStyle(this),lines=segments(this).reduce((count,value)=>count+Math.max(1,Math.ceil(value/width)),0);let height=parseFloat(style.height)||lines*(parseFloat(style.lineHeight)||fontSize(this)*1.2);const row=this.id==='steps'?this:this.parentElement?.id==='steps'?this.parentElement:null;if(row)height=Math.max(...[...row.children].map(child=>Math.ceil(segments(child).reduce((a,b)=>a+b,0)/available(child))*18));return {x:0,y:0,left:0,top:0,right:width,bottom:height,width,height};};
  w.HTMLElement.prototype.getClientRects=function(){const count=w.getComputedStyle(this).display==='inline'?Math.max(1,Math.ceil(segments(this).reduce((a,b)=>a+b,0)/available(this))):1;return Array.from({length:count},()=>this.getBoundingClientRect());};
  Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{configurable:true,get(){return available(this);}});
  Object.defineProperty(w.HTMLElement.prototype,'scrollWidth',{configurable:true,get(){return available(this);}});
  Object.defineProperty(w.HTMLElement.prototype,'scrollHeight',{configurable:true,get(){return this.getBoundingClientRect().height+3;}});
  const elements=[...doc.querySelectorAll('body *')],original=elements.map(el=>el.style.cssText),targets=[...doc.querySelectorAll('h1,h2,p')];
  const before=targets.map(el=>el.getBoundingClientRect());
  const engine=createContentEngine({host:doc.querySelector('#widget')});
  try{
    let sizes;
    for(let attempt=0;attempt<3;attempt++){
      engine.apply({...DEFAULT_SETTINGS,dyslexiaFont:true});
      targets.forEach((el,index)=>assert.equal(el.getBoundingClientRect().width,before[index].width,'text stays within the original available width'));
      const current=targets.map(el=>el.style.fontSize);
      if(sizes)assert.deepEqual(current,sizes,'refreshing must not repeatedly shrink the text');sizes=current;
      assert.equal(doc.querySelector('p').style.fontSize,'16px','paragraphs never shrink to fit their original line count');
      assert.equal(doc.querySelector('p').style.lineHeight,'24px');
      assert.equal(doc.querySelector('nav a').style.fontSize,'14px','navigation labels retain their original size');
      assert.equal(doc.querySelector('label').style.fontSize,'11px','small labels retain their original size');
      assert.equal(doc.querySelector('nav').style.position,'absolute');assert.equal(doc.querySelector('header').style.height,'80px');
      assert.equal(doc.querySelector('#steps span').style.fontSize,'11px','wrapping labels never become tiny to force a row height');
      assert.equal(doc.querySelector('h1 em').style.fontSize,doc.querySelector('h1').style.fontSize,'nested emphasis shares the heading size');
      assert.ok(parseFloat(doc.querySelector('h2').style.fontSize)>=24,'smaller headings retain a readable minimum');
      assert.equal(doc.querySelector('[role="img"] span').style.fontFamily,'');
      assert.equal(doc.querySelector('[data-uaw-icon]').style.fontFamily,'unicons');
      assert.ok(parseFloat(doc.querySelector('h1').style.fontSize)>30,'fit uses the largest suitable text instead of the minimum size');
    }
    engine.apply({...DEFAULT_SETTINGS});assert.deepEqual(elements.map(el=>el.style.cssText),original);
  }finally{engine.destroy();w.close();for(const [key,value] of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});

test('dyslexia fits oversized titles to their original space when font estimates understate their rendered width',()=>{
  const dom=new JSDOM(`<body><main>
    <h1 style="width:600px;height:110px;font-size:100px;line-height:110px;font-family:Arial">Empowering</h1>
    <div id="large-title" style="width:500px;font-size:72px;line-height:90px;font-family:Arial"><span style="font-size:72px;line-height:90px;font-family:Arial">Accessibility</span></div>
    <p style="font-size:16px;line-height:24px;font-family:Arial">Keep this paragraph readable.</p>
    <button style="font-size:14px;line-height:20px;font-family:Arial">Send enquiry</button>
    </main><div id="widget" data-uaw-ignore></div></body>`,{pretendToBeVisual:true});
  const w=dom.window,doc=w.document,previous={};
  for(const key of ['window','document','HTMLElement','MutationObserver','getComputedStyle']){previous[key]=globalThis[key];globalThis[key]=key==='getComputedStyle'?w.getComputedStyle.bind(w):w[key];}
  // Real layout can differ from canvas estimates because of host font features
  // and nested runs. Also exercise the fallback when canvas is unavailable.
  w.CanvasRenderingContext2D=function(){};
  w.HTMLCanvasElement.prototype.getContext=()=>({font:'',measureText(value){const size=parseFloat(this.font.match(/([\d.]+)px/)?.[1]||16);return {width:value.length*size*.5*(this.font.includes('OpenDyslexic')?1.1:1)};}});
  const width=el=>parseFloat(w.getComputedStyle(el).width)||(el.parentElement?width(el.parentElement):800);
  const textWidth=el=>[...el.childNodes].reduce((sum,node)=>sum+(node.nodeType===3?node.textContent.trim().length*(parseFloat(w.getComputedStyle(el).fontSize)||16)*.5*(w.getComputedStyle(el).fontFamily.includes('OpenDyslexic')?2.8:1):node.nodeType===1?textWidth(node):0),0);
  const textHeight=el=>Math.max(1,Math.ceil(textWidth(el)/width(el)))*(parseFloat(w.getComputedStyle(el).lineHeight)||24);
  w.HTMLElement.prototype.getBoundingClientRect=function(){const boxWidth=width(this),height=parseFloat(w.getComputedStyle(this).height)||textHeight(this);return {x:0,y:0,left:0,top:0,right:boxWidth,bottom:height,width:boxWidth,height};};
  w.HTMLElement.prototype.getClientRects=function(){return [this.getBoundingClientRect()];};
  Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{configurable:true,get(){return width(this);}});
  Object.defineProperty(w.HTMLElement.prototype,'clientHeight',{configurable:true,get(){return this.getBoundingClientRect().height;}});
  Object.defineProperty(w.HTMLElement.prototype,'scrollWidth',{configurable:true,get(){return Math.max(width(this),textWidth(this));}});
  Object.defineProperty(w.HTMLElement.prototype,'scrollHeight',{configurable:true,get(){return Math.max(this.getBoundingClientRect().height,textHeight(this));}});
  const elements=[...doc.querySelectorAll('body *')],original=elements.map(el=>el.style.cssText);
  const titles=[doc.querySelector('h1'),doc.querySelector('#large-title span')],bounds=titles.map(el=>el.getBoundingClientRect());
  const engine=createContentEngine({host:doc.querySelector('#widget')});
  try{
    let sizes;
    for(const canvas of [true,true,false]){
      w.CanvasRenderingContext2D=canvas?function(){}:undefined;
      engine.apply({...DEFAULT_SETTINGS,dyslexiaFont:true});
      titles.forEach((el,index)=>{
        assert.match(el.style.fontFamily,/OpenDyslexic/);
        assert.ok(el.scrollWidth<=bounds[index].width+1,'title fits without horizontal page enlargement');
        assert.ok(el.scrollHeight<=bounds[index].height+1,'title does not grow into extra rows or overflow its fixed-height box');
        assert.equal(el.style.overflowWrap,'normal','long title words are not split anywhere');
      });
      const current=titles.map(el=>el.style.fontSize);
      if(canvas&&sizes)assert.deepEqual(current,sizes,'reapplying starts from the original typography');
      sizes=current;
      assert.ok(parseFloat(titles[0].style.fontSize)<60,`rendered fitting can go below the old 60% floor: ${titles[0].style.cssText}`);
      assert.equal(doc.querySelector('p').style.fontSize,'16px');
      assert.equal(doc.querySelector('button').style.fontSize,'14px');
    }
    engine.apply({...DEFAULT_SETTINGS});assert.deepEqual(elements.map(el=>el.style.cssText),original);
  }finally{engine.destroy();w.close();for(const [key,value] of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});

test('dyslexia ignores scroll-driven changes and preserves position through necessary refreshes',async()=>{
  const dom=new JSDOM('<body><main><p style="font-size:16px;line-height:24px">Reading content</p><div id="late"></div></main><div id="widget" data-uaw-ignore></div></body>',{pretendToBeVisual:true});
  const w=dom.window,doc=w.document,previous={};
  for(const key of ['window','document','HTMLElement','MutationObserver','getComputedStyle']){previous[key]=globalThis[key];globalThis[key]=key==='getComputedStyle'?w.getComputedStyle.bind(w):w[key];}
  w.HTMLElement.prototype.getClientRects=()=>[{width:400,height:24}];
  const scroller=doc.documentElement;
  let clamp=false,writes=0;
  w.HTMLElement.prototype.getBoundingClientRect=function(){
    // Model the browser clamping scroll when baseline restoration shortens a page.
    if(clamp&&this.matches('p')&&!this.style.fontFamily){scroller.scrollTop=0;clamp=false;}
    return {width:400,height:24,top:0,bottom:24};
  };
  const paragraph=doc.querySelector('p'),setProperty=paragraph.style.setProperty.bind(paragraph.style);
  paragraph.style.setProperty=(...args)=>{if(args[0]==='font-family')writes++;return setProperty(...args);};
  const engine=createContentEngine({host:doc.querySelector('#widget')});
  try{
    engine.apply({...DEFAULT_SETTINGS,dyslexiaFont:true});
    await new Promise(resolve=>setTimeout(resolve,100));
    scroller.scrollTop=1200;
    const before=writes;
    doc.querySelector('main').className='sticky-header-is-scrolled';
    w.dispatchEvent(new w.Event('resize'));
    paragraph.firstChild.data='Reading a live counter: 12';
    await new Promise(resolve=>setTimeout(resolve,140));
    assert.equal(writes,before,'scroll classes, live text and height-only resizes must not refit the page');
    assert.equal(scroller.scrollTop,1200);
    clamp=true;
    doc.querySelector('#late').innerHTML='<p>Newly loaded reading content</p>';
    await new Promise(resolve=>setTimeout(resolve,140));
    assert.ok(writes>before,'new content still receives the font');
    assert.match(doc.querySelector('#late p').style.fontFamily,/OpenDyslexic/);
    assert.equal(scroller.scrollTop,1200,'refresh restores the reading position after baseline measurement');
    assert.match(doc.querySelector('[data-uaw-style]').textContent,/overflow-anchor:none/);
    engine.apply({...DEFAULT_SETTINGS});
    assert.doesNotMatch(doc.querySelector('[data-uaw-style]').textContent,/overflow-anchor:none/);
  }finally{engine.destroy();w.close();for(const [key,value] of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});

test('dyslexia waits for page scrolling to pause and corrects layout clamping without smooth scrolling',async()=>{
  const dom=new JSDOM('<html style="scroll-behavior:smooth"><body><main><p style="font-size:16px;line-height:24px">Reading content</p><div id="late"></div></main><div id="widget" data-uaw-ignore></div></body></html>',{pretendToBeVisual:true});
  const w=dom.window,doc=w.document,previous={};
  for(const key of ['window','document','HTMLElement','MutationObserver','getComputedStyle']){previous[key]=globalThis[key];globalThis[key]=key==='getComputedStyle'?w.getComputedStyle.bind(w):w[key];}
  const scroller=doc.documentElement,corrections=[];
  let clamp=false,writes=0;
  w.HTMLElement.prototype.getClientRects=()=>[{width:400,height:24}];
  w.HTMLElement.prototype.getBoundingClientRect=()=>({width:400,height:24,top:0,bottom:24});
  scroller.scrollTo=options=>{corrections.push(options);scroller.scrollLeft=options.left;scroller.scrollTop=options.top;};
  const paragraph=doc.querySelector('p'),setProperty=paragraph.style.setProperty.bind(paragraph.style);
  const removeProperty=paragraph.style.removeProperty.bind(paragraph.style);
  paragraph.style.setProperty=(...args)=>{if(args[0]==='font-family')writes++;return setProperty(...args);};
  paragraph.style.removeProperty=property=>{
    const original=removeProperty(property);
    // Model a shorter baseline page clamping the browser's scroll position.
    if(clamp&&property==='font-family'){scroller.scrollTop=0;clamp=false;}
    return original;
  };
  const engine=createContentEngine({host:doc.querySelector('#widget')});
  try{
    engine.apply({...DEFAULT_SETTINGS,dyslexiaFont:true});
    const before=writes;
    scroller.scrollTop=1200;clamp=true;
    w.dispatchEvent(new w.Event('scroll'));
    doc.querySelector('#late').innerHTML='<p>Lazy-loaded reading content</p>';
    await new Promise(resolve=>setTimeout(resolve,100));
    assert.equal(writes,before,'new content must not refit existing text during a scroll');
    scroller.scrollTop=1500;w.dispatchEvent(new w.Event('scroll'));
    await new Promise(resolve=>setTimeout(resolve,100));
    assert.equal(writes,before,'continued scrolling postpones the refit');
    await new Promise(resolve=>setTimeout(resolve,140));
    assert.ok(writes>before,'new content receives the font after scrolling pauses');
    assert.match(doc.querySelector('#late p').style.fontFamily,/OpenDyslexic/);
    assert.equal(scroller.scrollTop,1500,'correction uses the latest reading position');
    assert.deepEqual(corrections,[{left:0,top:1500,behavior:'instant'}],'a smooth host page must not animate the correction');
    assert.equal(scroller.style.scrollBehavior,'smooth','the host scroll preference is preserved');
  }finally{engine.destroy();w.close();for(const [key,value] of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});
