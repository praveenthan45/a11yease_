const reloaded=performance.getEntriesByType?.('navigation')?.[0]?.type==='reload';
const resetReload=(()=>{
  try{
    const key='accessease.reset.reload.v1',saved=JSON.parse(sessionStorage.getItem(key)||'null');
    sessionStorage.removeItem(key);
    return saved?.href===location.href&&Number.isFinite(saved.expiresAt)&&saved.expiresAt>Date.now();
  }catch{return false;}
})();
if(reloaded&&!resetReload&&(location.pathname!=='/'||location.search||location.hash)){
  location.replace('/');
}else{
  if(reloaded&&!resetReload){
    history.scrollRestoration='manual';
    window.addEventListener('pageshow',()=>window.scrollTo(0,0),{once:true});
  }
  const adminLink=document.createElement('a');
  adminLink.href='/admin';
  adminLink.textContent='Admin workspace';
  adminLink.className='admin-workspace-link';
  document.querySelector('header')?.append(adminLink);
  async function refreshSession(){
    try{
      const response=await fetch('/api/auth/session',{cache:'no-store',credentials:'same-origin'});
      if(response.status===401){location.replace('/login');return;}
      if(!response.ok)throw new Error('Session check unavailable.');
      const account=await response.json();
      adminLink.textContent=account.role==='admin'?'Admin workspace':'My workspace';
    }catch{/* Server requests still enforce authentication. */}
  }
  window.addEventListener('pageshow',refreshSession);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshSession();});
  refreshSession();
}
