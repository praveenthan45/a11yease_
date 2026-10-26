import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { parseVtt } from './helpers.js';

const style=`:host{display:block;margin:15px 0;--surface:#FFFFFF;--text:#14253D;--muted:#14253D;--border:#0B3970;--accent:#155EEF;font:14px/1.6 Arial,sans-serif;color:var(--text)}*{box-sizing:border-box}details{border:1px solid var(--border);border-radius:10px;background:var(--surface);padding:15px}summary{cursor:pointer;font-weight:600}ol{list-style:none;padding:0;margin:10px 0;max-height:300px;overflow:auto}li{display:flex;gap:10px;align-items:baseline;margin:10px 0}button{font:inherit;cursor:pointer;color:var(--accent);background:#F8FAFC;border:1px solid var(--border);border-radius:5px;padding:5px 10px;min-height:44px;white-space:nowrap}button:focus-visible,summary:focus-visible{outline:3px solid var(--accent);outline-offset:3px}p{margin:10px 0;color:var(--muted)}`;
const timestamp=seconds=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
const seconds=value=>value.split(':').reduce((total,part)=>total*60+Number(part.replace(',','.')),0);
function vttEntries(text){
  return text.replace(/^\uFEFF/,'').split(/\r?\n\s*\r?\n/).filter(block=>block.includes('-->')).flatMap(block=>{
    const timing=block.split(/\r?\n/).find(line=>line.includes('-->'));
    const start=seconds(timing.trim().split(/\s+/)[0]);
    return parseVtt(block).map(text=>({text,start:Number.isFinite(start)?start:null}));
  });
}
function jump(media,start){
  try{media.currentTime=start;media.focus({preventScroll:true});media.scrollIntoView({block:'center',behavior:'auto'});}catch{/* A stream may not be seekable yet. */}
}
function Transcript({item}){
  return <><style>{style}</style><details open><summary>Transcript · {item.title}</summary>{item.message?<p role="status">{item.message}</p>:<ol>{item.entries.map((entry,index)=><li key={index}>{entry.start!==null&&<button type="button" aria-label={`Go to ${timestamp(entry.start)} in ${item.title}`} onClick={()=>jump(item.media,entry.start)}>{timestamp(entry.start)}</button>}<span>{entry.text}</span></li>)}</ol>}</details></>;
}

export default function AudioTranscripts({enabled}){
  const [items,setItems]=useState([]),[revision,setRevision]=useState(0);
  useEffect(()=>{
    if(!enabled){setItems([]);return;}
    const controller=new AbortController(),mounts=new Map();let generation=0,queued=false;
    function schedule(){if(queued||controller.signal.aborted)return;queued=true;queueMicrotask(()=>{queued=false;load();});}
    async function read(media,index){
      const title=media.getAttribute('aria-label')||media.closest('article,figure')?.querySelector('h2,h3,figcaption')?.textContent||`Media ${index+1}`;
      const item={media,title,entries:[],target:mounts.get(media).shadowRoot};
      const supplied=media.getAttribute('data-transcript');
      if(supplied?.trim())return {...item,entries:supplied.split(/\n+/).filter(Boolean).map(text=>({text,start:null}))};
      const tracks=[...media.querySelectorAll('track')].filter(track=>['captions','subtitles'].includes(track.kind));
      tracks.sort((a,b)=>Number(b.track?.mode==='showing')-Number(a.track?.mode==='showing')||Number(b.default)-Number(a.default));
      for(const track of tracks){
        const cues=track.track?.cues;
        if(cues?.length)return {...item,entries:[...cues].map(cue=>({text:parseVtt(`00:00.000 --> 00:01.000\n${cue.text}`)[0]||'',start:cue.startTime}))};
        if(!track.getAttribute('src'))continue;
        try{const response=await fetch(track.src,{signal:controller.signal});if(!response.ok)continue;const entries=vttEntries(await response.text());if(entries.length)return {...item,entries};}catch(error){if(error.name==='AbortError')return item;}
      }
      // Tracks created by a host player need not have a <track> element.
      for(const track of [...(media.textTracks||[])])if(['captions','subtitles'].includes(track.kind)&&track.cues?.length)return {...item,entries:[...track.cues].map(cue=>({text:parseVtt(`00:00.000 --> 00:01.000\n${cue.text}`)[0]||'',start:cue.startTime}))};
      return {...item,message:tracks.length?'Transcript could not load. Try Refresh transcripts.':'No transcript available for this video or audio.'};
    }
    async function load(){
      const run=++generation;
      const media=[...document.querySelectorAll('video,audio')].filter(node=>!node.closest('[data-a11ytb-injected]'));
      for(const [node,mount] of mounts)if(!media.includes(node)){mount.remove();mounts.delete(node);}
      for(const node of media){let mount=mounts.get(node);if(!mount){mount=document.createElement('div');mount.dataset.a11ytbInjected='';mount.dataset.aeTranscript='';mount.attachShadow({mode:'open'});mounts.set(node,mount);}if(node.nextSibling!==mount)node.after(mount);}
      const result=await Promise.all(media.map(read));
      if(!controller.signal.aborted&&run===generation)setItems(result);
    }
    const observer=new MutationObserver(records=>{if(records.some(record=>record.type==='attributes'?record.target.matches('video,audio,track'):[...record.addedNodes,...record.removedNodes].some(node=>node.nodeType===1&&(node.matches('video,audio,track')||node.querySelector('video,audio,track')))))schedule();});
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src','srclang','default','data-transcript']});
    const onLoad=event=>{if(event.target.matches?.('video,audio,track'))schedule();};
    document.addEventListener('loadedmetadata',onLoad,true);document.addEventListener('load',onLoad,true);
    load();
    return()=>{controller.abort();observer.disconnect();document.removeEventListener('loadedmetadata',onLoad,true);document.removeEventListener('load',onLoad,true);for(const mount of mounts.values())mount.remove();};
  },[enabled,revision]);
  return <>{enabled&&<><button type="button" onClick={()=>setRevision(value=>value+1)}>Refresh transcripts</button>{items.length===0?<p role="status">No media found, or transcripts are loading.</p>:items.map((item,index)=><div key={index} className="team-row"><span style={{flex:1}}>{item.title}{item.message?' · Unavailable':''}</span><button type="button" onClick={()=>{window.AccessEase?.close();item.target.host.scrollIntoView({block:'center',behavior:'auto'});item.target.querySelector('summary')?.focus({preventScroll:true});}}>View transcript</button></div>)}</>}{enabled&&items.map((item,index)=>createPortal(<Transcript item={item}/>,item.target,String(index)))}</>;
}


