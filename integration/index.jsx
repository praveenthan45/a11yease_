import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal, flushSync } from 'react-dom';
import { createContentEngine } from '../visual-accessibility-widget/src/engine/contentEngine.js';
import { createReadingEngine } from '../visual-accessibility-widget/src/engine/readingEngine.js';
import { DEFAULT_SETTINGS, SPACING_PRESETS, normalizeSettings } from '../visual-accessibility-widget/src/engine/preferenceStore.js';
import { COLOR_MODES } from '../visual-accessibility-widget/src/colorVision/colorModes.js';
import { SettingsProvider, useA11ySettings } from '../AssistAccess/src/accessibility/core/SettingsContext.jsx';
import { ConfirmProvider } from '../AssistAccess/src/accessibility/core/confirm/ConfirmContext.jsx';
import { AuditProvider } from '../AssistAccess/src/accessibility/core/audit/AuditContext.jsx';
import { AltTextProvider } from '../AssistAccess/src/accessibility/features/altText/AltTextContext.jsx';
import RouteAnnouncer from '../AssistAccess/src/accessibility/features/announcements/RouteAnnouncer.jsx';
import { normalizeConfig } from '../AssistAccess/src/accessibility/config.js';
import { createStrings } from '../AssistAccess/src/accessibility/strings.js';
import { setToolbarHost } from '../AssistAccess/src/accessibility/core/dom/domPatches.js';
import { createDefaultSettings, snapshotSettingsPatch } from '../AssistAccess/src/accessibility/core/settingsSchema.js';
import { a11yFeatures } from '../AssistAccess/src/accessibility/features/registry.js';
import { getStylesText } from '../AssistAccess/src/accessibility/ui/styles/index.js';
import { FORM_STYLES, CONFIRM_STYLES } from '../AssistAccess/src/accessibility/patterns/appStyles.js';
import { summarize, validateImport } from './helpers.js';
import css from './team.css?inline';
import themeCss from '../dist/ui-theme.css?inline';
import brandCss from '../dist/brand.css?inline';
import categorizedCss from './settingsLayout.css?inline';
import { createSettingsLayout } from './settingsLayout.js';
import DemoForms from './DemoForms.jsx';
import SettingIcon from './SettingIcon.jsx';
import { showImageAltText } from './imageAltText.js';
import useFlashGuard from '../AssistAccess/src/accessibility/features/flashing/useFlashGuard.js';
import { createSudhinFeatures } from './sudhinFeatures.js';
import { consumerPanels } from './ConsumerPanels.jsx';
import AudioTranscripts from './AudioTranscripts.jsx';
import { collectSteps, stepLabel, focusStep } from './stepGuide.js';
import { installPanelLanguage } from './panelLanguage.js';
import languageCss from './panelLanguage.css?inline';
import widgetThemeCss from './widgetTheme.css?inline';
import AdditionalSettings from './AdditionalSettings.jsx';
import { additionalCards, DEFAULT_ADDITIONAL, normalizeAdditional, additionalActive, effectiveVisualSettings } from './additionalPreferences.js';
import { createCognitiveReading } from './cognitiveReading.js';
import { createWidgetAppearance } from './widgetAppearance.js';

const base = window.AccessEase;
let settingsLayout;
const storageKey = 'accessease.team.preferences.v2';
const assistStorageKey = 'accessease.team.assist.v2.settings';
const activationMigrationKey = 'accessease.team.activation-defaults.v1';
function initializeInactiveAssistDefaults() {
  try {
    const stored = localStorage.getItem(assistStorageKey);
    if (stored && localStorage.getItem(activationMigrationKey)) return;
    let saved;
    try { saved = JSON.parse(stored || '{}'); } catch { saved = {}; }
    const settings = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    settings.reader = {...settings.reader, auditEnabled:false};
    settings.forms = {...settings.forms, passwordToggle:false};
    localStorage.setItem(assistStorageKey, JSON.stringify(settings));
    localStorage.setItem(activationMigrationKey, '1');
  } catch { /* If storage is blocked, keep the provider's normal fallback. */ }
}
initializeInactiveAssistDefaults();
const toolsDefault = Object.freeze({ audioTranscripts:false, summary:false, progress:false, distraction:false, steps:false, notifications:false, liveCaptions:false, simplifiedNav:false, 'alt-text':false });
const defaultNavin = createDefaultSettings();
let visual = { ...DEFAULT_SETTINGS }, tools = { ...toolsDefault }, additional = { ...DEFAULT_ADDITIONAL }, navin = null, visualEngine, readingEngine, cognitiveReadingEngine, widgetAppearance, ui;
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
  visual = normalizeSettings(saved.visual);
  additional = normalizeAdditional(saved.additional);
  // Drop retired or invalid preference keys without changing other saved groups.
  if(saved.additional && JSON.stringify(saved.additional)!==JSON.stringify(additional))localStorage.setItem(storageKey,JSON.stringify({...saved,additional}));
  for (const key of Object.keys(tools)) if (typeof saved.tools?.[key] === 'boolean') tools[key] = saved.tools[key];
} catch { /* Keep defaults when storage is unavailable or invalid. */ }

