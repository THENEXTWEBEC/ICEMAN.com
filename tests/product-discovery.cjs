const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
 for (const width of [375,390,430,1024,1440]) {
  const mobile=width<821;
  const page=await browser.newPage({viewport:{width,height:900},isMobile:mobile,hasTouch:mobile});
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:8766');
  await page.evaluate(()=>document.querySelector('[data-consent="reject"]')?.click());
  const cards=page.locator('.discovery-card'),links=page.locator('.discovery-link');
  await cards.first().scrollIntoViewIfNeeded();
  assert.equal(await cards.count(),4);
  assert.equal(await page.locator('.discovery-pack').evaluateAll(images=>images.every(img=>{const s=getComputedStyle(img);return s.mixBlendMode==='normal'&&s.opacity==='1'&&s.filter==='none'})),true,'product colors must not blend with backgrounds');
  const geometry=await cards.evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));
  assert.equal(geometry[0].left,0);assert.equal(geometry[1].left,geometry[0].right);
  geometry.forEach(r=>assert.equal(r.height,geometry[0].height));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.equal(await page.locator('.showcase-accordion,.showcase-controls').count(),0);
  if(mobile){
   assert.equal(geometry[0].width,width/2);
   await links.first().tap();assert.equal(await page.locator('.is-revealed').count(),1);
   assert.equal(new URL(page.url()).pathname,'/');
   await links.nth(1).tap();assert.equal(await cards.first().getAttribute('class'),'discovery-card');
   await page.locator('.home-showcase-heading').tap();assert.equal(await page.locator('.is-revealed').count(),0);
   await links.first().tap();await page.waitForTimeout(350);
   const copy=await page.locator('.discovery-copy').first().evaluate(e=>({height:e.scrollHeight,box:e.clientHeight,top:e.getBoundingClientRect().top,img:e.parentElement.querySelector('img').getBoundingClientRect().bottom}));
   assert.ok(copy.height<=copy.box);assert.ok(copy.top>=copy.img);
   await page.locator('.home-showcase-heading').tap();
   for(let i=0;i<4;i++){
    await links.nth(i).tap();await page.waitForTimeout(350);
    const visible=await cards.nth(i).evaluate(e=>{const p=e.querySelector('img').getBoundingClientRect(),r=e.getBoundingClientRect(),c=e.querySelector('.discovery-copy');return p.left>=r.left&&p.right<=r.right&&p.top>=r.top&&p.bottom<=c.getBoundingClientRect().top&&c.scrollHeight<=c.clientHeight});
    assert.ok(visible,`entire product and text visible ${width}, card ${i}`);
   }
   await links.first().tap();await page.waitForTimeout(350);
   await page.screenshot({path:`/tmp/iceman-grid-${width}.png`,fullPage:false});
   const cdp=await page.context().newCDPSession(page);
   await page.evaluate(()=>scrollTo({top:document.querySelector('.discovery-grid').getBoundingClientRect().top+scrollY-150,behavior:'instant'}));
   const before=await page.evaluate(()=>scrollY);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:100,y:350}]});
   for(let i=1;i<=6;i++) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:100,y:350-i*22}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.waitForTimeout(300);assert.ok(await page.evaluate(()=>scrollY)>before+30);assert.equal(new URL(page.url()).pathname,'/');
   await links.first().tap();assert.match(new URL(page.url()).pathname,/papas-air-fryer/);
  } else {
   await links.first().hover();assert.equal(await page.locator('.is-revealed').count(),1);
   await links.first().click();assert.match(new URL(page.url()).pathname,/papas-air-fryer/);
  }
  await page.goBack();await links.first().focus();await page.keyboard.press('Enter');assert.match(new URL(page.url()).pathname,/papas-air-fryer/);
  await page.goBack();await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.discovery-pack').first().evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
  assert.deepEqual(errors,[]);console.log(`${width}: PASS`);await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
