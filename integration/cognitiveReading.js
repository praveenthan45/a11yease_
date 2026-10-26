const IGNORE='script,style,noscript,textarea,select,option,svg,canvas,iframe,object,embed,pre,code,kbd,samp,[contenteditable]:not([contenteditable="false"]),[data-uaw-ignore],[data-uaw-icon],[aria-hidden="true"]';
const GENERATED='[data-ae-cognitive-word]';

function splitWord(word,doc){
  const characters=Array.from(word);
  const length=Math.max(1,Math.ceil(characters.length*.35));
  const fragment=doc.createDocumentFragment();
  const prefix=doc.createElement('span');prefix.dataset.aeCognitivePrefix='';
  prefix.append(doc.createTextNode(characters.slice(0,length).join('')));
  fragment.append(prefix);
  if(length<characters.length){
    const remainder=doc.createElement('span');remainder.dataset.aeCognitiveRest='';
    remainder.append(doc.createTextNode(characters.slice(length).join('')));
    fragment.append(remainder);
  }
  return fragment;
}

export function createCognitiveReading({root=document.body,host}){
  const doc=root.ownerDocument,records=new Set(),byWrapper=new WeakMap(),bySource=new WeakMap();
  const style=doc.createElement('style');style.dataset.aeCognitiveReading='';
  style.textContent=`[data-ae-cognitive-word] [data-ae-cognitive-prefix]{font-weight:750!important}[data-ae-cognitive-word] [data-ae-cognitive-rest]{opacity:.68!important}`;
  let enabled=false,observer=null,frame=0,timer=0;

  function eligible(node){
    const parent=node.parentElement;
    return Boolean(parent&&node.nodeValue.trim()&& !parent.closest(`${IGNORE},${GENERATED}`)&&
      !host?.contains(parent)&&!parent.closest('head,title'));
  }
  function format(record,text){
    const {wrapper,source}=record,doc=wrapper.ownerDocument;
    wrapper.dataset.aeCognitiveWord='';
    wrapper.replaceChildren();
    for(const token of text.match(/\s+|[^\s]+/gu)||[]){
      if(/^\s+$/u.test(token))wrapper.append(doc.createTextNode(token));
      else wrapper.append(splitWord(token,doc));
    }
    if(source.nodeValue!==text)source.nodeValue=text;
  }
  function wrap(node){
    if(!eligible(node))return;
    const doc=node.ownerDocument,source=node,wrapper=doc.createElement('span');
    const record={source,wrapper};byWrapper.set(wrapper,record);bySource.set(source,record);records.add(record);
    format(record,node.nodeValue);
    node.replaceWith(wrapper);
    // Frameworks may retain and update the original text node after it is wrapped.
    observer?.observe(source,{characterData:true});
  }
  function scan(nodes){
    const doc=root.ownerDocument;
    const texts=[];
    for(const node of nodes){
      if(node.nodeType===3)texts.push(node);
      else if(node.nodeType===1&&!node.matches(`${IGNORE},${GENERATED}`)){
        const nested=doc.createTreeWalker(node,doc.defaultView.NodeFilter.SHOW_TEXT);
        for(let text=nested.nextNode();text;text=nested.nextNode())texts.push(text);
      }
    }
    for(const node of texts)wrap(node);
    // Consume only the character/child mutations created by this formatting pass.
    observer?.takeRecords();
  }
  function process(recordsList){
    const roots=new Set(),changed=new Set();
    for(const mutation of recordsList){
      if(mutation.type==='characterData'){
        const sourceRecord=bySource.get(mutation.target);
        if(sourceRecord){
          if(sourceRecord.source.isConnected&&!sourceRecord.wrapper.isConnected){
            records.delete(sourceRecord);bySource.delete(sourceRecord.source);roots.add(sourceRecord.source.parentElement||root);
          }else format(sourceRecord,sourceRecord.source.nodeValue);
          continue;
        }
        const wrapper=mutation.target.parentElement?.closest(GENERATED);
        if(wrapper){const record=byWrapper.get(wrapper);if(record)changed.add(record);}
        else roots.add(mutation.target.parentElement||root);
      }else{
        const wrapper=mutation.target.closest?.(GENERATED);
        if(wrapper){const record=byWrapper.get(wrapper);if(record)changed.add(record);}
        else for(const node of mutation.addedNodes)if(node.nodeType===3||node.nodeType===1)roots.add(node);
      }
    }
    for(const record of changed)if(record.wrapper.isConnected){
      const value=record.wrapper.textContent;
      if(value.trim())format(record,value);
      else{record.wrapper.replaceWith(record.source);record.source.nodeValue=value;records.delete(record);}
    }
    if(roots.size)scan([...roots]);
    else observer?.takeRecords();
    for(const record of records)if(!record.wrapper.isConnected)records.delete(record);
  }
  function schedule(){
    if(frame||timer)return;
    frame=doc.defaultView.requestAnimationFrame(()=>{
      frame=0;timer=doc.defaultView.setTimeout(()=>{timer=0;if(enabled)process(observer.takeRecords());},60);
    });
  }
  function apply(next){
    next=Boolean(next);
    if(next===enabled)return;
    enabled=next;
    if(enabled){
      doc.documentElement.setAttribute('data-ae-cognitive-reading','');
      doc.head.append(style);
      observer=new doc.defaultView.MutationObserver(schedule);
      observer.observe(root,{subtree:true,childList:true,characterData:true});
      scan([root]);
    }else{
      observer?.disconnect();observer=null;
      doc.defaultView.cancelAnimationFrame(frame);frame=0;doc.defaultView.clearTimeout(timer);timer=0;
      for(const record of records){
        if(!record.wrapper.isConnected)continue;
        record.source.nodeValue=record.wrapper.textContent;
        record.wrapper.replaceWith(record.source);
      }
      records.clear();
      doc.documentElement.removeAttribute('data-ae-cognitive-reading');
      style.remove();
    }
  }
  return {apply,destroy(){apply(false);}};
}