const visualCards = [
  ['fontScale','Text Size','Aa'], ['contrast','High Contrast Mode','◐'], ['dark','Dark Mode','☾'],
  ['light','Light Mode','☀'], ['grayscale','Grayscale Mode','◒'], ['colorVisionMode','Color Blindness Mode','◉'],
  ['spacingPreset','Text Spacing','↔'], ['magnifier','Text Magnifier','⌕'], ['highlightLinks','Highlight Links','↗'],
  ['dyslexiaFont','Dyslexia Mode','Aa'], ['readingGuide','Reading Guide','━'], ['readingMask','Reading Mask','▰'],
];
const toolCards = [
  ['audioTranscripts','Audio Transcripts','≡'], ['summary','Content Summary','☷'], ['progress','Reading Progress','◴'],
  ['distraction','Distraction-Free Mode','◈'], ['steps','Step-by-Step Guide','↳'], ['notifications','Visual Notifications','♧'],
];
const navinFeatures = a11yFeatures.filter(feature => !['reset','preferences','profiles'].includes(feature.id));
const motionCards = [['reduce-motion','Reduce Motion'],['pause-animations','Pause Animations'],['pause-auto-media','Stop Auto-Playing Media'],['flashing','Flashing Content Protection']];

function persist() {
  try { localStorage.setItem(storageKey, JSON.stringify({visual,tools,additional})); } catch { /* Session-only preferences. */ }
}
function changedVisual(id) {
  return ['contrast','dark','light'].includes(id) ? visual.theme === id : JSON.stringify(visual[id]) !== JSON.stringify(DEFAULT_SETTINGS[id]);
}
function navinActiveCount() {
  return navinFeatures.filter(feature=>feature.id!=='flashing'&&navinAdjusted(feature.id)).length + motionCards.filter(([id])=>motionAdjusted(id)).length;
}
function motionAdjusted(id) {
  if(!navin)return false;
  const motion=navin.settings.motion;
  return id==='reduce-motion'?motion.reduceMotion!==defaultNavin.motion.reduceMotion||motion.motionStrategy!==defaultNavin.motion.motionStrategy:id==='pause-animations'?motion.pauseAnimations:id==='pause-auto-media'?motion.pauseAutoMedia:motion.flashGuard.enabled;
}
function navinAdjusted(id) {
  if(!navin)return false;
  const s=navin.settings, d=defaultNavin;
  if(id==='visuals')return JSON.stringify(s.visual)!==JSON.stringify(d.visual);
  if(id==='flashing')return JSON.stringify(s.motion)!==JSON.stringify(d.motion);
  if(id==='screen-reader')return s.reader.auditEnabled!==false;
  if(id==='announcements')return s.reader.announceVerbosity!==d.reader.announceVerbosity||s.reader.announceRouteChanges!==d.reader.announceRouteChanges||s.ui.announceOnChange!==d.ui.announceOnChange;
  if(id==='password')return s.forms.passwordToggle!==false;
  if(id==='error-messages')return s.forms.announceErrors!==d.forms.announceErrors;
  return false;
}
function snapshot() {
  return {base:base.getSettings(),visual:{...visual},tools:{...tools},additional:{...additional},assist:navin ? snapshotSettingsPatch(navin.settings) : {}};
}
function applyVisualSettings() {
  const effective=effectiveVisualSettings(visual,additional);
  visualEngine.apply(effective);readingEngine.apply(effective);
  cognitiveReadingEngine?.apply(additional.cognitiveReading);
  widgetAppearance?.apply(effective,base.getSettings());
}
function changeAdditional(patch) {
  additional=normalizeAdditional({...additional,...patch});applyVisualSettings();persist();ui?.();base.refresh();base.status('Accessibility settings updated.');
}
function changeVisual(patch, message='Visual settings updated.') {
  visual=normalizeSettings({...visual,...patch});
  applyVisualSettings(); persist(); ui?.(); base.refresh(); base.status(message);
}
function changeTool(key, value) {
  tools={...tools,[key]:value}; persist(); ui?.(); base.refresh();
  base.status(`${toolCards.find(card=>card[0]===key)?.[1]||({liveCaptions:'Live Captions',simplifiedNav:'Simplify Navigation','alt-text':'Image alternative text'})[key]||key} ${value?'enabled':'disabled'}.`);
}
function resetTeam({persistImmediately=false}={}) {
  const resetControls=()=>{
    additional={...DEFAULT_ADDITIONAL};
    changeVisual({...DEFAULT_SETTINGS},'All visual settings reset.');
    tools={...toolsDefault}; persist(); ui?.();
    navin?.actions.resetScope('all');
    // These module defaults are enabled, but Reset all must leave every visible toggle off.
    navin?.actions.setReader('auditEnabled',false);
    navin?.actions.setForms('passwordToggle',false);
  };
  if(persistImmediately){
    // Commit the reset before saveNow reads the provider and the page reloads.
    flushSync(resetControls);
    navin?.actions.saveNow();
  }else resetControls();
}
function restoreSnapshot(settings) {
  // Each module validates its own values. Imported data cannot start voice input.
  additional=normalizeAdditional(settings.additional);
  base.setSettings(settings.base||{});
  visual=normalizeSettings(settings.visual);
  tools={...toolsDefault};
  for(const key of Object.keys(tools)) if(typeof settings.tools?.[key]==='boolean')tools[key]=settings.tools[key];
  navin?.actions.applyProfile({id:'custom',label:'Imported preferences',patch:settings.assist||{}});
  changeVisual(visual,'Preferences applied.');
}

