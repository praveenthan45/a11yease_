const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const project=path.join(__dirname,'..');

test('all product pages show the supplied pluga11y branding with one accessible name',()=>{
  for(const file of ['login.html','admin.html','index.html','learning-demo.html']){
    const dom=new JSDOM(fs.readFileSync(path.join(project,'dist',file),'utf8'),{url:'https://widget.example/'});
    try{
      const document=dom.window.document;
      assert.match(document.title,/pluga11y/,file);
      assert.doesNotMatch(document.body.textContent,/a11y\s*ease|access\s*ease/i,file);
      const brands=[...document.querySelectorAll('.ae-wordmark')];
      assert.ok(brands.length,file);
      for(const brand of brands){
        assert.equal(brand.textContent,'pluga11y',file);
        assert.equal(brand.querySelector('img').alt,'pluga11y',file);
        assert.match(brand.querySelector('img').src,/\/pluga11y-wordmark\.svg\?/);
        assert.ok([...brand.querySelectorAll('span')].every(span=>span.getAttribute('aria-hidden')==='true'));
      }
      for(const img of document.querySelectorAll('.brand-logo,.lab-brand-logo'))assert.match(img.src,/\/pluga11y-icon\.svg/);
      if(file==='admin.html')assert.match(document.querySelector('.installation-badge').src,/\/accessibility-badge\.png\?/);
      assert.match(document.querySelector('link[rel="icon"]').href,/\/pluga11y-icon\.svg/);
    }finally{dom.window.close();}
  }
});

test('logo assets preserve the supplied artwork and work as standalone SVG images',()=>{
  const original=fs.readFileSync(path.join(project,'dist/pluga11y-logo.jpeg'));
  for(const name of ['pluga11y-icon.svg','pluga11y-wordmark.svg']){
    const svg=fs.readFileSync(path.join(project,'dist',name),'utf8');
    const dom=new JSDOM(svg,{contentType:'image/svg+xml'});
    try{
      const document=dom.window.document;
      assert.equal(document.documentElement.localName,'svg');
      assert.equal(document.querySelectorAll('script').length,0);
      const embedded=document.querySelector('image').getAttribute('href');
      assert.match(embedded,/^data:image\/jpeg;base64,/);
      assert.deepEqual(Buffer.from(embedded.split(',')[1],'base64'),original);
      assert.match(document.querySelector('title').textContent,/pluga11y/);
    }finally{dom.window.close();}
  }
});

test('cross-site branding preserves saved settings, existing events and preference import/export',async()=>{
  const errors=[],console=new VirtualConsole();console.on('jsdomError',error=>errors.push(error.message));
  const dom=new JSDOM('<html lang="en"><body><main><h1>Client website</h1><p>Website content</p></main></body></html>',{url:'https://client.example/article?view=2',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:console});
  const w=dom.window,settle=()=>new Promise(resolve=>setTimeout(resolve,60));
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  w.HTMLElement.prototype.scrollIntoView=function(){};
  w.document.elementFromPoint=()=>null;w.scrollBy=()=>{};w.scrollTo=()=>{};
  Object.defineProperty(w.document,'currentScript',{value:{src:'https://assets.example/widget/widget.js'}});
  w.localStorage.setItem('accessease.preferences.v1',JSON.stringify({align:'right'}));
  w.localStorage.setItem('accessease.team.preferences.v2',JSON.stringify({visual:{theme:'dark'}}));
  try{
    for(const file of ['widget.js','team-features.js'])w.eval(fs.readFileSync(path.join(project,'dist',file),'utf8'));
    for(let i=0;i<50&&!w.AccessEaseTeam;i++)await settle();
    assert.ok(w.AccessEaseTeam,'the shared feature bundle initialized');await settle();
    const root=w.AccessEase.root;
    assert.equal(w.AccessEase.getSettings().align,'right');
    assert.equal(w.AccessEaseTeam.getSettings().visual.theme,'dark');
    assert.match(root.querySelector('.launcher img').src,/^https:\/\/assets\.example\/widget\/accessibility-badge\.png\?/);
    assert.match(root.querySelector('.top .logo img').src,/^https:\/\/assets\.example\/widget\/pluga11y-icon\.svg\?/);
    const brand=root.querySelector('.top .ae-wordmark');
    assert.match(brand.querySelector('img').src,/^https:\/\/assets\.example\/widget\/pluga11y-wordmark\.svg\?/);
    assert.equal(brand.querySelector('img').alt,'pluga11y');
    for(const link of root.querySelectorAll('.top .brand-link')){
      assert.match(link.getAttribute('aria-label'),/^pluga11y home/);
      assert.equal(link.target,'_blank');
      assert.equal(link.href,'https://pluga11y.com/');
    }
    let events=0;w.AccessEase.host.addEventListener('accessease:change',()=>events++);
    w.AccessEase.setSettings({align:'left'});await settle();
    assert.ok(events>0,'existing integration events still fire');
    assert.equal(root.querySelector('#align').value,'left');
    const downloads=[];w.HTMLAnchorElement.prototype.click=function(){downloads.push(this.download);};
    w.URL.createObjectURL=()=> 'blob:https://client.example/preferences';w.URL.revokeObjectURL=()=>{};
    const button=[...root.querySelectorAll('[data-team-card="preferences"] button')].find(button=>button.textContent==='Export preferences');
    assert.ok(button);button.click();await settle();
    assert.deepEqual(downloads,['pluga11y-preferences.json']);
    assert.equal(JSON.parse(w.localStorage.getItem('accessease.preferences.v1')).align,'left');
    assert.deepEqual(errors,[]);
  }finally{w.close();}
});

