const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH ? { executablePath:process.env.CHROME_PATH } : {})});
 const results=[];
 for(const width of (process.env.TEST_WIDTHS ? process.env.TEST_WIDTHS.split(",").map(Number) : [320,375,390,430,640,768,820,1024,1440])){
  const page=await browser.newPage({viewport:{width,height:width<821?812:900},isMobile:width<821,hasTouch:width<821});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:8765');await page.waitForTimeout(300);
  await page.evaluate(()=>document.querySelector('[data-consent="reject"]')?.click());
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`home overflow ${width}`);
  if(width<=820){
   await page.locator('[data-action="menu"]').click();
   await page.locator('[data-action="menu"]').click();
   await page.locator('#productos-destacados').scrollIntoViewIfNeeded();
   await page.waitForTimeout(300);
   const geometry=await page.evaluate(()=>[...document.querySelectorAll('.showcase-panel')].map(p=>{const name=p.querySelector('.showcase-product-name').getBoundingClientRect(),pack=p.querySelector('.showcase-pack').getBoundingClientRect(),detail=p.querySelector('.showcase-detail').getBoundingClientRect();return {width:p.clientWidth,packBottom:pack.bottom,nameTop:name.top,nameBottom:name.bottom,detailTop:detail.top}}));
   geometry.forEach(g=>{assert.ok(g.width>=width-80,`panel width ${width}`);assert.ok(g.packBottom<=g.nameTop,`pack overlap ${width}`);assert.ok(g.nameBottom<=g.detailTop,`copy overlap ${width}`)});
   await page.locator('[data-showcase-step="1"]').click();await page.waitForTimeout(800);
   assert.match(await page.locator('.showcase-count').innerText(),/02/);
   await page.evaluate(()=>{const a=document.querySelector('.showcase-accordion');a.scrollTo({left:(a.clientWidth+12)*3,behavior:'instant'})});await page.waitForTimeout(200);
   assert.match(await page.locator('.showcase-count').innerText(),/04/);
   await page.locator('[data-showcase-step="1"]').click();await page.waitForTimeout(800);
   assert.match(await page.locator('.showcase-count').innerText(),/01/);

  }
  if(width>820){
   await page.locator('#productos-destacados').scrollIntoViewIfNeeded();
   await page.waitForTimeout(800);
   const g=await page.locator('.showcase-panel.is-selected').evaluate(p=>({pack:p.querySelector('.showcase-pack').getBoundingClientRect().bottom,name:p.querySelector('.showcase-product-name').getBoundingClientRect().top}));
   assert.ok(g.pack<=g.name,'desktop product image must clear title');
  }
  for(const route of ['/productos' ,'/recetas','/empresas','/nosotros','/contacto','/privacidad','/terminos']){
   await page.evaluate(path=>{history.pushState({},'',path);dispatchEvent(new PopStateEvent('popstate'));scrollTo({top:0,behavior:'instant'})},route);
   await page.waitForTimeout(100);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${route} overflow ${width}`);
   assert.ok(await page.locator('main').innerText());
  }
  assert.deepEqual(errors,[],`errors ${width}`);results.push({width,status:'pass'});await page.close();
 }
 // Verify actual touch gestures, overlay state preservation, keyboard focus and
 // live accessibility preference changes independently of the viewport matrix.
 const page=await browser.newPage({viewport:{width:390,height:812},isMobile:true,hasTouch:true});
 await page.goto(process.env.TEST_URL || 'http://127.0.0.1:8765');
 await page.evaluate(()=>document.querySelector('[data-consent="reject"]')?.click());
 await page.locator('#productos-destacados').scrollIntoViewIfNeeded();
 await page.waitForTimeout(300);
 const main=await page.locator('main').elementHandle();
 await page.locator('[data-action="menu"]').click();
 assert.equal(await main.evaluate(el=>el.isConnected),true,'menu must preserve route DOM');
 await page.locator('.mobile-panel a').last().focus();await page.keyboard.press('Tab');
 assert.equal(await page.locator('[data-action="menu"]').evaluate(el=>el===document.activeElement),true);
 await page.keyboard.press('Escape');
 assert.equal(await page.locator('[data-action="menu"]').getAttribute('aria-expanded'),'false');
 const cdp=await page.context().newCDPSession(page);
 const touch=async(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y}]});
 // Start a vertical gesture over the carousel: the document must move immediately.
 await page.evaluate(()=>{const y=document.querySelector('.showcase-accordion').getBoundingClientRect().top+scrollY;scrollTo({top:y-120,behavior:'instant'})});
 const before=await page.evaluate(()=>scrollY);
 await touch('touchStart',190,390);
 for(let i=1;i<=6;i++){await touch('touchMove',190,390-i*24);await page.waitForTimeout(20)}
 await touch('touchEnd');await page.waitForTimeout(400);
 assert.ok(await page.evaluate(()=>scrollY)>before+40,'vertical scrolling over carousel stays free');
 assert.match(await page.locator('.showcase-count').innerText(),/01/);
 await page.evaluate(()=>{const y=document.querySelector('.showcase-accordion').getBoundingClientRect().top+scrollY;scrollTo({top:y-120,behavior:'instant'})});
 await touch('touchStart',330,350);
 for(let i=1;i<=8;i++){await touch('touchMove',330-i*33,350);await page.waitForTimeout(20)}
 await touch('touchEnd');await page.waitForTimeout(900);
 assert.ok(await page.locator('.showcase-accordion').evaluate(el=>el.scrollLeft)>100,'horizontal gesture uses native rail');
 assert.doesNotMatch(await page.locator('.showcase-count').innerText(),/^01/);
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
 assert.equal(await page.locator('.home-hero').evaluate(el=>getComputedStyle(el).position),'relative');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(100);
 assert.equal(await page.locator('.home-hero').evaluate(el=>getComputedStyle(el).position),'sticky');
 results.push({gestures:'pass',keyboard:'pass',reducedMotion:'pass'});
 console.log(JSON.stringify(results,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
