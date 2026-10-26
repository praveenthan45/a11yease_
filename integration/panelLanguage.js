import countryFlags from './flags/flags.json' with { type: 'json' };
import { panelDictionaries } from './panelDictionaries.js';

// Popular visitor languages, including Tamil and Hindi; flags are visual hints,
// while native language names remain the accessible labels.
export const PANEL_LANGUAGES = [
  ['en','English','gb'], ['ta','தமிழ்','in'], ['hi','हिन्दी','in'],
  ['es','Español','es'], ['fr','Français','fr'], ['de','Deutsch','de'],
  ['pt','Português','pt'], ['ar','العربية','sa'], ['zh','中文','cn'],
  ['ja','日本語','jp'], ['ko','한국어','kr'], ['ru','Русский','ru'],
  ['it','Italiano','it'], ['nl','Nederlands','nl'], ['tr','Türkçe','tr'],
  ['id','Bahasa Indonesia','id'], ['vi','Tiếng Việt','vn'],
  ['pl','Polski','pl'], ['uk','Українська','ua'], ['th','ไทย','th'],
];
const languageKey = 'accessease.panel.language.v1';
const normalize = text => text.replace(/\s+/g,' ').trim().toLowerCase();
const lookups = Object.fromEntries(Object.entries(panelDictionaries).map(([code,entries]) => [code,
  Object.fromEntries(Object.entries(entries).map(([key,value]) => [normalize(key),value]))]));

export function translatePanelText(text, code) {
  if (code === 'en' || !lookups[code]) return text;
  const dictionary = lookups[code], key = normalize(text);
  let translated = dictionary[key];
  if (!translated) {
    const aliases={'comfortable reading':'comfortable','reduced motion':'reduce motion','enhanced contrast':'high contrast mode','save current preferences as':'profile name','reset visual adjustments':'reset visual settings','normal / default':'normal','apply visual adjustments':'brightness, contrast and saturation','custom values':'custom','grayscale':'grayscale mode','high distinction / monochrome':'grayscale mode'};
    if(aliases[key])translated=dictionary[aliases[key]];
    const count = key.match(/^(\d+) (settings|active)$/);
    const speed = text.trim().match(/^([\d.]+×\s*·\s*)(.+)$/);
    const options = key.match(/^(.*) options$/);
    const review = key.match(/^(\d+) items to review\.$/);
    const palette = key.match(/^(protanopia|deuteranopia|tritanopia) support$/);
    if (translated) { /* alias above */ }
    else if (count) translated = `${count[1]} ${dictionary[count[2]]}`;
    else if (speed) translated = speed[1] + translatePanelText(speed[2],code);
    else if (options && dictionary[options[1]]) translated = `${dictionary[options[1]]} — ${dictionary.options}`;
    else if(review)translated=dictionary['{count} items to review.']?.replace('{count}',review[1]);
    else if(palette)translated=`${text.trim().split(' ')[0]} — ${dictionary['color blindness support']}`;
    else if (key.startsWith('↺')) translated = `↺ ${dictionary['reset all settings']}`;
    else if (key === 'search accessibility settings…') translated = dictionary['search accessibility settings'] + '…';
    else if (key === 'close accessibility settings') translated = dictionary.close;
    else if (key === 'accessibility settings') translated = dictionary.settings;
    else if (key === 'export') translated = dictionary['export preferences'];
    else if (key === 'import') translated = dictionary['import preferences'];
    else if (key === 'reset') translated = dictionary['reset all settings'];
  }
  if (!translated) return text;
  return text.match(/^\s*/)[0] + translated + text.match(/\s*$/)[0];
}

export function flagImage(country) {
  const svg=countryFlags[country];
  if(!svg)throw new Error(`Unknown panel flag: ${country}`);
  return 'data:image/svg+xml,'+encodeURIComponent(svg);
}

