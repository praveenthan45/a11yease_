// Presentation only: original buttons keep their listeners; React controls use portals.
export const settingCategories = [
  {id:'modes',label:'Accessibility modes',settings:['dyslexiaFont','grayscale','colorVisionMode','cognitiveDisability','cognitiveReading']},
  {id:'vision',label:'Vision',settings:['light','dark','visuals','contrast','highlightLinks','highlightTitles','highSaturation','lowSaturation','textColor','backgroundColor','titleColor']},
  {id:'reading',label:'Reading',settings:['fontScale','spacingPreset','magnifier','readingGuide','readingMask','speech','align','simple','highlight','summary','progress']},
  {id:'navigation',label:'Navigation',settings:['keyboard','skip','targets','switches','sticky','voice','steps','simplifiedNav','headings','darkCursor','lightCursor','linkNavigation']},
  {id:'focus',label:'Focus',settings:['focus','distraction','notifications','screen-reader','announcements']},
  {id:'media',label:'Media',settings:['captions','liveCaptions','audioTranscripts']},
  {id:'motion',label:'Motion',settings:['reduce-motion','pause-animations','pause-auto-media','flashing']},
  {id:'forms',label:'Forms',settings:['auth','form-labels','error-messages','password','confirm']},
  {id:'tools',label:'Tools',settings:['timeLimits','preferences','profiles','alt-text']},
];
const searchAliases={dyslexiaFont:'Dyslexia-Friendly Font',voice:'Voice Commands',speech:'Text-to-Speech',colorVisionMode:'Color Blindness Support',visuals:'Brightness contrast saturation visual adjustments'};

