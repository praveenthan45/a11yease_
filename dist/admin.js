'use strict';
const $=id=>document.getElementById(id);
let accountUsername='Admin',accountEmail='',accountRole='admin';
let csrf='',data={sites:[],keys:[],orders:[],billing:{}},pendingPayment=null;
const titles={overview:['Overview','Dashboard','Connect your clients’ websites. Manage their keys. Make room for everyone.'],websites:['Websites','Websites','Register and manage the websites connected to your accessibility toolkit.'],keys:['API keys','API keys','Generate, install and manage domain-restricted website keys.'],billing:['Billing & payments','Billing & payments','Activate website access through a verified Razorpay payment.'],integration:['Installation','Installation','Bring pluga11y to a client website with a single embed code.']};
function notice(message,error=false){$('notice').textContent=message;$('notice').classList.toggle('error',error);$('notice').hidden=false;}
function view(name){if(!titles[name])name='overview';document.querySelectorAll('[data-page]').forEach(section=>section.hidden=section.dataset.page!==name);document.querySelectorAll('.nav-item').forEach(button=>{button.classList.toggle('active',button.dataset.view===name);if(button.dataset.view===name)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});document.body.dataset.adminView=name;$('current-view').textContent=titles[name][0];if(name==='overview')$('page-title').textContent=`Welcome back, ${accountUsername}!`;else $('page-title').innerHTML=titles[name][1];$('page-description').textContent=titles[name][2];history.replaceState(null,'','#'+name);}
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>view(button.dataset.view)));
$('new-website').addEventListener('click',()=>{view('websites');$('site-name').focus();});
async function api(route,input){const response=await fetch('/api/platform/'+route,{method:input?'POST':'GET',credentials:'same-origin',headers:input?{'Content-Type':'application/json','X-CSRF-Token':csrf}:{},body:input?JSON.stringify(input):undefined});if(response.status===401){location.replace('/login');throw Error('Sign in to continue.');}const result=await response.json();if(!response.ok)throw Error(result.error||'Request failed.');return result;}
const date=value=>value?new Date(value).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}):'—';
const money=value=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(value/100);
const website=id=>data.sites.find(site=>site.id===id);
function el(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
function badge(text,kind=''){return el('span',text,'chip '+kind);}
function empty(container,title,description){const block=el('div',undefined,'empty');block.append(el('span','◎'),el('strong',title),el('p',description));container.replaceChildren(block);}
function table(container,headings,rows){const wrap=el('div',undefined,'table-wrap'),table=el('table'),thead=el('thead'),tr=el('tr');headings.forEach(text=>tr.append(el('th',text)));thead.append(tr);const tbody=el('tbody');rows.forEach(cells=>{const row=el('tr');cells.forEach(content=>{const cell=el('td');cell.append(typeof content==='string'?document.createTextNode(content):content);row.append(cell);});tbody.append(row);});table.append(thead,tbody);wrap.append(table);container.replaceChildren(wrap);}
function action(text,fn,className='secondary'){const button=el('button',text,'button '+className);button.type='button';button.addEventListener('click',fn);return button;}
function nameCell(site){const node=el('div');node.append(el('strong',site?.name||'Website'),el('small',site?.origin||''));return node;}
function sitesTable(container,overview=false){
  if(!data.sites.length)return empty(container,'Your first connection starts here.','Add a client website, generate its key, then install the widget.');
  const rows=data.sites.slice(0,overview?4:undefined).map(site=>{
    const name=nameCell(site);
    if(overview){name.className='overview-site-name';const icon=el('span',undefined,'site-link-icon');icon.append(overviewIcon('link'));name.prepend(icon);}
    const cells=[name,badge(site.active?'Active':'Not activated',site.active?'good':''),date(site.paidUntil)];
    if(overview)cells.push(el('span',site.active?'Active':'Inactive','site-status '+(site.active?'is-active':'')));
    cells.push(action(site.active?'Generate key':'Activate',()=>{view(site.active?'keys':'billing');$(site.active?'key-site':'payment-site').value=site.id;}));
    return cells;
  });
  table(container,overview?['Website','Access','Paid until','Status','Actions']:['Website','Access','Paid until','Actions'],rows);
}
function overviewIcon(type){
  const shapes={link:['M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2','M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2'],key:['M15.5 3a5.5 5.5 0 0 0-5.1 7.6L3 18v3h3v-3h3v-3l3.4-3.4A5.5 5.5 0 1 0 15.5 3Z','M16 7h.01'],card:['M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z','M3 9h18M7 15h4'],spark:['m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z']};
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  for(const [key,value] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.9','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))svg.setAttribute(key,value);
  shapes[type].forEach(d=>{const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',d);svg.append(path);});return svg;
}
document.querySelectorAll('[data-page="overview"] .stats article').forEach((card,index)=>{const icon=el('span',undefined,'overview-stat-icon');icon.append(overviewIcon(['link','key','card','spark'][index]));card.prepend(icon);});

function render(){
  $('stat-sites').textContent=data.sites.length;$('stat-keys').textContent=data.keys.filter(key=>!key.revokedAt&&(key.mode==='test'||website(key.siteId)?.active)).length;$('stat-paid').textContent=data.sites.filter(site=>site.paidUntil>Date.now()).length;$('site-count').textContent=`${data.sites.length} websites`;
  sitesTable($('overview-sites'),true);sitesTable($('website-list'));
  for(const name of ['key-site','payment-site']){const select=$(name),previous=select.value;select.replaceChildren();if(!data.sites.length){const option=el('option','Register a website first');option.value='';select.append(option);}data.sites.forEach(site=>{const option=el('option',`${site.name} · ${site.origin}`);option.value=site.id;select.append(option);});if(data.sites.some(site=>site.id===previous))select.value=previous;}
  if(!data.keys.length)empty($('key-list'),'No website keys yet.','Register a website and generate a live key without payment, or a localhost test key.');
  else table($('key-list'),['Website','Key','Environment','Status','Actions'],data.keys.map((key,index)=>({key,index,state:key.revokedAt?'Revoked':key.mode==='live'&&!website(key.siteId)?.active?'Inactive':'Active'})).sort((a,b)=>({Active:0,Inactive:1,Revoked:2}[a.state]-{Active:0,Inactive:1,Revoked:2}[b.state])||Number(b.key.createdAt||0)-Number(a.key.createdAt||0)||a.index-b.index).map(({key,state})=>{const keyCell=el('div');keyCell.append(el('code',key.prefix),el('small',`Created ${new Date(key.createdAt).toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}`));return [nameCell(website(key.siteId)),keyCell,badge(key.mode),badge(state,state==='Active'?'good':''),key.revokedAt?el('span','—'):action('Revoke',event=>revoke(key,event.currentTarget),'secondary revoke')];}));
  const bill=data.billing;$('plan-price').textContent=bill.amount?money(bill.amount):'Price not set';$('plan-duration').textContent=`per website · ${bill.days||30} days · one-time payment`;$('price-amount').value=bill.amount?bill.amount/100:'';$('price-days').value=bill.days||30;
  $('billing-status').textContent=bill.configured?(bill.mode==='live'?'Live connected':'Test mode'):'Setup required';$('billing-status').className='chip '+(bill.configured?'good':'');
  $('pay-button').disabled=!bill.configured||!data.sites.length;$('pay-button').textContent=bill.mode==='live'?'Pay with Razorpay ↗':'Open Razorpay test checkout ↗';
  $('checkout-hint').textContent=!bill.configured?'Checkout is not configured yet. The platform administrator must connect Razorpay before live payments can be accepted.':bill.mode==='test'?'Test mode: no real money collected. A test payment does not unlock live keys.':!bill.webhookConfigured?'Live checkout configured. Configure the webhook to handle captured payments and refunds reliably.':'Live checkout configured. Payment is verified on the server before access is activated.';
  $('webhook-url').textContent=location.origin+'/api/razorpay/webhook';
  if(!data.orders.length)empty($('payment-list'),'No payments yet.','Verified payment details will appear here after checkout.');else table($('payment-list'),['#','Website','Amount','Duration','Payment ID','Status','Date','Actions'],[...data.orders].reverse().map((order,index)=>[String(index+1),nameCell(website(order.siteId)),money(order.amount),`${order.days} days`,el('code',order.paymentId||order.id),badge(order.status==='paid'?'Successful':order.status==='test-paid'?'Test verified':`${order.mode} · ${order.status}`,order.status==='paid'||order.status==='test-paid'?'good':''),new Date(order.paidAt||order.createdAt).toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}),action('View',()=>showPaymentDetails(order))]));
}
async function refresh(){data=await api('overview');render();updateTestWebsite();}
async function submitting(form,operation){const button=form.querySelector('[type=submit]');button.disabled=true;try{await operation();}catch(error){notice(error.message,true);}finally{button.disabled=false;}}
$('site-form').addEventListener('submit',event=>{event.preventDefault();submitting(event.currentTarget,async()=>{const result=await api('sites',{name:$('site-name').value,origin:$('site-origin').value});$('site-form').reset();await refresh();$('key-site').value=result.site.id;$('payment-site').value=result.site.id;notice('Website registered. Generate a live key without payment, or a localhost test key.');});});
function snippet(key){return `<script src="${location.origin}/embed.js" data-key="${key}" async></script>`;}
function updateSnippet(){const key=$('embed-key').value.trim();$('embed-code').value=snippet(key||'YOUR_WEBSITE_KEY');updateTestWebsite();}
function updateTestWebsite(){
  const key=$('embed-key').value.trim(),valid=/^ae_(live|test)_[a-f0-9]{64}$/.test(key);
  const matches=valid?data.keys.filter(item=>!item.revokedAt&&key.startsWith(item.prefix.replace('…',''))):[];
  const site=matches.length===1?website(matches[0].siteId):null,link=$('open-test-website');
  link.setAttribute('aria-disabled',String(!site));link.href=site?site.origin:'#';
  $('test-website-hint').textContent=site?site.origin:'Enter a saved website key to open its registered website.';
}
$('open-test-website').addEventListener('click',event=>{if(event.currentTarget.getAttribute('aria-disabled')==='true')event.preventDefault();});
$('copy-key').addEventListener('click',async()=>{const key=$('embed-key').value.trim();if(!/^ae_(live|test)_[a-f0-9]{64}$/.test(key))return notice('Paste a valid website key first.',true);notice(await copy(key)?'Website key copied.':'Clipboard unavailable. Select and copy the key manually.');});
$('embed-key').addEventListener('input',updateSnippet);
async function copy(value){try{await navigator.clipboard.writeText(value);return true;}catch{return false;}}
$('copy-embed').addEventListener('click',async()=>{if(!/^ae_(live|test)_[a-f0-9]{64}$/.test($('embed-key').value.trim()))return notice('Paste a valid website key first.',true);notice(await copy($('embed-code').value)?'Embed code copied.':'Clipboard unavailable. Select and copy the snippet manually.');});
$('key-form').addEventListener('submit',event=>{event.preventDefault();submitting(event.currentTarget,async()=>{const result=await api('keys',{siteId:$('key-site').value,mode:$('key-mode').value});$('generated-key').value=result.key.token;$('generated-snippet').value=snippet(result.key.token);$('embed-key').value=result.key.token;updateSnippet();$('key-copy-status').textContent='';await refresh();$('new-key-dialog').showModal();});});
$('close-key').addEventListener('click',()=>$('new-key-dialog').close());
$('new-key-dialog').addEventListener('close',()=>{$('generated-key').value='';$('generated-snippet').value='';});
$('copy-generated').addEventListener('click',async()=>{$('key-copy-status').textContent=await copy($('generated-snippet').value)?'Copied. Save the snippet in your website source.':'Select and copy the snippet manually.';});
let pendingRevoke=null,revokeInFlight=false,revokeOpener=null;
const revokeDialog=$('revoke-key-dialog');
function revoke(key,opener){
  if(revokeInFlight||revokeDialog.open)return;
  pendingRevoke=key;revokeOpener=opener||document.activeElement;
  $('revoke-key-website').textContent=website(key.siteId)?.name||'Website';
  $('revoke-key-prefix').textContent=key.prefix;
  $('revoke-key-error').textContent='';$('revoke-key-error').hidden=true;
  revokeDialog.showModal();
}
function revokeBusy(busy){
  revokeInFlight=busy;revokeDialog.setAttribute('aria-busy',String(busy));
  for(const id of ['revoke-key-yes','revoke-key-no','revoke-key-close'])$(id).disabled=busy;
  $('revoke-key-yes').textContent=busy?'Revoking…':'Yes, revoke';
}
for(const id of ['revoke-key-no','revoke-key-close'])$(id).addEventListener('click',()=>{if(!revokeInFlight)revokeDialog.close();});
revokeDialog.addEventListener('cancel',event=>{if(revokeInFlight)event.preventDefault();});
revokeDialog.addEventListener('close',()=>{
  pendingRevoke=null;$('revoke-key-error').hidden=true;
  if(revokeOpener?.isConnected)revokeOpener.focus({preventScroll:true});revokeOpener=null;
});
$('revoke-key-form').addEventListener('submit',async event=>{
  event.preventDefault();if(!pendingRevoke||revokeInFlight)return;
  const key=pendingRevoke;let revoked=false;revokeBusy(true);$('revoke-key-error').hidden=true;
  try{
    await api('keys/revoke',{id:key.id});revoked=true;revokeDialog.close();
    await refresh();notice('Key revoked. It will no longer load the widget on new page loads.');
  }catch(error){
    if(revoked)notice('Key revoked, but the list could not refresh. Reload the workspace to see the updated status.',true);
    else{$('revoke-key-error').textContent=error.message;$('revoke-key-error').hidden=false;}
  }finally{revokeBusy(false);}
});
$('price-form').addEventListener('submit',event=>{event.preventDefault();submitting(event.currentTarget,async()=>{await api('config',{amount:Math.round(Number($('price-amount').value)*100),days:Number($('price-days').value)});await refresh();notice('Website access pricing saved. Existing orders keep their original price.');});});
function showPaymentDetails(order){
  const details=$('payment-details');details.replaceChildren();
  const fields={'Website':website(order.siteId)?.origin||'Website','Order ID':order.id,'Payment ID':order.paymentId||'Pending','Amount':money(order.amount),'Access duration':order.days+' days','Environment':order.mode,'Status':order.status,'Created':new Date(order.createdAt).toLocaleString(),'Verified':order.paidAt?new Date(order.paidAt).toLocaleString():'Not verified'};
  for(const [name,value] of Object.entries(fields))details.append(el('dt',name),el('dd',value));
  $('payment-details-dialog').showModal();
}
$('close-payment-details').addEventListener('click',()=>$('payment-details-dialog').close());
let checkoutLoading;
function loadCheckout(){if(window.Razorpay)return Promise.resolve();if(!checkoutLoading)checkoutLoading=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://checkout.razorpay.com/v1/checkout.js';script.onload=resolve;script.onerror=()=>{checkoutLoading=null;script.remove();reject(Error('Razorpay checkout could not load. Check your connection and retry.'));};document.head.append(script);});return checkoutLoading;}
async function verifyPayment(){if(!pendingPayment)return;try{const result=await api('payments/verify',pendingPayment);pendingPayment=null;$('verify-pending').hidden=true;await refresh();notice(result.mode==='live'?'Payment verified. Website access is active; generate your live key in API keys.':'Test payment verified. Live access remains inactive until a live payment is captured.');}catch(error){$('verify-pending').hidden=false;notice(error.message,true);}}
$('retry-payment').addEventListener('click',verifyPayment);
$('pay-button').addEventListener('click',async()=>{const button=$('pay-button');button.disabled=true;try{await loadCheckout();const result=await api('orders',{siteId:$('payment-site').value});const checkout=new window.Razorpay({key:result.keyId,order_id:result.order.id,amount:result.order.amount,currency:'INR',name:'pluga11y',description:`Website access · ${result.order.days} days`,prefill:accountEmail?{email:accountEmail}:{},theme:{color:'#2563eb'},handler:async response=>{pendingPayment=response;await verifyPayment();},modal:{ondismiss:()=>notice('Checkout closed. No access is activated until a payment is captured and verified.')}});checkout.on('payment.failed',()=>notice('Payment failed. You can retry checkout.',true));checkout.open();await refresh();}catch(error){notice(error.message,true);}finally{button.disabled=!data.billing.configured||!data.sites.length;}});
$('logout').addEventListener('click',async()=>{try{const response=await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin',headers:{'X-CSRF-Token':csrf}});if(!response.ok)throw Error('Logout failed. Retry.');location.replace('/login');}catch(error){notice(error.message,true);}});
async function start(){try{const response=await fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store'});if(!response.ok){location.replace('/login');return;}const account=await response.json();csrf=account.csrf;accountRole=account.role||'admin';accountEmail=account.email||'';accountUsername=account.email||account.username;document.body.dataset.accountRole=accountRole;document.querySelectorAll('[data-admin-only]').forEach(node=>node.hidden=accountRole!=='admin');$('account-name').replaceChildren(document.createTextNode(accountUsername),el('small',accountRole==='admin'?'Platform administrator':'Client workspace'));await refresh();updateSnippet();view(location.hash.slice(1)||'overview');}catch(error){notice('Workspace could not load. '+error.message,true);}}
const resetReload=(()=>{
  try{
    const key='accessease.reset.reload.v1',saved=JSON.parse(sessionStorage.getItem(key)||'null');
    sessionStorage.removeItem(key);
    return saved?.href===location.href&&Number.isFinite(saved.expiresAt)&&saved.expiresAt>Date.now();
  }catch{return false;}
})();
if(performance.getEntriesByType?.('navigation')?.[0]?.type==='reload'&&!resetReload)location.replace('/');
else start();
