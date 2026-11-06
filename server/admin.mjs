import http from 'node:http';
import { randomBytes, scrypt as scryptCallback, createHash, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { platform, enforceAdminOnlyAccounts } from './platform.mjs';

const scrypt = promisify(scryptCallback);
const root = path.resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const credentialPath = process.env.ADMIN_CREDENTIAL_FILE || fileURLToPath(new URL('../.local/admin-auth.json', import.meta.url));
const credential = JSON.parse(await readFile(credentialPath, 'utf8'));
if (typeof credential.username !== 'string' || !/^[a-f0-9]{32}$/.test(credential.salt) || !/^[a-f0-9]{128}$/.test(credential.hash)) throw new Error('Invalid admin credential file.');
if(process.env.REMOVE_CLIENT_ACCOUNTS==='true')await enforceAdminOnlyAccounts();
const sessions = new Map(), attempts = new Map();
const cookieName = 'ae_admin_session';
const sessionTtlMs = Math.max(100, Number(process.env.SESSION_TTL_MS) || 8 * 60 * 60 * 1000);
const digest = token => createHash('sha256').update(token).digest('hex');
const publicFiles = new Set(['/login.html','/login.css','/site-palette.css','/login.js','/ui-theme.css','/brand.css','/pluga11y-icon.svg','/pluga11y-wordmark.svg','/pluga11y-logo.jpeg','/widget.js','/embed.js','/team-features.js','/accessibility-badge.png','/brand-logo-transparent.png','/OpenDyslexic-OFL.txt','/favicon.ico']);
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.mp4':'video/mp4','.vtt':'text/vtt; charset=utf-8','.woff2':'font/woff2','.ttf':'font/ttf'};
let verifications = 0;
function headers(res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  if (process.env.COOKIE_SECURE === 'true') res.setHeader('Strict-Transport-Security','max-age=31536000');
}
function json(res,status,value) {res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));}
function redirect(res,location) {res.writeHead(303,{Location:location});res.end();}
function cookie(value,clear=false) {return `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict${process.env.COOKIE_SECURE === 'true' ? '; Secure' : ''}${clear ? '; Max-Age=0' : ''}`;}
function session(req) {
  const token = req.headers.cookie?.split(';').map(value=>value.trim()).find(value=>value.startsWith(`${cookieName}=`))?.slice(cookieName.length+1);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const key=digest(token),data=sessions.get(key);
  if(data && (data.role!=='admin'||Date.now()-data.createdAt>=sessionTtlMs)){sessions.delete(key);return null;}
  return data ? {key,...data} : null;
}
function sameOrigin(req) {
  if (req.headers['sec-fetch-site']==='cross-site') return false;
  try {
    const source=new URL(req.headers.origin);
    if(process.env.PUBLIC_ORIGIN)return source.origin===new URL(process.env.PUBLIC_ORIGIN).origin;
    return source.host===req.headers.host && source.protocol===(process.env.COOKIE_SECURE==='true'?'https:':'http:');
  } catch {return false;}
}
async function body(req) {
  let data='',size=0;
  for await (const chunk of req) {size+=chunk.length;if(size>4096)throw new Error('Request too large');data+=chunk;}
  const parsed=JSON.parse(data);
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('Invalid request body');
  return parsed;
}
async function serve(req,res,pathname) {
  const file=path.resolve(root,`.${pathname}`);
  if (!file.startsWith(root+path.sep)) return json(res,404,{error:'Not found.'});
  let info;try {info=await stat(file);} catch {return json(res,404,{error:'Not found.'});}
  if(!info.isFile())return json(res,404,{error:'Not found.'});
  const type=mime[path.extname(file)]||'application/octet-stream';
  if(path.extname(file)==='.html'&&pathname!=='/login.html'&&pathname!=='/admin.html') {
    const html=(await readFile(file,'utf8')).replace('</head>','<link rel="stylesheet" href="/admin-session.css"><link rel="stylesheet" href="/ui-theme.css"><script src="/admin-session.js" defer></script></head>');
    res.writeHead(200,{'Content-Type':type});return res.end(req.method==='HEAD'?undefined:html);
  }
  let start=0,end=info.size-1,status=200;
  if(req.headers.range) {
    const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if(!match||(!match[1]&&!match[2])){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});return res.end();}
    if(!match[1])start=Math.max(0,info.size-Number(match[2]));
    else {start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]));}
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=info.size){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});return res.end();}
    status=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${info.size}`);
  }
  res.writeHead(status,{'Content-Type':type,'Content-Length':Math.max(0,end-start+1),'Accept-Ranges':'bytes'});
  if(req.method==='HEAD'||!info.size)return res.end();
  const stream=createReadStream(file,{start,end});stream.on('error',()=>res.destroy());stream.pipe(res);
}
const server=http.createServer(async(req,res)=>{
  headers(res);
  try {
    const url=new URL(req.url,'http://localhost'),pathname=decodeURIComponent(url.pathname),current=session(req);
    if(pathname.startsWith('/api/platform/')||pathname==='/api/widget/validate'||pathname==='/api/razorpay/webhook')return await platform(req,res,url,{current,sameOrigin,json,body});
    if(pathname==='/admin'||pathname==='/admin.html'){
      if(!current)return redirect(res,'/login');
      res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' https://checkout.razorpay.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.razorpay.com; font-src 'self'; connect-src 'self' https://*.razorpay.com; frame-src https://*.razorpay.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
      return await serve(req,res,'/admin.html');
    }
    if(pathname==='/health')return json(res,200,{ok:true});
    if(pathname==='/api/auth/session'&&req.method==='GET')return current?json(res,200,{username:current.username,role:current.role,email:current.email||null,csrf:current.csrf}):json(res,401,{error:'Sign in to continue.'});
    if(pathname==='/api/auth/login'&&req.method==='POST') {
      if(!sameOrigin(req)||!req.headers['content-type']?.startsWith('application/json'))return json(res,403,{error:'Request rejected.'});
      const key=req.socket.remoteAddress,now=Date.now();let counter=attempts.get(key);
      if(!counter||now-counter.since>=900000){counter={since:now,count:0};attempts.set(key,counter);}
      if(counter.count>=10||verifications>=8){res.setHeader('Retry-After','900');return json(res,429,{error:'Too many attempts. Try again in 15 minutes.'});}
      counter.count++;
      const input=await body(req),identifier=typeof input.identifier==='string'?input.identifier.trim():typeof input.username==='string'?input.username.trim():'';
      if(!identifier||identifier.length>100||typeof input.password!=='string'||input.password.length>256){input.password='';return json(res,400,{error:'Enter your administrator username and password.'});}
      const isAdmin=identifier===credential.username;
      const salt=isAdmin?credential.salt:'00000000000000000000000000000000',expected=isAdmin?credential.hash:'0'.repeat(128);
      verifications++;let actual;
      try{actual=await scrypt(input.password,Buffer.from(salt,'hex'),64,{N:32768,r:8,p:1,maxmem:64*1024*1024});}finally{verifications--;input.password='';}
      const validPassword=timingSafeEqual(actual,Buffer.from(expected,'hex'));
      const validAdmin=isAdmin&&timingSafeEqual(createHash('sha256').update(identifier).digest(),createHash('sha256').update(credential.username).digest());
      if(!validPassword||!validAdmin)return json(res,401,{error:'Username or password is incorrect.'});
      attempts.delete(key);if(current)sessions.delete(current.key);
      if(sessions.size>=1000)sessions.delete(sessions.keys().next().value);
      const token=randomBytes(32).toString('hex');sessions.set(digest(token),{createdAt:Date.now(),csrf:randomBytes(32).toString('hex'),role:'admin',username:credential.username});
      res.setHeader('Set-Cookie',cookie(token));return json(res,200,{ok:true});
    }
    if(pathname==='/api/auth/logout'&&req.method==='POST') {
      if(!sameOrigin(req)||!current||req.headers['x-csrf-token']!==current.csrf)return json(res,403,{error:'Request rejected.'});
      sessions.delete(current.key);res.setHeader('Set-Cookie',cookie('',true));return json(res,200,{ok:true});
    }
    if(pathname.startsWith('/api/'))return json(res,404,{error:'Not found.'});
    if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'Method not allowed.'});
    if(pathname==='/login'||pathname==='/login.html')return current?redirect(res,'/admin'):await serve(req,res,'/login.html');
    const publicAsset=publicFiles.has(pathname)||/^\/assets\/[a-zA-Z0-9_./-]+\.(woff2?|ttf)$/.test(pathname);
    if(!current&&!publicAsset)return redirect(res,'/login');
    if(publicAsset)res.setHeader('Access-Control-Allow-Origin','*');
    return await serve(req,res,pathname==='/'?'/index.html':pathname);
  } catch {if(!res.headersSent)json(res,400,{error:'Unable to process this request.'});else res.destroy();}
});
server.requestTimeout=15000;server.headersTimeout=10000;
setInterval(()=>{const now=Date.now();for(const [key,value]of attempts)if(now-value.since>900000)attempts.delete(key);for(const [key,value]of sessions)if(now-value.createdAt>=sessionTtlMs)sessions.delete(key);},60000).unref();
server.listen(Number(process.env.PORT||1434),process.env.BIND_HOST||'127.0.0.1',()=>console.log(`pluga11y admin server ready on port ${server.address().port}.`));
