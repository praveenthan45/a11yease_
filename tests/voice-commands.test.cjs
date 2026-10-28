const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Exercise the actual widget voice functions with simulated browser recognition events.
// This does not simulate audio capture or the browser's remote transcription service.
const source = fs.readFileSync(path.join(__dirname, '../dist/widget.js'), 'utf8');
const voiceSource = source.slice(source.indexOf('  let voiceRestartTimer='), source.indexOf('  function clearScan()'));
function setup({ unsupported = false, failStart = false, names = null } = {}) {
  const sessions = [], timers = new Map(), events = [], delays = [];
  const items=(names||['Example link']).map(name=>({
    textContent:name, getAttribute:()=>null, querySelector:()=>null, matches:()=>true,
    focus:()=>events.push(['focus',name]), click:()=>events.push(names?['click',name]:['click'])
  }));
  let timerId = 0;
  class Recognition {
    constructor() { sessions.push(this); }
    start() { if (failStart) throw new Error('cannot start'); this.started = true; }
    abort() { this.aborted = true; }
  }
  const context = vm.createContext({
    state: {voice: true}, recognition: null, selectedReadingText: '',
    window: {SpeechRecognition: unsupported ? undefined : Recognition, scrollBy: value => events.push(['scroll', value.top])},
    status: text => events.push(['status', text]), apply: () => events.push(['apply']),
    setVoicePhase:()=>{}, showVoiceTranscript:()=>{}, scrollVoice:top=>events.push(['scroll',top]),
    root:{contains:()=>true},panel:{hidden:false},voiceInput:{hidden:true},
    move: direction => events.push(['move', direction]),
    focused: () => items[0], controls:()=>items,
    captureSelection: () => false, startSpeech: () => events.push(['read']), stopSpeech: () => events.push(['stop-read']),
    openPanel: open => events.push(['panel', open]), reset: () => {context.stopVoice(); events.push(['reset']);},
    setTimeout: (callback,delay) => {delays.push(delay);timers.set(++timerId, callback); return timerId;},
    clearTimeout: id => timers.delete(id)
  });
  vm.runInContext(voiceSource, context);
  function result(text, isFinal = true) {
    const row = [{transcript: text}]; row.isFinal = isFinal;
    sessions.at(-1).onresult({resultIndex: 0, results: [row]});
  }
  function tick() { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(fn => fn()); }
  return {context, sessions, timers, events, result, tick, items, delays};
}

