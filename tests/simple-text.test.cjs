const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const project=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(project,file),'utf8');
const settle=()=>new Promise(resolve=>setTimeout(resolve,30));

function setup(html,{dictionary={},demo=false}={}){
  const errors=[],console=new VirtualConsole();console.on('jsdomError',error=>errors.push(error.message));
  const dom=new JSDOM(html,{url:'http://localhost:1434',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:console});
  const w=dom.window;
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
  w.HTMLElement.prototype.scrollIntoView=function(){};w.scrollTo=()=>{};w.scrollBy=()=>{};
  Object.defineProperty(w.document,'currentScript',{value:{src:'http://localhost:1434/widget.js'}});
  if(demo){w.eval(read('dist/playground.js'));w.eval(read('dist/simple-text.js'));}
  else w.AccessEaseSimpleText=dictionary;
  w.eval(read('dist/widget.js'));
  if(demo)w.eval(read('dist/team-features.js'));
  return {w,document:w.document,errors,toggle:()=>w.AccessEase.root.querySelector('[data-setting="simple"]').click(),close:()=>w.close()};
}

test('plain language covers page text without removing inline controls or altering values',()=>{
  const t=setup(`<!doctype html><html lang="en"><body>
    <header><nav><a id="navigation" href="#content">Commence here</a></nav></header>
    <main id="content"><h1>Utilize this page</h1>
      <p id="authored" data-simple="Try the tool before continuing.">Try using the tool prior to continuing.</p>
      <p id="inline" data-simple="Never replace inline controls with a whole-block string.">Please <strong>utilize</strong> the <a id="link" href="#details">tool</a> in order to continue.</p>
      <ul><li>Approximately 12 items are available.</li></ul>
      <table><tbody><tr><td>You are able to keep all 3 items.</td></tr></tbody></table>
      <button id="action">Commence the action</button><label for="input">Utilize a sample value</label>
      <input id="input" value="Utilize my original value" placeholder="Utilize a sample value">
      <textarea id="textarea" placeholder="Commence writing">Utilize my notes</textarea>
      <select><option>Utilize this value</option></select>
      <img alt="Utilize this illustration" title="Commence here">
      <p lang="fr">Utilize ces mots</p><div contenteditable="true">Utilize my draft</div>
      <p translate="no">Utilize this name</p><p data-simple-ignore>Utilize my exact quote</p>
      <pre>utilize(code)</pre><script>const utilize = 12;</script>
    </main><footer>You can commence here on a daily basis.</footer>
  </body></html>`);
  try{
    const d=t.document,inline=d.querySelector('#inline'),link=d.querySelector('#link'),button=d.querySelector('#action');
    const original=inline.innerHTML;let clicks=0;button.addEventListener('click',()=>clicks++);
    const source=[...d.querySelectorAll('header,h1,p,li,td,button,label,footer')].map(el=>[el,el.textContent]);
    t.toggle();
    assert.equal(d.querySelector('h1').textContent,'Use this page');
    assert.equal(d.querySelector('#authored').textContent,'Try the tool before continuing.');
    assert.equal(inline.textContent,'Please use the tool to continue.');
    assert.equal(d.querySelector('#link'),link);
    assert.equal(link.getAttribute('href'),'#details');
    assert.equal(d.querySelector('nav a').textContent,'Start here');
    assert.equal(d.querySelector('li').textContent,'About 12 items are available.');
    assert.equal(d.querySelector('td').textContent,'You can keep all 3 items.');
    assert.equal(d.querySelector('footer').textContent,'You can start here each day.');
    assert.equal(d.querySelector('#input').placeholder,'Use a sample value');
    assert.equal(d.querySelector('#textarea').placeholder,'Start writing');
    assert.equal(d.querySelector('#input').value,'Utilize my original value');
    assert.equal(d.querySelector('#textarea').value,'Utilize my notes');
    assert.equal(d.querySelector('select').value,'Utilize this value');
    assert.equal(d.querySelector('[lang="fr"]').textContent,'Utilize ces mots');
    assert.equal(d.querySelector('[contenteditable]').textContent,'Utilize my draft');
    assert.equal(d.querySelector('[translate="no"]').textContent,'Utilize this name');
    assert.equal(d.querySelector('[data-simple-ignore]').textContent,'Utilize my exact quote');
    assert.equal(d.querySelector('pre').textContent,'utilize(code)');
    button.click();assert.equal(clicks,1);
    t.toggle();
    source.forEach(([el,text])=>assert.equal(el.textContent,text));
    assert.equal(inline.innerHTML,original);
    assert.equal(d.querySelector('#link'),link);
    assert.equal(d.querySelector('#input').placeholder,'Utilize a sample value');
    assert.equal(d.querySelector('img').alt,'Utilize this illustration');
    button.click();assert.equal(clicks,2);
    assert.deepEqual(t.errors,[]);
  }finally{t.close();}
});