export function createSettingsLayout(base) {
  const root=base.root,grid=root.querySelector('.grid');
  const originalControls=[...grid.children];
  const controlId=control=>control.dataset.setting||control.dataset.teamCard||control.querySelector('[data-setting]')?.dataset.setting||control.querySelector('select')?.id;
  grid.classList.add('settings-groups');
  const groups=new Map();
  let currentQuery='';
  const setExpanded=(group,expanded)=>{
    if(!group.toggle)expanded=true;
    group.controls.hidden=!expanded;
    group.toggle?.setAttribute('aria-expanded',String(expanded));
    group.section.dataset.expanded=String(expanded);
  };
  for(const category of settingCategories){
    const section=document.createElement('section');
    section.className='settings-group';section.dataset.category=category.id;
    section.setAttribute('aria-labelledby',`category-${category.id}`);
    const heading=document.createElement('h3');heading.className='category-heading';heading.id=`category-${category.id}`;
    const toggle=category.id==='modes'?null:document.createElement('button');
    const label=document.createElement('span');label.className='category-label';label.textContent=category.label;
    if(toggle){
      toggle.type='button';toggle.className='category-toggle';
      const expander=document.createElement('span');expander.className='category-expander';expander.setAttribute('aria-hidden','true');
      toggle.append(label,expander);heading.append(toggle);
    }else heading.append(label);
    const controls=document.createElement('div');controls.className='category-controls';
    controls.id=`category-${category.id}-controls`;toggle?.setAttribute('aria-controls',controls.id);
    section.append(heading,controls);grid.append(section);
    const group={section,controls,toggle,expanded:category.id==='modes',searchExpanded:category.id==='modes'};
    toggle?.addEventListener('click',()=>{
      const wasExpanded=currentQuery?group.searchExpanded:group.expanded;
      for(const other of groups.values())if(other!==group){
        if(currentQuery)other.searchExpanded=false;else other.expanded=false;
        setExpanded(other,false);
      }
      if(currentQuery)group.searchExpanded=!wasExpanded;else group.expanded=!wasExpanded;
      setExpanded(group,currentQuery?group.searchExpanded:group.expanded);
      if(currentQuery?group.searchExpanded:group.expanded)requestAnimationFrame(()=>{
        const body=root.querySelector('.body');
        if(!body||group.section.hidden)return;
        body.scrollTop+=group.section.getBoundingClientRect().top-body.getBoundingClientRect().top;
      });
    });
    setExpanded(group,group.expanded);
    groups.set(category.id,group);
  }
  const categoryFor=id=>settingCategories.find(category=>category.settings.includes(id))?.id||'tools';
  const targetFor=id=>groups.get(categoryFor(id)).controls;
  // Move the original speech and rate controls together so their listeners and preferences stay intact.
  const speech=originalControls.find(control=>control.dataset.setting==='speech');
  const rate=originalControls.find(control=>control.querySelector('#rate'));
  const speechSetting=document.createElement('section');speechSetting.className='speech-setting';speechSetting.dataset.teamCard='speech';
  const speechHeader=document.createElement('div');speechHeader.className='speech-header';
  const speedToggle=document.createElement('button');speedToggle.type='button';speedToggle.className='speech-options-toggle';
  speedToggle.setAttribute('aria-label','Text to Speech options');speedToggle.setAttribute('aria-controls','speech-speed-options');
  const speedIcon=document.createElement('span');speedIcon.className='category-expander';speedIcon.setAttribute('aria-hidden','true');speedToggle.append(speedIcon);
  const speedOptions=document.createElement('div');speedOptions.id='speech-speed-options';speedOptions.className='speech-options';speedOptions.append(rate);
  speechHeader.append(speech,speedToggle);speechSetting.append(speechHeader,speedOptions);
  let speedExpanded=false,speedSearchExpanded=false,wasSpeaking=base.getSettings().speech;
  const showSpeed=()=>{
    const expanded=speedExpanded||speedSearchExpanded;
    speedOptions.hidden=!expanded;speedToggle.setAttribute('aria-expanded',String(expanded));
  };
  speedToggle.addEventListener('click',()=>{speedExpanded=!(speedExpanded||speedSearchExpanded);speedSearchExpanded=false;showSpeed();});
  base.host.addEventListener('accessease:change',()=>{
    const speaking=base.getSettings().speech;
    if(speaking&&!wasSpeaking)speedExpanded=true;
    wasSpeaking=speaking;showSpeed();
  });
  root.querySelector('.reset').addEventListener('click',()=>{speedExpanded=false;showSpeed();});
  showSpeed();
  const closePreviousOptions=event=>{
    const target=event.target instanceof Element?event.target:null;
    if(!target)return;
    const card=target.closest('.tile,.select-row,.team-card,.speech-setting,.voice-setting');
    const categoryToggle=target.closest('.category-toggle');
    if(!card&&!categoryToggle)return;
    for(const details of root.querySelectorAll('details[open]')){
      if(card&&(details===card||details.contains(target)))continue;
      details.open=false;
    }
    if(!card?.closest('.speech-setting')){
      speedExpanded=false;speedSearchExpanded=false;showSpeed();
    }
  };
  root.addEventListener('click',closePreviousOptions,true);
  for(const control of originalControls){
    if(control===rate)continue;
    if(control===speech){targetFor('speech').append(speechSetting);continue;}
    const id=controlId(control);
    if(control.classList.contains('voice-setting'))control.dataset.teamCard='voice';
    targetFor(id).append(control);
  }
  const search=document.createElement('div');search.className='team-search';
  search.innerHTML='<label for="team-search">Search accessibility settings</label><input id="team-search" type="search" placeholder="Search accessibility settings…" autocomplete="off">';
  const toolbar=document.createElement('div');toolbar.className='panel-toolbar';toolbar.append(search);
  root.querySelector('.top').after(toolbar);
  root.querySelector('.intro').hidden=true;
  const empty=document.createElement('p');empty.className='team-empty';empty.hidden=true;empty.setAttribute('role','status');empty.textContent='No matching settings. Try another word or category.';
  root.querySelector('.body').append(empty);
  const filter=()=>{
    const query=search.querySelector('input').value.trim().toLowerCase();
    const queryChanged=query!==currentQuery;currentQuery=query;
    grid.dataset.categoryFilter='all';
    let matches=0;
    for(const [id,group] of groups){
      const cards=[...group.controls.children].filter(card=>card.matches('.tile,.select-row,.team-card,.speech-setting,.voice-setting'));
      const order=settingCategories.find(category=>category.id===id).settings;
      const ordered=[...cards].sort((a,b)=>order.indexOf(controlId(a))-order.indexOf(controlId(b)));
      ordered.forEach((card,index)=>{if(group.controls.children[index]!==card)group.controls.insertBefore(card,group.controls.children[index]);});
      let visible=0;
      for(const card of cards){
        const labelNode=card.querySelector('.card-title,.motion-title,strong,label,summary');
        const id=controlId(card);
        const speedLabel=card===speechSetting?(base.panelLanguage?.searchText(rate.querySelector('label'))||rate.querySelector('label').textContent):'';
        const label=(base.panelLanguage?.searchText(labelNode)||labelNode?.textContent||'')+' '+(searchAliases[id]||'')+' '+speedLabel;
        card.hidden=!label.toLowerCase().includes(query);
        if(card===speechSetting){speedSearchExpanded=Boolean(query)&&speedLabel.toLowerCase().includes(query);showSpeed();}
        if(!card.hidden)visible++;
      }
      group.section.hidden=visible===0;
      if(queryChanged)group.searchExpanded=true;
      setExpanded(group,query?group.searchExpanded:group.expanded);
      if(!group.section.hidden)matches+=visible;
    }
    empty.hidden=matches!==0;
  };
  search.querySelector('input').addEventListener('input',filter);
  // React may add content after initialization; observe children only to avoid attribute loops.
  const observer=new MutationObserver(filter);
  for(const group of groups.values())observer.observe(group.controls,{childList:true,subtree:true});
  filter();
  return {targetFor,filter};
}
