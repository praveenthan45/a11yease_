import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { PANEL_LANGUAGES, installPanelLanguage, translatePanelText, flagImage } from '../integration/panelLanguage.js';
import { panelDictionaries } from '../integration/panelDictionaries.js';

test('20 languages include Tamil and Hindi with bundled flags and complete matching catalogs', () => {
  assert.equal(PANEL_LANGUAGES.length,20);
  assert.equal(new Set(PANEL_LANGUAGES.map(([code])=>code)).size,20);
  assert.ok(PANEL_LANGUAGES.some(([code])=>code==='ta'));
  assert.ok(PANEL_LANGUAGES.some(([code])=>code==='hi'));
  assert.deepEqual(PANEL_LANGUAGES.filter(([, ,country])=>country==='in').map(([code])=>code).sort(),['hi','ta']);
  assert.ok(!PANEL_LANGUAGES.some(([code])=>['bn','te','mr'].includes(code)));
  for(const code of ['pl','uk','th'])assert.ok(PANEL_LANGUAGES.some(([language])=>language===code));
  for(const [language,country] of [['en','gb'],['pt','pt'],['ar','sa'],['uk','ua']]){
    assert.equal(PANEL_LANGUAGES.find(([code])=>code===language)[2],country);
  }
  const keys=Object.keys(panelDictionaries.ta).sort();
  for(const [code,,country] of PANEL_LANGUAGES){
    assert.match(decodeURIComponent(flagImage(country)), /<svg/);
    assert.doesNotMatch(decodeURIComponent(flagImage(country)), /undefined/);
    assert.doesNotMatch(decodeURIComponent(flagImage(country)), /<script|https?:\/\/(?!www\.w3\.org)/);
    if(code==='en')continue;
    assert.deepEqual(Object.keys(panelDictionaries[code]).sort(),keys);
    assert.ok(Object.values(panelDictionaries[code]).every(value=>typeof value==='string'&&value.trim()));
    assert.notEqual(translatePanelText('Reduce Motion',code),'Reduce Motion');
  }
});

test('flags use the complete source assets instead of the former hand-drawn approximations',()=>{
  const assets=JSON.parse(fs.readFileSync(new URL('../integration/flags/flags.json',import.meta.url),'utf8'));
  for(const [, ,country] of PANEL_LANGUAGES){
    assert.equal(decodeURIComponent(flagImage(country).split(',')[1]),assets[country]);
    assert.match(assets[country],new RegExp(`id="flag-icons-${country}"`));
  }
  assert.match(assets.in,/rotate\(15\)/,'Indian flag includes the full radial wheel artwork');
  assert.match(assets.in,/<use xlink:href="#in-d"/);
  assert.match(assets.sa,/<path/,'Saudi flag retains its emblem paths');
});

test('panel translation preserves input values, implicit option values, website text, dynamic changes and preference isolation', async()=>{
  const dom=new JSDOM('<html lang="en"><body><p id="website">Reduce Motion</p><div id="widget"></div></body></html>',{url:'https://example.com',pretendToBeVisual:true});
  const root=dom.window.document.getElementById('widget').attachShadow({mode:'open'});
  root.innerHTML='<section class="panel"><div class="top"></div><h3>Reduce Motion</h3><input placeholder="Search accessibility settings…" value="my text"><select><option>wide</option><option>comfortable</option></select><p role="status">Your preferences are saved in this browser.</p><button aria-label="Text Size">Text Size</button><span data-panel-original-content>Reading</span></section>';
  dom.window.localStorage.setItem('accessease.preferences.v1','{"focus":true}');
  const api=installPanelLanguage({root});
  try{
    api.setLanguage('ta');
    assert.equal(root.querySelector('h3').textContent,'இயக்கத்தைக் குறை');
    assert.equal(root.querySelector('input').value,'my text');
    assert.equal(root.querySelector('option').value,'wide');
    assert.equal(root.querySelector('button[aria-label]').getAttribute('aria-label'),'எழுத்து அளவு');
    assert.equal(root.querySelector('[data-panel-original-content]').textContent,'Reading');
    assert.equal(dom.window.document.getElementById('website').textContent,'Reduce Motion');
    assert.equal(dom.window.document.documentElement.lang,'en');
    assert.equal(dom.window.localStorage.getItem('accessease.preferences.v1'),'{"focus":true}');
    root.querySelector('[role=status]').textContent='All settings have been reset.';
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(root.querySelector('[role=status]').textContent,'அனைத்து அமைப்புகளும் மீட்டமைக்கப்பட்டன.');
    api.setLanguage('hi');assert.equal(root.querySelector('h3').textContent,'गति कम करें');
    assert.match(api.searchText(root.querySelector('h3')),/Reduce Motion/);
    api.setLanguage('en');assert.equal(root.querySelector('h3').textContent,'Reduce Motion');
    assert.equal(root.querySelector('option').textContent,'wide');
    api.setLanguage('ta');api.destroy();
    assert.equal(dom.window.localStorage.getItem('accessease.panel.language.v1'),'ta');
    const restored=installPanelLanguage({root});assert.equal(restored.language,'ta');restored.destroy();
  }finally{dom.window.close();}
});