test('new and changed content is simplified without restoring stale app messages',async()=>{
  const t=setup('<!doctype html><html lang="en"><body><main><p id="status">Utilize the original message.</p></main></body></html>');
  try{
    t.toggle();
    const status=t.document.querySelector('#status'),node=status.firstChild;
    node.nodeValue='Utilize the updated message for 8 items.';
    const added=t.document.createElement('p');added.textContent='You are able to commence now.';t.document.querySelector('main').append(added);
    await settle();
    assert.equal(node.nodeValue,'Use the updated message for 8 items.');
    assert.equal(added.textContent,'You can start now.');
    t.document.querySelector('main').append(t.document.createTextNode(' Utilize the appended text.'));
    await settle();
    assert.equal(t.document.querySelector('main').lastChild.nodeValue,' Use the appended text.');
    t.toggle();
    assert.equal(node.nodeValue,'Utilize the updated message for 8 items.');
    assert.equal(added.textContent,'You are able to commence now.');
    assert.equal(t.document.querySelector('main').lastChild.nodeValue,' Utilize the appended text.');
    assert.deepEqual(t.errors,[]);
  }finally{t.close();}
});

test('ordinary English website copy is simplified offline while URLs, email addresses, identifiers and controls stay intact',()=>{
  const t=setup(`<!doctype html><html lang="en"><body><main>
    <h1>Additional configuration assistance</h1>
    <p id="copy">At the present time, we will retain all 12 records prior to commencing. Users are required to configure the additional options.</p>
    <p id="literal">Visit https://example.com/utilize?note=commence or www.commence.com. Email commence@example.com. Open /utilize/configuration or commence.txt; keep utilize_record and #commence unchanged. Run \`utilize()\`.</p>
    <p id="mixed">préutilize Utilize 3 items.</p><p id="caps">CONFIGURE THE ADDITIONAL OPTIONS.</p>
    <span class="material-icons">commence</span><button id="button" value="commence">Commence download</button>
    <a id="link" href="/commence?mode=utilize">Additional information</a>
  </main></body></html>`);
  try{
    const main=t.document.querySelector('main'),original=main.innerHTML;
    const literal=t.document.querySelector('#literal').textContent,button=t.document.querySelector('#button'),link=t.document.querySelector('#link');let clicks=0;
    button.addEventListener('click',()=>clicks++);t.toggle();
    assert.equal(t.document.querySelector('h1').textContent,'Extra setup help');
    assert.equal(t.document.querySelector('#copy').textContent,'Now, we will keep all 12 records before starting. Users must set up the extra options.');
    assert.equal(t.document.querySelector('#literal').textContent,literal);
    assert.equal(t.document.querySelector('#mixed').textContent,'préutilize Use 3 items.');
    assert.equal(t.document.querySelector('#caps').textContent,'SET UP THE EXTRA OPTIONS.');
    assert.equal(t.document.querySelector('.material-icons').textContent,'commence');
    assert.equal(button.textContent,'Start download');assert.equal(button.value,'commence');
    assert.equal(link.textContent,'Extra information');assert.equal(link.getAttribute('href'),'/commence?mode=utilize');
    assert.equal(t.document.querySelector('#link'),link);button.click();assert.equal(clicks,1);
    t.toggle();assert.equal(main.innerHTML,original);button.click();assert.equal(clicks,2);
    assert.deepEqual(t.errors,[]);
  }finally{t.close();}
});

