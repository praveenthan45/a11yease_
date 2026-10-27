const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const sessionScript=fs.readFileSync(path.join(__dirname,'../dist/admin-session.js'),'utf8');
const adminScript=fs.readFileSync(path.join(__dirname,'../dist/admin.js'),'utf8');

const resetReloadKey='accessease.reset.reload.v1';

function runSession({type='navigate',pathname='/',hash='',search='',resetMarker}={}){
  const redirects=[],added=[],listeners={},scrolls=[],requests=[];
  const storage=new Map(resetMarker===undefined?[]:[[resetReloadKey,resetMarker]]);
  const header={append:element=>added.push(element)};
  const context={
    performance:{getEntriesByType:()=>[{type}]},
    location:{pathname,hash,search,href:`http://localhost:1434${pathname}${search}${hash}`,replace:url=>redirects.push(url)},
    sessionStorage:{getItem:key=>storage.get(key)||null,removeItem:key=>storage.delete(key)},
    history:{scrollRestoration:'auto'},
    window:{addEventListener:(name,handler)=>{(listeners[name]??=[]).push(handler);},scrollTo:(...args)=>scrolls.push(args)},
    document:{createElement:tag=>({tagName:tag.toUpperCase()}),querySelector:()=>header,addEventListener:()=>{},hidden:false},
    fetch:async url=>{requests.push(url);return {status:200,ok:true,json:async()=>({role:'admin'})};}
  };
  vm.runInNewContext(sessionScript,context);
  return {redirects,added,listeners,scrolls,requests,context,storage};
}

test('a widget reset reload keeps the same page, query and fragment without forcing a scroll to the top',()=>{
  for(const pathname of ['/learning-demo.html','/index.html','/']){
    const search='?course=2',hash='#reading';
    const resetMarker=JSON.stringify({href:`http://localhost:1434${pathname}${search}${hash}`,expiresAt:Date.now()+60000});
    const result=runSession({type:'reload',pathname,search,hash,resetMarker});
    assert.deepEqual(result.redirects,[]);
    assert.equal(result.added.length,1);
    assert.equal(result.context.history.scrollRestoration,'auto');
    result.listeners.pageshow.forEach(handler=>handler());
    assert.deepEqual(result.scrolls,[]);
    assert.equal(result.storage.has(resetReloadKey),false,'the reset exception is consumed once');
    assert.deepEqual(runSession({type:'reload',pathname,search,hash}).redirects,['/'],'a later normal reload keeps its existing behavior');
  }
});

test('a reset reload exception cannot redirect a different page or survive after it expires',()=>{
  for(const resetMarker of [
    JSON.stringify({href:'http://localhost:1434/other-page',expiresAt:Date.now()+60000}),
    JSON.stringify({href:'http://localhost:1434/learning-demo.html',expiresAt:Date.now()-1}),
    '{invalid',
  ]){
    const result=runSession({type:'reload',pathname:'/learning-demo.html',resetMarker});
    assert.deepEqual(result.redirects,['/']);
  }
});

test('refreshing another signed-in page returns to the landing page',()=>{
  for(const pathname of ['/learning-demo.html','/index.html']){
    const result=runSession({type:'reload',pathname});
    assert.deepEqual(result.redirects,['/']);
    assert.equal(result.added.length,0);
  }
  assert.deepEqual(runSession({type:'reload',hash:'#reading'}).redirects,['/']);
});

test('refreshing the landing page starts at the top and has no logout icon',async()=>{
  const result=runSession({type:'reload'});
  assert.deepEqual(result.redirects,[]);
  assert.equal(result.context.history.scrollRestoration,'manual');
  assert.equal(result.added.length,1);
  assert.equal(result.added[0].tagName,'A');
  result.listeners.pageshow.forEach(handler=>handler());
  assert.deepEqual(result.scrolls,[[0,0]]);
  await Promise.resolve();
  assert.equal(result.requests[0],'/api/auth/session');
});

test('workspace startup redirects only on reload',()=>{
  const guard=adminScript.slice(adminScript.lastIndexOf('const resetReload='));
  assert.ok(guard.startsWith('const resetReload='));
  for(const [type,resetMarker,expected] of [['reload',null,['/']],['navigate',null,[]],['reload',JSON.stringify({href:'http://localhost:1434/admin#keys',expiresAt:Date.now()+60000}),[]]]){
    const redirects=[],started=[];
    let saved=resetMarker;
    vm.runInNewContext(guard,{
      performance:{getEntriesByType:()=>[{type}]},
      location:{href:'http://localhost:1434/admin#keys',replace:url=>redirects.push(url)},
      sessionStorage:{getItem:()=>saved,removeItem:()=>{saved=null;}},
      start:()=>started.push(true)
    });
    assert.deepEqual(redirects,expected);
    assert.equal(started.length,expected.length?0:1);
    assert.equal(saved,null);
  }
});
