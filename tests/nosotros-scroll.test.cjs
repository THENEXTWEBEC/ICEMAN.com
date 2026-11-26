const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const timeline=app.slice(app.indexOf('    // One native-scroll timeline'),app.indexOf('    const hero=root.querySelector("[data-reveal-hero]");'));
function element(){
 const attrs={},listeners={},classes=new Set();
 return {style:{setProperty(k,v){this[k]=v;}},attrs,listeners,
 classList:{toggle(k,v){v?classes.add(k):classes.delete(k);},remove(k){classes.delete(k);},contains:k=>classes.has(k)},
 setAttribute(k,v){attrs[k]=v;},addEventListener(k,v){listeners[k]=v;}};
}
function fixture({height=700,viewport=800,reducedMotion=false}={}){
 const win={innerHeight:viewport,scrollY:0,addEventListener(){},scrollTo(options){this.lastScroll=options;}};
 const sections=['concepts','values','purpose'].map((id,i)=>{
  const section=element(),wrap={offsetHeight:height};
  const images=Array.from({length:id==='purpose'?1:3},()=>({...element(),complete:true,naturalWidth:100}));
  const buttons=id==='purpose'?[]:Array.from({length:3},element);
  const caption={textContent:'description 0'},words=Array.from({length:9},element);
  Object.assign(section,{dataset:{storySelector:id},wrap,images,buttons,
   getBoundingClientRect:()=>({top:1000+i*3000-win.scrollY}),
   querySelector:s=>s===':scope > .wrap'?wrap:caption,
   querySelectorAll:s=>s.includes('story-panel-image')?images:s==='h2 span'?words:buttons});
  return section;
 });
 const root={querySelectorAll:()=>sections.slice(0,2),querySelector:s=>s==='.site-header'?{offsetHeight:76}:sections[2]};
 const context={window:win,root,signal:new AbortController().signal,reduced:{matches:reducedMotion,addEventListener(){}},
  storyConcepts:[0,1,2].map(i=>({text:'description '+i})),storyValues:[0,1,2].map(i=>({text:'description '+i})),
  requestAnimationFrame:()=>1,cancelAnimationFrame(){},ResizeObserver:class{observe(){}disconnect(){}},document:{}};
 vm.runInNewContext(timeline+';this.api={scenes,renderStory,updateScrollStories,measureScrollStories};',context);
 return {...context,sections};
}
test('photo and caption advance together at both boundaries and reverse without lag',()=>{
 const f=fixture(),s=f.api.scenes[0];
 for(const [progress,expected] of [[-.2,0],[.24,0],[.26,1],[.5,1],[.76,2],[1.2,2],[.5,1],[0,0]]){
  f.window.scrollY=s.start+s.travel*progress;f.api.updateScrollStories();
  assert.equal(s.active,expected);
  assert.equal(s.buttons[expected].attrs['aria-pressed'],'true');
  if(expected)assert.equal(f.sections[0].querySelector('p').textContent,'description '+expected);
 }
});
test('crossfade stays opaque and follows intermediate scroll positions',()=>{
 const f=fixture(),s=f.api.scenes[0];
 f.api.renderStory(s,.25);
 assert.equal(s.images[0].style.opacity,'1');
 assert.ok(Math.abs(Number(s.images[1].style.opacity)-.5)<.00001);
 f.api.renderStory(s,.22);
 assert.ok(Number(s.images[1].style.opacity)<.5);
 assert.equal(s.images[0].style.opacity,'1');
});
test('slow image keeps the previous frame and catches up on load without another scroll',()=>{
 const f=fixture(),s=f.api.scenes[0];
 s.images[1].complete=false;s.images[1].naturalWidth=0;
 f.window.scrollY=s.start+s.travel*.5;f.api.updateScrollStories();
 assert.equal(s.active,0);assert.equal(s.images[0].style.opacity,'1');
 s.images[1].complete=true;s.images[1].naturalWidth=100;s.images[1].listeners.load();
 f.api.updateScrollStories();assert.equal(s.active,1);
});
test('sticky start uses header and measured travel; last button lands at release',()=>{
 const f=fixture(),s=f.api.scenes[0];
 assert.equal(s.start,924);assert.equal(s.travel,910);
 s.buttons[2].listeners.click();
 assert.equal(f.window.lastScroll.top,s.start+s.travel);
 assert.equal(f.window.lastScroll.behavior,'smooth');
 assert.ok(f.api.scenes[2].travel>0,'purpose text has a scroll interval even with one photo');
});
test('short viewports and reduced motion keep content accessible',()=>{
 const short=fixture({viewport:500});
 assert.equal(short.api.scenes[0].flowing,true);
 assert.equal(short.sections[0].classList.contains('is-flowing'),true);
 const reduced=fixture({reducedMotion:true});
 reduced.api.scenes[0].buttons[2].listeners.click();
 assert.equal(reduced.api.scenes[0].active,2);
 assert.equal(reduced.window.lastScroll,undefined);
 reduced.api.updateScrollStories();assert.equal(reduced.api.scenes[0].active,2);
});

test('late content above a scene does not shift photo timing or button destinations',()=>{
 const f=fixture(),s=f.api.scenes[0];
 s.section.getBoundingClientRect=()=>({top:1800-f.window.scrollY});
 f.window.scrollY=1800-76+s.travel*.5;
 f.api.updateScrollStories();
 assert.equal(s.active,1);
 s.buttons[0].listeners.click();assert.equal(f.window.lastScroll.top,1724);
});