function Card(props) {
  return createPortal(<SettingCard {...props}/>,settingsLayout.targetFor(props.id));
}
function SettingCard({id,title,active=false,children}) {
  const visualToggle=['contrast','dark','light','grayscale','magnifier','highlightLinks','dyslexiaFont','readingGuide','readingMask'].includes(id);
  const toolToggle=Object.hasOwn(tools,id);
  const assistToggle={password:['forms','passwordToggle'],'error-messages':['forms','announceErrors'],'screen-reader':['reader','auditEnabled'],visuals:['visual','enabled']}[id];
  if(visualToggle||toolToggle||assistToggle){
    const enabled=visualToggle?(['contrast','dark','light'].includes(id)?visual.theme===id:visual[id]):toolToggle?tools[id]:navin?.settings[assistToggle[0]][assistToggle[1]];
    const toggle=()=>{if(visualToggle)changeVisual(['contrast','dark','light'].includes(id)?{theme:enabled?'default':id}:{[id]:!enabled});else if(toolToggle)changeTool(id,!enabled);else if(id==='visuals')navin.actions.setVisualEnabled(!enabled);else navin.actions[assistToggle[0]==='forms'?'setForms':'setReader'](assistToggle[1],!enabled);};
    const options=['readingGuide','readingMask','audioTranscripts','summary','steps','password','error-messages','screen-reader','visuals'].includes(id);
    return <section className={`team-card direct-card${enabled?' active':''}`} data-team-card={id}>
      <div className="direct-card-header"><span className="team-icon" aria-hidden="true"><SettingIcon id={id}/></span><strong className="card-title">{title}</strong><button type="button" className="card-enable" role="switch" aria-label={title} aria-checked={Boolean(enabled)} onClick={toggle}><span className="card-switch-thumb" aria-hidden="true"/></button></div>
      <div className={`team-options direct-options${options&&enabled?'':' direct-options-hidden'}`}>{children}</div>
    </section>;
  }
  return <details className={`team-card${active?' active':''}`} data-team-card={id}>
    <summary aria-label={`${title} options`}><span className="team-icon" aria-hidden="true"><SettingIcon id={id}/></span><span>{title}</span><small>{active?'Adjusted':'Options'}</small></summary>
    <div className="team-options">{children}</div>
  </details>;
}
function Toggle({label,value,onChange}) {
  return <div className="team-row"><span style={{flex:1}}>{label}</span><button type="button" aria-label={label} aria-pressed={value} onClick={()=>onChange(!value)}>{value?'On':'Off'}</button></div>;
}
function MotionCards() {
  const {settings,actions,meta,strings}=useA11ySettings();
  useFlashGuard();
  useEffect(()=>{
    if(settings.motion.flashGuard.enabled&&settings.motion.flashGuard.action!=='pause')actions.setFlashGuard('action','pause');
  },[settings.motion.flashGuard.enabled,settings.motion.flashGuard.action,actions]);
  return motionCards.map(([id,title])=>{
    if(id==='pause-animations'||id==='pause-auto-media'){
      const key=id==='pause-animations'?'pauseAnimations':'pauseAutoMedia',enabled=settings.motion[key];
      return <section key={id} className={`team-card direct-card${enabled?' active':''}`} data-team-card={id} aria-label={title}><div className="direct-card-header"><span className="team-icon" aria-hidden="true"><SettingIcon id={id}/></span><strong className="card-title">{title}</strong><button type="button" className="card-enable" role="switch" aria-label={title} aria-checked={enabled} onClick={()=>actions.setMotion(key,!enabled)}><span className="card-switch-thumb" aria-hidden="true"/></button></div></section>;
    }
    if(id==='reduce-motion')return <details key={id} className={`team-card motion-card${motionAdjusted(id)?' active':''}`} data-team-card={id}>
      <summary aria-label={`${title} options`}><span className="team-icon" aria-hidden="true"><SettingIcon id={id}/></span><span>{title}</span></summary>
      <div className="team-options"><Toggle label={title} value={meta.effectiveReducedMotion} onChange={on=>actions.setMotion('reduceMotion',on?'on':'off')}/><p className="team-description">{settings.motion.reduceMotion==='system'?'Following your device motion preference.':strings.motion.reduceMotionHint}</p><button onClick={()=>actions.setMotion('reduceMotion','system')}>Use my system setting</button><label htmlFor="motion-strategy">How animations are handled</label><select id="motion-strategy" value={settings.motion.motionStrategy} onChange={event=>actions.setMotion('motionStrategy',event.target.value)}><option value="instant">Finish immediately</option><option value="pause">Pause at current frame</option></select><p className="team-description">{strings.motion.strategyHint}</p></div>
    </details>;
    if(id==='flashing')return <section key={id} className={`team-card direct-card${motionAdjusted(id)?' active':''}`} data-team-card={id} aria-label={title}>
      <div className="direct-card-header"><span className="team-icon" aria-hidden="true"><SettingIcon id={id}/></span><strong className="card-title">{title}</strong><button type="button" className="card-enable" role="switch" aria-label={title} aria-checked={settings.motion.flashGuard.enabled} onClick={()=>actions.setFlashGuard('enabled',!settings.motion.flashGuard.enabled)}><span className="card-switch-thumb" aria-hidden="true"/></button></div>
    </section>;
    return <section key={id} className={`team-card motion-card${motionAdjusted(id)?' active':''}`} data-team-card={id} aria-label={title}>
    <h3 className="motion-title"><span className="team-icon" aria-hidden="true"><SettingIcon id={id}/></span><span>{title}</span></h3>
    <div className="team-options">{id==='pause-animations'?<><Toggle label={title} value={settings.motion.pauseAnimations} onChange={on=>actions.setMotion('pauseAnimations',on)}/><p className="team-description">{strings.motion.pauseAnimationsHint}</p></>:<><Toggle label={title} value={settings.motion.pauseAutoMedia} onChange={on=>actions.setMotion('pauseAutoMedia',on)}/><p className="team-description">{strings.motion.pauseMediaHint}</p></>}</div>
  </section>;
  });
}
function Range({id,label,value,min,max,step=1,onChange,suffix=''}) {
  return <div className="team-row"><label htmlFor={`team-${id}`}>{label}</label><input id={`team-${id}`} type="range" min={min} max={max} step={step} value={value} onChange={event=>onChange(Number(event.target.value))}/><output htmlFor={`team-${id}`}>{value}{suffix}</output></div>;
}
function VisualOptions({id}) {
  if(id==='fontScale')return <><p className="team-description">Resize all page text. The settings panel keeps its own size.</p><div className="team-row"><button aria-label="Decrease Text Size" disabled={visual.fontScale<=.5} onClick={()=>changeVisual({fontScale:visual.fontScale-.1})}>−</button><button aria-label="Reset Text Size" onClick={()=>changeVisual({fontScale:1})}>{Math.round(visual.fontScale*100)}%</button><button aria-label="Increase Text Size" disabled={visual.fontScale>=2} onClick={()=>changeVisual({fontScale:visual.fontScale+.1})}>+</button></div></>;
  if(['contrast','dark','light'].includes(id))return <Toggle label={visualCards.find(card=>card[0]===id)[1]} value={visual.theme===id} onChange={on=>changeVisual({theme:on?id:'default'})}/>;
  if(id==='colorVisionMode')return <div className="team-row"><label htmlFor="team-color-mode">Color palette</label><select id="team-color-mode" value={visual.colorVisionMode} onChange={event=>changeVisual({colorVisionMode:event.target.value})}>{COLOR_MODES.map(mode=><option key={mode.id} value={mode.id}>{mode.name}</option>)}</select><p className="team-description">Changes website backgrounds, text and controls to the selected assistance palette. Normal / Default restores original colors. Images and video keep their original colors.</p></div>;
  if(id==='spacingPreset')return <><div className="team-row"><label htmlFor="team-spacing">Spacing preset</label><select id="team-spacing" value={visual.spacingPreset} onChange={event=>changeVisual({spacingPreset:event.target.value,...(SPACING_PRESETS[event.target.value]||{}),customSpacingOverrides:[]})}>{['default','comfortable','wide','custom'].map(preset=><option key={preset}>{preset}</option>)}</select></div>{visual.spacingPreset==='custom'&&[['lineHeight','Line height',1.2,2.5,.1,'×'],['letterSpacing','Letter spacing',0,.2,.01,'em'],['paragraphSpacing','Paragraph spacing',0,3,.1,'em']].map(([key,label,min,max,step,suffix])=><Range key={key} id={key} label={label} value={visual[key]} min={min} max={max} step={step} suffix={suffix} onChange={value=>changeVisual({[key]:value,customSpacingOverrides:[...new Set([...visual.customSpacingOverrides,key])]})}/>)}</>;
  return <><Toggle label={visualCards.find(card=>card[0]===id)[1]} value={visual[id]} onChange={value=>changeVisual({[id]:value})}/>
    {id==='magnifier'&&<div className="team-row"><p>Magnification: 1.5×</p><p className="team-description">Move the pointer over text or focus a text control to enlarge it.</p></div>}
    {id==='readingGuide'&&<Range id="guideHeight" label="Guide height" value={visual.guideHeight} min={2} max={24} step={2} suffix="px" onChange={value=>changeVisual({guideHeight:value})}/>}
    {id==='readingMask'&&<Range id="maskHeight" label="Reading band height" value={visual.maskHeight} min={60} max={540} step={10} suffix="px" onChange={value=>changeVisual({maskHeight:value})}/>}
    {id==='dyslexiaFont'&&<p className="team-description">Uses the bundled OpenDyslexic font, including its bold and italic variants.</p>}
  </>;
}

