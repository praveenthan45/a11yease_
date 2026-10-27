// All overrides have a property-level journal. Removing the widget restores host values.
import { colorModeVariables, colorSupportCss } from '../colorVision/colorModes.js';
import { dyslexiaFontCss } from './dyslexiaFont.js';
import { applyDyslexiaText } from './dyslexiaText.js';
import { applyLightTheme } from './lightTheme.js';
import { applyContrastTheme, contrastThemeCss } from './contrastTheme.js';
import { reflowText } from './textReflow.js';
import { applyColorVision } from './colorVision.js';
import { applyGrayscale } from './grayscale.js';
import { applyAdditionalVisuals } from './additionalVisuals.js';
const TEXT_SKIP = 'script,style,noscript,svg,svg *,canvas,iframe,[data-uaw-ignore],[data-uaw-ignore] *,[data-uaw-icon],[data-uaw-icon] *,[aria-hidden="true"],[aria-hidden="true"] *';
const SCOPE = ':where([data-uaw-scope], [data-uaw-scope] *):not(:where([data-uaw-ignore],[data-uaw-ignore] *))';
const TEXT = `${SCOPE}:not(:where(svg, svg *, img, video, canvas, [data-uaw-icon], [data-uaw-icon] *, [data-uaw-ignore], [data-uaw-ignore] *))`;

