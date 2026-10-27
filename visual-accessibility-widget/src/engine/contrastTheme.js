const IGNORE='script,style,link,noscript,img,picture,svg,canvas,video,audio,iframe,object,embed,[role="img"],[data-uaw-ignore],[data-uaw-icon]';
const BUTTON='button,input[type="button"],input[type="submit"],input[type="reset"],[role="button"],a.button';
const LINK='a[href],[role="link"]';
const PALETTES={
  dark:{background:'#101827',text:'#e8eef9',link:'#9db8ff',border:'#93a4bd'},
  contrast:{background:'#000000',text:'#ffffff',link:'#ffff00',border:'#ffffff'},
};
const backgroundOpacity=value=>{
  if(!value||value==='transparent')return 0;
  const alpha=value.match(/[,/]\s*([\d.]+)\s*\)$/);
  return alpha?Number(alpha[1]):1;
};

export function contrastThemeCss(scope,text,theme) {
  const palette=PALETTES[theme];
  if(!palette)return '';
  const {background,link,border}=palette;
  return `${text}::before,${text}::after,${text}::marker{color:inherit!important;-webkit-text-fill-color:currentColor!important;text-shadow:none!important;}
    ${scope}:where(input,textarea)::placeholder{color:${border}!important;-webkit-text-fill-color:${border}!important;opacity:1!important;}
    ${scope}:where(:focus-visible){outline:3px solid ${link}!important;outline-offset:3px!important;}
    ${text}::selection{background-color:${link}!important;color:${background}!important;-webkit-text-fill-color:${background}!important;}`;
}

export function applyContrastTheme(elements,theme,override) {
  const palette=PALETTES[theme];
  if(!palette)return;
  // Read first: changing a parent must not erase a child's original appearance.
  const snapshots=elements.filter(el=>!el.closest(IGNORE)).map(el=>{
    const css=getComputedStyle(el);
    return {el,image:css.backgroundImage,backgroundOpacity:backgroundOpacity(css.backgroundColor),clip:css.backgroundClip||css.getPropertyValue('-webkit-background-clip'),
      opacity:Number.parseFloat(css.opacity),blend:css.mixBlendMode};
  });
  // Track authored image/gradient backgrounds so descendants remain transparent
  // over them and text receives an outline without painting over the artwork.
  const visualBackgrounds=new Set(snapshots.filter(({image,backgroundOpacity:alpha,clip})=>
    clip!=='text'&&(image!=='none'||alpha>0&&alpha<1)).map(({el})=>el));
  for(const snapshot of snapshots){
    let ancestor=snapshot.el;
    while(ancestor&&!visualBackgrounds.has(ancestor))ancestor=ancestor.parentElement;
    snapshot.visualBackground=ancestor;
  }
  for(const {el,image,backgroundOpacity:alpha,clip,opacity,blend,visualBackground} of snapshots){
    const button=el.closest(BUTTON),link=!button&&el.closest(LINK);
    const foreground=link?palette.link:palette.text;
    // Keep transparent wrappers transparent so CSS banners and layered photos
    // are not covered by an opaque theme surface. Recolor only authored surfaces.
    override(el,'color',foreground);
    override(el,'-webkit-text-fill-color',foreground);
    if(alpha>=.95||clip==='text')override(el,'background-color',palette.background);
    override(el,'border-color',palette.border);
    override(el,'text-shadow',visualBackground&&el.textContent.trim()?
      '-1px 0 #000,1px 0 #000,0 -1px #000,0 1px #000,0 2px 4px rgba(0,0,0,.9)':'none');
    override(el,'-webkit-text-stroke-width','0px');
    if(clip==='text'){
      // Replace gradient/image-filled glyphs with the accessible foreground.
      override(el,'background-image','none');
      override(el,'background-clip','border-box');
      override(el,'-webkit-background-clip','border-box');
    }
    if(opacity>0&&opacity<1&&el.textContent.trim())override(el,'opacity','1');
    if(blend&&blend!=='normal')override(el,'mix-blend-mode','normal');
    if(el.matches('html,body,input,select,textarea,button'))override(el,'color-scheme','dark');
    if(el.matches('input,select,textarea'))override(el,'accent-color',palette.link);
  }
}
