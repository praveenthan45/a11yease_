import { createContentEngine } from '../visual-accessibility-widget/src/engine/contentEngine.js';
import { DEFAULT_SETTINGS } from '../visual-accessibility-widget/src/engine/preferenceStore.js';
import { getColorMode } from '../visual-accessibility-widget/src/colorVision/colorModes.js';
import { cursorValue } from '../visual-accessibility-widget/src/engine/additionalVisuals.js';

const DEFAULT_PALETTE={background:'#F8FAFC',surface:'#FFFFFF',text:'#14253D',primary:'#155EEF',buttons:'#0B3970',border:'#CFE6FF'};
const THEMES={
  dark:{background:'#101827',surface:'#172235',text:'#E8EEF9',primary:'#9DB8FF',buttons:'#9DB8FF',border:'#93A4BD'},
  contrast:{background:'#000000',surface:'#000000',text:'#FFFFFF',primary:'#FFFF00',buttons:'#FFFF00',border:'#FFFFFF'},
};
function luminance(hex){
  return hex.slice(1).match(/../g).map(part=>parseInt(part,16)/255)
    .map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4)
    .reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);
}
function readable(color,background){
  const foreground=luminance(color),back=luminance(background);
  if((Math.max(foreground,back)+.05)/(Math.min(foreground,back)+.05)>=4.5)return color;
  return (back+.05)/.05>=1.05/(back+.05)?'#000000':'#FFFFFF';
}

// Adapt the widget through its own tokens. Painting every child like page
// content would hide switch thumbs, selected indicators and colour swatches.
export function createWidgetAppearance(base){
  const {root,host}=base,panel=root.querySelector('.panel');
  const typography=createContentEngine({root:panel,host,styleRoot:root});
  const style=panel.ownerDocument.createElement('style');style.dataset.widgetAppearance='';root.append(style);
  const original=new Map(),originalFilter=panel.style.getPropertyValue('filter'),originalFilterPriority=panel.style.getPropertyPriority('filter');
  let typographySignature='';
  function token(name,value){
    if(!original.has(name))original.set(name,{value:host.style.getPropertyValue(name),priority:host.style.getPropertyPriority(name)});
    if(host.style.getPropertyValue(name)!==value)host.style.setProperty(name,value);
  }
  function apply(settings,baseSettings={}){
    const extra=settings.additional||{};
    let palette={...DEFAULT_PALETTE};
    if(settings.colorVisionMode!=='default'){
      const colors=getColorMode(settings.colorVisionMode).colors;
      palette={background:colors.background,surface:colors.surface,text:colors.text,primary:colors.primary,buttons:colors.primary,border:colors.primary};
    }
    if(THEMES[settings.theme])palette={...THEMES[settings.theme]};
    else{
      if(extra.backgroundColor)palette.background=palette.surface=extra.backgroundColor;
      if(extra.textColor)palette.text=extra.textColor;
    }
    palette.text=readable(palette.text,palette.surface);
    palette.primary=readable(palette.primary,palette.surface);
    const heading=readable(THEMES[settings.theme]?palette.text:extra.titleColor||palette.text,palette.background);
    for(const [name,value] of Object.entries({
      '--ae-bg':palette.background,'--ae-surface':palette.surface,'--ae-text':palette.text,
      '--ae-primary':palette.primary,'--ae-buttons':palette.buttons,'--ae-container-border':palette.border,
      '--ae-heading':heading,'--ae-on-buttons':readable('#FFFFFF',palette.buttons),
      '--ae-on-primary':readable('#FFFFFF',palette.primary),
      '--ae-header-bg':'#FFFFFF','--ae-header-text':'#000000',
    }))token(name,value);
    const filters=[];
    if(originalFilter&&originalFilter!=='none')filters.push(originalFilter);
    if(settings.grayscale||settings.colorVisionMode==='monochrome')filters.push('grayscale(1)');
    if(extra.saturation==='high')filters.push('saturate(1.7)');
    if(extra.saturation==='low')filters.push('saturate(0.5)');
    if(filters.length)panel.style.setProperty('filter',filters.join(' '));
    else if(originalFilter)panel.style.setProperty('filter',originalFilter,originalFilterPriority);
    else panel.style.removeProperty('filter');
    let css=`.panel .top,.panel .top h2,.panel .top p,.panel .close{color:var(--ae-header-text)}
      .panel .reset,.panel .reset:hover,.panel .a11ytb-button--primary{color:var(--ae-on-buttons)}
      .panel .close{border-color:var(--ae-header-text)}
      .panel .category-heading,.panel .category-controls :is(.card-title,.team-card>summary){color:var(--ae-heading)}
      .panel .category-controls .card-enable[aria-checked=true] .card-switch-thumb{background:var(--ae-on-primary)}
      .panel .category-controls .card-enable .card-switch-thumb{background:var(--ae-buttons)}
      .panel .panel-language-list button[aria-selected=true]{color:var(--ae-on-primary)}
      .panel .category-controls>.tile[aria-pressed=true]:after,.panel .speech-header>.tile[aria-pressed=true]:after,.panel .voice-setting>.tile[aria-pressed=true]:after{background:radial-gradient(circle at 27px 11px,var(--ae-on-primary) 0 8px,transparent 9px),var(--ae-primary)}
      .panel .top button:focus-visible{outline-color:var(--ae-header-text)}
      .team-summary-card>header button,.team-step button,.overlay-close,.team-toast,.team-progress-label{color:var(--ae-on-buttons)}`;
    if(extra.cursor&&extra.cursor!=='default')css+=`.panel,.panel *{cursor:${cursorValue(extra.cursor)}!important}`;
    if(baseSettings.align&&baseSettings.align!=='original')css+=`.panel :is(.card-title,.category-label,.tile strong,p,label,legend,textarea){text-align:${baseSettings.align}!important}`;
    if(extra.highlightTitles)css+=`.panel :is(h2,h3,.card-title){outline:2px solid var(--ae-primary);outline-offset:2px}`;
    style.textContent=css;
    // Keep website text scaling and spacing out of the settings controls.
    // Font choice still applies independently of the panel's original sizes.
    const presentation={...DEFAULT_SETTINGS,dyslexiaFont:settings.dyslexiaFont};
    const signature=JSON.stringify(presentation);
    if(signature!==typographySignature){
      typographySignature=signature;
      const body=panel.querySelector('.body'),top=body.scrollTop;
      typography.apply(presentation);body.scrollTop=top;
    }
  }
  return {apply,destroy(){
    typography.destroy();style.remove();
    for(const [name,previous] of original){if(previous.value)host.style.setProperty(name,previous.value,previous.priority);else host.style.removeProperty(name);}
    if(originalFilter)panel.style.setProperty('filter',originalFilter,originalFilterPriority);else panel.style.removeProperty('filter');
  }};
}
