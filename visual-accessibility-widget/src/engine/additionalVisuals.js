const HEADINGS='h1,h2,h3,h4,h5,h6,[role="heading"]';
const COGNITIVE_TARGETS='h1,h2,h3,h4,h5,h6,[role="heading"],button,input[type="button"],input[type="submit"],input[type="reset"],[role="button"],a[href],[role="link"]';
const SKIP='script,style,link,noscript,svg,canvas,img,video,iframe,object,embed,[data-uaw-ignore],[data-uaw-ignore] *,[data-uaw-icon],[data-uaw-icon] *';
const PAINT=['color','background-color','border-top-color','border-right-color','border-bottom-color','border-left-color','outline-color','text-decoration-color','box-shadow','text-shadow','background-image'];
const CONTROLS='button,input,select,textarea,[role="button"]';
function readableControlColor(color,background){
  const channels=value=>value.startsWith('#')?value.slice(1).match(/../g)?.map(channel=>parseInt(channel,16)):value.match(/[\d.]+/g)?.slice(0,3).map(Number);
  const luminance=value=>{const rgb=channels(value);if(!rgb||rgb.length!==3)return null;return rgb.map(channel=>{const c=channel/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;}).reduce((sum,c,index)=>sum+c*[.2126,.7152,.0722][index],0);};
  const foreground=luminance(color),bg=luminance(background);if(foreground===null||bg===null)return color;
  if((Math.max(foreground,bg)+.05)/(Math.min(foreground,bg)+.05)>=4.5)return color;
  return (bg+.05)/.05>=1.05/(bg+.05)?'#000000':'#FFFFFF';
}
function saturateColors(value,amount) {
  return value.replace(/rgba?\([^)]+\)/g,color=>{
    const rgb=color.match(/[\d.]+/g)?.map(Number);if(!rgb||rgb.length<3)return color;
    const gray=rgb[0]*.213+rgb[1]*.715+rgb[2]*.072;
    const out=rgb.slice(0,3).map(channel=>Math.round(Math.min(255,Math.max(0,gray+(channel-gray)*amount))));
    return rgb.length>3?`rgba(${out.join(', ')}, ${rgb[3]})`:`rgb(${out.join(', ')})`;
  });
}
function applySaturation(roots,override,amount) {
  for(const root of roots){
    const nodes=[root,...root.querySelectorAll('*')],styles=new Map(nodes.map(el=>[el,getComputedStyle(el)])),unsafe=new Set();
    for(const el of nodes){
      const style=styles.get(el);
      if(el.scrollHeight>el.clientHeight+2||el.scrollWidth>el.clientWidth+2)unsafe.add(el);
      if(el.matches('script,style,link,noscript,[data-uaw-ignore]')||['absolute','fixed','sticky'].includes(style.position)||(style.position==='relative'&&style.zIndex!=='auto')){
        for(let parent=el.parentElement;parent&&styles.has(parent);parent=parent.parentElement)unsafe.add(parent);
      }
    }
    function visit(el){
      if(el.matches('script,style,link,noscript,[data-uaw-ignore]'))return;
      const style=styles.get(el),rect=el.getBoundingClientRect();
      if(!unsafe.has(el)&&rect.width>0&&rect.height>0){
        override(el,'filter',`${style.filter&&style.filter!=='none'?style.filter+' ':''}saturate(${amount})`);return;
      }
      for(const property of PAINT){const before=style.getPropertyValue(property),after=saturateColors(before,amount);if(after!==before)override(el,property,after);}
      for(const child of el.children)visit(child);
    }
    visit(root);
  }
}
export function cursorValue(theme) {
  const fill=theme==='dark'?'#14253D':'#FFFFFF',stroke=theme==='dark'?'#FFFFFF':'#14253D';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><path d="M4 2v39l10-10 7 14 8-4-7-14h15Z" fill="${fill}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 4 2, auto`;
}
export function applyAdditionalVisuals({root,roots,elements,settings,override}) {
  if(!settings)return;
  const headingHighlight=settings.highlightTitles;
  if(!headingHighlight&&!settings.cognitiveDisability&&!settings.textColor&&!settings.backgroundColor&&!settings.titleColor&&settings.cursor==='default'&&settings.saturation==='normal')return;
  const candidates=[root,...elements].filter(el=>!el.matches(SKIP)&&!el.closest('[data-uaw-ignore]'));
  const styles=settings.backgroundColor||settings.textColor?new Map(candidates.map(el=>[el,getComputedStyle(el)])):null;
  const cursor=settings.cursor!=='default'?cursorValue(settings.cursor):'';
  for(const el of candidates){
    const heading=el.closest(HEADINGS);
    let textColor=settings.textColor;
    const control=el.closest(CONTROLS);
    if(control&&styles){
      let background=settings.backgroundColor;
      for(let parent=control;!background&&parent;parent=parent.parentElement){const paint=(styles.get(parent)||getComputedStyle(parent)).backgroundColor;if(paint&&paint!=='transparent'&&!/rgba\([^)]*,\s*0\s*\)/.test(paint))background=paint;}
      textColor=readableControlColor(textColor||styles.get(el).color,background||'#FFFFFF');
    }
    if(textColor&&!heading){override(el,'color',textColor);override(el,'-webkit-text-fill-color',textColor);}
    if(settings.titleColor&&heading){override(el,'color',settings.titleColor);override(el,'-webkit-text-fill-color',settings.titleColor);}
    if(settings.backgroundColor){
      const style=styles.get(el),paint=style.backgroundColor;
      if(el===root||(paint&&paint!=='transparent'&&!/rgba\([^)]*,\s*0\s*\)/.test(paint)))override(el,'background-color',settings.backgroundColor);
      if(/gradient\(/.test(style.backgroundImage)&&!style.backgroundImage.includes('url('))override(el,'background-image','none');
    }
    if(headingHighlight&&el.matches(HEADINGS)){
      override(el,'outline','2px solid currentColor');override(el,'outline-offset','4px');override(el,'border-radius','3px');
    }
    if(settings.cognitiveDisability&&el.matches(COGNITIVE_TARGETS)){
      override(el,'outline','2px solid #155EEF');override(el,'outline-offset','3px');override(el,'border-radius','3px');
    }
    if(cursor)override(el,'cursor',cursor);
  }
  // Keep filters off html/body and protected floating ancestors so fixed controls keep their position.
  if(settings.saturation!=='normal')applySaturation(roots,override,settings.saturation==='high'?1.7:.5);
}