test('language, hidden state and publisher opt-outs update safely while simplification stays enabled',async()=>{
  const t=setup('<html lang="en"><body><p>Currently, retain the additional configuration.</p></body></html>');
  try{
    const p=t.document.querySelector('p'),original=p.textContent;t.toggle();
    assert.equal(p.textContent,'Now, keep the extra setup.');
    p.setAttribute('data-simple-ignore','');await settle();assert.equal(p.textContent,original);
    p.removeAttribute('data-simple-ignore');await settle();assert.equal(p.textContent,'Now, keep the extra setup.');
    t.document.documentElement.lang='fr';await settle();assert.equal(p.textContent,original);
    t.document.documentElement.lang='en';await settle();assert.equal(p.textContent,'Now, keep the extra setup.');
    p.hidden=true;await settle();assert.equal(p.textContent,original);
    p.hidden=false;await settle();assert.equal(p.textContent,'Now, keep the extra setup.');
    t.toggle();assert.equal(p.textContent,original);assert.deepEqual(t.errors,[]);
  }finally{t.close();}
});

test('open web components and their new content simplify and restore without changing controls or protected roots',async()=>{
  const t=setup('<html lang="en"><body><main></main><div lang="fr" id="foreign"></div></body></html>');
  try{
    const d=t.document,host=d.createElement('article'),shadow=host.attachShadow({mode:'open'});
    shadow.innerHTML='<p>Currently, utilize the additional configuration.</p><button aria-label="Commence download">Commence</button>';
    d.querySelector('main').append(host);
    const foreign=d.createElement('div'),foreignRoot=foreign.attachShadow({mode:'open'});foreignRoot.innerHTML='<p>Utilize this configuration.</p>';d.querySelector('#foreign').append(foreign);
    const protectedHost=d.createElement('div');protectedHost.setAttribute('translate','no');const protectedRoot=protectedHost.attachShadow({mode:'open'});protectedRoot.innerHTML='<p>Utilize this name.</p>';d.body.append(protectedHost);
    const closedHost=d.createElement('div'),closedRoot=closedHost.attachShadow({mode:'closed'});closedRoot.innerHTML='<p>Utilize the original words.</p>';d.body.append(closedHost);
    let clicks=0;const button=shadow.querySelector('button');button.addEventListener('click',()=>clicks++);
    t.toggle();assert.equal(shadow.querySelector('p').textContent,'Now, use the extra setup.');
    assert.equal(button.getAttribute('aria-label'),'Start download');button.click();assert.equal(clicks,1);
    assert.equal(foreignRoot.textContent,'Utilize this configuration.');assert.equal(protectedRoot.textContent,'Utilize this name.');assert.equal(closedRoot.textContent,'Utilize the original words.');
    const added=d.createElement('p');added.textContent='We will retain approximately 6 items.';shadow.append(added);await settle();
    assert.equal(added.textContent,'We will keep about 6 items.');
    const lateHost=d.createElement('div'),lateRoot=lateHost.attachShadow({mode:'open'});lateRoot.innerHTML='<p>Configure the additional options.</p>';
    d.querySelector('main').append(lateHost);await settle();assert.equal(lateRoot.textContent,'Set up the extra options.','new web components are discovered while the mode is on');
    host.remove();await settle();assert.equal(added.textContent,'We will retain approximately 6 items.','detached components keep their original text');
    d.querySelector('main').append(host);await settle();assert.equal(added.textContent,'We will keep about 6 items.');
    t.toggle();assert.equal(shadow.querySelector('p').textContent,'Currently, utilize the additional configuration.');
    assert.equal(button.getAttribute('aria-label'),'Commence download');assert.equal(added.textContent,'We will retain approximately 6 items.');
    assert.equal(lateRoot.textContent,'Configure the additional options.');
    button.click();assert.equal(clicks,2);assert.deepEqual(t.errors,[]);
  }finally{t.close();}
});

