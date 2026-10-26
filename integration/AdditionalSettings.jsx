import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import SettingIcon from './SettingIcon.jsx';
import {additionalCards,additionalActive,toggleAdditional,COLOR_SWATCHES} from './additionalPreferences.js';
import {createLinkNavigation} from './linkNavigation.js';

function Colors({id,title,value,onChange}){
  return <div className="color-control">
    <div className="color-preview" aria-hidden="true" style={{color:id==='backgroundColor'?'#14253D':value||'#14253D',backgroundColor:id==='backgroundColor'?value||'#FFFFFF':'#FFFFFF'}}>Aa</div>
    <div className="color-swatches" role="group" aria-label={title}>{COLOR_SWATCHES.map(([name,color])=><button key={color} type="button" className="color-swatch" aria-label={name} title={name} aria-pressed={value===color} style={{'--swatch-color':color}} onClick={()=>onChange({[id]:value===color?'':color})}><span aria-hidden="true">{value===color?'✓':''}</span></button>)}</div>
    <button type="button" className="restore-color" onClick={()=>onChange({[id]:''})} disabled={!value}>Use website colors</button>
  </div>;
}
function Links({base}){
  const [items,setItems]=useState([]),engine=useRef(null);
  useEffect(()=>{const navigation=createLinkNavigation({host:base.host,onChange:setItems});engine.current=navigation;navigation.refresh();return()=>{navigation.destroy();engine.current=null;};},[base]);
  return <div className="link-navigation-controls">
    <label htmlFor="ae-link-navigation">Jump to a link or button</label>
    <select id="ae-link-navigation" value="" onFocus={()=>engine.current?.refresh()} onChange={event=>{
      const id=event.target.value;if(!id)return;
      const label=items.find(item=>item.id===id)?.name;
      // Close the panel first so its focus restoration cannot steal focus from the destination.
      base.close();if(engine.current?.jump(id))base.status(`Moved to ${label}.`);else base.status('That control is no longer available.');
    }}>
      <option value="">{items.length?'Choose a link or button':'No links or buttons found'}</option>
      {items.map(item=><option key={item.id} value={item.id} data-panel-original-content>{item.name}</option>)}
    </select>
    <button type="button" onClick={()=>engine.current?.refresh()}>Refresh links</button>
  </div>;
}
export default function AdditionalSettings({settings,onChange,layout,base}){
  return additionalCards.map(([id,title])=>{
    const active=additionalActive(settings,id),options=['textColor','backgroundColor','titleColor','linkNavigation'].includes(id);
    const icon=<span className="team-icon" aria-hidden="true"><SettingIcon id={id}/></span>;
    const content=options?<details className={`team-card additional-card${active?' active':''}`} data-team-card={id}>
      <summary aria-label={`${title} options`}>{icon}<span>{title}</span></summary>
      <div className="team-options">{id==='linkNavigation'?<Links base={base}/>:<Colors id={id} title={title} value={settings[id]} onChange={onChange}/>}</div>
    </details>:<section className={`team-card direct-card additional-card${active?' active':''}`} data-team-card={id}>
      <div className="direct-card-header">{icon}<strong className="card-title">{title}</strong><button type="button" className="card-enable" role="switch" aria-label={title} aria-checked={active} onClick={()=>onChange(toggleAdditional(settings,id))}><span className="card-switch-thumb" aria-hidden="true"/></button></div>
      {id==='cognitiveDisability'&&active&&<p className="additional-help">Outlines headings, hyperlinks and buttons. Paragraphs and surrounding containers stay unboxed.</p>}
      {id==='cognitiveReading'&&active&&<p className="additional-help">Emphasizes the beginning of each word to help you follow text across any website.</p>}
    </section>;
    return createPortal(content,layout.targetFor(id),id);
  });
}
