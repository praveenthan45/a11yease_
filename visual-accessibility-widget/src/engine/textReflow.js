const EXCLUDE='svg,canvas,img,video,[role="img"],[data-uaw-preserve-layout],[data-uaw-preserve-layout] *,[data-uaw-chart],[data-chart],[class*="chart"],[class*="Chart"]';
function reflowHeaders(elements,override,compactNavigation,onlyNavigation) {
  const included=new Set(elements);
  for(const nav of elements.filter(el=>el.matches('nav,[role="navigation"]'))) {
    if(onlyNavigation && !onlyNavigation.has(nav))continue;
    const header=nav.closest('header,[role="banner"]');
    if(!header || !included.has(header) || header.matches(EXCLUDE) || nav.matches(EXCLUDE) || !nav.getClientRects().length) continue;
    const headerStyle=getComputedStyle(header), navStyle=getComputedStyle(nav);
    if(headerStyle.display==='none' || navStyle.display==='none') continue;
    // Floating navigation has no flow height. Enlarged text must reserve space
    // before the page content, rather than painting over it.
    if(['absolute','fixed'].includes(headerStyle.position)) override(header,'position','relative');
    if(['absolute','fixed'].includes(navStyle.position)) {
      override(nav,'position','relative');
      for(const edge of ['top','right','bottom','left']) override(nav,edge,'auto');
    }
    override(header,'height','auto');
    override(header,'max-height','none');
    override(nav,'height','auto');
    override(nav,'max-height','none');
    for(const el of [nav,...nav.querySelectorAll('*')]) {
      if(!included.has(el) || el.matches(EXCLUDE) || !el.getClientRects().length) continue;
      // Dropdowns, off-canvas menus and their descendants keep their original
      // positioning and visibility. Only the visible navigation flow reflows.
      let floating=false;
      for(let ancestor=el;ancestor && ancestor!==nav;ancestor=ancestor.parentElement) {
        if(['absolute','fixed'].includes(getComputedStyle(ancestor).position)) {floating=true;break;}
      }
      if(floating) continue;
      const style=getComputedStyle(el);
      if(style.display==='none') continue;
      if(['flex','inline-flex'].includes(style.display) && style.flexDirection==='row') override(el,'flex-wrap','wrap');
      if(compactNavigation && el.matches('a,button,[role="button"]') && parseFloat(style.minHeight)>44) {
        // A desktop menu's 80px minimum repeats on every wrapped line.
        // Keep usable controls without retaining that empty space per item.
        override(el,'min-height','44px');
      }
      if(el.textContent.trim() && !el.matches('img,svg,i') && !el.matches('[class*="icon"]')) {
        override(el,'height','auto');
        override(el,'max-height','none');
        override(el,'white-space','normal');
        override(el,'min-width','0');
        override(el,'max-width','100%');
      }
    }
  }
}
export function reflowText(elements,override,{compactNavigation=false,headersOnly=false,onlyNavigation}={}) {
  reflowHeaders(elements,override,compactNavigation,onlyNavigation);
  if(headersOnly)return;
  // Reflow ordinary rows while retaining scrolling/animated tracks and controls.
  const rows=elements.map(el=>({el,style:getComputedStyle(el)})).filter(({el,style})=>
    !el.matches(EXCLUDE) && style.display==='flex' && style.flexDirection==='row' &&
    style.flexWrap==='nowrap' && style.whiteSpace!=='nowrap' && style.animationName==='none' &&
    !['auto','scroll'].includes(style.overflowX) && !el.matches('button,a,[role="button"]') && el.children.length>1);
  for(const {el} of rows) {
    override(el,'flex-wrap','wrap');
    override(el,'height','auto');
    if(el.getBoundingClientRect().width<600) {
      for(const child of el.children) {
        if(child instanceof HTMLElement && (child.matches('a') || child.querySelector('a img')) && child.querySelector('img') && child.textContent.trim()) {
          override(child,'flex-basis','100%');
          override(child,'max-width','100%');
        }
      }
    }
    if(el.matches('nav') && el.parentElement) {
      for(const sibling of el.parentElement.children) {
        const style=getComputedStyle(sibling);
        if(sibling!==el && sibling instanceof HTMLElement && style.position==='absolute' && style.display!=='none' && !sibling.matches('[role="menu"],[role="dialog"]')) {
          override(sibling,'position','static');
          override(sibling,'transform','none');
        }
      }
    }
  }
  for(const el of elements) {
    if(el.matches(EXCLUDE)) continue;
    const style=getComputedStyle(el);
    if(style.display==='grid') {
      const columns=style.gridTemplateColumns.split(' ').map(parseFloat);
      const width=el.getBoundingClientRect().width;
      if(columns.length===3 && Math.min(...columns)<width*0.2 && Math.max(...columns)>width*0.6) override(el,'grid-template-columns','minmax(0,1fr)');
    }
    if (el.children.length && ['flex','inline-flex','grid','inline-grid'].includes(style.display)) {
      for(const child of el.children) {
        if(child instanceof HTMLElement && !child.matches(EXCLUDE) && !child.matches('img,svg,button') && getComputedStyle(child).position==='static') override(child,'min-width','0');
      }
    }
  }
  // Read geometry together before writing sizes, avoiding one layout per element.
  const expansion=[];
  for(const el of elements) {
    if(el.matches(EXCLUDE)) continue;
    const style=getComputedStyle(el);
    if(style.position==='absolute'||style.position==='fixed') continue;
    const rect=el.getBoundingClientRect();
    if(!rect.width||!rect.height) continue;
    if(style.overflowY==='visible' && el.scrollHeight>el.clientHeight+2 && el.children.length && !el.matches('html,body')) expansion.push([el,'auto']);
    for(const child of el.children) {
      if(!(child instanceof HTMLElement)||child.matches(EXCLUDE)) continue;
      const childStyle=getComputedStyle(child);
      if(childStyle.position!=='absolute'||!child.textContent.trim()||child.querySelector('img,video,canvas')) continue;
      const childRect=child.getBoundingClientRect();
      if(childRect.top<rect.top && childRect.height>rect.height) {
        expansion.push([el,childRect.height+Math.max(0,parseFloat(childStyle.bottom)||0)+24]);
      }
    }
  }
  for(const [el,height] of expansion) {
    if(height==='auto') override(el,'height','auto');
    else override(el,'min-height',`${height}px`);
  }
}