test('language menu supports pointer focus changes, keyboard selection and Escape without closing the settings panel',async()=>{
  const dom=new JSDOM('<div id="widget"></div>',{url:'https://example.com',pretendToBeVisual:true});
  const root=dom.window.document.getElementById('widget').attachShadow({mode:'open'});
  root.innerHTML='<section class="panel"><div class="top"></div><h3>Text Size</h3></section>';
  const api=installPanelLanguage({root});
  try{
    const toggle=root.querySelector('.panel-language-toggle');toggle.click();
    assert.equal(toggle.getAttribute('aria-expanded'),'true');
    assert.equal(root.activeElement.dataset.language,'en');
    root.activeElement.dispatchEvent(new dom.window.FocusEvent('focusout',{bubbles:true,relatedTarget:null}));
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(toggle.getAttribute('aria-expanded'),'true','transient pointer blur must not close the menu before click');
    root.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));
    assert.equal(root.activeElement.dataset.language,'ta');root.activeElement.click();
    assert.equal(api.language,'ta');assert.equal(root.activeElement,toggle);
    toggle.click();root.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    assert.equal(toggle.getAttribute('aria-expanded'),'false');
    assert.equal(root.querySelector('.panel').hidden,false);
  }finally{api.destroy();dom.window.close();}
});

test('combined widget translates all 61 setting titles and searches in English and Tamil without changing settings',async()=>{
  const errors=[],vc=new VirtualConsole();vc.on('jsdomError',error=>errors.push(error.message));
  const dom=new JSDOM('<html lang="en"><body><main><h1>Original website</h1></main></body></html>',{url:'http://localhost:1439',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
  const w=dom.window;w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  w.HTMLElement.prototype.scrollIntoView=function(){};w.scrollBy=()=>{};w.scrollTo=()=>{};
  Object.defineProperty(w.document,'currentScript',{value:{src:'http://localhost:1439/widget.js'}});
  try{
    w.eval(fs.readFileSync(new URL('../dist/widget.js',import.meta.url),'utf8'));
    w.eval(fs.readFileSync(new URL('../dist/team-features.js',import.meta.url),'utf8'));
    for(let i=0;i<50&&!w.AccessEaseTeam;i++)await new Promise(resolve=>setTimeout(resolve,20));
    assert.ok(w.AccessEaseTeam);
    const root=w.AccessEase.root,api=w.AccessEase.panelLanguage;
    root.querySelector('[data-team-card="highlightLinks"] .card-enable').click();
    await new Promise(resolve=>setTimeout(resolve,60));
    assert.equal(w.AccessEaseTeam.getSettings().visual.highlightLinks,true);
    const snapshot=JSON.stringify(w.AccessEaseTeam.getSettings());
    const titles=[...root.querySelectorAll('.card-title,.tile strong,.select-row label,.team-card>summary>span:not(.team-icon)')].map(node=>{const label=node.cloneNode(true);label.querySelectorAll('small,.icon').forEach(child=>child.remove());return label.textContent.trim();}).filter(Boolean);
    assert.equal(titles.length,61);
    const catalogKeys=new Set(Object.keys(panelDictionaries.ta).map(key=>key.toLowerCase()));
    for(const title of titles)assert.ok(catalogKeys.has(title.toLowerCase()),`Translation missing for ${title}`);
    api.setLanguage('ta');
    assert.equal(root.querySelector('.intro-title'),null);
    const toolbar=root.querySelector('.panel-toolbar');
    assert.equal(toolbar.firstElementChild.className,'team-search');
    assert.equal(toolbar.lastElementChild.className,'panel-language');
    assert.equal(root.querySelector('.category-count,.category-icon'),null);
    assert.equal(root.querySelector('.panel-language-toggle').getAttribute('aria-labelledby'),'panel-language-label panel-language-value');
    assert.equal(root.querySelector('.panel-language-toggle').title,'மொழி: தமிழ்');
    const search=root.querySelector('#team-search');search.value='reduce';search.dispatchEvent(new w.Event('input'));
    assert.equal(root.querySelector('[data-team-card="reduce-motion"]').hidden,false);
    search.value='இயக்கத்தைக்';search.dispatchEvent(new w.Event('input'));
    assert.equal(root.querySelector('[data-team-card="reduce-motion"]').hidden,false);
    search.value='';search.dispatchEvent(new w.Event('input'));
    const readTitles=()=>[...root.querySelectorAll('.card-title,.tile strong,.select-row label,.team-card>summary>span:not(.team-icon)')].map(node=>{const label=node.cloneNode(true);label.querySelectorAll('small,.icon').forEach(child=>child.remove());return label.textContent.trim();}).filter(Boolean);
    for(const [code] of PANEL_LANGUAGES){
      api.setLanguage(code);
      assert.equal(JSON.stringify(w.AccessEaseTeam.getSettings()),snapshot);
      assert.deepEqual(readTitles(),titles.map(title=>translatePanelText(title,code)),`All 61 titles render in ${code}`);
    }
    assert.equal(w.document.querySelector('h1').textContent,'Original website');
    assert.equal(w.document.documentElement.lang,'en');
    assert.deepEqual(errors,[]);
  }finally{w.close();}
});