function ReadingOverlays() {
  // Keep active reading aids outside the panel's hidden subtree.
  // The portal shares the same shadow root and settings lifecycle.
  return createPortal(<><div className="guide" hidden/><div className="mask mask-top" hidden/><div className="mask mask-bottom" hidden/>
    <section className="magnifier" aria-label="Magnified text" hidden><p className="magnifier-text"/></section>
    <button className="overlay-close" hidden>Dismiss reading mask</button>
    {['left','right'].map(side=><div key={side} className={`reading-size-controls reading-size-${side}`} hidden>{[['guideHeight','readingGuide'],['maskHeight','readingMask']].map(([key,feature])=><button key={key} data-reading-key={key} data-reading-feature={feature} data-reading-step={side==='left'?-1:1} aria-label={`${side==='left'?'Decrease':'Increase'} ${feature==='readingGuide'?'reading guide':'reading mask'} size`} onClick={()=>changeVisual({[key]:visual[key]+(side==='left'?-1:1)*(key==='guideHeight'?2:10)})}>{side==='left'?'−':'+'}</button>)}</div>)}
    <div hidden><input data-setting="maskHeight" readOnly/><output data-output="maskHeight"/></div>
  </>, base.root);
}

function Tools({refresh}) {
  const [summary,setSummary]=useState([]), [step,setStep]=useState(0), [headings,setHeadings]=useState([]), [notice,setNotice]=useState(''), [progress,setProgress]=useState(0), [timeState,setTimeState]=useState('');
  const timer=useRef(),stepFocusCleanup=useRef(),stepTargets=useRef([]),stepIndex=useRef(0);
  stepTargets.current=headings;stepIndex.current=step;
  useEffect(()=>{
    if(!tools.summary){setSummary([]);return;}
    const scope=document.querySelector('main,[role="main"]')||document.body;
    const content=[...scope.querySelectorAll('p,blockquote')]
      .filter(el=>!el.closest('aside,nav,footer,form,#audit,#test-guide,[id^="guide-"],[hidden],[aria-hidden="true"],[data-a11ytb-injected],[role="status"],.lab-note,.motion-intro')&&el.getClientRects().length&&!el.querySelector('a,button'))
      .map(el=>el.innerText?.trim()||el.textContent?.trim()||'')
      .filter(text=>! /^(?:compare|enable|start|try|open|use|select|hover|turn|watch|listen|hear|read|click|press|choose|adjust|increase|decrease|answer|submit|check|reset|pause|reduce|go to|follow)\b/i.test(text));
    setSummary(summarize(content));
  },[tools.summary,refresh]);
  useEffect(()=>{
    if(!tools.progress){setProgress(0);return;}
    let frame;
    const measure=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>setProgress(Math.round(Math.min(100,Math.max(0,window.scrollY/Math.max(1,document.documentElement.scrollHeight-window.innerHeight)*100)))));};
    measure();window.addEventListener('scroll',measure,{passive:true});window.addEventListener('resize',measure);
    return ()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',measure);window.removeEventListener('resize',measure);};
  },[tools.progress]);
  useEffect(()=>{
    if(!tools.distraction)return;
    const style=document.createElement('style');style.dataset.a11ytbInjected='';
    style.textContent='[data-ae-distraction],[data-ad],.advertisement,.ad-banner,.cookie-banner,aside:not([data-a11ytb-injected]){display:none!important}';
    document.head.append(style);return()=>style.remove();
  },[tools.distraction]);
  useEffect(()=>{
    if(!tools.steps){setHeadings([]);return;}
    let frame;
    function scan(){
      const next=collectSteps(document),previous=stepTargets.current,current=previous[stepIndex.current];
      if(next.length===previous.length&&next.every((element,index)=>element===previous[index]))return;
      const retained=next.indexOf(current);setHeadings(next);setStep(retained>=0?retained:Math.max(0,Math.min(stepIndex.current,next.length-1)));
    }
    const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(scan);};
    const observer=new MutationObserver(schedule);
    observer.observe(document.querySelector('main,[role="main"]')||document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','aria-hidden','disabled','aria-disabled','inert','class','style','open','type']});
    document.addEventListener('toggle',schedule,true);window.addEventListener('resize',schedule);scan();
    return()=>{cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('toggle',schedule,true);window.removeEventListener('resize',schedule);stepFocusCleanup.current?.();stepFocusCleanup.current=null;};
  },[tools.steps,refresh]);
  useEffect(()=>{
    if(!tools.steps)return;
    const style=document.createElement('style');style.dataset.a11ytbInjected='';
    style.textContent='[data-ae-current-step]{outline:3px solid #2563eb!important;outline-offset:8px!important;border-radius:5px}[data-ae-current-step]::before{content:attr(data-ae-current-step);display:block;width:max-content;margin-bottom:10px;padding:3px 10px;border-radius:5px;background:#2563eb;color:#fff;font:600 12px/1.5 Arial,sans-serif;letter-spacing:0}';
    document.head.append(style);return()=>style.remove();
  },[tools.steps]);
  useEffect(()=>{
    if(!tools.steps)return;
    const target=headings[step];if(!target)return;
    const previous=target.getAttribute('data-ae-current-step'),current=target.getAttribute('aria-current');
    target.setAttribute('data-ae-current-step',`Step ${step+1} of ${headings.length}`);target.setAttribute('aria-current','step');
    return()=>{previous===null?target.removeAttribute('data-ae-current-step'):target.setAttribute('data-ae-current-step',previous);current===null?target.removeAttribute('aria-current'):target.setAttribute('aria-current',current);};
  },[tools.steps,step,headings]);
  useEffect(()=>{
    if(!tools.notifications){setNotice('');return;}
    function show(text){if(!text)return;setNotice(text.slice(0,220));clearTimeout(timer.current);timer.current=setTimeout(()=>setNotice(''),5000);}
    const invalid=event=>show(event.target.validationMessage||'Check the highlighted field.');
    const observer=new MutationObserver(records=>{
      const node=records.map(record=>record.target.nodeType===1?record.target:record.target.parentElement).find(el=>el?.closest('[role=status],[role=alert],[aria-live=polite],[aria-live=assertive]'));
      if(node&&!node.closest('#accessease-widget,[data-a11ytb-injected]'))show(node.closest('[role=status],[role=alert],[aria-live]')?.textContent.trim());
    });
    observer.observe(document.body,{childList:true,characterData:true,subtree:true});document.addEventListener('invalid',invalid,true);
    return ()=>{observer.disconnect();document.removeEventListener('invalid',invalid,true);clearTimeout(timer.current);};
  },[tools.notifications]);
  function goTo(index){const next=Math.max(0,Math.min(index,headings.length-1));setStep(next);const target=headings[next];if(!target)return;stepFocusCleanup.current?.();stepFocusCleanup.current=focusStep(target);}
  async function extendTime(){
    const callback=window.AccessEaseConfig?.extendSession;
    if(typeof callback!=='function'){setTimeState('This website has not connected a session-extension service. No timeout has been changed.');return;}
    setTimeState('Requesting 5 more minutes…');
    try{const result=await callback({minutes:5});setTimeState(result===true||result?.extended===true?'The website confirmed a 5-minute extension.':'The website did not confirm an extension.');}catch{setTimeState('The extension request failed. Please try again.');}
  }
  return <>
    {toolCards.map(([id,title,symbol])=><Card key={id} id={id} title={title} symbol={symbol} active={tools[id]}><Toggle label={title} value={tools[id]} onChange={value=>changeTool(id,value)}/>
      {id==='audioTranscripts'&&<AudioTranscripts enabled={tools.audioTranscripts}/>}
      {id==='summary'&&<p className="team-description">Creates up to five key points in a separate page card.</p>}
      {id==='progress'&&<p className="team-description">Shows how far you have scrolled through this page.</p>}
      {id==='distraction'&&<p className="team-description">Hides marked ads, sidebars and cookie banners. Main content stays available.</p>}
      {id==='steps'&&<>{tools.steps&&<ol>{headings.map((heading,i)=><li key={i}><button data-panel-original-content aria-current={i===step?'step':undefined} onClick={()=>{base.close();goTo(i);}}>{i+1}. {stepLabel(heading)}</button></li>)}</ol>}</>}
      {id==='notifications'&&<p className="team-description">Shows a visible, non-flashing message for form errors and page status updates.</p>}
    </Card>)}
    <Card id="timeLimits" title="Extend Session Time" symbol="◷"><p className="team-description">Requires this website to provide a session-extension service.</p><button onClick={extendTime}>Request 5 more minutes</button><p role="status">{timeState}</p></Card>
    {createPortal(<>
    {tools.progress&&<><div className="team-progress" style={{width:`${progress}%`}}/><div className="team-progress-label">{progress}% read</div></>}
    {tools.summary&&<aside className="team-summary-card" aria-labelledby="team-summary-title"><header><div><span className="team-summary-eyebrow">PAGE TAKEAWAYS</span><h2 id="team-summary-title">Content Summary</h2></div><button type="button" aria-label="Close content summary" onClick={()=>changeTool('summary',false)}>×</button></header>{summary.length?<ul>{summary.map((line,index)=><li key={`${index}-${line}`}>{line}</li>)}</ul>:<p role="status">No readable page text found to summarize.</p>}</aside>}
    {tools.steps&&headings.length>0&&<div className="team-step"><button disabled={step===0} aria-label="Previous guide step" onClick={()=>goTo(step-1)}>←</button><span aria-live="polite">{step+1}/{headings.length} · {headings[step]?stepLabel(headings[step]):''}</span><button disabled={step===headings.length-1} aria-label="Next guide step" onClick={()=>goTo(step+1)}>→</button></div>}
    {notice&&<div className="team-toast">{notice}</div>}
    </>, base.root)}
  </>;
}

