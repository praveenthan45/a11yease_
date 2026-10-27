(() => {
  'use strict';
  if (document.getElementById('accessease-widget')) return;
  const key = 'accessease.preferences.v1';
  const voiceNavigationKey='accessease.voice.navigation.v1';
  const defaults = {speech:false,rate:1,align:'original',simple:false,highlight:false,keyboard:false,focus:false,skip:false,targets:false,voice:false,switches:false,sticky:false,captions:false};
  const readingRates = [.75,1,1.1,1.25,1.5];
  // Keep older saved/exported 2x preferences usable at the gentler maximum.
  function normalizeReadingRate(rate){return rate===2?1.5:readingRates.includes(rate)?rate:1;}
  let saved = {}; try { saved = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch {}
  const state = {...defaults};
  for (const name of Object.keys(defaults)) if (typeof saved[name] === typeof defaults[name]) state[name] = saved[name];
  state.rate = normalizeReadingRate(state.rate);
  if (!['original','left','center','right','justify'].includes(state.align)) state.align = 'original';
  let voiceRequested = saved.voiceRequested === true || saved.voice === true;
  state.voice = false;
  const host = document.createElement('div'); host.id = 'accessease-widget'; document.body.prepend(host);
  const root = host.attachShadow({mode:'open'});
  host.setAttribute('data-uaw-ignore','');
  host.setAttribute('data-a11ytb-host','');
  let teamExtension = null;
  const badgeURL = new URL('accessibility-badge.png?v=20261014-uploaded-logo', document.currentScript?.src || document.baseURI).href;
  const symbol = `<img class="badge" src="${badgeURL}" alt="" aria-hidden="true">`;
  root.innerHTML = `<style>
  :host{all:initial;font-family:Inter,Arial,sans-serif;color:#14253D;font-size:14px;line-height:1.5;--blue:#155EEF;--muted:#14253D;--border:#0B3970;--bg:#F8FAFC;--white:#FFFFFF;--navy:#0B3970}*{box-sizing:border-box}button,select{font:inherit}button{cursor:pointer}button:focus-visible,select:focus-visible{outline:3px solid var(--blue);outline-offset:3px}[hidden]{display:none!important}.launcher{position:fixed;right:25px;bottom:25px;width:65px;height:65px;border-radius:99px;border:0;background:var(--blue);color:var(--white);box-shadow:0 4px 12px rgba(11,57,112,.25);display:grid;place-items:center;z-index:2147483647;transition:transform .2s}.launcher:hover{transform:translateY(-3px);background:var(--navy)}svg{width:30px;height:30px}.panel{position:fixed;right:25px;bottom:105px;width:400px;max-width:calc(100vw - 30px);max-height:calc(100dvh - 130px);background:var(--white);border:1px solid var(--border);border-radius:20px;box-shadow:0 8px 20px rgba(0,0,0,.18);z-index:2147483647;display:flex;flex-direction:column;overflow:hidden;animation:appear .2s ease-out}.top{padding:20px 25px;background:var(--navy);color:var(--white);display:flex;align-items:center;gap:15px}.top .logo{width:40px;height:40px;background:var(--blue);border-radius:9px;display:grid;place-items:center}.top h2{font-size:20px;line-height:1.2;margin:0 0 5px}.top p{font-size:11px;margin:0;color:#FFFFFF}.close{margin-left:auto;background:transparent;border:1px solid #14253D;color:var(--white);width:30px;height:30px;border-radius:9px;font-size:20px}.intro{padding:15px 25px 0;display:flex;align-items:center;justify-content:space-between;font-size:11px;color:var(--muted)}.count{color:var(--blue);background:#F8FAFC;border-radius:99px;padding:5px 10px;font-weight:600}.body{overflow:auto;padding:0 20px 15px;overscroll-behavior:contain}.category{font-size:10px;letter-spacing:1.5px;color:var(--muted);margin:20px 5px 10px;font-weight:700}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.tile{border:1px solid var(--border);border-radius:9px;background:var(--white);padding:15px 10px;text-align:left;min-height:100px;position:relative;color:#14253D}.tile:hover{background:var(--bg)}.tile[aria-pressed=true]{border-color:var(--blue);background:#F8FAFC}.tile .icon{display:block;color:var(--blue);font-size:21px;line-height:1;margin-bottom:10px}.tile strong{display:block;font-size:12px;line-height:1.4;padding-right:10px;font-weight:600}.tile small{display:block;color:var(--muted);font-size:10px;margin-top:5px;line-height:1.4}.tile[aria-pressed=true]:after{content:'✓';position:absolute;top:10px;right:10px;color:var(--blue);font-weight:700}.select-row{border:1px solid var(--border);border-radius:9px;padding:10px 15px;margin-top:10px;display:flex;justify-content:space-between;align-items:center;gap:10px}.select-row label{font-size:12px;font-weight:600}.select-row small{display:block;font-size:10px;color:var(--muted);font-weight:400}.select-row select{max-width:140px;background:var(--bg);color:#14253D;border:1px solid var(--border);border-radius:5px;padding:5px;font-size:12px}.footer{border-top:1px solid var(--border);padding:15px 20px}.status{font-size:11px;color:var(--muted);margin:0 0 10px;line-height:1.5;min-height:17px}.reset{width:100%;border:1px solid var(--border);border-radius:9px;background:var(--bg);color:#14253D;padding:10px;font-size:12px;font-weight:600}.footnote{font-size:9px;color:var(--muted);text-align:center;margin:10px 0 0}.skip{position:fixed;left:15px;top:15px;transform:translateY(-150%);background:var(--blue);color:var(--white);border:0;padding:15px 20px;border-radius:9px;z-index:2147483647}.skip:focus{transform:none}@keyframes appear{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}@media(max-width:500px){.launcher{right:15px;bottom:15px;width:60px;height:60px}.panel{right:15px;bottom:90px;max-height:calc(100dvh - 110px)}}@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
  .badge{display:block;width:100%;height:100%;object-fit:contain;border-radius:50%}.launcher,.launcher:hover{background:transparent;padding:0}.top .logo{background:transparent}.panel{height:calc(100dvh - 130px)}.top,.intro,.footer{flex-shrink:0}.body{flex:1 1 auto;min-height:0}@media(max-width:500px){.panel{height:calc(100dvh - 110px)}}
  .panel{width:740px;height:auto;max-height:calc(100dvh - 130px);border-radius:20px}.top{padding:20px 25px;gap:15px}.top .logo{width:45px;height:45px;flex-shrink:0}.top h2{font-size:22px;margin-bottom:5px}.top p{font-size:12px}.close{width:40px;height:40px;flex-shrink:0;display:grid;place-items:center;font-size:24px}.intro{padding:20px 25px 15px;gap:15px;flex-wrap:wrap;font-size:14px;color:#14253D}.intro-title{font-weight:600}.intro-summary{display:flex;align-items:center;gap:10px}.total{font-size:12px;color:var(--muted)}.count{font-size:12px}.body{padding:0 25px 20px;scrollbar-width:thin}.grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.tile{display:grid;align-content:start;gap:5px;min-height:90px;padding:15px;border-radius:10px;transition:border-color .15s,background .15s}.tile:hover{border-color:var(--blue);background:var(--bg)}.tile .icon{margin:0;font-size:20px;line-height:1;display:flex;align-items:center;height:20px}.icon svg{width:20px;height:20px;flex-shrink:0}.tile strong{padding:0;font-size:13px;line-height:1.3}.tile small{font-size:11px;line-height:1.4;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tile[aria-pressed=true]:after{width:20px;height:20px;display:grid;place-items:center;border-radius:99px;background:var(--blue);color:var(--white);font-size:12px;top:10px;right:10px}.tile[data-setting=captions]{grid-column:1/-1;min-height:65px;grid-template-columns:30px 1fr;align-content:center;column-gap:10px}.tile[data-setting=captions] .icon{grid-row:1/3;align-self:center}.tile[data-setting=captions] strong,.tile[data-setting=captions] small{grid-column:2}.tile[data-setting=captions]:after{top:20px;right:15px}.select-row{display:block;min-height:90px;margin:0;padding:15px;border-radius:10px}.select-row label{font-size:13px;line-height:1.3}.select-row .icon{display:flex;height:20px;color:var(--blue);margin-bottom:5px}.select-row small{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}.select-row select{display:block;margin-top:10px;max-width:none;width:100%;min-height:35px;padding:5px 10px;border-radius:5px;font-size:12px}.select-row[data-active=true]{border-color:var(--blue);background:#F8FAFC}.footer{padding:15px 25px;background:var(--bg)}.footer-actions{display:flex;align-items:center;justify-content:space-between;gap:20px}.status{margin:0;font-size:12px;min-height:0;max-height:60px;overflow:auto;flex:1}.reset{width:auto;min-width:145px;min-height:40px;background:var(--white);white-space:nowrap;font-size:12px;padding:10px 15px}.reset:hover{border-color:var(--blue);color:var(--blue)}.footnote{text-align:left;font-size:10px;margin-top:10px}
  @media(min-width:801px) and (max-height:850px){.top{padding:15px 25px}.intro{padding-top:15px;padding-bottom:10px}.body{padding-bottom:15px}.tile,.select-row{padding:10px 15px;min-height:80px}.tile[data-setting=captions]{min-height:55px}.tile[data-setting=captions]:after{top:15px}.footer{padding:10px 25px}.select-row select{margin-top:5px}}
  @media(min-width:801px) and (max-height:700px){.tile small{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}.tile{min-height:65px}.tile[data-setting=captions]{min-height:50px}.tile[data-setting=captions] .icon{grid-row:1}.top .logo{width:35px;height:35px}.top p,.footnote{display:none}}
  @media(max-width:800px){.panel{width:540px}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.tile[data-setting=captions]{grid-column:1/-1}.top,.intro,.footer{padding-left:20px;padding-right:20px}.body{padding-left:20px;padding-right:20px}.footer-actions{align-items:flex-start;gap:10px}.status{font-size:11px}.reset{min-width:120px;font-size:11px}.tile strong{font-size:12px}}
  @media(max-width:500px){.panel{height:auto;max-height:calc(100dvh - 110px)}.top{padding:15px 20px}.top h2{font-size:20px}.top p{font-size:11px}.intro{padding-top:15px;padding-bottom:10px;font-size:13px}.tile,.select-row{padding:10px;min-height:90px}.tile small{font-size:10px}.intro-summary{gap:5px}.total{font-size:11px}.count{font-size:11px}.footer{padding:10px 20px}.footnote{font-size:9px}.select-row label{font-size:12px}}
  .panel .reset{background:var(--navy);border-color:var(--navy);color:#FFFFFF}.panel .reset:hover{background:var(--blue);border-color:var(--blue);color:#FFFFFF}
  .panel{inset:15px 15px 15px auto;width:min(420px,calc(100vw - 30px));max-width:min(420px,calc(100vw - 30px));height:calc(100dvh - 30px);max-height:calc(100dvh - 30px);resize:none;container-type:inline-size}.tile,.select-row{min-width:0}
  @media(max-width:540px){.panel{--ae-mobile-sheet-height:min(max(60dvh,calc(500px + env(safe-area-inset-bottom,0px))),calc(100dvh - 72px));inset:auto 0 0;margin:0;width:100%;max-width:100%;height:var(--ae-mobile-sheet-height);max-height:var(--ae-mobile-sheet-height);border-radius:18px 18px 0 0;box-shadow:0 -8px 32px #0B397026}}
  @media(max-width:540px),(max-height:540px){.panel .top{min-height:52px;padding:4px 12px;gap:8px}.panel .top .logo{width:32px;height:32px}.panel .top h2{font-size:20px;margin:0}.panel .top p,.panel .intro,.panel .footnote{display:none}.panel .close{width:44px;height:44px}.panel .footer{padding:6px 12px calc(6px + env(safe-area-inset-bottom,0px))}.panel .footer-actions{align-items:center;gap:10px}.panel .reset{min-height:44px}.panel .status{max-height:32px}}
  @container(max-width:540px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.top,.intro,.footer{padding-left:20px;padding-right:20px}.body{padding-left:20px;padding-right:20px}.tile,.select-row{padding:10px}.tile strong,.select-row label{font-size:12px}.footer-actions{gap:10px}.status{min-width:0;font-size:11px}.reset{min-width:120px;font-size:11px}}
  @container(max-width:400px){.top{gap:10px;padding-top:15px;padding-bottom:15px}.top .logo{width:35px;height:35px}.top h2{font-size:20px;margin:0}.top p{display:none}.intro{gap:5px;padding-top:10px;padding-bottom:10px;font-size:12px}.tile small{font-size:10px}.footer{padding-top:10px;padding-bottom:10px}.footnote{font-size:9px}}
  .panel .top{background:#FFFFFF;color:#000000}.panel .top h2,.panel .top p,.panel .close{color:#000000}.panel .close{border-color:#000000}.panel .close:hover{background:#F8FAFC}
  </style><button class="skip" hidden>Skip to main content</button><button class="launcher" aria-label="Open accessibility settings" aria-expanded="false" aria-controls="ae-panel"><img class="badge launcher-badge" src="${badgeURL}" alt="" aria-hidden="true"></button>
  <section class="panel" id="ae-panel" aria-label="Accessibility settings" hidden><div class="top"><div class="logo">${symbol}</div><div><h2><span class="ae-wordmark"><span class="ae-wordmark-start">A11y</span><span class="ae-wordmark-end">Ease</span></span></h2><p>Your page. Your pace. Your preferences.</p></div><button class="close" aria-label="Close accessibility settings">×</button></div><div class="intro" hidden><span class="intro-summary" hidden><span class="total">13 settings</span><span class="count">0 active</span></span></div><div class="body"><div class="grid">
  ${tile('speech','speech','Text to Speech','Drag to highlight the text you want to hear')}${tile('simple','simple','Simplified Text Mode','Use clearer wording across the page')}
  <div class="select-row"><label for="rate"><span class="icon" aria-hidden="true">${settingIcon('rate')}</span>Adjustable Reading Speed<small>Speed of the voice reader</small></label><select id="rate"><option value="0.75">0.75× · Slower</option><option value="1">1× · Normal</option><option value="1.1">1.1× · Slightly faster</option><option value="1.25">1.25×</option><option value="1.5">1.5× · Faster</option></select></div>
  <div class="select-row"><label for="align"><span class="icon" aria-hidden="true">${settingIcon('align')}</span>Text Alignment<small>Adjust all page text</small></label><select id="align"><option value="original">Original</option><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option><option value="justify">Justify</option></select></div>
  ${tile('highlight','highlight','Paragraph Highlighting','Highlight a paragraph on hover')}${tile('keyboard','keyboard','Keyboard Navigation','Move through text and controls')}
  ${tile('focus','focus','Visible Keyboard Focus','Make the focused control stand out')}${tile('skip','skip','Skip to Main Content','Add a skip link · Press Tab')}${tile('targets','targets','Large Click Targets','Give buttons and links more space')}
  ${tile('voice','voice','Voice Command','Speak commands · Microphone needed')}${tile('switches','switches','Switch Device Support','Space: next · Enter: select')}${tile('sticky','sticky','Sticky Keys Compatibility','Sequential Ctrl, Alt, A shortcut')}
  ${tile('captions','captions','Closed Captions','Show available video subtitle tracks')}
  </div></div><div class="footer"><div class="footer-actions"><p class="status" role="status" aria-live="polite">Your preferences are saved in this browser.</p><button class="reset">↺ &nbsp; Reset all settings</button></div><p class="powered-by" style="margin:10px 0 0;text-align:center;font-size:10px;line-height:1.5;color:var(--muted)">Powered by <a href="https://www.gentizeinnovations.com/" target="_blank" rel="noopener noreferrer" style="color:var(--blue);font-size:12px;font-weight:600;text-decoration:underline">Gentize</a></p></div></section>`;
  function settingIcon(name){
    const paths={speech:'<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>',simple:'<path d="m3 19 6-14 6 14M5 14h8M17 10h4M19 10v9"/>',rate:'<path d="M4 18a9 9 0 1 1 16 0M12 13l4-5"/><circle cx="12" cy="13" r="1"/>',align:'<path d="M3 5h18M3 10h12M3 15h18M3 20h12"/>',highlight:'<path d="m14 4 6 6-8 8H6v-6l8-8ZM3 21h18"/>',keyboard:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h1m3 0h1m3 0h1m3 0h1M6 13h1m3 0h1m3 0h1m3 0h1M7 16h10"/>',focus:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><circle cx="12" cy="12" r="3"/>',skip:'<path d="M5 3v12a3 3 0 0 0 3 3h11m-4-4 4 4-4 4"/>',targets:'<circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/>',voice:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>',switches:'<path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4"/>',sticky:'<path d="M9 7V5a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v14a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V7Z"/>',captions:'<rect x="2" y="4" width="20" height="16" rx="3"/><path d="M10 9a3 3 0 1 0 0 6M18 9a3 3 0 1 0 0 6"/>'};
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.focus}</svg>`;
  }
  function tile(id,icon,label,description){return `<button class="tile" data-setting="${id}" aria-pressed="false" title="${description}"><span class="icon" aria-hidden="true">${settingIcon(icon)}</span><strong>${label}</strong><small>${description}</small></button>`;}
  const style = document.createElement('style'); style.id='accessease-page-styles';document.head.append(style);
  const focusStyle=document.createElement('style');root.append(focusStyle);
  const targetStyle=document.createElement('style');root.append(targetStyle);
  const launcher=root.querySelector('.launcher'), panel=root.querySelector('.panel');
  const voiceTile=root.querySelector('[data-setting="voice"]'),voiceSetting=document.createElement('div');
  voiceSetting.className='voice-setting';voiceTile.before(voiceSetting);voiceSetting.append(voiceTile);
  const voiceResume=document.createElement('button');voiceResume.type='button';voiceResume.className='voice-resume';voiceResume.textContent='Resume microphone';voiceResume.hidden=true;voiceSetting.append(voiceResume);
  const voiceIndicator=document.createElement('div');voiceIndicator.className='voice-indicator';voiceIndicator.hidden=true;
  voiceIndicator.innerHTML='<span class="voice-indicator-text" role="status" aria-live="polite"></span><button type="button" aria-label="Stop voice commands">Stop</button>';
  root.append(voiceIndicator);
  const voiceStyle=document.createElement('style');voiceStyle.textContent='.voice-indicator{position:fixed;right:100px;bottom:25px;z-index:2147483646;max-width:min(310px,calc(100vw - 120px));display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid #bfdbfe;border-radius:12px;background:#fff;color:#092644;box-shadow:0 6px 20px #09264424;pointer-events:auto;font:12px/1.5 Inter,Arial,sans-serif}.voice-indicator button{flex-shrink:0;padding:6px 10px;border:1px solid #bfdbfe;border-radius:7px;background:#eff6ff;color:#1749b9}.voice-indicator[hidden]{display:none!important}.voice-setting{position:relative;min-width:0}.voice-setting>.tile{width:100%;height:100%}.voice-setting .tile[data-voice-phase=resume] small{visibility:hidden}.voice-resume{position:absolute;bottom:8px;left:15px;padding:2px 4px;border:0;background:transparent;color:var(--blue);font:600 10px Inter,Arial,sans-serif;text-decoration:underline}.voice-resume[hidden]{display:none!important}.panel .tile[data-setting=voice][data-voice-phase=starting]:after,.panel .tile[data-setting=voice][data-voice-phase=permission]:after,.panel .tile[data-setting=voice][data-voice-phase=reconnecting]:after{border-color:#d97706;background:radial-gradient(circle at 24px 10px,#fff 0 7px,transparent 8px),#d97706}';root.append(voiceStyle);
  function setVoicePhase(phase,message){
    const tile=root.querySelector('[data-setting="voice"]');tile.dataset.voicePhase=phase;
    tile.querySelector('small').textContent=({resume:'Saved · microphone paused',permission:'Allow microphone access to start',starting:'Starting microphone…',listening:'Listening · say “scroll down”',reconnecting:'Reconnecting microphone…',error:'Microphone unavailable · check the message below'})[phase]||'Speak commands · Microphone needed';
    if(phase==='resume')tile.setAttribute('aria-label','Voice Commands preference is saved; microphone is paused.');else tile.removeAttribute('aria-label');
    voiceResume.hidden=!(voiceRequested&&!state.voice);
    if(message)voiceIndicator.querySelector('span').textContent=message;
    voiceIndicator.hidden=!state.voice||!panel.hidden;
  }
  voiceResume.addEventListener('click',()=>{state.voice=true;voiceRequested=true;startVoice();apply();});
  voiceIndicator.querySelector('button').addEventListener('click',()=>{voiceRequested=false;stopVoice();apply();status('Voice Commands disabled.');});
  const voiceInput=document.createElement('label');voiceInput.className='voice-input';voiceInput.hidden=true;
  voiceInput.style.setProperty('display','none','important');
  voiceInput.append(document.createTextNode('Voice microphone '));
  const voiceInputSelect=document.createElement('select');voiceInputSelect.setAttribute('aria-label','Voice microphone');voiceInput.append(voiceInputSelect);
  root.querySelector('.footer').prepend(voiceInput);
  voiceStyle.textContent+='.voice-input{display:flex;align-items:center;gap:8px;margin:0 0 10px;font:12px/1.5 Inter,Arial,sans-serif}.voice-input select{min-width:0;flex:1;max-width:100%;padding:7px;border:1px solid #bfdbfe;border-radius:6px;background:#fff;color:#092644}';
  voiceInputSelect.addEventListener('change',()=>{
    voiceDeviceId=voiceInputSelect.value;
    if(state.voice){stopVoice();state.voice=true;startVoice();apply();}
  });
  let recognition=null, scanned=null, scanIndex=-1, readingIndex=0, readingOffset=0, readingTimer=null, sentences=[], speechGeneration=0, selectedReadingText='';
  let pageFocusEntryPending=state.focus,focusWasEnabled=state.focus;
  const simpleNodes=new Map(); const simpleAttributes=new Map(); const readingTabIndexes=new Map(); const latched=new Set();
  const simpleWording=new Map(Object.entries(window.AccessEaseSimpleText||{}).filter(([,text])=>typeof text==='string'&&text.trim()).map(([text,plain])=>[text.trim().replace(/\s+/g,' '),plain]));
  const plainPhrases=[
    ['in order to','to'],['due to the fact that','because'],['in the event that','if'],
    ['at this point in time','now'],['has the ability to','can'],['have the ability to','can'],
    ['is able to','can'],['are able to','can'],['a sufficient number of','enough'],
    ['a large number of','many'],['a small number of','a few'],['on a daily basis','each day'],
    ['in close proximity to','near'],['prior to','before'],['subsequent to','after'],
    ['utilize','use'],['utilizes','uses'],['utilized','used'],['utilizing','using'],
    ['approximately','about'],['commence','start'],['commences','starts'],['commenced','started'],
  ].map(([phrase,plain])=>[new RegExp(`\\b${phrase.replace(/ /g,'\\s+')}\\b`,'gi'),plain]);
  const simpleExcluded='script,style,noscript,template,code,pre,kbd,samp,svg,math,select,#accessease-widget,[contenteditable]:not([contenteditable="false"]),[data-simple-ignore],[translate="no"]';
  function plainText(text,parent,provided){
    const wording=text.trim();if(!wording)return text;
    const authored=provided||simpleWording.get(wording.replace(/\s+/g,' '));
    if(typeof authored==='string'&&authored.trim())return text.replace(wording,()=>authored);
    // Conservative phrase changes only: keep facts, complete sentences and other languages.
    const language=parent.closest('[lang]')?.getAttribute('lang')||document.documentElement.lang||'en';
    if(!/^en(?:-|$)/i.test(language))return text;
    let plain=text;
    for(const [pattern,replacement] of plainPhrases)plain=plain.replace(pattern,match=>match===match.toUpperCase()?replacement.toUpperCase():/^[A-Z]/.test(match)?replacement[0].toUpperCase()+replacement.slice(1):replacement);
    return plain;
  }
  function applySimpleText(){
    if(!state.simple){
      simpleNodes.forEach(({original,applied},node)=>{if(node.isConnected&&node.nodeValue===applied)node.nodeValue=original;});
      simpleAttributes.forEach((attributes,el)=>{if(el.isConnected)attributes.forEach(({original,applied},name)=>{if(el.getAttribute(name)===applied)el.setAttribute(name,original);});});
      simpleNodes.clear();simpleAttributes.clear();return;
    }
    simpleNodes.forEach((record,node)=>{if(!node.isConnected)simpleNodes.delete(node);});
    simpleAttributes.forEach((record,el)=>{if(!el.isConnected)simpleAttributes.delete(el);});
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    let node;
    while((node=walker.nextNode())){
      const parent=node.parentElement;
      if(!parent||parent.closest(`${simpleExcluded},textarea`))continue;
      const record=simpleNodes.get(node);
      const original=record&&node.nodeValue===record.applied?record.original:node.nodeValue;
      // A whole-block alternative is safe only for a plain text block. Never remove
      // inline links, emphasis, icons or their event listeners to replace its words.
      const provided=parent.hasAttribute('data-simple')&&parent.childNodes.length===1?parent.dataset.simple:undefined;
      const desired=plainText(original,parent,provided);
      if(desired!==original)simpleNodes.set(node,{original,applied:desired});else simpleNodes.delete(node);
      if(node.nodeValue!==desired)node.nodeValue=desired;
    }
    document.querySelectorAll('[placeholder],[aria-label],[title],img[alt]').forEach(el=>{
      if(el.closest(simpleExcluded))return;
      let attributes=simpleAttributes.get(el)||new Map();
      for(const name of ['placeholder','aria-label','title','alt']){
        const current=el.getAttribute(name);if(current===null){attributes.delete(name);continue;}
        const record=attributes.get(name),original=record&&current===record.applied?record.original:current;
        const desired=plainText(original,el);
        if(desired!==original)attributes.set(name,{original,applied:desired});else attributes.delete(name);
        if(current!==desired)el.setAttribute(name,desired);
      }
      if(attributes.size)simpleAttributes.set(el,attributes);else simpleAttributes.delete(el);
    });
  }
  function main(){return document.querySelector('main,[role="main"]')||document.body;}
  function persist(){try{localStorage.setItem(key,JSON.stringify({...state,voice:false,voiceRequested}));}catch{}}
  function status(message){root.querySelector('.status').textContent=message;if(state.voice&&panel.hidden)voiceIndicator.querySelector('span').textContent=message;}
  function openPanel(open){panel.hidden=!open;pageFocusEntryPending=!open&&state.focus;launcher.setAttribute('aria-expanded',String(open));launcher.setAttribute('aria-label',open?'Close accessibility settings':'Open accessibility settings');voiceIndicator.hidden=!state.voice||open;if(open){root.querySelector('.body').scrollTop=0;root.querySelector('.close').focus({preventScroll:true});}else launcher.focus({preventScroll:true});}
  launcher.addEventListener('click',()=>openPanel(panel.hidden));root.querySelector('.close').addEventListener('click',()=>openPanel(false));
  function goMain(){openPanel(false);pageFocusEntryPending=false;const el=main();if(!el.hasAttribute('tabindex'))el.setAttribute('tabindex','-1');el.focus({preventScroll:true});el.scrollIntoView({behavior:'instant',block:'start'});}
  root.querySelector('.skip').addEventListener('click',goMain);
  function controls(){const selector='a[href],button,input,select,textarea,summary,video[controls],audio[controls],[tabindex]';const modal=[...root.querySelectorAll('dialog[open],[role="dialog"][aria-modal="true"]'),...document.querySelectorAll('dialog[open],[role="dialog"][aria-modal="true"]')].find(el=>!el.closest('[hidden],[inert]')&&el.getClientRects().length);return [...document.querySelectorAll(selector),...root.querySelectorAll(selector)].filter(el=>el!==host && (!modal||modal.contains(el)) && !el.disabled && el.getAttribute('aria-disabled')!=='true' && el.tabIndex>=0 && !el.closest('[hidden],[inert],[aria-hidden="true"],svg,picture,img,.course-art,[role="img"]') && el.getClientRects().length && getComputedStyle(el).visibility!=='hidden');}
  function focused(){return root.activeElement||document.activeElement;}
  function move(direction){const items=controls();if(!items.length)return;const current=items.indexOf(focused());const index=current<0?(direction>0?0:items.length-1):(current+direction+items.length)%items.length;items[index].focus();}
  function updateCaptions(){let tracks=0;document.querySelectorAll('video').forEach(v=>{for(const track of v.textTracks){if(['captions','subtitles'].includes(track.kind)){track.mode=state.captions?'showing':'disabled';tracks++;}}});return tracks;}
  let focusRing=null,focusFrame=null,outlinedElement=null,originalOutline=null;
  function restoreFocusOutline(){
    if(!outlinedElement)return;
    if(originalOutline.value)outlinedElement.style.setProperty('outline-style',originalOutline.value,originalOutline.priority);
    else outlinedElement.style.removeProperty('outline-style');
    if(!originalOutline.hadStyle&&!outlinedElement.getAttribute('style'))outlinedElement.removeAttribute('style');
    outlinedElement=null;originalOutline=null;
  }
  function hideFocusRing(){restoreFocusOutline();if(focusRing){focusRing.hidden=true;focusRing.style.setProperty('display','none','important');}}
  function updateFocusRing(){
    cancelAnimationFrame(focusFrame);focusFrame=null;
    const el=document.activeElement;
    const simplifiedTarget=el?.classList.contains('sudhin-tab-stop');
    if(!(state.focus||state.skip||simplifiedTarget)||!document.hasFocus()||!el||el===host||el===document.body||el.closest('[data-uaw-ignore]')||!el.matches(':focus-visible')||!el.getClientRects().length){
      hideFocusRing();
      return;
    }
    // A CSS outline stops at the element box even when its text overflows.
    // Measure painted text as well, without resizing the host page's layout.
    const range=document.createRange();range.selectNodeContents(el);
    const rects=[el.getBoundingClientRect(),...range.getClientRects()].filter(rect=>rect.width>0&&rect.height>0);
    if(!rects.length){hideFocusRing();return;}
    const left=Math.min(...rects.map(rect=>rect.left))-6,top=Math.min(...rects.map(rect=>rect.top))-6;
    const right=Math.max(...rects.map(rect=>rect.right))+6,bottom=Math.max(...rects.map(rect=>rect.bottom))+6;
    if(!focusRing){
      focusRing=document.createElement('div');focusRing.dataset.aeFocusRing='';focusRing.dataset.uawIgnore='';focusRing.setAttribute('aria-hidden','true');
      document.body.append(focusRing);
    }
    if(outlinedElement!==el){
      restoreFocusOutline();outlinedElement=el;
      originalOutline={value:el.style.getPropertyValue('outline-style'),priority:el.style.getPropertyPriority('outline-style'),hadStyle:el.hasAttribute('style')};
      el.style.setProperty('outline-style','none','important');
    }
    focusRing.hidden=false;
    const simplifiedOnly=simplifiedTarget&&!state.focus&&!state.skip;
    for(const [property,value] of Object.entries({all:'initial',display:'block',position:'fixed','box-sizing':'border-box',left:`${left}px`,top:`${top}px`,width:`${right-left}px`,height:`${bottom-top}px`,border:state.skip?'2px solid #2563eb':simplifiedOnly?'3px solid #2563eb':'4px solid #2563eb','box-shadow':state.skip||simplifiedOnly?'none':'0 0 0 3px #bfdbfe','pointer-events':'none','z-index':'2147483646',margin:'0',transform:'none',transition:'none'}))focusRing.style.setProperty(property,value,'important');
    focusFrame=requestAnimationFrame(updateFocusRing);
  }
  document.addEventListener('focusin',updateFocusRing,true);
  document.addEventListener('focusout',()=>{cancelAnimationFrame(focusFrame);focusFrame=requestAnimationFrame(updateFocusRing);},true);
  window.addEventListener('blur',()=>{cancelAnimationFrame(focusFrame);focusFrame=null;hideFocusRing();});
  window.addEventListener('focus',updateFocusRing);
  function apply(){
    if(state.focus&&!focusWasEnabled)pageFocusEntryPending=true;
    if(!state.focus)pageFocusEntryPending=false;
    focusWasEnabled=state.focus;
    focusStyle.textContent=state.focus?'button:focus-visible,select:focus-visible,input:focus-visible,textarea:focus-visible,summary:focus-visible,a:focus-visible{outline:4px solid #2563eb!important;outline-offset:5px!important;box-shadow:0 0 0 8px #bfdbfe!important}':'';
    targetStyle.textContent=state.targets?'button,select{min-height:45px!important;min-width:45px!important}':'';
    if(state.keyboard||state.focus){
      const targets=new Set();
      const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
      let textNode;
      while((textNode=walker.nextNode())){
        if(!/[\p{L}\p{N}]/u.test(textNode.textContent))continue;
        const parent=textNode.parentElement;
        if(!parent||parent.closest('#accessease-widget,script,style,noscript,svg,picture,img,.course-art,[role="img"],[aria-hidden="true"],[hidden],[inert],a[href],button,input,select,textarea,summary,video,audio,[contenteditable="true"],[role="button"],[role="link"]'))continue;
        const block=parent.closest('h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,caption,th,td,dt,dd,label,legend,pre');
        targets.add(block||parent);
      }
      document.querySelectorAll('video[controls],audio[controls],[role="button"],[role="link"]').forEach(el=>{
        if(!el.closest('[hidden],[inert],[aria-hidden="true"],#accessease-widget,.course-art,[role="img"]'))targets.add(el);
      });
      // Restore skipped top-level header controls, while leaving intentional
      // roving tab indexes inside menus/toolbars and hidden dropdowns alone.
      document.querySelectorAll('header a[href],header button,[role="banner"] a[href],[role="banner"] button').forEach(el=>{
        if(el.tabIndex<0&&!el.disabled&&el.getAttribute('aria-disabled')!=='true'&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'&&!el.closest('[hidden],[inert],[aria-hidden="true"],[role="menu"],[role="menubar"],[role="toolbar"],[role="tablist"]'))targets.add(el);
      });
      targets.forEach(el=>{
        if(!readingTabIndexes.has(el))readingTabIndexes.set(el,el.getAttribute('tabindex'));
        el.setAttribute('tabindex','0');el.setAttribute('data-ae-reading-target','');
      });
    }else{
      readingTabIndexes.forEach((previous,el)=>{if(previous===null)el.removeAttribute('tabindex');else el.setAttribute('tabindex',previous);el.removeAttribute('data-ae-reading-target');});
      readingTabIndexes.clear();
    }
    document.querySelectorAll('[data-ae-text-flex]').forEach(el=>el.removeAttribute('data-ae-text-flex'));
    if(state.align!=='original')document.querySelectorAll('a,button,label,span,div,p').forEach(el=>{
      if(el===host||el.closest('#accessease-widget'))return;
      const hasText=[...el.childNodes].some(node=>node.nodeType===Node.TEXT_NODE&&node.textContent.trim());
      if(!hasText)return;
      const css=getComputedStyle(el);
      if(['flex','inline-flex'].includes(css.display)&&['row','row-reverse'].includes(css.flexDirection))el.setAttribute('data-ae-text-flex','');
    });
    const flexAlignment=state.align==='center'?'center':state.align==='right'?'flex-end':'flex-start';
    style.textContent=`${state.align!=='original'?`body,body *{text-align:${state.align}!important}body [data-ae-text-flex]{justify-content:${flexAlignment}!important}`:''}
    ${state.targets?'body a,body button,body input,body select{min-height:45px!important;min-width:45px!important}body a{display:inline-flex!important;align-items:center!important}':''}
    ${state.highlight?'body p:hover,body p:focus-within{background:#bfdbfe!important;color:#0f172a!important;outline:2px solid #2563eb!important;outline-offset:5px!important;border-radius:5px}':''}
    ${state.keyboard?'[data-ae-reading-target]:focus{outline:3px solid #2563eb!important;outline-offset:5px!important;border-radius:5px}':''}
    [data-ae-scanned]{outline:4px solid #2563eb!important;outline-offset:5px!important}`;
    applySimpleText();
    root.querySelector('.skip').hidden=!state.skip;
    root.querySelectorAll('[data-setting]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.setting==='voice'?state.voice||voiceRequested:state[el.dataset.setting])));
    root.querySelector('#rate').value=String(state.rate);root.querySelector('#align').value=state.align;
    root.querySelector('#rate').closest('.select-row').dataset.active=String(state.rate!==1);
    root.querySelector('#align').closest('.select-row').dataset.active=String(state.align!=='original');
    const count=Object.entries(state).filter(([k,v])=>k==='rate'?v!==1:k==='align'?v!=='original':k==='voice'?v===true||voiceRequested:v===true).length;
    root.querySelector('.count').textContent=`${count+(teamExtension?.activeCount()||0)} active`;
    updateCaptions();persist();
    if(!(state.focus||state.skip||document.activeElement?.classList.contains('sudhin-tab-stop'))){restoreFocusOutline();if(focusRing){focusRing.remove();focusRing=null;}}
    updateFocusRing();
    host.dispatchEvent(new CustomEvent('accessease:change',{detail:{...state}}));
  }
  function readingChunks(text,lang){
    // Short, sentence-aware utterances retain punctuation and natural phrasing
    // instead of sending a whole selected page to the faster speech engine.
    let phrases;
    try{phrases=[...new Intl.Segmenter(lang,{granularity:'sentence'}).segment(text)].map(item=>item.segment);}
    catch{phrases=text.match(/[^.!?\n]+(?:[.!?]+["'”’)]*|\n|$)/g)||[text];}
    return phrases.flatMap(phrase=>{
      const chunks=[];let remaining=phrase.trim();
      while(remaining.length>240){
        let end=remaining.lastIndexOf(' ',240);
        if(end<80)end=240;
        // Never split a UTF-16 surrogate pair.
        if(/[\uD800-\uDBFF]/.test(remaining[end-1]))end--;
        chunks.push(remaining.slice(0,end));remaining=remaining.slice(end).trimStart();
      }
      if(remaining)chunks.push(remaining);
      return chunks;
    });
  }
  function readingVoice(lang){
    const voices=window.speechSynthesis.getVoices?.()||[],tag=lang.toLowerCase().replaceAll('_','-');
    const sameLanguage=voices.filter(voice=>voice.lang.toLowerCase().replaceAll('_','-').split('-')[0]===tag.split('-')[0]);
    const exact=sameLanguage.filter(voice=>voice.lang.toLowerCase().replaceAll('_','-')===tag);
    const candidates=exact.length?exact:sameLanguage;
    return candidates.find(voice=>/natural|neural|google/i.test(voice.name))||candidates.find(voice=>voice.default)||candidates[0];
  }
  function stopSpeech(){speechGeneration++;clearTimeout(readingTimer);readingTimer=null;if('speechSynthesis'in window)window.speechSynthesis.cancel();}
  function speakNext(generation){
    if(!state.speech||generation!==speechGeneration)return;
    if(readingIndex>=sentences.length){sentences=[];readingIndex=0;status('Finished reading the selected text. Highlight another passage to read it.');return;}
    const start=readingOffset,lang=document.documentElement.lang||'en';
    const utterance=new SpeechSynthesisUtterance(sentences[readingIndex].slice(start));
    utterance.rate=state.rate;utterance.pitch=1;utterance.volume=1;utterance.lang=lang;
    const voice=readingVoice(lang);if(voice){utterance.voice=voice;utterance.lang=voice.lang;}
    utterance.onboundary=event=>{if(generation===speechGeneration && event.name==='word' && Number.isInteger(event.charIndex) && event.charIndex>=0 && event.charIndex<utterance.text.length)readingOffset=start+event.charIndex;};
    utterance.onend=()=>{if(generation===speechGeneration){readingIndex++;readingOffset=0;const pause=state.rate>1.1&&/[.!?]["'”’)]*$/.test(utterance.text)?100:0;readingTimer=setTimeout(()=>{readingTimer=null;speakNext(generation);},pause);}};
    utterance.onerror=()=>{if(generation===speechGeneration){stopSpeech();state.speech=false;apply();status('Voice reading could not start. Check your browser audio settings.');}};
    window.speechSynthesis.speak(utterance);
  }
  function startSpeech(){if(!('speechSynthesis'in window)){state.speech=false;status('Voice reading is unavailable in this browser.');return;}stopSpeech();state.speech=true;readingIndex=0;readingOffset=0;sentences=selectedReadingText?readingChunks(selectedReadingText,document.documentElement.lang||'en'):[];if(!sentences.length){status('Text-to-Speech is on. Drag to highlight the text you want to hear.');return;}status(`Reading selected text: “${selectedReadingText.slice(0,100)}${selectedReadingText.length>100?'…':''}”`);speakNext(speechGeneration);}
  function captureSelection(){const selection=window.getSelection();if(selection&&!selection.isCollapsed&&main().contains(selection.anchorNode)&&main().contains(selection.focusNode)){selectedReadingText=selection.toString().trim();return true;}return false;}
  document.addEventListener('selectionchange',captureSelection);
  document.addEventListener('pointerup',event=>{
    const target=event.composedPath()[0];if(event.composedPath().includes(host)||!main().contains(target))return;
    if(!captureSelection()){selectedReadingText='';return;}
    if(state.speech&&selectedReadingText){startSpeech();apply();}
  });
  document.addEventListener('keyup',event=>{if(event.key==='Shift'&&state.speech&&captureSelection()){startSpeech();apply();}});
  function scrollVoice(amount,pageOnly=false){
    let container=!pageOnly&&!panel.hidden?root.querySelector('.body'):null;
    if(!container){
      const scrollable=el=>el&&el!==host&&el.clientHeight>0&&el.scrollHeight>el.clientHeight&&/(auto|scroll|overlay)/.test(getComputedStyle(el).overflowY);
      let active=document.activeElement;
      while(active&&active!==document.body){if(scrollable(active)){container=active;break;}active=active.parentElement;}
      const page=document.scrollingElement||document.documentElement;
      if(!container&&page.scrollHeight<=window.innerHeight){
        const candidates=[...document.querySelectorAll('main,[role="main"],section,article,div')].filter(el=>scrollable(el)&&!el.closest('[hidden],[inert],#accessease-widget')&&el.getClientRects().length);
        candidates.sort((a,b)=>{const area=el=>{const r=el.getBoundingClientRect();return Math.max(0,Math.min(r.right,window.innerWidth)-Math.max(r.left,0))*Math.max(0,Math.min(r.bottom,window.innerHeight)-Math.max(r.top,0));};return area(b)-area(a);});
        container=candidates[0]||null;
      }
    }
    if(container){if(typeof container.scrollBy==='function')container.scrollBy({top:amount,behavior:'auto'});else container.scrollTop+=amount;}
    else window.scrollBy({top:amount,behavior:'auto'});
  }
  let voiceRestartTimer=null, voiceStartTimer=null, voiceResultTimer=null, voiceResultFailures=0, voiceStartFailures=0, voiceNetworkFailures=0;
  let voiceInputStream=null,voiceInputRequest=0,voiceInputPending=false,voiceDeviceId='',voiceNativeInput=false;
  function supportsVoiceInputTrack(){
    // Chrome desktop 135+ supports SpeechRecognition.start(MediaStreamTrack).
    const ua=window.navigator?.userAgent||'',version=ua.match(/\b(?:Chrome|Chromium)\/(\d+)/);
    return !!(version&&Number(version[1])>=135&&!/Android/.test(ua)&&window.navigator.mediaDevices?.getUserMedia);
  }
  function stopVoiceInput(){
    voiceInputRequest++;voiceInputPending=false;voiceInput.hidden=true;
    if(voiceInputStream){for(const track of voiceInputStream.getTracks()){track.onended=null;track.stop();}voiceInputStream=null;}
  }
  async function openVoiceInput(API){
    const request=++voiceInputRequest;voiceInputPending=true;
    const media=window.navigator.mediaDevices;
    let stream;
    const discard=()=>{stream?.getTracks().forEach(track=>track.stop());};
    const current=()=>request===voiceInputRequest&&state.voice;
    setVoicePhase('starting','Opening microphone…');
    try{
      stream=await media.getUserMedia({audio:voiceDeviceId?{deviceId:{exact:voiceDeviceId}}:true});
      if(!current()){discard();return;}
      const devices=await media.enumerateDevices().catch(()=>[]);
      if(!current()){discard();return;}
      const inputs=devices.filter(device=>device.kind==='audioinput'&&device.deviceId!=='communications');
      const virtual=label=>/virtual|hitpaw|cable|stereo mix|loopback/i.test(label);
      // A silent virtual default cannot hear the user. Prefer an available physical input.
      const physical=inputs.find(device=>device.deviceId!=='default'&&device.label&&!virtual(device.label));
      if(!voiceDeviceId&&virtual(stream.getAudioTracks()[0]?.label||'')&&physical){
        discard();stream=await media.getUserMedia({audio:{deviceId:{exact:physical.deviceId}}});
        if(!current()){discard();return;}
      }
      const track=stream.getAudioTracks()[0];
      if(!track||track.readyState!=='live')throw new Error('Microphone track is not live');
      voiceInputStream=stream;voiceInputPending=false;
      voiceInputSelect.replaceChildren();
      for(const device of inputs){const option=document.createElement('option');option.value=device.deviceId;option.textContent=device.label||'Microphone';voiceInputSelect.append(option);}
      const deviceId=track.getSettings().deviceId;
      if(![...voiceInputSelect.options].some(option=>option.value===deviceId)){
        const option=document.createElement('option');option.value=deviceId||'';option.textContent=track.label||'Current microphone';voiceInputSelect.append(option);
      }
      voiceInputSelect.value=deviceId||'';
      track.onended=()=>{if(voiceInputStream!==stream||!state.voice)return;stopVoice();apply();setVoicePhase('error');status('The selected microphone disconnected. Reconnect it, then turn Voice Commands on again.');};
      beginVoiceRecognition(API);
    }catch(error){discard();if(current()){voiceInputPending=false;voiceMicrophoneError(error);}}
  }
  function normalizeVoiceText(text){return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').trim().replace(/\s+/g,' ');}
  function voiceControlName(el){
    const labelledBy=el.getAttribute('aria-labelledby');
    const label=labelledBy?labelledBy.split(/\s+/).map(id=>el.getRootNode().getElementById(id)?.textContent||'').join(' '):'';
    return el.getAttribute('aria-label')||label||el.querySelector('strong')?.textContent||
      (el.labels?[...el.labels].map(label=>label.textContent).join(' '):'')||el.textContent||el.getAttribute('title')||el.getAttribute('value')||'';
  }
  function voiceControlNames(el){
    const visible=[...el.childNodes||[]].filter(node=>node.nodeType!==1||node.getAttribute('aria-hidden')!=='true'&&node.tagName!=='SVG').map(node=>node.textContent).join(' ');
    return [...new Set([voiceControlName(el),el.querySelector('strong')?.textContent,el.matches('summary')?el.querySelector('span:nth-child(2)')?.textContent:'',el.getAttribute('title'),visible].filter(Boolean).map(normalizeVoiceText))];
  }
  function clickableControls(){return controls().filter(el=>el.matches('a[href],button,input,select,textarea,summary,[role="button"],[role="link"],[role="switch"],[role="checkbox"]'));}
  function clickNamedVoiceControl(name){
    let target=normalizeVoiceText(name), ordinal=null;
    const candidates=clickableControls();
    let matches=candidates.filter(el=>voiceControlNames(el).includes(target));
    // Allow “click the Start learning button” while preserving names containing “button”.
    if(!matches.length){target=target.replace(/^the\s+/,'').replace(/\s+(button|link)$/,'');
      const position=target.match(/^(first|second|third|last)\s+(.+)$/);if(position){ordinal=position[1];target=position[2];}
      matches=candidates.filter(el=>voiceControlNames(el).includes(target));
    }
    if(!matches.length&&target)matches=candidates.filter(el=>voiceControlNames(el).some(label=>` ${label} `.includes(` ${target} `)));
    matches=[...new Set(matches)];
    if(!ordinal&&matches.length>1){
      // A footer link with the same label must not make the single on-screen
      // header control ambiguous. Keep off-screen matches for explicit ordinals
      // or when the requested control is not currently in the viewport.
      const onScreen=matches.filter(el=>{
        const rect=el.getBoundingClientRect?.();
        return rect&&rect.width>0&&rect.height>0&&rect.bottom>0&&rect.right>0&&rect.top<window.innerHeight&&rect.left<window.innerWidth;
      });
      if(onScreen.length)matches=onScreen;
    }
    if(ordinal){const index=ordinal==='last'?matches.length-1:{first:0,second:1,third:2}[ordinal];matches=matches[index]?[matches[index]]:[];}
    if(!matches.length){status(`No available button or link named “${name}”. Say “click” followed by the name shown on the page.`);return null;}
    if(matches.length>1){status(`Found ${matches.length} items named “${name}”. Say “click first ${target}” or “click second ${target}”.`);return null;}
    const el=matches[0], label=voiceControlName(el).trim();
    if(!root.contains(el)&&!panel.hidden)openPanel(false);
    el.scrollIntoView?.({block:'center',inline:'nearest',behavior:'auto'});el.focus();el.click();return label;
  }
  function releaseVoiceSession(session){
    clearTimeout(voiceStartTimer);voiceStartTimer=null;
    clearTimeout(voiceResultTimer);voiceResultTimer=null;
    if(recognition===session)recognition=null;
    if(session){session.onstart=session.onaudiostart=session.onsoundstart=session.onspeechstart=session.onspeechend=session.onresult=session.onerror=session.onend=session.onnomatch=null;try{session.abort();}catch{}}
  }
  function stopVoice(){
    try{window.sessionStorage.removeItem(voiceNavigationKey);}catch{}
    state.voice=false;voiceNetworkFailures=0;voiceResultFailures=0;
    clearTimeout(voiceRestartTimer);clearTimeout(voiceStartTimer);voiceRestartTimer=voiceStartTimer=null;
    releaseVoiceSession(recognition);
    stopVoiceInput();
    setVoicePhase('off','Microphone off.');
  }
  function runVoiceCommand(transcript){
    const text=normalizeVoiceText(transcript).replace(/^(?:hey\s+)?access\s*ease\s+/,'').replace(/^(?:can|could|would|will)\s+you\s+/,'').replace(/^please\s+|\s+please$/g,'');
    let action='';
    if(/^(?:scroll|move|go) (?:the )?(?:page |screen )?down(?: (?:the )?(?:page|screen))?$/.test(text)||['down','page down'].includes(text)){scrollVoice(450,/\b(page|screen)\b/.test(text));action='Scrolled down';}
    else if(/^(?:scroll|move|go) (?:the )?(?:page |screen )?up(?: (?:the )?(?:page|screen))?$/.test(text)||['up','page up'].includes(text)){scrollVoice(-450,/\b(page|screen)\b/.test(text));action='Scrolled up';}
    else if(['next','next item','next control'].includes(text)){move(1);action='Moved to the next item';}
    else if(['previous','previous item','previous control','back'].includes(text)){move(-1);action='Moved to the previous item';}
    else if(/^(click|select|activate|press|tap)\s+/.test(text)){const label=clickNamedVoiceControl(text.replace(/^(click|select|activate|press|tap)\s+(?:on\s+)?/,''));if(label===null)return;action=`Activated “${label}”`;}
    else if(['click','select','activate','press','tap'].includes(text)){const el=focused();if(!clickableControls().includes(el)){status('Say “click” followed by a button or link name, for example “click Save bookmark”.');return;}el.click();action='Activated the focused item';}
    else if(['read selected text','read selection','read page'].includes(text)){captureSelection();if(!selectedReadingText){status('Highlight the text first, then say “read selected text”.');return;}startSpeech();apply();action='Reading selected text';}
    else if(text==='stop reading'){stopSpeech();apply();action='Stopped reading';}
    else if(text==='close settings'){openPanel(false);action='Closed settings';}
    else if(text==='open settings'){openPanel(true);action='Opened settings';}
    else if(text==='reset settings'){reset();return;}
    else if(['stop listening','voice off'].includes(text)){voiceRequested=false;stopVoice();apply();status('Voice Commands disabled.');return;}
    else{status(`Heard “${transcript.trim()}”, but no matching command. Say “scroll down”, “next”, “click”, or “open settings”.`);return;}
    // Clicking Voice Commands or Reset can disable the session; keep that status intact.
    if(state.voice){status(`Heard “${transcript.trim()}”. ${action}. Listening for your next command.`);setVoicePhase('listening',`${action}. Listening for your next command.`);}
  }
  function queueVoiceRestart(delay=200){
    if(!state.voice)return;
    clearTimeout(voiceRestartTimer);
    voiceRestartTimer=setTimeout(()=>{voiceRestartTimer=null;if(state.voice)startVoice(true);},delay);
  }
  function startVoice(restarting=false){
    if(!state.voice||recognition||voiceInputPending)return;
    clearTimeout(voiceRestartTimer);voiceRestartTimer=null;
    const API=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!API){stopVoice();apply();setVoicePhase('error');status('Voice commands are unavailable here. Open this page in Google Chrome with speech recognition support.');return;}
    if(window.isSecureContext===false){stopVoice();apply();setVoicePhase('error');status('Microphone access needs HTTPS or localhost. Open this page on a secure address, then turn Voice Commands on again.');return;}
    if(!restarting){voiceStartFailures=0;voiceNetworkFailures=0;voiceResultFailures=0;voiceNativeInput=false;status('Starting microphone. Allow Chrome microphone access if prompted.');}
    if(!voiceNativeInput&&supportsVoiceInputTrack()&&!voiceInputStream){openVoiceInput(API);return;}
    beginVoiceRecognition(API);
  }
  function voiceMicrophoneError(error){
    const messages={NotAllowedError:'Microphone access was denied. Allow the microphone in Chrome site settings, then turn Voice Commands on again.',SecurityError:'Microphone access was blocked. Check the browser site permissions.',NotFoundError:'No working microphone was found. Connect a microphone and check the browser input device.',NotReadableError:'The microphone could not open. Check your input device and close another app if it is using the microphone.'};
    stopVoice();apply();setVoicePhase('error');status(messages[error?.name]||'Microphone access failed. Check the browser input device and try Voice Commands again.');
  }
  function beginVoiceRecognition(API){
    let session;
    try{session=new API();}catch{stopVoice();apply();setVoicePhase('error');status('The browser speech service could not open. Try Voice Commands in Google Chrome.');return;}
    recognition=session;setVoicePhase('starting','Starting Chrome speech recognition…');
    session.continuous=true;session.interimResults=true;session.lang='en-US';
    let audioStarted=false,awaitingResult=false;const handledResults=new Map();
    function resultTimedOut(){
      if(recognition!==session||!state.voice||!awaitingResult)return;
      if(fallbackToNativeInput())return;
      if(++voiceResultFailures>=3){
        stopVoice();apply();setVoicePhase('error');
        status('Microphone hears speech, but Chrome is not returning complete words. Check your internet connection and speech language, then turn Voice Commands on again.');return;
      }
      retry('Speech service did not return a complete command. Reconnecting automatically; please repeat your command.');
    }
    function waitForResult(delay=8000){clearTimeout(voiceResultTimer);voiceResultTimer=setTimeout(resultTimedOut,delay);}
    function retry(message,delay=200){
      releaseVoiceSession(session);
      if(!state.voice)return;
      setVoicePhase('reconnecting',message);status(message);queueVoiceRestart(delay);
    }
    function fallbackToNativeInput(){
      if(!voiceInputStream||voiceNativeInput)return false;
      // Chromium's version alone does not guarantee that track input works.
      // Release our capture before letting recognition open the default input.
      releaseVoiceSession(session);stopVoiceInput();voiceNativeInput=true;
      setVoicePhase('reconnecting','Switching to the browser default microphone…');
      status('Switching to the browser default microphone. Allow microphone access if prompted.');
      queueVoiceRestart();return true;
    }
    function startupTimedOut(){
      if(recognition!==session||!state.voice||audioStarted)return;
      if(fallbackToNativeInput())return;
      if(++voiceStartFailures<3){retry('Microphone is taking longer to start. Reconnecting automatically…');return;}
      stopVoice();apply();setVoicePhase('error');status('Speech recognition did not capture microphone audio. Allow the microphone in browser site settings, select a working default input, then turn Voice Commands on again.');
    }
    session.onstart=()=>{
      if(recognition!==session||!state.voice||audioStarted)return;
      status('Speech service started. Waiting for microphone audio…');
    };
    session.onaudiostart=()=>{if(recognition!==session||!state.voice)return;audioStarted=true;clearTimeout(voiceStartTimer);voiceStartTimer=null;voiceStartFailures=0;setVoicePhase('listening','Listening · say “scroll down” or “click Save bookmark”.');status('Microphone ready. Listening: say “scroll down”, “click Save bookmark”, or “close settings”.');};
    session.onsoundstart=()=>{if(recognition!==session||!state.voice)return;setVoicePhase('listening','Microphone hears sound. Listening for words…');status('Microphone hears sound. Listening for a command…');};
    session.onspeechstart=()=>{if(recognition!==session||!state.voice)return;awaitingResult=true;waitForResult();setVoicePhase('listening','Hearing your command…');status('Hearing speech. Waiting for the complete command…');};
    session.onspeechend=()=>{
      if(recognition!==session||!state.voice||!awaitingResult)return;
      clearTimeout(voiceResultTimer);
      // Continuous recognition may hold its final result after speech ends.
      // A graceful stop asks for that result; abort is reserved for recovery.
      voiceResultTimer=setTimeout(()=>{
        if(recognition!==session||!state.voice||!awaitingResult)return;
        waitForResult(3000);
        try{session.stop?.();}catch{resultTimedOut();}
      },1500);
    };
    session.onnomatch=()=>{if(recognition===session&&state.voice){awaitingResult=false;clearTimeout(voiceResultTimer);voiceResultTimer=null;setVoicePhase('listening','Please repeat your command.');status('Speech was heard but not understood. Try “scroll down” or “click Save bookmark”.');}};
    session.onresult=e=>{
      if(recognition!==session||!state.voice)return;
      for(let i=e.resultIndex;i<e.results.length;i++){
        const result=e.results[i],transcript=result[0]?.transcript;
        if(typeof transcript==='string'&&transcript.trim()){
          audioStarted=true;clearTimeout(voiceStartTimer);voiceStartTimer=null;voiceStartFailures=0;
          voiceNetworkFailures=0;
          if(result.isFinal){awaitingResult=false;clearTimeout(voiceResultTimer);voiceResultTimer=null;voiceResultFailures=0;if(handledResults.get(i)!==transcript){handledResults.set(i,transcript);runVoiceCommand(transcript);}}
          else {awaitingResult=true;waitForResult();status(`Hearing “${transcript.trim()}”…`);}
        }
        if(!state.voice)break;
      }
    };
    session.onerror=e=>{
      if(recognition!==session||!state.voice)return;
      // Silence and temporary service interruptions must not switch off voice input.
      // Retire the failed session before retrying, even if Chrome omits its end event.
      if(e.error==='no-speech'||e.error==='aborted'){
        if(!audioStarted){
          if(fallbackToNativeInput())return;
          if(++voiceStartFailures>=3){stopVoice();apply();setVoicePhase('error');status('Speech recognition repeatedly ended before microphone audio started. Check microphone permission and the browser default input, then turn Voice Commands on again.');return;}
        }
        retry('Voice Commands is still on. Reconnecting microphone…');return;
      }
      if(e.error==='network'){
        if(fallbackToNativeInput())return;
        if(++voiceNetworkFailures>4){
          stopVoice();apply();setVoicePhase('error');
          status('The browser speech service could not connect after 4 retries. Check your internet connection or VPN/firewall, then turn Voice Commands on again. You can also try Google Chrome.');return;
        }
        retry('Speech service connection interrupted. Reconnecting automatically; check your internet connection if this continues.',Math.min(1000*2**(voiceNetworkFailures-1),5000));return;
      }
      if(e.error==='audio-capture'&&fallbackToNativeInput())return;
      const messages={
        'not-allowed':'Microphone access was denied. Allow the microphone in your browser site settings, then turn Voice Commands on again.',
        'service-not-allowed':'Your browser blocked speech recognition. Check browser permissions or try Chrome or Edge.',
        'audio-capture':'No working microphone was found. Check your microphone connection and browser input device.',
        'language-not-supported':'English speech recognition is unavailable in this browser.'
      };
      stopVoice();apply();setVoicePhase('error');status(messages[e.error]||`Voice input stopped (${e.error}). Turn Voice Commands on again to retry.`);
    };
    session.onend=()=>{
      if(recognition!==session||!state.voice)return;
      if(!audioStarted&&fallbackToNativeInput())return;
      if(!audioStarted&&++voiceStartFailures>=3){stopVoice();apply();setVoicePhase('error');status('Chrome ended speech recognition before microphone audio started. Check microphone permission and the selected input device.');return;}
      retry('Voice Commands is still on. Reconnecting microphone…');
    };
    // Arm before start(): a stalled service may never emit the start event.
    voiceStartTimer=setTimeout(startupTimedOut,10000);
    try{if(voiceInputStream)session.start(voiceInputStream.getAudioTracks()[0]);else session.start();}catch(error){
      if(['NotAllowedError','SecurityError'].includes(error?.name)){releaseVoiceSession(session);voiceMicrophoneError(error);return;}
      if(fallbackToNativeInput())return;
      releaseVoiceSession(session);
      if(++voiceStartFailures<3){setVoicePhase('reconnecting','Retrying microphone input…');status('Retrying microphone input…');queueVoiceRestart();}
      else{stopVoice();apply();setVoicePhase('error');status('Microphone input could not start. Check browser microphone access, then turn Voice Commands on again.');}
    }
  }
  let scanTabIndex=null;
  function switchControls(){
    const selector='a[href],button,input:not([type="hidden"]),select,textarea,summary,video[controls],audio[controls],[role="button"],[role="link"],[role="switch"],[role="checkbox"],[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"],[role="tab"],[role="radio"]';
    const modal=[...root.querySelectorAll('dialog[open],[role="dialog"][aria-modal="true"]'),...document.querySelectorAll('dialog[open],[role="dialog"][aria-modal="true"]')].find(el=>!el.closest('[hidden],[inert]')&&el.getClientRects().length);
    return [...new Set([...document.querySelectorAll(selector),...root.querySelectorAll(selector)])].filter(el=>
      el!==host&&(!modal||modal.contains(el))&&!el.disabled&&!el.matches(':disabled')&&el.getAttribute('aria-disabled')!=='true'&&
      !el.closest('[hidden],[inert],[aria-hidden="true"],svg')&&el.getClientRects().length&&
      !['hidden','collapse'].includes(getComputedStyle(el).visibility));
  }
  function clearScan(){
    if(scanned){scanned.removeAttribute('data-ae-scanned');if(scanTabIndex===null)scanned.removeAttribute('tabindex');else scanned.setAttribute('tabindex',scanTabIndex);}
    scanned=null;scanIndex=-1;scanTabIndex=null;
  }
  function scan(){
    const items=switchControls(),previous=items.indexOf(scanned);
    clearScan();if(!items.length)return;
    scanIndex=(previous+1)%items.length;scanned=items[scanIndex];scanTabIndex=scanned.getAttribute('tabindex');
    if(scanned.tabIndex<0&&!scanned.hasAttribute('tabindex'))scanned.setAttribute('tabindex','-1');
    scanned.setAttribute('data-ae-scanned','');scanned.focus({preventScroll:true});scanned.scrollIntoView?.({block:'nearest',inline:'nearest',behavior:'auto'});
  }
  function reset({reload=false}={}){
    voiceRequested=false;stopSpeech();stopVoice();clearScan();latched.clear();selectedReadingText='';sentences=[];
    Object.assign(state,defaults);teamExtension?.reset({persistImmediately:reload});apply();status('All settings have been reset.');
    if(reload){
      openPanel(false);
      try{sessionStorage.setItem('accessease.reset.reload.v1',JSON.stringify({href:location.href,expiresAt:Date.now()+60000}));}catch{}
      window.location.reload();
    }
  }
  root.querySelector('.reset').addEventListener('click',()=>reset({reload:true}));
  root.querySelectorAll('[data-setting]').forEach(el=>el.addEventListener('click',()=>{
    const id=el.dataset.setting;
    if(id==='voice'){
      if(state.voice||voiceRequested){state.voice=false;voiceRequested=false;stopVoice();status('Voice Commands disabled.');}
      else{state.voice=true;voiceRequested=true;status('Voice Commands enabled. Allow microphone access if prompted.');startVoice();}
    }else{
      state[id]=!state[id];status(`${el.querySelector('strong').textContent} ${state[id]?'enabled':'disabled'}.`);
      if(id==='speech'){if(state.speech)startSpeech();else stopSpeech();}
    }
    if(id==='switches'){clearScan();if(state.switches)status('Connect a switch that sends Space or Enter. Space moves to the next control; Enter activates it. Typing fields keep normal keyboard input.');}
    if(id==='sticky'){latched.clear();if(state.sticky)status('Press and release Ctrl, then Alt, then A to open or close the panel. This shortcut also works in input fields.');}
    if(id==='simple'&&state.simple)status('Simple wording is on for headings, paragraphs, links, buttons, and labels.');
    if(id==='keyboard'&&state.keyboard)status('Navigate all page text and controls with arrow keys or Tab. Images are skipped. Use Tab to leave text fields, dropdowns, or video controls.');
    if(id==='captions'&&state.captions)status(updateCaptions()?'Available video captions enabled. Play the free lesson to see them.':'No caption tracks found. This website needs subtitle tracks for captions.');
    apply();
  }));
  root.querySelector('#rate').addEventListener('change',e=>{state.rate=normalizeReadingRate(Number(e.target.value));if(state.speech){speechGeneration++;clearTimeout(readingTimer);readingTimer=null;window.speechSynthesis.cancel();speakNext(speechGeneration);}apply();status(`Voice reading speed: ${state.rate}×.`);});
  root.querySelector('#align').addEventListener('change',e=>{state.align=e.target.value;apply();status(`All page text alignment: ${state.align}.`);});
  let stickyAltCaptured=false;
  document.addEventListener('keydown',e=>{
    const target=e.composedPath()[0];const typing=target.closest?.('input,textarea,select,video,audio,[contenteditable="true"]');
    const shortcutA=e.code==='KeyA'||e.key?.toLowerCase()==='a';
    // The modal owns Escape and focus while a confirmation is open.
    if(e.key==='Escape'&&(root.querySelector('dialog[open]')||document.querySelector('dialog[open]')))return;
    if(e.key==='Escape'&&!panel.hidden){e.preventDefault();latched.clear();openPanel(false);return;}
    if(e.ctrlKey&&e.altKey&&shortcutA){e.preventDefault();latched.clear();if(!e.repeat)openPanel(panel.hidden);return;}
    // The host/browser may restore old content focus after settings close.
    // Consume one forward Tab to start at the header, then keep native order.
    if(state.focus&&panel.hidden&&e.key==='Tab'&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
      const startAtHeader=pageFocusEntryPending&&!e.shiftKey;
      pageFocusEntryPending=false;
      if(startAtHeader||focused()===launcher){
        const pageControls=controls().filter(el=>!root.contains(el));
        const firstHeader=pageControls.find(el=>el.closest('header,[role="banner"]'));
        const next=e.shiftKey?pageControls.at(-1):startAtHeader?(firstHeader||pageControls[0]):pageControls[0];
        if(next){e.preventDefault();next.focus();return;}
      }
    }
    if(state.sticky){
      if(e.key==='Control'){latched.add('Control');return;}
      if(e.key==='Alt'){
        latched.add('Alt');
        // A standalone Alt normally hands focus to the browser menu on Windows.
        // Capture it only while forming this shortcut, including its key release.
        if(latched.has('Control')||e.ctrlKey){e.preventDefault();stickyAltCaptured=true;}
        return;
      }
      if(e.key==='Shift')return;
      if(shortcutA&&latched.has('Control')&&latched.has('Alt')){e.preventDefault();latched.clear();if(!e.repeat){openPanel(panel.hidden);status('Sticky Keys shortcut activated. Press Ctrl, then Alt, then A to toggle settings again.');}return;}
      latched.clear();
    }
    if(state.switches&&!typing){
      // Switch keys belong to this scanner. Dropdown libraries also listen for
      // Enter/Space; letting the original key through activates the same toggle
      // twice (or follows its parent link immediately after opening the menu).
      if(e.code==='Space'){e.preventDefault();e.stopImmediatePropagation();scan();return;}
      if(e.key==='Enter'&&scanned){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat){if(switchControls().includes(scanned))scanned.click();else clearScan();}return;}
    }
    if(state.keyboard&&!typing&&!e.ctrlKey&&!e.metaKey&&!e.altKey){if(['ArrowDown','ArrowRight','ArrowUp','ArrowLeft'].includes(e.key)){e.preventDefault();move(['ArrowDown','ArrowRight'].includes(e.key)?1:-1);}}
  },true);
  document.addEventListener('keyup',e=>{if(e.key==='Alt'&&stickyAltCaptured){e.preventDefault();stickyAltCaptured=false;}},true);
  window.addEventListener('blur',()=>{latched.clear();stickyAltCaptured=false;});
  document.addEventListener('loadedmetadata',updateCaptions,true);
  const observer=new MutationObserver(records=>{
    if(records.some(record=>{
      const parent=record.target.nodeType===Node.ELEMENT_NODE?record.target:record.target.parentElement;
      if(!parent||parent===host||parent.closest('#accessease-widget,script,style,noscript'))return false;
      return record.type==='childList'&&[...record.addedNodes].some(node=>node!==host&&!node.matches?.('[data-ae-focus-ring]')&&(node.nodeType===Node.ELEMENT_NODE||state.simple&&node.nodeType===Node.TEXT_NODE))||state.simple&&(record.type==='characterData'||record.type==='attributes');
    }))apply();
  });observer.observe(document.body,{childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','data-simple','aria-label','title','alt'],subtree:true});
  function resumeVoiceNavigation(){
    let continuation;
    try{
      continuation=JSON.parse(window.sessionStorage.getItem(voiceNavigationKey)||'null');
      window.sessionStorage.removeItem(voiceNavigationKey);
    }catch{return;}
    if(!continuation||continuation.origin!==window.location.origin||!Number.isFinite(continuation.expiresAt)||continuation.expiresAt<=Date.now())return;
    voiceRequested=true;state.voice=true;startVoice();apply();
  }
  window.addEventListener('pagehide',()=>{
    const continueVoice=state.voice;
    stopSpeech();stopVoice();
    // Keep the user's active choice only across this tab's same-origin pages.
    // Release the old page's microphone; the next page opens its own recognizer.
    if(continueVoice)try{window.sessionStorage.setItem(voiceNavigationKey,JSON.stringify({origin:window.location.origin,expiresAt:Date.now()+300000}));}catch{}
  });
  window.addEventListener('pageshow',event=>{
    if(!event.persisted)return;
    try{const preferences=JSON.parse(localStorage.getItem(key)||'{}');if(typeof preferences.switches==='boolean')state.switches=preferences.switches;}catch{}
    clearScan();apply();resumeVoiceNavigation();
  });
  window.AccessEase = {
    host, root, open:()=>openPanel(true), close:()=>openPanel(false), status,
    getSettings:()=>({...state}), reset,
    setSettings(patch={}) {
      // Imported preferences never start a microphone, speech playback or scanning.
      for(const name of Object.keys(defaults)) {
        if(['speech','voice','switches'].includes(name)) continue;
        if(typeof patch[name]===typeof defaults[name]) state[name]=patch[name];
      }
      state.rate=normalizeReadingRate(state.rate);
      if(!['original','left','center','right','justify'].includes(state.align))state.align='original';
      apply();
    },
    registerExtension(extension){teamExtension=extension;apply();},
    refresh:apply,
  };
  if(voiceRequested)setVoicePhase('resume','Voice Commands are saved. Select Resume microphone to listen again.');
  apply();
  resumeVoiceNavigation();
  // Load the shared feature bundle relative to this script on any host website.
  const teamScript=document.createElement('script');
  teamScript.src=new URL('team-features.js?v=20261027-white-header',document.currentScript.src).href;
  teamScript.onerror=()=>status('Additional settings could not load. Check the widget asset files.');
  document.head.append(teamScript);
})();
