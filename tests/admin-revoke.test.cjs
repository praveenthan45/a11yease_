const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');

async function setup(){
  const console=new VirtualConsole(),errors=[];console.on('jsdomError',error=>errors.push(error.message));
  const dom=new JSDOM(fs.readFileSync(path.join(__dirname,'../dist/admin.html'),'utf8'),{url:'https://app.example/admin#keys',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:console});
  const w=dom.window,requests=[];
  const state={sites:[{id:'site-1',name:'Example client',origin:'https://client.example',active:true,paidUntil:0}],keys:[{id:'key-1',siteId:'site-1',mode:'live',prefix:'ae_live_first…',createdAt:2000,revokedAt:null},{id:'key-2',siteId:'site-1',mode:'live',prefix:'ae_live_second…',createdAt:1000,revokedAt:null}],orders:[],billing:{configured:false,days:30}};
  let fail=false,release;
  w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');this.querySelector('[autofocus]')?.focus();};
  w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};
  w.fetch=async(url,options={})=>{
    if(url==='/api/auth/session')return {ok:true,status:200,json:async()=>({username:'Demo admin',role:'admin',csrf:'test-csrf'})};
    if(url==='/api/platform/overview')return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(state))};
    if(url==='/api/platform/keys/revoke'){
      requests.push({body:JSON.parse(options.body),headers:options.headers});
      await new Promise(resolve=>release=resolve);
      if(fail)return {ok:false,status:503,json:async()=>({error:'Unable to revoke. Please retry.'})};
      state.keys.find(key=>key.id===requests.at(-1).body.id).revokedAt=Date.now();
      return {ok:true,status:200,json:async()=>({ok:true})};
    }
    throw Error('Unexpected request: '+url);
  };
  w.eval(fs.readFileSync(path.join(__dirname,'../dist/admin.js'),'utf8'));
  const settle=()=>new Promise(resolve=>setTimeout(resolve,15));
  for(let i=0;i<50&&!w.document.querySelector('button.revoke');i++)await settle();
  assert.equal(w.document.querySelectorAll('button.revoke').length,2);
  return {w,state,requests,errors,settle,setFail:value=>fail=value,release:()=>release(),dialog:w.document.getElementById('revoke-key-dialog')};
}

test('Revoke opens a labelled confirmation; No, close and Escape leave every key active',async()=>{
  const t=await setup();
  try{
    const button=t.w.document.querySelector('button.revoke');button.focus();button.click();
    assert.equal(t.dialog.open,true);assert.equal(t.requests.length,0);
    assert.equal(t.dialog.getAttribute('aria-labelledby'),'revoke-key-title');
    assert.equal(t.w.document.activeElement.id,'revoke-key-no');
    assert.equal(t.w.document.getElementById('revoke-key-prefix').textContent,'ae_live_first…');
    t.w.document.getElementById('revoke-key-no').click();assert.equal(t.dialog.open,false);
    assert.equal(t.w.document.activeElement,button);
    button.click();t.w.document.getElementById('revoke-key-close').click();assert.equal(t.dialog.open,false);
    button.click();const cancel=new t.w.Event('cancel',{cancelable:true});
    if(t.dialog.dispatchEvent(cancel))t.dialog.close();
    assert.equal(t.dialog.open,false);assert.equal(t.requests.length,0);
    assert.ok(t.state.keys.every(key=>key.revokedAt===null));assert.deepEqual(t.errors,[]);
  }finally{t.w.close();}
});

test('Yes revokes exactly the selected key once, with CSRF protection, and refreshes its status',async()=>{
  const t=await setup();
  try{
    t.w.document.querySelectorAll('button.revoke')[1].click();
    const form=t.w.document.getElementById('revoke-key-form');
    form.dispatchEvent(new t.w.Event('submit',{bubbles:true,cancelable:true}));
    form.dispatchEvent(new t.w.Event('submit',{bubbles:true,cancelable:true}));
    assert.equal(t.requests.length,1);assert.deepEqual(t.requests[0].body,{id:'key-2'});
    assert.equal(t.requests[0].headers['X-CSRF-Token'],'test-csrf');
    assert.equal(t.w.document.getElementById('revoke-key-yes').disabled,true);
    assert.equal(t.dialog.dispatchEvent(new t.w.Event('cancel',{cancelable:true})),false,'Escape cannot dismiss an in-flight revocation');
    t.release();await t.settle();
    assert.equal(t.dialog.open,false);assert.equal(t.state.keys[0].revokedAt,null);
    assert.ok(t.state.keys[1].revokedAt);assert.equal(t.w.document.querySelectorAll('button.revoke').length,1);
    assert.match(t.w.document.getElementById('key-list').textContent,/Revoked/);
    assert.match(t.w.document.getElementById('notice').textContent,/Key revoked/);assert.deepEqual(t.errors,[]);
  }finally{t.w.close();}
});

test('a failed confirmation keeps the key active and allows a deliberate retry or cancellation',async()=>{
  const t=await setup();
  try{
    t.setFail(true);t.w.document.querySelector('button.revoke').click();
    const form=t.w.document.getElementById('revoke-key-form');
    form.dispatchEvent(new t.w.Event('submit',{bubbles:true,cancelable:true}));t.release();await t.settle();
    assert.equal(t.dialog.open,true);assert.ok(t.state.keys.every(key=>key.revokedAt===null));
    assert.equal(t.w.document.getElementById('revoke-key-error').hidden,false);
    assert.match(t.w.document.getElementById('revoke-key-error').textContent,/Please retry/);
    assert.equal(t.w.document.getElementById('revoke-key-yes').disabled,false);
    t.setFail(false);form.dispatchEvent(new t.w.Event('submit',{bubbles:true,cancelable:true}));t.release();await t.settle();
    assert.equal(t.requests.length,2);assert.equal(t.dialog.open,false);assert.ok(t.state.keys[0].revokedAt);
    assert.deepEqual(t.errors,[]);
  }finally{t.w.close();}
});
