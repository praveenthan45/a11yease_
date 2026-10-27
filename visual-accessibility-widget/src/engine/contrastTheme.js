const IGNORE='script,style,link,noscript,img,picture,svg,canvas,video,audio,iframe,object,embed,[role="img"],[data-uaw-ignore],[data-uaw-icon]';
const BUTTON='button,input[type="button"],input[type="submit"],input[type="reset"],[role="button"],a.button';
const LINK='a[href],[role="link"]';
const PALETTES={
  dark:{background:'#101827',text:'#e8eef9',link:'#9db8ff',border:'#93a4bd',photoOverlay:'rgba(16,24,39,.72)'},
  contrast:{background:'#000000',text:'#ffffff',link:'#ffff00',border:'#ffffff',photoOverlay:'rgba(0,0,0,.8)'},
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
    return {el,image:css.backgroundImage,clip:css.backgroundClip||css.getPropertyValue('-webkit-background-clip'),
      opacity:Number.parseFloat(css.opacity),blend:css.mixBlendMode};
  });
  // Track CSS photo backgrounds so text nested inside them keeps a readable
  // dark outline while the photograph itself remains visible through the tint.
  const photoBackgrounds=new Set(snapshots.filter(({image,clip})=>image.includes('url(')&&clip!=='text').map(({el})=>el));
  for(const snapshot of snapshots){
    let ancestor=snapshot.el;
    while(ancestor&&!photoBackgrounds.has(ancestor))ancestor=ancestor.parentElement;
    snapshot.photoBackground=ancestor;
  }
  for(const {el,image,clip,opacity,blend,photoBackground} of snapshots){
    const button=el.closest(BUTTON),link=!button&&el.closest(LINK);
    const foreground=link?palette.link:palette.text;
    // Inline importance beats host utility rules and existing inline !important
    // declarations. A paired surface also protects white labels on light cards.
    override(el,'color',foreground);
    override(el,'-webkit-text-fill-color',foreground);
    override(el,'background-color',palette.background);
    override(el,'border-color',palette.border);
    override(el,'text-shadow',photoBackground&&el.textContent.trim()?'0 1px 2px rgba(0,0,0,.96),0 0 8px rgba(0,0,0,.8)':'none');
    override(el,'-webkit-text-stroke-width','0px');
    if(image&&image!=='none'){
      const hasText=!!el.textContent.trim();
      // Keep photographs visible while tinting them enough to support readable
      // light text in dark and high-contrast themes.
      const picture=image.includes('url(')&&clip!=='text';
      override(el,'background-image',picture?(hasText?`linear-gradient(${palette.photoOverlay},${palette.photoOverlay}),${image}`:image):'none');
    }
    if(clip==='text'){
      override(el,'background-clip','border-box');
      override(el,'-webkit-background-clip','border-box');
    }
    if(opacity>0&&opacity<1&&el.textContent.trim())override(el,'opacity','1');
    if(blend&&blend!=='normal')override(el,'mix-blend-mode','normal');
    if(el.matches('html,body,input,select,textarea,button'))override(el,'color-scheme','dark');
    if(el.matches('input,select,textarea'))override(el,'accent-color',palette.link);
  }
}