export function installPanelLanguage(base, {onChange=()=>{}}={}) {
  const panel=base.root.querySelector('.panel'), doc=panel.ownerDocument, view=doc.defaultView;
  let language='en';
  try { const saved=view.localStorage.getItem(languageKey); if(PANEL_LANGUAGES.some(([code])=>code===saved))language=saved; } catch {}
  const originals=new WeakMap(), attributes=new WeakMap();
  const row=doc.createElement('div'); row.className='panel-language'; row.dataset.panelLanguage='';
  const label=doc.createElement('span');label.id='panel-language-label';label.textContent='Language';
  const button=doc.createElement('button');button.type='button';button.className='panel-language-toggle';
  button.setAttribute('aria-labelledby',label.id+' panel-language-value');button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','panel-language-list');
  const selected=doc.createElement('span');selected.id='panel-language-value';
  const list=doc.createElement('div');list.id='panel-language-list';list.className='panel-language-list';list.setAttribute('role','listbox');list.setAttribute('aria-labelledby',label.id);list.hidden=true;
  function image(country){const img=doc.createElement('img');img.src=flagImage(country);img.alt='';img.width=30;img.height=20;return img;}
  const selectedFlag=image('gb');button.append(selectedFlag,selected);row.append(label,button,list);
  const toolbar=panel.querySelector('.panel-toolbar');
  if(toolbar)toolbar.append(row);else panel.querySelector('.top').after(row);
  function close(){list.hidden=true;button.setAttribute('aria-expanded','false');}
  function source(node){const value=node.data, saved=originals.get(node);return saved&&value===saved.translated?saved.original:value;}
  function refresh(){
    observer.disconnect();
    panel.lang=language;
    const current=PANEL_LANGUAGES.find(([code])=>code===language);selected.textContent=current[1];selectedFlag.src=flagImage(current[2]);
    button.title=translatePanelText('Language',language)+': '+current[1];
    list.querySelectorAll('[role=option]').forEach(option=>option.setAttribute('aria-selected',String(option.dataset.language===language)));
    onChange();
    const walker=doc.createTreeWalker(panel,view.NodeFilter.SHOW_TEXT);
    let node;
    while((node=walker.nextNode())){
      if(node.parentElement?.closest('[data-panel-language],style,script,textarea,[data-panel-original-content],.consumer-results li strong'))continue;
      const original=source(node), translated=translatePanelText(original,language);
      // Options without explicit values must keep their original setting values.
      if(node.parentElement?.tagName==='OPTION'&&!node.parentElement.hasAttribute('value'))node.parentElement.value=node.parentElement.textContent;
      originals.set(node,{original,translated});if(node.data!==translated)node.data=translated;
    }
    for(const element of panel.querySelectorAll('[aria-label],[placeholder],[title]')){
      if(element.closest('[data-panel-language],[data-panel-original-content]'))continue;
      const saved=attributes.get(element)||{};
      for(const name of ['aria-label','placeholder','title']){
        if(!element.hasAttribute(name))continue;
        const value=element.getAttribute(name), record=saved[name];
        const original=record&&value===record.translated?record.original:value;
        const translated=translatePanelText(original,language);saved[name]={original,translated};
        if(value!==translated)element.setAttribute(name,translated);
      }
      attributes.set(element,saved);
    }
    label.textContent=translatePanelText('Language',language);
    observer.observe(panel,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','placeholder','title']});
  }
  function setLanguage(code){
    if(!PANEL_LANGUAGES.some(([id])=>id===code))return;
    language=code;try{view.localStorage.setItem(languageKey,code);}catch{}
    close();refresh();
  }
  for(const [code,name,country] of PANEL_LANGUAGES){
    const option=doc.createElement('button');option.type='button';option.setAttribute('role','option');option.dataset.language=code;option.lang=code;option.tabIndex=-1;
    option.append(image(country),doc.createTextNode(name));option.addEventListener('click',()=>{setLanguage(code);button.focus();});list.append(option);
  }
  function open(){list.hidden=false;button.setAttribute('aria-expanded','true');list.querySelector(`[data-language="${language}"]`).focus();}
  button.addEventListener('click',()=>list.hidden?open():close());
  button.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();open();}});
  row.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!list.hidden){event.preventDefault();event.stopPropagation();close();button.focus();return;}
    if(list.hidden)return;
    const options=[...list.children],index=options.indexOf(doc.activeElement?.shadowRoot?.activeElement||base.root.activeElement);
    let next=index;
    if(event.key==='ArrowDown')next=(index+1)%options.length;
    else if(event.key==='ArrowUp')next=(index+options.length-1)%options.length;
    else if(event.key==='Home')next=0;
    else if(event.key==='End')next=options.length-1;
    else return;
    event.preventDefault();event.stopPropagation();options[next].focus();
  });
  const outside=event=>{if(!event.composedPath().includes(row))close();};
  base.root.addEventListener('pointerdown',outside);
  // During native pointer focus changes activeElement can temporarily be body.
  // relatedTarget is the destination, so moving between options must not hide
  // the menu before the browser dispatches the option's click.
  row.addEventListener('focusout',event=>{if(event.relatedTarget&&!row.contains(event.relatedTarget))close();});
  const observer=new view.MutationObserver(refresh);
  const api={setLanguage,get language(){return language;},refresh,
    searchText(element){if(!element)return '';const walker=doc.createTreeWalker(element,view.NodeFilter.SHOW_TEXT);let node,text='';while((node=walker.nextNode())){const original=source(node);text+=' '+original+' '+translatePanelText(original,language);}return text;},
    destroy(){observer.disconnect();base.root.removeEventListener('pointerdown',outside);language='en';refresh();observer.disconnect();row.remove();delete base.panelLanguage;},
  };
  base.panelLanguage=api;refresh();return api;
}
