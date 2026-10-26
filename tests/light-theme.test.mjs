import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
import {applyLightTheme} from '../visual-accessibility-widget/src/engine/lightTheme.js';
import {DEFAULT_SETTINGS} from '../visual-accessibility-widget/src/engine/preferenceStore.js';

// Resolve the real engine modules while omitting the bundler-only font assets.
const engineUrl=new URL('../visual-accessibility-widget/src/engine/contentEngine.js',import.meta.url);
const engineSource=readFileSync(engineUrl,'utf8')
  .replace(/^import \{ dyslexiaFontCss \}[^\n]+/m,"const dyslexiaFontCss='';")
  .replace(/from '(\.[^']+)'/g,(_,specifier)=>`from '${new URL(specifier,engineUrl).href}'`);
const {createContentEngine}=await import('data:text/javascript;base64,'+Buffer.from(engineSource).toString('base64'));

function run(html,check) {
  const dom=new JSDOM(html),previous={document:globalThis.document,getComputedStyle:globalThis.getComputedStyle};
  globalThis.document=dom.window.document;
  globalThis.getComputedStyle=dom.window.getComputedStyle.bind(dom.window);
  const changes=[];
  try {
    applyLightTheme([...document.querySelectorAll('html,body,body *')],(element,property,value)=>changes.push({element,property,value}));
    check(changes,document);
  } finally {
    dom.window.close();
    for(const [key,value] of Object.entries(previous)) {if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
  }
}

test('light pages keep every original color, including dark headers and white SVG icons',()=>{
  run('<html style="background:#fff"><body style="background:#fff;color:#111"><header style="background:#b65d00;color:#fff">Header</header><main><div style="background:#b65d00"><svg style="color:white"><path fill="currentColor"/></svg></div><section style="background:#111;color:#fff">Dark accent</section></main></body></html>',changes=>assert.equal(changes.length,0));
});
test('transparent body on a light canvas also leaves dark accent cards alone',()=>{
  run('<html style="background:#f5f5f5"><body><div style="background:#111;color:#fff">Accent</div></body></html>',changes=>assert.equal(changes.length,0));
});
test('dark page converts to light while keeping already light panels and photos',()=>{
  run('<html style="background:#101827"><body style="color:#eee"><main><p>Content</p><a href="/">Link</a><section id="light" style="background:white;color:#111">Light panel</section><div id="photo" style="background-image:url(photo.jpg);color:white">Photo caption</div></main></body></html>',(changes,doc)=>{
    assert.ok(changes.some(change=>change.element===doc.documentElement && change.property==='background-color' && change.value==='#ffffff'));
    assert.ok(changes.some(change=>change.element===doc.querySelector('p') && change.property==='color' && change.value==='#0f172a'));
    assert.ok(changes.some(change=>change.element===doc.querySelector('a') && change.property==='color' && change.value==='#1d4ed8'));
    assert.ok(!changes.some(change=>['light','photo'].includes(change.element.id)));
  });
});

const luminance=color=>(color.match(/[\d.]+/g)||[]).slice(0,3).map(Number).map(value=>{
  const channel=value/255;return channel<=.04045?channel/12.92:((channel+.055)/1.055)**2.4;
}).reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);
function assertReadable(w,el){
  const css=w.getComputedStyle(el),foreground=luminance(css.color),background=luminance(css.backgroundColor);
  assert.ok((Math.max(foreground,background)+.05)/(Math.min(foreground,background)+.05)>=7,`${el.id} has a readable foreground/background pair`);
  assert.equal(el.style.getPropertyPriority('color'),'important','host important colors cannot override the theme');
}
function themedPage(){
  const dom=new JSDOM(`<html style="background-color:white"><head><style>
    #host #title{color:transparent!important;-webkit-text-fill-color:transparent!important;background-clip:text}
    #host .cta{color:white!important;background-color:white!important}
    #host a span{color:#eee!important}
    </style></head><body style="background-color:white;color:white"><main id="host">
    <header style="background-color:#b65d00;color:white"><a id="story" href="/stories"><span id="story-label">Customer Stories</span></a></header>
    <h1 id="title" style="background-image:linear-gradient(white,black);background-clip:text">Our experts are ready to assist you!</h1>
    <p id="pale" style="color:rgba(250,250,250,.15)!important;opacity:.3">Get expert assistance with your digital content.</p>
    <button id="meeting" class="cta" style="color:white!important;background-color:white!important"><span id="meeting-label" style="color:black!important">Setup a Meeting</span></button>
    <a id="link" href="/services" style="color:white!important">Digital Solutions</a>
    <input id="email" placeholder="Email address" style="color:white;background-color:white">
    <div id="photo" style="background-image:url(photo.jpg)">A readable photo caption</div>
    <img id="image" src="photo.jpg" style="filter:sepia(1)">
    <p id="hidden" hidden style="opacity:0;color:white">Hidden menu content</p>
    </main><div id="widget" data-uaw-ignore style="color:#14253d;background-color:white"><p>Widget text</p></div></body></html>`,{pretendToBeVisual:true});
  const w=dom.window,previous={};
  for(const key of ['window','document','HTMLElement','MutationObserver','getComputedStyle']){previous[key]=globalThis[key];globalThis[key]=key==='getComputedStyle'?w.getComputedStyle.bind(w):w[key];}
  const engine=createContentEngine({host:w.document.querySelector('#widget')});
  return {w,doc:w.document,engine,close(){engine.destroy();w.close();for(const [key,value] of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}};
}
for(const theme of ['dark','contrast'])test(`${theme} makes pale text, white button labels and important host colors readable and restores them on disable`,()=>{
  const t=themedPage(),all=[...t.doc.querySelectorAll('html,body,body *')],original=all.map(el=>el.style.cssText);
  try{
    for(let pass=0;pass<2;pass++){
      t.engine.apply({...DEFAULT_SETTINGS,theme,additional:{textColor:'#000000',backgroundColor:'#ffffff',titleColor:'#000000',cursor:'default',saturation:'normal'}});
      for(const id of ['title','pale','meeting','meeting-label','story','story-label','link','email','photo'])assertReadable(t.w,t.doc.getElementById(id));
      assert.equal(t.doc.querySelector('#pale').style.opacity,'1','pale opacity no longer makes visible text fade away');
      assert.equal(t.doc.querySelector('#hidden').style.opacity,'0','intentionally hidden content is not revealed');
      assert.equal(t.doc.querySelector('#hidden').hidden,true);
      assert.equal(t.doc.querySelector('#title').style.backgroundImage,'none','transparent gradient lettering receives a solid text color');
      assert.equal(t.doc.querySelector('#title').style.backgroundClip,'border-box');
      assert.match(t.doc.querySelector('#photo').style.backgroundImage,/photo.jpg/,'background photography is retained');
      assert.equal(t.doc.querySelector('#image').style.filter,'sepia(1)');
      assert.equal(t.doc.querySelector('#widget').style.color,'rgb(20, 37, 61)');
      assert.equal(t.doc.querySelector('#widget p').getAttribute('style'),null);
      const css=t.doc.querySelector('[data-uaw-style]').textContent;
      assert.match(css,/-webkit-text-fill-color:currentColor!important/);
      assert.match(css,/::placeholder[^}]*opacity:1!important/);
    }
    t.engine.apply({...DEFAULT_SETTINGS});
    assert.deepEqual(all.map(el=>el.style.cssText),original,'turning the theme off restores each original inline value');
  }finally{t.close();}
});

test('active dark mode also themes newly loaded website text',async()=>{
  const t=themedPage();
  try{
    t.engine.apply({...DEFAULT_SETTINGS,theme:'dark'});
    const paragraph=t.doc.createElement('p');paragraph.id='late';paragraph.style.color='white';paragraph.textContent='New website content';
    t.doc.querySelector('main').append(paragraph);
    await new Promise(resolve=>setTimeout(resolve,140));
    assertReadable(t.w,paragraph);
    t.engine.apply({...DEFAULT_SETTINGS});
    assert.equal(paragraph.style.color,'white');assert.equal(paragraph.style.backgroundColor,'');
  }finally{t.close();}
});