test('logo image lettering follows color modes and restores without changing image sources',async()=>{
  const errors=[],console=new VirtualConsole();
  console.on('jsdomError',error=>errors.push(error.message));
  const dom=new JSDOM('<html lang="en"><body><header><a class="ae-wordmark" href="/"><img class="plug-wordmark" src="/pluga11y-wordmark.svg" alt="pluga11y" data-uaw-ignore></a></header><main><h1>Website title</h1><img id="photo" src="/photo.jpg"></main><footer><span class="ae-wordmark"><img class="plug-wordmark" src="/pluga11y-wordmark.svg" alt="pluga11y" data-uaw-ignore></span></footer></body></html>',{url:'https://client.example/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:console});
  const w=dom.window,settle=()=>new Promise(resolve=>setTimeout(resolve,80));
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  w.HTMLElement.prototype.scrollIntoView=function(){};
  w.document.elementFromPoint=()=>null;w.scrollBy=()=>{};w.scrollTo=()=>{};
  Object.defineProperty(w.document,'currentScript',{value:{src:'https://assets.example/widget.js'}});
  try{
    for(const file of ['widget.js','team-features.js'])w.eval(fs.readFileSync(path.join(project,'dist',file),'utf8'));
    for(let i=0;i<50&&!w.AccessEaseTeam;i++)await settle();
    assert.ok(w.AccessEaseTeam);await settle();
    const images=[...w.document.querySelectorAll('img'),w.AccessEase.root.querySelector('.plug-wordmark')];
    const originalImages=images.map(image=>image.outerHTML);
    const modeFilters=[
      [{grayscale:true},'grayscale(1)','none'],
      [{colorVisionMode:'monochrome'},'grayscale(1)','none'],
      [{theme:'contrast'},'brightness(0) invert(1)','brightness(0)'],
      [{theme:'dark'},'brightness(0) invert(1)','brightness(0)'],
      [{theme:'contrast',grayscale:true},'brightness(0) invert(1)','brightness(0)'],
    ];
    for(const [visual,pageFilter,panelFilter] of modeFilters){
      w.AccessEaseTeam.setSettings({visual});await settle();
      for(const surface of w.document.querySelectorAll('header,footer')){
        assert.equal(surface.style.getPropertyValue('--ae-wordmark-filter'),pageFilter);
      }
      assert.equal(w.AccessEase.host.style.getPropertyValue('--ae-wordmark-filter'),panelFilter);
      assert.equal(w.document.querySelector('#photo').style.filter,'','ordinary photographs are not recolored by the wordmark rule');
      assert.deepEqual(images.map(image=>image.outerHTML),originalImages,'logo sources, sizes and text remain intact');
      w.AccessEaseTeam.setSettings({visual:{}});await settle();
      for(const surface of w.document.querySelectorAll('header,footer')){
        assert.equal(surface.style.getPropertyValue('--ae-wordmark-filter'),'');
      }
      assert.equal(w.AccessEase.host.style.getPropertyValue('--ae-wordmark-filter'),'none');
    }
    assert.deepEqual(errors,[]);
  }finally{w.close();}
});