function Preferences() {
  const [message,setMessage]=useState(''), [profileName,setProfileName]=useState(''), [profiles,setProfiles]=useState(()=>{
    try{const value=JSON.parse(localStorage.getItem('accessease.team.profiles.v2')||'[]');return Array.isArray(value)?value.slice(0,10).filter(item=>typeof item.name==='string'&&item.settings):[];}catch{return [];}
  });
  function exportSettings(){const link=document.createElement('a');const url=URL.createObjectURL(new Blob([JSON.stringify({kind:'accessease-preferences',version:2,settings:snapshot()},null,2)],{type:'application/json'}));link.href=url;link.download='pluga11y-preferences.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('Preferences exported. No page input values are included.');}
  async function importSettings(event){const file=event.target.files?.[0];if(!file)return;try{if(file.size>100000)throw new Error('Preferences file must be smaller than 100 KB.');restoreSnapshot(validateImport(JSON.parse(await file.text())));setMessage('Preferences imported for all features.');}catch(error){setMessage(error.message);}event.target.value='';}
  function builtIn(id){base.reset();if(id==='reading'){changeVisual({...SPACING_PRESETS.comfortable,spacingPreset:'comfortable',dyslexiaFont:true});base.setSettings({focus:true});}if(id==='lowMotion'){navin.actions.applyProfile({id:'reducedMotion',label:'Reduced motion',patch:{motion:{reduceMotion:'on',pauseAnimations:true,pauseAutoMedia:true}}});}if(id==='contrast'){changeVisual({theme:'contrast'});base.setSettings({focus:true,targets:true});}}
  function saveProfile(){const name=profileName.trim().slice(0,50);if(!name)return;const next=[...profiles.filter(profile=>profile.name!==name),{name,settings:snapshot()}].slice(-10);setProfiles(next);try{localStorage.setItem('accessease.team.profiles.v2',JSON.stringify(next));setMessage('Profile saved.');}catch{setMessage('Profile is available for this visit; browser storage is unavailable.');}setProfileName('');}
  return <><Card id="preferences" title="Saved Preferences" symbol="⇄"><p className="team-description">Export or import preferences for all four modules together. Microphone and speech playback require a new user action.</p><div className="team-row"><button onClick={exportSettings}>Export preferences</button><label htmlFor="team-import">Import preferences</label><input id="team-import" type="file" accept=".json,application/json" onChange={importSettings}/></div><p role="status">{message}</p></Card>
    <Card id="profiles" title="Accessibility Profiles" symbol="◉"><div className="team-row">{[['default','Default'],['reading','Comfortable reading'],['lowMotion','Reduced motion'],['contrast','Enhanced contrast']].map(([id,label])=><button key={id} onClick={()=>builtIn(id)}>{label}</button>)}</div><div className="team-row"><label htmlFor="team-profile-name">Save current preferences as</label><input id="team-profile-name" maxLength={50} value={profileName} onChange={event=>setProfileName(event.target.value)}/><button disabled={!profileName.trim()} onClick={saveProfile}>Save profile</button></div>{profiles.map(profile=><button data-panel-original-content style={{margin:5}} key={profile.name} onClick={()=>restoreSnapshot(profile.settings)}>{profile.name}</button>)}</Card></>;
}

function UnifiedControls() {
  useEffect(()=>tools['alt-text']?showImageAltText({host:base.host}):undefined,[tools['alt-text']]);
  const context=useA11ySettings();navin=context;
  const [revision,setRevision]=useState(0), [refresh,setRefresh]=useState(0);
  ui=()=>setRevision(value=>value+1);
  useEffect(()=>{
    visualEngine=createContentEngine({root:document.body,host:base.host});
    readingEngine=createReadingEngine({shadow:base.root,root:document.body,update:changeVisual});
    cognitiveReadingEngine=createCognitiveReading({root:document.body,host:base.host});
    widgetAppearance=createWidgetAppearance(base);
    applyVisualSettings();
    base.registerExtension({activeCount:()=>visualCards.filter(([id])=>changedVisual(id)).length+Object.values(tools).filter(Boolean).length+additionalCards.filter(([id])=>additionalActive(additional,id)).length+navinActiveCount(),reset:resetTeam});
    window.AccessEaseTeam={getSettings:snapshot,setSettings:restoreSnapshot,reset:()=>base.reset(),refresh:()=>setRefresh(value=>value+1)};
    base.host.dataset.teamReady='true';
    base.host.dispatchEvent(new CustomEvent('accessease:ready'));
    const listen=()=>{widgetAppearance.apply(effectiveVisualSettings(visual,additional),base.getSettings());setRevision(value=>value+1);};
    base.host.addEventListener('accessease:change',listen);
    return()=>{base.host.removeEventListener('accessease:change',listen);widgetAppearance.destroy();cognitiveReadingEngine.destroy();readingEngine.destroy();visualEngine.destroy();};
  },[]);
  useEffect(()=>{
    const panel=base.root.querySelector('.panel');
    const handle=panel?.querySelector('.top');
    if(!panel||!handle)return undefined;
    const key='accessease.panel.position.v1';
    let drag=null,position=null;
    const clamp=(value,min,max)=>Math.min(Math.max(value,min),Math.max(min,max));
    const viewportWidth=()=>document.documentElement.clientWidth||window.innerWidth;
    const setPosition=(left,top)=>{
      if(panel.hidden||viewportWidth()<=540)return;
      const rect=panel.getBoundingClientRect();
      const x=clamp(left,0,viewportWidth()-rect.width),y=clamp(top,0,window.innerHeight-rect.height);
      panel.style.inset='auto';panel.style.left=`${x}px`;panel.style.top=`${y}px`;panel.style.right='auto';panel.style.bottom='auto';panel.style.margin='0';
      position={left:x,top:y};
    };
    const save=()=>{
      if(!position)return;
      try{localStorage.setItem(key,JSON.stringify(position));}catch{}
    };
    try{
      // Old resizable dimensions must not override the fixed, responsive size.
      localStorage.removeItem('accessease.panel.geometry.v1');
      const saved=JSON.parse(localStorage.getItem(key)||'null');
      if(saved&&[saved.left,saved.top].every(Number.isFinite))position={left:saved.left,top:saved.top};
    }catch{}
    const reposition=()=>{
      const movable=viewportWidth()>540;
      handle.tabIndex=movable?0:-1;
      if(movable){
        handle.setAttribute('aria-label','Move the accessibility panel with the arrow keys');
        if(position)setPosition(position.left,position.top);
      }else{
        drag=null;handle.removeAttribute('aria-label');
        for(const property of ['inset','left','top','right','bottom','margin'])panel.style.removeProperty(property);
      }
    };
    const start=event=>{
      if(viewportWidth()<=540||event.button!==undefined&&event.button!==0||event.target.closest('button,a,input,select,textarea'))return;
      const rect=panel.getBoundingClientRect();
      drag={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,left:rect.left,top:rect.top};
      setPosition(rect.left,rect.top);
      event.preventDefault();handle.setPointerCapture?.(event.pointerId);
    };
    const move=event=>{if(!drag||event.pointerId!==drag.pointerId)return;setPosition(drag.left+event.clientX-drag.startX,drag.top+event.clientY-drag.startY);};
    const stop=event=>{if(!drag||event.pointerId!==drag.pointerId)return;drag=null;save();};
    const keydown=event=>{
      if(viewportWidth()<=540||event.target!==handle||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;
      const rect=panel.getBoundingClientRect(),step=event.shiftKey?40:15;
      setPosition(rect.left+(event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0),rect.top+(event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0));save();event.preventDefault();
    };
    handle.addEventListener('pointerdown',start);handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',stop);handle.addEventListener('pointercancel',stop);handle.addEventListener('keydown',keydown);
    const observer=new MutationObserver(reposition);
    observer.observe(panel,{attributes:true,attributeFilter:['hidden']});
    window.addEventListener('resize',reposition);
    reposition();
    return()=>{handle.removeEventListener('pointerdown',start);handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',stop);handle.removeEventListener('pointercancel',stop);handle.removeEventListener('keydown',keydown);observer.disconnect();window.removeEventListener('resize',reposition);};
  },[]);
  useEffect(()=>{
    const features=createSudhinFeatures({host:base.host,root:base.root,status:base.status});
    features.apply(tools);
    return ()=>features.destroy();
  },[tools.liveCaptions,tools.simplifiedNav]);
  useEffect(()=>{if(additionalCards.some(([id])=>additionalActive(additional,id)))applyVisualSettings();base.refresh();},[context.settings]);
  return <><RouteAnnouncer/><DemoForms/>{visualCards.map(([id,title,symbol])=><Card key={id} id={id} title={title} symbol={symbol} active={changedVisual(id)}><VisualOptions id={id}/></Card>)}
    <Tools refresh={refresh}/>
    <Card id="liveCaptions" title="Live Captions" symbol="CC" active={tools.liveCaptions}><Toggle label="Live Captions" value={tools.liveCaptions} onChange={on=>changeTool('liveCaptions',on)}/><p className="team-description">Shows available video caption tracks and timed data-captions while media plays. No automatic speech transcription; embedded players manage their own captions.</p></Card>
    <Card id="simplifiedNav" title="Simplify Navigation" symbol="↳" active={tools.simplifiedNav}><Toggle label="Simplify Navigation" value={tools.simplifiedNav} onChange={on=>changeTool('simplifiedNav',on)}/><p className="team-description">Use Tab to move through the main content and section headings. Turn off to restore the original tab order.</p></Card>
    {createPortal(<MotionCards/>,settingsLayout.targetFor('reduce-motion'))}
    {navinFeatures.filter(feature=>feature.id!=='flashing').map(({id,title,Panel})=>{if(id==='alt-text')return <Card key={id} id={id} title={title} active={tools[id]}/>;const Controls=consumerPanels[id]||Panel;return <Card key={id} id={id} title={title} active={navinAdjusted(id)}><Controls compact/></Card>;})}
    <AdditionalSettings settings={additional} onChange={changeAdditional} layout={settingsLayout} base={base}/>
    <Preferences/><ReadingOverlays/>
  </>;
}

if(base&&!base.host.dataset.teamReady){
  // Full-viewport click-through host also keeps fixed controls stable under page filters.
  Object.assign(base.host.style,{position:'fixed',inset:'0',pointerEvents:'none',zIndex:'2147483647'});
  setToolbarHost(base.host);
  // Font faces must be registered in the document for use inside a shadow root.
  if(!document.querySelector('[data-a11yease-brand-style]')){
    const brandStyle=document.createElement('style');brandStyle.dataset.a11yeaseBrandStyle='';brandStyle.textContent=brandCss;document.head.append(brandStyle);
  }
  const style=document.createElement('style');style.textContent=getStylesText()+FORM_STYLES+CONFIRM_STYLES+css+themeCss+categorizedCss+languageCss+widgetThemeCss+brandCss;base.root.append(style);
  settingsLayout=createSettingsLayout(base);
  const mount=document.createElement('div');mount.className='team-mount';base.root.querySelector('.body').append(mount);
  const total=13+visualCards.length+toolCards.length+1+navinFeatures.length+2+3+2+additionalCards.length;
  base.root.querySelector('.total').textContent=`${total} settings`;
  base.root.querySelector('.top p').textContent='One panel. Your preferences. Every page.';
  installPanelLanguage(base,{onChange:()=>settingsLayout.filter()});
  const config=normalizeConfig({...window.AccessEaseConfig?.assist,storageKeyPrefix:'accessease.team.assist.v2',visualAffectsToolbar:true});
  const strings=createStrings(config.strings);
  createRoot(mount).render(<SettingsProvider config={config} strings={strings}><ConfirmProvider portalTarget={base.root}><AuditProvider><AltTextProvider><UnifiedControls/></AltTextProvider></AuditProvider></ConfirmProvider></SettingsProvider>);
}
