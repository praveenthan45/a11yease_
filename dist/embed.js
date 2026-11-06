(() => {
  'use strict';
  const script=document.currentScript;
  const key=script?.dataset.key;
  if(!script?.src||!key||window.__accessEaseEmbedLoading||document.getElementById('accessease-widget'))return;
  const base=new URL('.',script.src);
  window.__accessEaseEmbedLoading=true;
  function load(){const widget=document.createElement('script');widget.src=new URL('widget.js',base).href;widget.async=true;widget.onerror=()=>{window.__accessEaseEmbedLoading=false;console.warn('pluga11y: widget could not load.');};document.head.append(widget);}
  fetch(new URL('api/widget/validate',base),{mode:'cors',credentials:'omit',headers:{'X-AccessEase-Key':key}}).then(async response=>{
    if(!response.ok)throw Error('Website key is invalid or revoked.');
    const result=await response.json();if(!result.ok)throw Error('Website validation failed.');
    if(document.body)load();else document.addEventListener('DOMContentLoaded',load,{once:true});
  }).catch(()=>{window.__accessEaseEmbedLoading=false;console.warn('pluga11y: check the registered website origin and website key.');});
})();
