import { test,expect,type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { screenshotPath } from './local-paths';
test.use({ hasTouch:true });
async function setup(page:Page,{ role = '',entered = false } = {}) {
  const state = { price:100,acceptingOrders:true,openTime:'07:00:00',statusError:false,statusGate:null as Promise<void> | null,orders:[] as Record<string,unknown>[] };
  await page.addInitScript(({role,entered}) => {
    if (entered) sessionStorage.setItem('japz.intro.entered','yes');
    localStorage.setItem('japz.customerToken','customer-fixture');
    if (role) localStorage.setItem('authToken','staff-fixture');
    Object.defineProperty(window,'speechSynthesis',{value:undefined,configurable:true});
  },{role,entered});
  await page.route('**/api/**',async route => {
    const endpoint = new URL(route.request().url()).pathname;
    const json = (data:unknown,status=200) => route.fulfill({status,json:data,headers:{'Cache-Control':'no-store'}});
    if (endpoint === '/api/auth/user') return role ? json({user:{id:90,role,name:'Owner',email:'owner@ui.test',assignedCategories:[]}}) : json({error:'Not signed in'},401);
    if (endpoint === '/api/employee/today') return json({success:true,data:{record:{id:1,clockIn:new Date().toISOString(),clockOut:null}}});
    if (endpoint === '/api/menu-categories') return json([{id:1,name:'Burgers'},{id:2,name:'Drinks'}]);
    if (endpoint === '/api/menu-items') return json([{id:1,name:'JAPZ Burger',description:'Fresh grilled burger',categoryId:1,price:state.price,imageUrl:'/test-food.svg',status:'available',trackStock:true,stock:30},{id:2,name:'Iced Tea',description:'Freshly brewed tea',categoryId:2,price:40,imageUrl:'/test-food.svg',status:'available',trackStock:true,stock:20}]);
    if (endpoint === '/api/public/status') {
      if (state.statusGate) await state.statusGate;
      return state.statusError ? json({error:'Status unavailable'},503) : json({acceptingOrders:state.acceptingOrders,openTime:state.openTime,closeTime:'20:00:00',paymentMethods:[{key:'cash',label:'Cash',hint:'Pay when you collect your order'}]});
    }
    if (endpoint === '/api/public/popular') return json({popular:[]});
    if (endpoint === '/api/public/promos') return json({promos:[]});
    if (endpoint === '/api/public/auth/me') return json({user:{id:99,name:'Ana',email:'ana@ui.test',phone:'09123456789'}});
    if (endpoint === '/api/public/notifications') return json({notifications:[],unreadCount:0});
    if (endpoint === '/api/public/addresses') return json({addresses:[]});
    if (endpoint === '/api/public/reservations/mine') return json({reservations:[]});
    if (endpoint === '/api/public/reservations/availability') return json({available:true});
    if (endpoint === '/api/public/orders' && route.request().method() === 'POST') { state.orders.push(route.request().postDataJSON()); return json({order:{orderNumber:'WEB-TEST-1'},requiresPayment:false},201); }
    if (endpoint === '/api/public/orders/WEB-TEST-1') return json({order:{orderNumber:'WEB-TEST-1',status:'pending',orderType:'take-out',total:state.price,items:[{name:'JAPZ Burger',quantity:1,total:state.price}],delivery:null,notes:null}});
    if (endpoint.includes('/kitchen/orders/')) return json({orders:[]});
    return json([]);
  });
  await page.route('**/test-food.svg',route => route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#bb8226"/><circle cx="200" cy="150" r="90" fill="#ffce1b"/></svg>'}));
  return state;
}
test.afterEach(async ({page}) => { await page.unrouteAll({behavior:'wait'}); });
async function enter(page:Page) { await expect(page.getByRole('button',{name:'Get Started',exact:true})).toBeVisible({timeout:6500}); await page.getByRole('button',{name:'Get Started',exact:true}).click(); await expect(page.getByLabel('Search the menu')).toBeVisible(); }

test('welcome plays the rider, reveals Get Started and preserves same-session menu entry',async ({page}) => {
  await setup(page);
  const errors:string[] = []; page.on('pageerror',error => errors.push(error.message));
  const response = await page.goto('/japz'); expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle('Online Ordering · JAPZ GRILL');
  await expect(page.getByRole('heading',{name:'Made fresh. Delivered happy.',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:/^Skip(?: animation)?$/i})).toHaveCount(0);
  await expect(page.getByRole('button',{name:/Switch to (dark|light) mode/})).toHaveCount(0);
  await expect(page.getByLabel('Search the menu')).toHaveCount(0);
  await expect(page.locator('.intro-order-button')).toBeHidden();
  await expect(page.getByRole('button',{name:'Get Started',exact:true})).toBeVisible({timeout:6500});
  await expect(page.locator('.rider-delivered')).toHaveCSS('opacity','1');
  await expect(page.getByRole('button',{name:'Get Started',exact:true})).not.toBeFocused();
  await expect(page.getByRole('button',{name:/^Skip(?: animation)?$/i})).toHaveCount(0);
  await expect(page.getByRole('img',{name:'JAPZ GRILL — Burger & Bistro',exact:true})).toHaveAttribute('src','/logo.jpg');
  await expect(page.getByLabel('Search the menu')).toHaveCount(0);
  await page.getByRole('button',{name:'Get Started',exact:true}).click();
  await expect(page).toHaveURL('/japz/menu'); await expect(page.getByLabel('Search the menu')).toBeVisible();
  await page.reload(); await expect(page.getByLabel('Search the menu')).toBeVisible(); await expect(page.locator('.ordering-intro')).toHaveCount(0);
  await page.goto('/order/menu?table=4'); await expect(page.getByLabel('Search the menu')).toBeVisible(); await expect(page.locator('.storefront-context')).toContainText('Table 4');
  expect(errors).toEqual([]);
});
test('welcome hierarchy and Get Started fit small phones; reduced motion shows a static final frame',async ({page}) => {
  await setup(page); await page.emulateMedia({colorScheme:'light',reducedMotion:'reduce'}); await page.goto('/japz');
  await expect(page.getByRole('button',{name:'Get Started',exact:true})).toBeVisible();
  await expect(page.locator('.rider-vehicle')).toHaveCSS('animation-name','none');
  await expect(page.locator('.rider-delivered')).toHaveCSS('opacity','1');
  expect(await page.locator('.rider-scene').evaluate(element => element.getAnimations({subtree:true}).filter(animation => animation.playState === 'running').length)).toBe(0);
  await expect(page.getByRole('button',{name:/^Skip(?: animation)?$/i})).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('Open now');
  for (const [width,height] of [[320,480],[320,568],[320,640],[390,700],[1366,768]]) {
    await page.setViewportSize({width,height});
    await expect(page.getByRole('button',{name:'Get Started',exact:true})).toBeInViewport();
    const orderBox = (await page.getByRole('button',{name:'Get Started',exact:true}).boundingBox())!;
    expect(orderBox.y).toBeGreaterThanOrEqual(0); expect(orderBox.y+orderBox.height).toBeLessThanOrEqual(height);
    await expect(page.getByRole('img',{name:'JAPZ GRILL — Burger & Bistro',exact:true})).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const padding = await page.locator('.intro-logo-card').evaluate(element => { const box = element.getBoundingClientRect(),image = element.querySelector('img')!.getBoundingClientRect(); return image.left - box.left; });
    expect(padding).toBeGreaterThanOrEqual(12);
  }
  await expect(page.locator('.ordering-intro h1')).toHaveCount(1); await expect(page.locator('.ordering-intro header,.ordering-intro footer')).toHaveCount(0);
  await expect(page.getByText('Good food, on its way.',{exact:true})).toHaveCount(0);
  await expect(page.getByLabel('Search the menu')).toHaveCount(0);
  mkdirSync(screenshotPath,{recursive:true}); await page.setViewportSize({width:390,height:700});
  await page.screenshot({path:path.join(screenshotPath,'japz-welcome-light-phone.png'),animations:'disabled'});
  await page.emulateMedia({colorScheme:'dark'}); await expect(page.locator('.rider-scene')).toHaveCSS('color','rgb(255, 255, 255)');
  await page.screenshot({path:path.join(screenshotPath,'japz-welcome-dark-phone.png'),animations:'disabled'});
});
test('welcome follows the device and every customer page offers the remembered theme control except welcome',async ({page}) => {
  await setup(page); await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'}); await page.goto('/japz');
  const errors:string[] = []; page.on('pageerror',error => errors.push(error.message));
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark'); await expect(page.locator('.rider-scene')).toHaveCSS('color','rgb(255, 255, 255)');
  await expect(page.getByRole('button',{name:/Switch to (dark|light) mode/})).toHaveCount(0);
  await page.emulateMedia({colorScheme:'light'}); await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await page.emulateMedia({colorScheme:'dark'}); await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  mkdirSync(screenshotPath,{recursive:true}); await page.screenshot({path:path.join(screenshotPath,'japz-grill-welcome-dark.png'),animations:'disabled'});
  await enter(page);
  const toggle = page.locator('.theme-toggle');
  const size = await toggle.boundingBox(); expect(size!.width).toBe(44); expect(size!.height).toBe(44);
  await expect(toggle).toHaveAttribute('aria-label','Switch to light mode'); await toggle.click(); await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await page.reload(); await expect(page.getByLabel('Search the menu')).toBeVisible(); await expect(toggle).toHaveAttribute('aria-label','Switch to dark mode');
  await toggle.focus(); await toggle.press('Space'); await expect(toggle).toHaveAttribute('aria-label','Switch to light mode');
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.emulateMedia({colorScheme:'light'}); await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await expect(page.getByRole('combobox',{name:'Appearance',exact:true})).toHaveCount(0);
  for (const route of ['/japz/cart','/japz/track','/japz/track/WEB-TEST-1','/japz/reserve','/japz/profile','/japz/auth','/japz/pay/return?cancelled=1','/japz','/order/cart']) {
    await page.goto(route); await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
    await expect(page.locator('.storefront-loading')).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Switch to light mode',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Switch to light mode',exact:true}).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme','light');
    await page.getByRole('button',{name:'Switch to dark mode',exact:true}).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  }
  expect(errors).toEqual([]);
});

