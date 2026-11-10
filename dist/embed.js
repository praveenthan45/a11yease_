(() => {
  'use strict';
  const script=document.currentScript;
  const key=script?.dataset.key;
  if(!script?.src||!key||window.__accessEaseEmbedLoading||document.getElementById('accessease-widget'))return;
  const base=new URL('.',script.src);
  window.__accessEaseEmbedLoading=true;
  // Download public assets during validation; execute the widget only after approval.
  const hints=[];
  for(const [file,as] of [['widget.js','script'],['accessibility-badge.png?v=20261106-compact','image']]){
    const hint=document.createElement('link');hint.rel='preload';hint.as=as;
    hint.href=new URL(file,base).href;hint.fetchPriority='low';document.head.append(hint);hints.push(hint);
  }
  const cleanup=()=>hints.forEach(hint=>hint.remove());
  function load(){
    const widget=document.createElement('script');widget.src=new URL('widget.js',base).href;widget.async=true;
    widget.onload=cleanup;
    widget.onerror=()=>{cleanup();window.__accessEaseEmbedLoading=false;console.warn('pluga11y: widget could not load.');};
    document.head.append(widget);
  }
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
  fetch(new URL('api/widget/validate',base),{mode:'cors',credentials:'omit',signal:controller.signal,headers:{'X-AccessEase-Key':key}}).then(async response=>{
    if(!response.ok)throw Error('Website key is invalid or revoked.');
    const result=await response.json();if(!result.ok)throw Error('Website validation failed.');
    if(document.body)load();else document.addEventListener('DOMContentLoaded',load,{once:true});
  }).catch(()=>{cleanup();window.__accessEaseEmbedLoading=false;console.warn('pluga11y: check the registered website origin and website key.');})
    .finally(()=>clearTimeout(timeout));
})();