let count = 0;
function test(name, run) { run(); count++; console.log('PASS ' + name); }
test('microphone status follows audio capture, not just speech service start', () => {
  const t = setup(); t.context.startVoice();
  assert.match(t.events.at(-1)[1], /Starting microphone/);
  t.sessions[0].onstart(); assert.match(t.events.at(-1)[1], /Waiting for microphone audio/);
  t.sessions[0].onaudiostart(); assert.match(t.events.at(-1)[1], /Microphone ready/);
  assert.equal(t.sessions[0].lang, 'en-US');
  assert.equal(t.sessions[0].interimResults,true);
});
test('final commands scroll, navigate, click, and open settings', () => {
  const t = setup(); t.context.startVoice();
  ['Please scroll down.', 'scroll up', 'next', 'previous', 'click', 'open settings', 'close settings'].forEach(text => t.result(text));
  assert.deepEqual(t.events.filter(e => e[0] !== 'status'), [['scroll',450],['scroll',-450],['move',1],['move',-1],['click'],['panel',true],['panel',false]]);
});
test('interim and unrelated speech do not trigger commands', () => {
  const t = setup(); t.context.startVoice(); t.result('click', false); t.result('next week');
  assert.equal(t.events.filter(e => ['move','click'].includes(e[0])).length, 0);
  assert.match(t.events.at(-1)[1], /no matching command/);
});
test('all new final results are handled from resultIndex', () => {
  const t = setup(); t.context.startVoice();
  const results = ['click','next','scroll down'].map(transcript => {const row=[{transcript}];row.isFinal=true;return row;});
  t.sessions[0].onresult({resultIndex:1,results});
  assert.deepEqual(t.events.filter(e => e[0] !== 'status'), [['move',1],['scroll',450]]);
});
test('normal session end reconnects instead of turning the setting off', () => {
  const t = setup(); t.context.startVoice(); t.sessions[0].onend();
  assert.equal(t.context.state.voice,true); t.tick(); assert.equal(t.sessions.length,2); assert.equal(t.sessions[1].started,true);
});
test('no-speech timeout remains enabled and reconnects', () => {
  const t = setup(); t.context.startVoice(); t.sessions[0].onerror({error:'no-speech'}); t.sessions[0].onend?.(); t.tick();
  assert.equal(t.context.state.voice,true); assert.equal(t.sessions.length,2);
});
test('repeated silent sessions stay enabled without reporting a broken microphone', () => {
  const t=setup();t.context.startVoice();
  for(let i=0;i<3;i++){
    t.sessions.at(-1).onstart();t.sessions.at(-1).onaudiostart();t.sessions.at(-1).onend();
    if(i<2)t.tick();
  }
  assert.match(t.events.at(-1)[1],/still on/);
  assert.equal(t.context.state.voice,true);
});
test('permission and microphone errors show actionable errors', () => {
  for(const [error,expected] of [['not-allowed',/Allow the microphone/],['service-not-allowed',/blocked speech recognition/],['audio-capture',/No working microphone/]]) {
    const t=setup();t.context.startVoice();t.sessions[0].onerror({error});
    assert.equal(t.context.state.voice,false);assert.equal(t.sessions[0].aborted,true);
    assert.match(t.events.at(-1)[1],expected);assert.equal(t.timers.size,0);
  }
});
test('temporary errors reconnect even without an end event and accept the next command',()=>{
  for(const error of ['no-speech','aborted','network']){
    const t=setup();t.context.startVoice();
    const old=t.sessions[0],lateEnd=old.onend,lateError=old.onerror,lateResult=old.onresult;
    old.onaudiostart();old.onerror({error});
    assert.equal(t.context.state.voice,true);assert.equal(old.aborted,true);assert.equal(old.onend,null);
    if(error==='network')assert.match(t.events.at(-1)[1],/internet connection/);
    assert.equal(t.timers.size,1);t.tick();
    assert.equal(t.sessions.length,2);t.sessions[1].onaudiostart();
    lateEnd();lateError({error:'not-allowed'});
    const row=[{transcript:'scroll down'}];row.isFinal=true;lateResult({resultIndex:0,results:[row]});
    assert.equal(t.context.state.voice,true);assert.equal(t.timers.size,0);
    t.result('scroll down');
    assert.deepEqual(t.events.filter(e=>e[0]==='scroll'),[['scroll',450]]);
  }
});
test('network retries use capped backoff and reset after recognized speech',()=>{
  const t=setup();t.context.startVoice();
  for(let i=0;i<4;i++){t.sessions.at(-1).onaudiostart();t.sessions.at(-1).onerror({error:'network'});t.tick();}
  assert.deepEqual(t.delays.filter(delay=>delay!==10000),[1000,2000,4000,5000]);
  t.result('scroll down');t.sessions.at(-1).onerror({error:'network'});
  assert.equal(t.delays.at(-1),1000);assert.equal(t.context.state.voice,true);
  t.context.stopVoice();t.tick();assert.equal(t.sessions.length,5);
});
test('persistent network errors stop instead of reconnecting forever',()=>{
  const t=setup();t.context.startVoice();
  for(let i=0;i<5;i++){t.sessions.at(-1).onaudiostart();t.sessions.at(-1).onerror({error:'network'});if(i<4)t.tick();}
  assert.equal(t.context.state.voice,false);assert.equal(t.sessions.length,5);assert.equal(t.timers.size,0);
  assert.match(t.events.at(-1)[1],/could not connect after 4 retries/);
});
test('missing service start event times out and a retry accepts a command',()=>{
  const t=setup();t.context.startVoice();
  assert.equal(t.timers.size,1);t.tick();assert.equal(t.sessions[0].aborted,true);
  t.tick();t.sessions[1].onaudiostart();t.result('scroll down');
  assert.deepEqual(t.events.filter(e=>e[0]==='scroll'),[['scroll',450]]);
});
test('slow audio startup retries before reporting a microphone failure',()=>{
  const t=setup();t.context.startVoice();t.sessions[0].onstart();t.tick();
  assert.equal(t.context.state.voice,true);assert.equal(t.sessions[0].aborted,true);
  t.tick();t.sessions[1].onaudiostart();t.result('scroll down');
  assert.deepEqual(t.events.filter(e=>e[0]==='scroll'),[['scroll',450]]);
});
test('three audio startup timeouts stop cleanly',()=>{
  const t=setup();t.context.startVoice();
  for(let i=0;i<3;i++){t.sessions.at(-1).onstart();t.tick();if(i<2)t.tick();}
  assert.equal(t.context.state.voice,false);assert.equal(t.sessions.length,3);assert.equal(t.timers.size,0);
  assert.match(t.events.at(-1)[1],/did not capture microphone audio/);
});
test('audio arriving before service start remains ready and duplicate starts do not open another mic',()=>{
  const t=setup();t.context.startVoice();t.sessions[0].onaudiostart();t.sessions[0].onstart();t.context.startVoice();
  assert.match(t.events.at(-1)[1],/Microphone ready/);assert.equal(t.timers.size,0);assert.equal(t.sessions.length,1);
});
test('turning voice off cancels pending restart', () => {
  const t=setup();t.context.startVoice();t.sessions[0].onend();t.context.stopVoice();t.tick();
  assert.equal(t.sessions.length,1);assert.equal(t.context.state.voice,false);
});
test('stop listening detaches handlers and aborts microphone', () => {
  const t=setup();t.context.startVoice();t.result('stop listening');
  assert.equal(t.context.state.voice,false);assert.equal(t.sessions[0].aborted,true);assert.equal(t.sessions[0].onend,null);
});
test('selected text is required for reading and whole page is never read', () => {
  const t=setup();t.context.startVoice();t.result('read page');
  assert.match(t.events.at(-1)[1],/Highlight the text first/);assert.equal(t.events.some(e=>e[0]==='read'),false);
  t.context.selectedReadingText='Selected passage';t.result('read selected text');assert.equal(t.events.some(e=>e[0]==='read'),true);
});
test('failed microphone starts stop after three attempts', () => {
  const t=setup({failStart:true});t.context.startVoice();t.tick();t.tick();
  assert.equal(t.sessions.length,3);assert.equal(t.context.state.voice,false);assert.equal(t.timers.size,0);
});
test('unsupported browser leaves voice disabled', () => {
  const t=setup({unsupported:true});t.context.startVoice();assert.equal(t.context.state.voice,false);assert.match(t.events.at(-1)[1],/unavailable/);
});
test('spoken button name activates its control without previous keyboard focus',()=>{
  const t=setup({names:['Other link','Keyboard Navigation']});t.context.startVoice();t.result('Click keyboard navigation.');
  assert.deepEqual(t.events.filter(e=>['focus','click'].includes(e[0])),[['focus','Keyboard Navigation'],['click','Keyboard Navigation']]);
});
test('widget name uses the title, excluding icon and description',()=>{
  const t=setup({names:['Wrong description']});t.items[0].querySelector=()=>({textContent:'Visible Keyboard Focus'});
  t.context.startVoice();t.result('Please click on Visible Keyboard Focus button.');
  assert.equal(t.events.filter(e=>e[0]==='click').length,1);
});
test('aria label is used for icon-only controls',()=>{
  const t=setup({names:['×']});t.items[0].getAttribute=key=>key==='aria-label'?'Close accessibility settings':null;
  t.context.startVoice();t.result('click Close accessibility settings');assert.equal(t.events.filter(e=>e[0]==='click').length,1);
});
test('duplicate and missing names never activate an arbitrary control',()=>{
  const t=setup({names:['Explore this course','Explore this course']});t.context.startVoice();
  t.result('click Explore this course');assert.match(t.events.at(-1)[1],/Found 2 items/);
  t.result('click missing');assert.match(t.events.at(-1)[1],/No available button/);
  assert.equal(t.events.filter(e=>e[0]==='click').length,0);
  t.result('click second Explore this course');assert.equal(t.events.filter(e=>e[0]==='click').length,1);
});
test('bare click does not pretend a focused paragraph is clickable',()=>{
  const t=setup();t.context.focused=()=>({click:()=>{throw Error('should not click text');}});
  t.context.startVoice();t.result('click');assert.match(t.events.at(-1)[1],/followed by a button or link name/);
});
console.log(`${count} voice command tests passed. Audio transcription requires a real microphone test.`);