test('desktop ordering header stays on one line with hours, navigation, cart, install and account controls',async ({page}) => {
  await setup(page,{entered:true}); await page.emulateMedia({colorScheme:'light',reducedMotion:'reduce'}); await page.goto('/japz/menu?table=4');
  await page.getByRole('button',{name:'Add JAPZ Burger',exact:true}).click();
  await page.evaluate(() => { const event = new Event('beforeinstallprompt',{cancelable:true}); Object.assign(event,{prompt:async () => undefined,userChoice:Promise.resolve({outcome:'dismissed'})}); dispatchEvent(event); });
  await expect(page.getByRole('button',{name:'Install App',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Notifications',exact:true})).toBeVisible();
  await expect(page.locator('.storefront-context')).toContainText('7:00 AM – 8:00 PM · PH');
  for (const width of [1024,1280,1366,1440,1920]) {
    await page.setViewportSize({width,height:850});
    const selectors = ['.storefront-brand','.storefront-context','.storefront-desktop-nav','.storefront-install-slot','.storefront-header-actions'];
    const boxes = await Promise.all(selectors.map(selector => page.locator(selector).boundingBox()));
    const center = boxes[0]!.y+boxes[0]!.height/2;
    for (let index=0; index<boxes.length; index++) {
      const box = boxes[index]!;
      expect(Math.abs(box.y+box.height/2-center)).toBeLessThanOrEqual(1);
      expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x+box.width).toBeLessThanOrEqual(width);
      if (index) expect(box.x).toBeGreaterThanOrEqual(boxes[index-1]!.x+boxes[index-1]!.width);
    }
    expect((await page.locator('.storefront-header').boundingBox())!.height).toBeLessThanOrEqual(70);
    await expect(page.locator('.storefront-desktop-nav a')).toHaveCount(6);
    await expect(page.locator('.storefront-mobile-footer')).toBeHidden();
    await expect(page.getByRole('button',{name:/view cart/i})).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  mkdirSync(screenshotPath,{recursive:true}); await page.setViewportSize({width:1366,height:768});
  await page.screenshot({path:path.join(screenshotPath,'japz-desktop-header-light.png'),animations:'disabled'});
  await page.getByRole('button',{name:'Switch to dark mode',exact:true}).click();
  await page.screenshot({path:path.join(screenshotPath,'japz-desktop-header-dark.png'),animations:'disabled'});
  await page.locator('.storefront-desktop-nav').getByRole('link',{name:'Profile',exact:true}).click(); await expect(page).toHaveURL('/japz/profile');
  await expect(page.getByRole('button',{name:'Switch to light mode',exact:true})).toBeVisible();
  for (const width of [320,390,768,1023]) {
    await page.setViewportSize({width,height:800});
    await expect(page.locator('.storefront-desktop-nav')).toBeHidden(); await expect(page.locator('.storefront-mobile-footer')).toBeVisible();
    await expect(page.getByRole('button',{name:'Switch to light mode',exact:true})).toBeInViewport();
    await expect(page.getByRole('button',{name:/view cart/i})).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
test('mobile menu categories, large cards, cart and checkout remain usable at 320–1366px',async ({page}) => {
  const state = await setup(page,{entered:true}); await page.emulateMedia({colorScheme:'light'}); await page.goto('/japz/menu');
  await page.getByRole('button',{name:'Drinks',exact:true}).click(); await expect(page.getByRole('button',{name:'Add JAPZ Burger',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'All',exact:true}).click(); await page.getByRole('button',{name:'Add JAPZ Burger',exact:true}).click();
  for (const [width,height] of [[320,700],[390,700],[768,850],[1366,768]]) {
    await page.setViewportSize({width,height}); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button',{name:'Add another JAPZ Burger',exact:true}).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button',{name:'Add another JAPZ Burger',exact:true})).toBeInViewport();
  }
  mkdirSync(screenshotPath,{recursive:true}); await page.setViewportSize({width:390,height:800}); await page.locator('.storefront-content').evaluate(element => { element.scrollTop = 0; });
  await expect(page.getByText('JAPZ Burger added',{exact:true})).toHaveCount(0);
  await page.screenshot({path:path.join(screenshotPath,'japz-grill-menu-light.png'),animations:'disabled'});
  await page.getByRole('button',{name:'Switch to dark mode',exact:true}).click();
  await expect(page.locator('.storefront-product-card').first()).toHaveCSS('background-color','rgb(32, 34, 29)');
  await expect(page.locator('.storefront-product-title').first()).toHaveCSS('color','rgb(244, 244, 237)');
  const contrast = await page.locator('.storefront-product-quantity button').first().evaluate(element => {
    const style = getComputedStyle(element);
    const luminance = (color:string) => { const channels = color.match(/\d+/g)!.slice(0,3).map(Number).map(value => { const s = value/255; return s <= .04045 ? s/12.92 : ((s+.055)/1.055)**2.4; }); return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722; };
    const values = [luminance(style.color),luminance(style.backgroundColor)].sort((a,b) => b-a);
    return (values[0]+.05)/(values[1]+.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
  await page.screenshot({path:path.join(screenshotPath,'japz-grill-menu-dark.png'),animations:'disabled'});
  await page.goto('/japz/cart'); await expect(page.locator('.storefront-checkout-summary')).toContainText('₱100.00');
  await page.getByRole('button',{name:'Check out',exact:true}).click();
  await expect(page.getByRole('button',{name:'Place Order',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Place Order',exact:true}).click(); await expect(page).toHaveURL('/japz/track/WEB-TEST-1');
  expect(state.orders).toHaveLength(1); expect(state.orders[0]).toMatchObject({items:[{id:1,quantity:1}],paymentMethod:'cash',orderType:'take-out'});
});
test('reconnecting fetches fresh prices and updates an existing cart without losing quantities',async ({page}) => {
  const state = await setup(page,{entered:true}); await page.goto('/japz/menu'); await page.getByRole('button',{name:'Add JAPZ Burger',exact:true}).click();
  state.price = 125; await page.evaluate(() => dispatchEvent(new Event('online')));
  await expect(page.locator('.storefront-product-card').filter({has:page.getByRole('button',{name:'View JAPZ Burger',exact:true})})).toContainText('₱125.00');
  await page.goto('/japz/cart'); await expect(page.locator('.storefront-checkout-summary')).toContainText('₱125.00');
});
test('an Android install offer captured during the intro works and dismissal is remembered',async ({page}) => {
  await setup(page); await page.goto('/japz');
  const offer = () => page.evaluate(() => { const event = new Event('beforeinstallprompt',{cancelable:true}); Object.assign(event,{prompt:async () => undefined,userChoice:Promise.resolve({outcome:'dismissed'})}); dispatchEvent(event); });
  await offer(); await enter(page); await expect(page.getByRole('button',{name:'Install App',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Install App',exact:true}).click(); await expect(page.getByRole('button',{name:'Install App',exact:true})).toHaveCount(0);
  await page.reload(); await expect(page.getByLabel('Search the menu')).toBeVisible(); await offer(); await expect(page.getByRole('button',{name:'Install App',exact:true})).toHaveCount(0);
});
test('iPhone installation gives Share instructions and hides the offer after dismissal',async ({page}) => {
  await page.addInitScript(() => Object.defineProperty(navigator,'userAgent',{value:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit Safari'}));
  await setup(page,{entered:true}); await page.goto('/japz/menu'); await page.getByRole('button',{name:'Install App',exact:true}).click();
  const dialog = page.getByRole('dialog',{name:'Install JAPZ GRILL on iPhone',exact:true}); await expect(dialog).toContainText('Add to Home Screen'); await expect(dialog).toContainText('Share');
  await dialog.getByRole('button',{name:'Not now',exact:true}).click(); await expect(page.getByRole('button',{name:'Install App',exact:true})).toHaveCount(0);
});
test('ordering dark mode never applies to ERP, including browser back and client-side navigation',async ({page}) => {
  await page.addInitScript(() => Object.defineProperty(navigator,'standalone',{value:true}));
  await setup(page,{role:'kitchen',entered:true}); await page.emulateMedia({colorScheme:'light'}); await page.goto('/japz/menu'); await expect(page.getByRole('button',{name:'Install App',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Switch to dark mode',exact:true}).click(); await expect(page.locator('html')).toHaveAttribute('data-theme','dark'); await page.goto('/kitchen/completed');
  await expect(page.getByRole('heading',{name:'Completed Orders',exact:true})).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme','light'); await expect(page.locator('.workspace-sidebar')).toHaveCSS('background-color','rgb(255, 255, 255)');
  await expect(page.getByRole('button',{name:/Switch to (dark|light) mode/})).toHaveCount(0);
  await page.emulateMedia({colorScheme:'dark'}); await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await page.evaluate(() => { history.pushState({},'', '/order/menu'); dispatchEvent(new PopStateEvent('popstate')); });
  await expect(page.getByLabel('Search the menu')).toBeVisible(); await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await expect(page.getByRole('button',{name:'Switch to light mode',exact:true})).toBeVisible();
  await page.goBack(); await expect(page.getByRole('heading',{name:'Completed Orders',exact:true})).toBeVisible(); await expect(page.locator('html')).toHaveAttribute('data-theme','light');
});
test('unknown ordering URLs still give an honest not-found page with a working ordering link',async ({page}) => {
  await setup(page); await page.goto('/japz/not-a-real-page'); await expect(page.getByRole('heading',{name:'Page not found',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Open Online Ordering',exact:true}).click(); await expect(page).toHaveURL('/japz');
});

test('Track my order remains available after the welcome animation finishes',async ({page}) => {
  await setup(page); await page.goto('/japz');
  await expect(page.getByRole('button',{name:'Get Started',exact:true})).toBeVisible({timeout:6500});
  await expect(page.getByRole('button',{name:'Get Started',exact:true})).not.toBeFocused();
  await page.getByRole('link',{name:'Track my order',exact:true}).click(); await expect(page).toHaveURL('/japz/track');
  await expect(page.getByRole('button',{name:/Switch to (dark|light) mode/})).toBeVisible();
});

test('Get Started has a focus outline for keyboard input and none for pointer input',async ({page}) => {
  await setup(page); await page.emulateMedia({reducedMotion:'reduce'}); await page.goto('/japz');
  const order = page.getByRole('button',{name:'Get Started',exact:true});
  await expect(order).toBeVisible(); await expect(order).not.toBeFocused();
  await page.keyboard.press('Tab'); await expect(order).toBeFocused(); await expect(order).toHaveCSS('outline-style','solid');
  await page.reload(); await expect(order).toBeVisible(); await page.locator('body').click({position:{x:3,y:3}});
  const box = (await order.boundingBox())!; await page.mouse.move(box.x+box.width/2,box.y+box.height/2); await page.mouse.down();
  await expect(order).toHaveCSS('outline-style','none'); await page.mouse.up(); await expect(page).toHaveURL('/japz/menu');
});

test('welcome reports loading then real closed hours, and never invents a status after a failed request',async ({page}) => {
  const state = await setup(page); await page.emulateMedia({reducedMotion:'reduce'});
  let release!: () => void; state.statusGate = new Promise(resolve => { release=resolve; }); state.acceptingOrders=false; state.openTime='08:30:00';
  await page.goto('/japz'); await expect(page.getByRole('status')).toHaveText('Checking store hours…');
  release(); state.statusGate=null;
  await expect(page.getByRole('status')).toHaveText('Closed · Opens at 8:30 AM');
  await expect(page.locator('.ordering-intro')).not.toContainText(/\d+\s*(min|minutes|mins)\b/i);
  state.statusError=true; await page.reload(); await expect(page.getByRole('status')).toHaveText('Store status unavailable');
});

test('a menu theme change fades for 250ms and reduced-motion mode suppresses transitions',async ({page}) => {
  await setup(page,{entered:true}); await page.emulateMedia({colorScheme:'light',reducedMotion:'no-preference'}); await page.goto('/japz/menu');
  await expect(page.getByRole('button',{name:'Switch to dark mode',exact:true})).toBeVisible();
  await page.locator('.storefront-header').evaluate(element => element.addEventListener('transitionend',event => { const transition=event as TransitionEvent; if (transition.propertyName === 'background-color') (element as HTMLElement).dataset.fadeDuration=String(transition.elapsedTime); }));
  await page.getByRole('button',{name:'Switch to dark mode',exact:true}).click();
  await expect(page.locator('.storefront-header')).toHaveAttribute('data-fade-duration','0.25');
  await page.emulateMedia({reducedMotion:'reduce'}); await page.getByRole('button',{name:'Switch to light mode',exact:true}).click();
  const reducedDuration = await page.locator('.storefront-header').evaluate(element => Math.max(...getComputedStyle(element).transitionDuration.split(',').map(value => parseFloat(value))));
  expect(reducedDuration).toBeLessThanOrEqual(.001);
});