test('accessible embedded pages and reloads simplify while cross-origin frame restrictions are skipped',async()=>{
  const t=setup('<html lang="en"><body><main></main></body></html>');
  try{
    const frame=t.document.createElement('iframe');t.document.querySelector('main').append(frame);
    const embedded=frame.contentDocument;embedded.documentElement.lang='en';embedded.body.innerHTML='<p>Utilize the additional configuration.</p>';
    const blocked=t.document.createElement('iframe');t.document.body.append(blocked);
    Object.defineProperty(blocked,'contentDocument',{get(){throw new t.w.DOMException('Different origin','SecurityError');}});
    t.toggle();assert.equal(embedded.querySelector('p').textContent,'Use the extra setup.');
    embedded.querySelector('p').firstChild.nodeValue='Currently, retain approximately 4 items.';await settle();
    assert.equal(embedded.querySelector('p').textContent,'Now, keep about 4 items.');
    embedded.documentElement.innerHTML='<head></head><body><p>Commence the additional step.</p></body>';
    frame.dispatchEvent(new t.w.Event('load'));await settle();assert.equal(embedded.querySelector('p').textContent,'Start the extra step.');
    t.toggle();assert.equal(embedded.querySelector('p').textContent,'Commence the additional step.');assert.deepEqual(t.errors,[]);
  }finally{t.close();}
});

test('turning simplification off restores detached text and preserves newer publisher messages',()=>{
  const t=setup('<html lang="en"><body><p id="detached">Utilize this configuration.</p><p id="changed">Commence now.</p></body></html>');
  try{
    const detached=t.document.querySelector('#detached'),changed=t.document.querySelector('#changed');t.toggle();
    detached.remove();changed.firstChild.nodeValue='A new publisher message.';t.toggle();
    assert.equal(detached.textContent,'Utilize this configuration.');assert.equal(changed.textContent,'A new publisher message.');
    assert.deepEqual(t.errors,[]);
  }finally{t.close();}
});

test('the current demo uses meaningful alternatives across every content section and restores them',async()=>{
  const html=read('dist/index.html');
  assert.ok(html.indexOf('src="simple-text.js"')<html.indexOf('src="widget.js?'),'wording loads before the widget');
  const t=setup(html,{demo:true});
  try{
    for(let i=0;i<30&&!t.w.AccessEaseTeam;i++)await settle();
    assert.ok(t.w.AccessEaseTeam);
    const d=t.document,hero=d.querySelector('.lab-hero p'),original=hero.textContent;
    const inline=d.querySelector('#reading p a'),heading=d.querySelector('.lab-hero h1 em');
    const sections=['.lab-hero','#reading','#media','#forms','#motion','#audit','#test-guide','footer'];
    const before=sections.map(selector=>d.querySelector(selector).textContent);
    t.toggle();await settle();
    assert.equal(hero.textContent,'Try settings that change how you use this page. Read the story, play a clip and try the sample form. Choose the settings that work for you.');
    assert.ok(d.querySelector('#reading p[data-simple]').textContent.includes('build confidence'));
    sections.forEach((selector,index)=>assert.notEqual(d.querySelector(selector).textContent,before[index],`${selector} includes page-wide plain wording`));
    assert.equal(d.querySelector('#reading p a'),inline);
    assert.equal(d.querySelector('.lab-hero h1 em'),heading);
    const bookmark=d.querySelector('#compact-save');bookmark.click();await settle();
    assert.match(d.querySelector('#bookmark-status').textContent,/Bookmark saved/);
    const submit=[...d.querySelectorAll('#demo-form-root button')].find(button=>button.textContent==='Try demo sign-in');
    assert.ok(submit);submit.click();await settle();
    assert.ok(d.querySelector('#demo-form-root [aria-invalid="true"]'),'React form handlers still work');
    t.toggle();await settle();
    assert.equal(hero.textContent,original);
    assert.equal(d.querySelector('.lab-hero h1 em').textContent,'50 ways to explore.');
    assert.equal(d.querySelector('#reading p a'),inline);
    assert.deepEqual(t.errors,[]);
  }finally{t.close();}
});
