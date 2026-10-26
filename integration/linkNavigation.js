const TARGETS='a[href],area[href],button,input[type="button"],input[type="submit"],input[type="reset"],input[type="image"],[role="link"],[role="button"],summary';
export function navigationName(el) {
  const doc=el.ownerDocument;
  const labelled=el.getAttribute('aria-labelledby')?.split(/\s+/).map(id=>doc.getElementById(id)?.textContent||'').join(' ');
  return (labelled?.trim()||el.getAttribute('aria-label')?.trim()||
    (el.matches('input')?el.getAttribute('alt')||el.value:'')||el.textContent?.trim()||
    [...el.querySelectorAll('img[alt]')].map(img=>img.alt).join(' ')||el.getAttribute('title')||el.getAttribute('alt')||'').replace(/\s+/g,' ').trim().slice(0,180);
}
export function isNavigationTarget(el,host) {
  if(!el?.isConnected||host.contains(el)||el===host||el.matches(':disabled,[aria-disabled="true"]')||el.closest('[hidden],[inert],[aria-hidden="true"],[data-uaw-ignore],[data-a11ytb-ui]'))return false;
  for(let node=el;node&&node!==el.ownerDocument.body;node=node.parentElement){
    const style=el.ownerDocument.defaultView.getComputedStyle(node);
    if(style.display==='none'||style.visibility==='hidden'||style.visibility==='collapse')return false;
    if(node.parentElement?.matches('details:not([open])')&&!node.matches('summary'))return false;
  }
  return el.getClientRects().length>0;
}
export function createLinkNavigation({host,doc=document,onChange=()=>{}}) {
  let nextId=0,timer=null,current=null,previousTabindex=null;
  const ids=new WeakMap(),targets=new Map(),view=doc.defaultView;
  function refresh(){
    targets.clear();const items=[];
    for(const element of doc.body.querySelectorAll(TARGETS)){
      if(!isNavigationTarget(element,host))continue;
      const name=navigationName(element);if(!name)continue;
      if(!ids.has(element))ids.set(element,`page-link-${++nextId}`);
      const id=ids.get(element);targets.set(id,element);items.push({id,name});
    }
    const totals=new Map(),counts=new Map();for(const {name} of items)totals.set(name,(totals.get(name)||0)+1);
    onChange(items.map(({id,name})=>{counts.set(name,(counts.get(name)||0)+1);return {id,name:totals.get(name)>1?`${name} (${counts.get(name)})`:name};}));
    return items;
  }
  function clearFocus(){
    if(!current)return;
    current.removeAttribute('data-ae-navigation-target');
    if(previousTabindex===null)current.removeAttribute('tabindex');else current.setAttribute('tabindex',previousTabindex);
    current.removeEventListener('blur',clearFocus);current=null;
  }
  function jump(id){
    const target=targets.get(id);if(!target||!isNavigationTarget(target,host)){refresh();return false;}
    clearFocus();current=target;previousTabindex=target.getAttribute('tabindex');
    if(target.tabIndex<0)target.setAttribute('tabindex','-1');
    target.setAttribute('data-ae-navigation-target','');target.addEventListener('blur',clearFocus,{once:true});
    target.scrollIntoView({block:'center',inline:'nearest',behavior:'auto'});target.focus({preventScroll:true});return true;
  }
  const observer=new view.MutationObserver(records=>{
    if(records.some(record=>record.target!==host&&!host.contains(record.target))){view.clearTimeout(timer);timer=view.setTimeout(refresh,80);}
  });
  observer.observe(doc.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['href','hidden','disabled','aria-disabled','aria-hidden','aria-label','aria-labelledby','title','class']});
  const style=doc.createElement('style');style.dataset.aeLinkNavigation='';style.textContent='[data-ae-navigation-target]{outline:3px solid #155EEF!important;outline-offset:5px!important}';doc.head.append(style);
  return {refresh,jump,destroy(){observer.disconnect();view.clearTimeout(timer);clearFocus();targets.clear();style.remove();}};
}
