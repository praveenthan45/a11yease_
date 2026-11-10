import {readFile} from 'node:fs/promises';
import {gzip, brotliCompress, constants} from 'node:zlib';
import {promisify} from 'node:util';

const gzipAsync=promisify(gzip),brotliAsync=promisify(brotliCompress);
const cache=new Map();
function encoding(header=''){
  const supported=new Map();
  for(const part of header.split(',')){
    const [name,...parameters]=part.trim().toLowerCase().split(';');
    const quality=parameters.find(value=>value.trim().startsWith('q='));
    const q=quality===undefined?1:Number(quality.trim().slice(2));
    supported.set(name,Number.isFinite(q)&&q>=0&&q<=1?q:0);
  }
  return ['br','gzip'].map(name=>[name,supported.get(name)??supported.get('*')??0])
    .filter(([,q])=>q>0).sort((a,b)=>b[1]-a[1])[0]?.[0]||'';
}
function compressed(file,info,format){
  const key=file+':'+info.size+':'+info.mtimeMs+':'+format;
  if(!cache.has(key)){
    // Bound memory and share the first compression job between simultaneous visitors.
    if(cache.size>=24)cache.delete(cache.keys().next().value);
    const job=readFile(file).then(data=>format==='br'
      ?brotliAsync(data,{params:{[constants.BROTLI_PARAM_QUALITY]:4}})
      :gzipAsync(data));
    cache.set(key,job);
    job.catch(()=>{if(cache.get(key)===job)cache.delete(key);});
  }
  return cache.get(key);
}

// Private pages, authentication and key validation retain their no-store policy.
export async function servePublicAsset(req,res,{file,pathname,info,type}){
  if(req.headers.range)return false;
  const etag='W/"'+info.size.toString(16)+'-'+info.mtimeMs.toString(16)+'"';
  const fingerprinted=/^\/assets\/[^/]+-[a-zA-Z0-9_-]{8,}\.(woff2?|ttf)$/.test(pathname);
  res.setHeader('Cache-Control',fingerprinted?'public, max-age=31536000, immutable':'public, max-age=0, must-revalidate');
  res.setHeader('ETag',etag);
  res.setHeader('Last-Modified',info.mtime.toUTCString());
  const compressible=info.size>=1024&&info.size<=4*1024*1024&&/^(text\/|image\/svg\+xml)/.test(type);
  if(compressible)res.setHeader('Vary','Accept-Encoding');
  const candidates=(req.headers['if-none-match']||'').split(',').map(value=>value.trim().replace(/^W\//,''));
  if(candidates.includes('*')||candidates.includes(etag.replace(/^W\//,''))){res.writeHead(304);res.end();return true;}
  const format=compressible?encoding(req.headers['accept-encoding']):'';
  if(!format)return false;
  const data=await compressed(file,info,format);
  res.writeHead(200,{'Content-Type':type,'Content-Encoding':format,'Content-Length':data.length,'Accept-Ranges':'bytes'});
  res.end(req.method==='HEAD'?undefined:data);
  return true;
}