export function createContentEngine({ root = document.body, host, nonce, styleRoot = document.head }) {
  const journal = new Map();
  const scopes = new Map();
  let current, timer, lastScrollAt=-Infinity, dyslexiaReady=!document.fonts, dyslexiaLoading=false;
  const stylesheet = document.createElement('style');
  if (nonce) stylesheet.nonce = nonce;
  stylesheet.dataset.uawStyle = '';
  styleRoot.append(stylesheet);

  function override(el, property, value) {
    let entries = journal.get(el);
    if (!entries) journal.set(el, entries = { hadStyle: el.hasAttribute('style'), properties: new Map() });
    if (!entries.properties.has(property)) entries.properties.set(property, { value: el.style.getPropertyValue(property), priority: el.style.getPropertyPriority(property) });
    el.style.setProperty(property, value, 'important');
  }
  function restore() {
    for (const [el, entries] of journal) {
      for (const [property, original] of entries.properties) {
        if (original.value) el.style.setProperty(property, original.value, original.priority);
        else el.style.removeProperty(property);
      }
      if (!entries.hadStyle && !el.getAttribute('style')) el.removeAttribute('style');
    }
    journal.clear();
  }
  function scopeContent() {
    for (const el of root === document.body ? root.children : [root]) {
      if (el === host || el.matches('script,style,link,[data-uaw-ignore]')) continue;
      if (!scopes.has(el)) scopes.set(el, el.getAttribute('data-uaw-scope'));
      el.setAttribute('data-uaw-scope', '');
    }
    // Release detached roots so navigation doesn't accumulate page references.
    for (const [el, previous] of scopes) if (!el.isConnected) {
      previous === null ? el.removeAttribute('data-uaw-scope') : el.setAttribute('data-uaw-scope', previous);
      scopes.delete(el);
    }
  }
  function apply(settings) {
    const preserveScroll = settings.dyslexiaFont || current?.dyslexiaFont;
    const scroller = document.scrollingElement || document.documentElement;
    const left = scroller.scrollLeft, top = scroller.scrollTop;
    applyContent(settings);
    if (preserveScroll) {
      // Baseline measurement can temporarily clamp the scroll position.
      root.getBoundingClientRect();
      if (scroller.scrollLeft !== left || scroller.scrollTop !== top) {
        // CSS scroll-behavior:smooth must not animate internal corrections.
        if (typeof scroller.scrollTo === 'function') scroller.scrollTo({left,top,behavior:'instant'});
        else {
          scroller.scrollLeft = left;
          scroller.scrollTop = top;
        }
      }
    }
  }
  function applyContent(settings) {
    const scrollGuard = settings.dyslexiaFont || current?.dyslexiaFont ? 'html{overflow-anchor:none!important;}' : '';
    current = settings;
    // Host transition:all must not animate baseline restoration. Otherwise a
    // mid-transition font size gets multiplied again on every content refresh.
    stylesheet.textContent = scrollGuard + `${SCOPE}{transition:none!important;}`;
    restore();
    scopeContent();
    const elements = [...scopes.keys()].flatMap(el => [el, ...el.querySelectorAll('*')])
      .filter(el => el instanceof HTMLElement && el !== host && !el.matches(TEXT_SKIP));
    // Measure every baseline before changing any inherited font size.
    if (settings.fontScale !== 1) {
      const sizes = elements.map(el => {
        const style=getComputedStyle(el);
        return {font:parseFloat(style.fontSize),line:parseFloat(style.lineHeight)};
      });
      elements.forEach((el, i) => {
        if (Number.isFinite(sizes[i].font)) override(el, 'font-size', `${sizes[i].font * settings.fontScale}px`);
        const customLine=settings.spacingPreset!=='default' && (settings.spacingPreset!=='custom' || settings.customSpacingOverrides?.includes('lineHeight'));
        if (!customLine && Number.isFinite(sizes[i].line)) override(el, 'line-height', `${sizes[i].line * settings.fontScale}px`);
      });
    }
    let css = settings.dyslexiaFont ? scrollGuard : '';
    if (settings.colorVisionMode !== 'default') {
      applyColorVision([...new Set([root, ...elements])], settings.colorVisionMode, override);
      for (const el of scopes.keys()) for (const [property, value] of Object.entries(colorModeVariables(settings.colorVisionMode))) override(el, property, value);
      css += colorSupportCss(SCOPE);
    }
    if (settings.fontScale !== 1) css += `${TEXT}{overflow-wrap:anywhere!important;}`;
    if (settings.theme === 'light') applyLightTheme([...new Set([root,...elements])], override);
    if (settings.theme === 'dark' || settings.theme === 'contrast') {
      css += contrastThemeCss(SCOPE,TEXT,settings.theme);
    }
    if (settings.spacingPreset !== 'default') {
      const enabled = key => settings.spacingPreset !== 'custom' || settings.customSpacingOverrides?.includes(key);
      const declarations = [['letterSpacing','letter-spacing','em'], ['wordSpacing','word-spacing','em'], ['lineHeight','line-height','']]
        .filter(([key]) => enabled(key)).map(([key, property, unit]) => `${property}:${settings[key]}${unit}!important;`).join('');
      if (declarations) css += `${TEXT}{${declarations}overflow-wrap:anywhere!important;}`;
      if (enabled('paragraphSpacing')) css += `${SCOPE}:where(p){margin-block-end:${settings.paragraphSpacing}em!important;}`;
    }
    if (settings.dyslexiaFont) {
      css += dyslexiaFontCss;
    }
    if (settings.highlightLinks) {
      const controls = `${SCOPE}:where(a[href],area[href],button,input[type="button"],input[type="submit"],input[type="reset"],input[type="image"],[role="button"],[role="link"],summary)`;
      const color = ['dark','contrast'].includes(settings.theme) ? '#facc15' : '#2563eb';
      const halo = ['dark','contrast'].includes(settings.theme) ? '#101827' : '#ffffff';
      css += `${controls}{outline:2px solid ${color}!important;outline-offset:3px!important;box-shadow:0 0 0 3px ${halo}!important;border-radius:3px!important;}
      ${SCOPE}:where(a[href],[role="link"]){text-decoration:underline!important;text-decoration-thickness:2px!important;text-underline-offset:4px!important;}
      ${controls}:focus-visible{outline:3px dashed ${color}!important;outline-offset:5px!important;}`;
    }
    if(settings.additional)applyAdditionalVisuals({root,roots:[...scopes.keys()],elements,settings:settings.additional,override});
    if(settings.theme==='dark'||settings.theme==='contrast'){
      // Readability takes priority over custom paint colors while a theme is on.
      const canvas=root===document.body?[document.documentElement,root]:[root];
      applyContrastTheme([...new Set([...canvas,...elements])],settings.theme,override);
    }
    if (settings.grayscale) applyGrayscale([...scopes.keys()],override);
    // Commit scaled inline values while transitions are disabled, then return
    // the host's hover/focus transitions unchanged.
    root.getBoundingClientRect();
    stylesheet.textContent = css+(settings.dyslexiaFont&&dyslexiaReady?`${SCOPE}{transition:none!important;}`:'');
    if(settings.fontScale>1 || settings.spacingPreset!=='default')reflowText(elements,override);
    if(settings.dyslexiaFont){
      if(dyslexiaReady){
        const overflowingNavigation=applyDyslexiaText(elements,override);
        if(overflowingNavigation.length)reflowText(elements,override,{compactNavigation:true,headersOnly:true,onlyNavigation:new Set(overflowingNavigation)});
        root.getBoundingClientRect();stylesheet.textContent=css;
      }
      else if(!dyslexiaLoading&&document.fonts){
        dyslexiaLoading=true;
        Promise.all([400,700].flatMap(weight=>['normal','italic'].map(style=>document.fonts.load(`${style} ${weight} 16px "UAW OpenDyslexic"`))))
          .then(()=>{dyslexiaReady=true;dyslexiaLoading=false;refresh();},()=>{dyslexiaLoading=false;});
      }
    }
  }
  function runRefresh() {
    timer=undefined;
    if (!current) return;
    // Lazy-loaded content can arrive on every scroll. Wait for the user to
    // pause before restoring baseline styles and fitting the font again.
    const remaining=current.dyslexiaFont?160-(Date.now()-lastScrollAt):0;
    if (remaining>0) { timer=setTimeout(runRefresh,remaining); return; }
    apply(current);
  }
  function refresh() { clearTimeout(timer); timer = setTimeout(runRefresh, 80); }
  function scrolled() { if (current?.dyslexiaFont) lastScrollAt=Date.now(); }
  const hasDyslexiaFont = el => el?.style?.fontFamily.includes('UAW OpenDyslexic');
  const observer = new MutationObserver(records => {
    if (records.some(record => !host?.contains(record.target) && (
      (current?.dyslexiaFont && record.type==='attributes') ||
      (current?.dyslexiaFont && record.type==='characterData' && !hasDyslexiaFont(record.target.parentElement)) || [...record.addedNodes, ...record.removedNodes].some(node =>
        node !== host && (node.nodeType===1 || (current?.dyslexiaFont && node.nodeType===3 && !hasDyslexiaFont(record.target))))
    ))) refresh();
  });
  // Sticky/reveal classes and mobile browser chrome change while scrolling;
  // neither should repeatedly restore and refit the entire document.
  observer.observe(root, { childList: true, characterData: true, subtree: true, attributes:true,attributeFilter:['hidden','open'] });
  let viewportWidth = window.innerWidth;
  function resize() {
    const changed = viewportWidth !== window.innerWidth;
    viewportWidth = window.innerWidth;
    if (!current?.dyslexiaFont || changed) refresh();
  }
  window.addEventListener('resize', resize);
  window.addEventListener('scroll', scrolled, {passive:true});
  return {
    apply, refresh,
    destroy() {
      current=null;
      clearTimeout(timer); observer.disconnect(); window.removeEventListener('resize', resize); window.removeEventListener('scroll', scrolled); restore(); stylesheet.remove();
      for (const [el, previous] of scopes) previous === null ? el.removeAttribute('data-uaw-scope') : el.setAttribute('data-uaw-scope', previous);
      scopes.clear();
    },
  };
}
