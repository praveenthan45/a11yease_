import { randomBytes, createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lockPlatformDirectory } from './instanceLock.mjs';

const directory=process.env.PLATFORM_DATA_DIR||fileURLToPath(new URL('../.local/platform/',import.meta.url));
await mkdir(directory,{recursive:true});
await lockPlatformDirectory(directory);
const filename=path.join(directory,'platform.json');
let db={accounts:[],sites:[],keys:[],orders:[],config:{amount:200000,days:30}};
try{db=JSON.parse(await readFile(filename,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
let saving=Promise.resolve();
function save(){saving=saving.catch(()=>{}).then(async()=>{await writeFile(filename+'.tmp',JSON.stringify(db),{mode:0o600});await rename(filename+'.tmp',filename);});return saving;}
const hash=value=>createHash('sha256').update(value).digest('hex');
const id=()=>randomBytes(12).toString('hex');
export async function enforceAdminOnlyAccounts(){
  let changed=!Array.isArray(db.accounts)||db.accounts.length>0;
  db.accounts=[];
  // Preserve installed website keys and payment records under the sole administrator.
  for(const records of [db.sites,db.orders])for(const record of records||[]){
    if(record.accountId!==null&&record.accountId!==undefined){record.accountId=null;changed=true;}
  }
  if(changed)await save();
}
const local=hostname=>['localhost','127.0.0.1','[::1]'].includes(hostname);
function origin(value){const url=new URL(value);if(url.username||url.password||url.pathname!=='/'||url.search||url.hash||!(url.protocol==='https:'||(url.protocol==='http:'&&local(url.hostname))))throw Error('Enter an HTTPS website origin, for example https://client.com. HTTP is allowed only for localhost.');return url.origin;}
function settings(){const key=process.env.RAZORPAY_KEY_ID||'';return {provider:'Razorpay',currency:'INR',amount:db.config.amount,days:db.config.days,configured:!!(key&&process.env.RAZORPAY_KEY_SECRET&&db.config.amount>0),mode:key.startsWith('rzp_live_')?'live':'test',webhookConfigured:!!process.env.RAZORPAY_WEBHOOK_SECRET};}
function publicSite(site){const {accountId,...safe}=site;return {...safe,active:true};}
function canAccessSite(site,current){return !!site&&current.role==='admin';}
function signature(value,secret,supplied){if(typeof supplied!=='string'||! /^[a-f0-9]{64}$/i.test(supplied))return false;return timingSafeEqual(createHmac('sha256',secret).update(value).digest(),Buffer.from(supplied,'hex'));}
async function razor(endpoint,data){const response=await fetch('https://api.razorpay.com/v1/'+endpoint,{method:data?'POST':'GET',signal:AbortSignal.timeout(15000),headers:{Authorization:'Basic '+Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64'),'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});const result=await response.json();if(!response.ok)throw Error('Razorpay request failed. Check your server credentials or retry.');return result;}
function activate(order,payment){if(order.status==='paid'||order.status==='refunded')return;const site=db.sites.find(site=>site.id===order.siteId);if(!site)return;order.status='paid';order.paymentId=payment.id;order.paidAt=Date.now();order.previousPaidUntil=site.paidUntil||0;site.paidUntil=Math.max(Date.now(),site.paidUntil||0)+order.days*86400000;}
async function rawBody(req){let result='',size=0;for await(const chunk of req){size+=chunk.length;if(size>65536)throw Error('Request too large.');result+=chunk;}return result;}

export async function platform(req,res,url,{current,sameOrigin,json,body}){
  const route=url.pathname;
  if(route==='/api/razorpay/webhook'&&req.method==='POST'){
    const secret=process.env.RAZORPAY_WEBHOOK_SECRET;if(!secret)return json(res,503,{error:'Webhook not configured.'});
    const raw=await rawBody(req);if(!signature(raw,secret,req.headers['x-razorpay-signature']))return json(res,403,{error:'Invalid signature.'});
    const event=JSON.parse(raw),payment=event.payload?.payment?.entity;
    const refund=event.payload?.refund?.entity;
    const order=db.orders.find(order=>(payment?.order_id&&order.id===payment.order_id)||(refund?.payment_id&&order.paymentId===refund.payment_id));
    if(order&&order.mode==='live'&&event.event==='payment.captured'&&payment.status==='captured'&&payment.amount===order.amount&&payment.currency==='INR')activate(order,payment);
    if(order&&refund?.status==='processed'&&event.event==='refund.processed'&&order.status==='paid'){
      order.status='refunded';const site=db.sites.find(site=>site.id===order.siteId);if(site)site.paidUntil=Math.max(0,(site.paidUntil||0)-order.days*86400000);
    }
    await save();return json(res,200,{ok:true});
  }
  if(route==='/api/widget/validate'&&req.method==='GET'){
    const requested=req.headers.origin;
    if(!requested||requested==='null')return json(res,403,{error:'Website origin is required.'});
    let canonical;try{canonical=origin(requested);}catch{return json(res,403,{error:'Website origin is invalid.'});}
    const token=req.headers['x-accessease-key'];if(typeof token!=='string'||token.length>150)return json(res,403,{error:'Website key is required.'});
    const key=db.keys.find(key=>key.hash===hash(token)&&!key.revokedAt),site=key&&db.sites.find(site=>site.id===key.siteId);
    if(!site||site.origin!==canonical||(key.mode==='test'&&!local(new URL(canonical).hostname)))return json(res,403,{error:'Key is inactive or this website origin is not allowed.'});
    res.setHeader('Access-Control-Allow-Origin',canonical);res.setHeader('Vary','Origin');
    // Writes only on first activation or once per hour, not for every visitor.
    if(!key.lastUsed||Date.now()-key.lastUsed>3600000){key.lastUsed=Date.now();await save();}
    return json(res,200,{ok:true,mode:key.mode,site:site.name});
  }
  if(route==='/api/widget/validate'&&req.method==='OPTIONS'){
    let canonical;try{canonical=origin(req.headers.origin);}catch{return json(res,403,{error:'Invalid origin.'});}
    if(!db.sites.some(site=>site.origin===canonical))return json(res,403,{error:'Website is not registered.'});
    res.setHeader('Access-Control-Allow-Origin',canonical);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','GET, OPTIONS');res.setHeader('Access-Control-Allow-Headers','X-AccessEase-Key');res.setHeader('Access-Control-Max-Age','600');res.writeHead(204);return res.end();
  }
  if(!route.startsWith('/api/platform/'))return false;
  if(!current)return json(res,401,{error:'Sign in to continue.'});
  if(current.role!=='admin')return json(res,403,{error:'Administrator access only.'});
  if(req.method!=='GET'&&(!sameOrigin(req)||req.headers['x-csrf-token']!==current.csrf||!req.headers['content-type']?.startsWith('application/json')))return json(res,403,{error:'Request rejected.'});
  try{
  if(route==='/api/platform/overview'&&req.method==='GET'){
      const sites=db.sites,siteIds=new Set(sites.map(site=>site.id));
      return json(res,200,{sites:sites.map(publicSite),keys:db.keys.filter(key=>siteIds.has(key.siteId)).map(({hash,...key})=>key),orders:db.orders.filter(order=>siteIds.has(order.siteId)).map(({accountId,...order})=>order),billing:settings()});
    }
    if(route==='/api/platform/config'&&req.method==='POST'){
      if(current.role!=='admin')return json(res,403,{error:'Only the platform administrator can change pricing.'});
      const input=await body(req);if(!Number.isSafeInteger(input.amount)||input.amount<100||input.amount>100000000||!Number.isInteger(input.days)||input.days<1||input.days>366)throw Error('Enter a price from ₹1 to ₹10,00,000 and duration from 1 to 366 days.');
      db.config={amount:input.amount,days:input.days};await save();return json(res,200,settings());
    }
    if(route==='/api/platform/sites'&&req.method==='POST'){
      const input=await body(req);if(typeof input.name!=='string'||!input.name.trim()||input.name.length>80||typeof input.origin!=='string')throw Error('Enter a website name and origin.');
      const siteOrigin=origin(input.origin);if(db.sites.some(site=>site.origin===siteOrigin))throw Error('This website origin is already registered.');if(db.sites.length>=1000)throw Error('Website limit reached.');
      const site={id:id(),name:input.name.trim(),origin:siteOrigin,createdAt:Date.now(),paidUntil:0,accountId:null};db.sites.push(site);await save();return json(res,201,{site:publicSite(site)});
    }
    if(route==='/api/platform/keys'&&req.method==='POST'){
      const input=await body(req),site=db.sites.find(site=>site.id===input.siteId);if(!canAccessSite(site,current))throw Error('Select a website in your workspace.');const mode=input.mode==='test'?'test':'live';
      if(mode==='test'&&!local(new URL(site.origin).hostname))throw Error('Test keys are available only for localhost origins.');
      if(db.keys.filter(key=>key.siteId===site.id&&!key.revokedAt).length>=5)throw Error('Revoke an unused key first. Maximum five active keys per website.');
      const token=`ae_${mode}_${randomBytes(32).toString('hex')}`,key={id:id(),siteId:site.id,mode,prefix:token.slice(0,17)+'…',hash:hash(token),createdAt:Date.now(),revokedAt:null};db.keys.push(key);await save();return json(res,201,{key:{id:key.id,token,mode}});
    }
    if(route==='/api/platform/keys/revoke'&&req.method==='POST'){
      const input=await body(req),key=db.keys.find(key=>key.id===input.id),site=key&&db.sites.find(site=>site.id===key.siteId);if(!key||!canAccessSite(site,current))throw Error('Key not found in your workspace.');key.revokedAt=Date.now();await save();return json(res,200,{ok:true});
    }
    if(route==='/api/platform/orders'&&req.method==='POST'){
      if(!settings().configured)return json(res,503,{error:'Set a price and configure Razorpay server credentials to enable checkout.'});
      const input=await body(req),site=db.sites.find(site=>site.id===input.siteId);if(!canAccessSite(site,current))throw Error('Select a website in your workspace.');
      const amount=db.config.amount,days=db.config.days,mode=settings().mode;
      const remote=await razor('orders',{amount,currency:'INR',receipt:id(),notes:{siteId:site.id}});
      const order={id:remote.id,siteId:site.id,accountId:null,amount,days,mode,status:'created',createdAt:Date.now()};db.orders.push(order);await save();return json(res,201,{order,keyId:process.env.RAZORPAY_KEY_ID});
    }
    if(route==='/api/platform/payments/verify'&&req.method==='POST'){
      const input=await body(req),order=db.orders.find(order=>order.id===input.razorpay_order_id),site=order&&db.sites.find(site=>site.id===order.siteId);if(!order||!canAccessSite(site,current))throw Error('Order not found in your workspace.');
      if(!signature(`${order.id}|${input.razorpay_payment_id}`,process.env.RAZORPAY_KEY_SECRET||'',input.razorpay_signature))return json(res,403,{error:'Payment signature could not be verified.'});
      const payment=await razor('payments/'+encodeURIComponent(input.razorpay_payment_id));
      if(payment.order_id!==order.id||payment.amount!==order.amount||payment.currency!=='INR'||payment.status!=='captured')return json(res,409,{error:'Payment is not captured yet. Retry verification after Razorpay captures it.'});
      if(order.mode==='live')activate(order,payment);else if(order.status!=='paid'){order.status='test-paid';order.paymentId=payment.id;order.paidAt=Date.now();}
      await save();return json(res,200,{ok:true,mode:order.mode});
    }
    return json(res,404,{error:'Not found.'});
  }catch(error){
    if(error.code){console.error('Platform storage operation failed:',error.code);return json(res,500,{error:'Unable to save changes. Please retry or contact the administrator.'});}
    return json(res,400,{error:error.message||'Request failed.'});
  }
}
