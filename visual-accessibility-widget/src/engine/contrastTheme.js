const IGNORE='script,style,link,noscript,img,picture,svg,canvas,video,audio,iframe,object,embed,[role="img"],[data-uaw-ignore],[data-uaw-icon]';
const BUTTON='button,input[type="button"],input[type="submit"],input[type="reset"],[role="button"],a.button';
const LINK='a[href],[role="link"]';
const PALETTES={
  dark:{background:'#101827',text:'#e8eef9',link:'#9db8ff',border:'#93a4bd'},
  contrast:{background:'#000000',text:'#ffffff',link:'#ffff00',border:'#ffffff'},
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
  for(const {el,image,clip,opacity,blend} of snapshots){
    const button=el.closest(BUTTON),link=!button&&el.closest(LINK);
    const foreground=link?palette.link:palette.text;
    // Inline importance beats host utility rules and existing inline !important
    // declarations. A paired surface also protects white labels on light cards.
    override(el,'color',foreground);
    override(el,'-webkit-text-fill-color',foreground);
    override(el,'background-color',palette.background);
    override(el,'border-color',palette.border);
    override(el,'text-shadow','none');
    override(el,'-webkit-text-stroke-width','0px');
    if(image&&image!=='none'){
      const directText=[...el.childNodes].some(node=>node.nodeType===3&&node.textContent.trim());
      // Keep photographs; add a dark backing where text is painted over them.
      const picture=image.includes('url(')&&clip!=='text';
      override(el,'background-image',picture?(directText?`linear-gradient(${palette.background}f2,${palette.background}f2),${image}`:image):'none');
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
