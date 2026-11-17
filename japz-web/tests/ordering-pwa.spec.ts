import { test,expect } from '@playwright/test';
const origin = process.env.JAPZ_PWA_BASE_URL;
test.skip(!origin,'Set JAPZ_PWA_BASE_URL to a production preview to verify the generated service worker.');
test('production manifest, icons, direct links and offline page work without caching any API data',async ({page,context}) => {
  await context.route('**/api/**',route => route.fulfill({json:new URL(route.request().url()).pathname === '/api/auth/user' ? {user:null} : [],headers:{'Cache-Control':'no-store'}}));
  await page.goto(origin + '/logo.jpg');
  await page.evaluate(async () => { const cache = await caches.open('japz-food-shell-legacy-test'); await cache.put('/old-rider-logo.svg',new Response('old logo')); });
  await page.goto(origin + '/japz');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  const manifest = await page.evaluate(async () => (await fetch('/manifest.json')).json());
  expect(manifest).toMatchObject({name:'JAPZ GRILL',short_name:'JAPZ GRILL',display:'standalone',start_url:'/japz/'});
  expect(await page.evaluate(async () => (await caches.keys()).some(key => key.startsWith('japz-food-shell-')))).toBe(false);
  for (const icon of manifest.icons) {
    const dimensions = await page.evaluate(async src => { const image = new Image(); image.src = src; await image.decode(); return [image.naturalWidth,image.naturalHeight]; },icon.src);
    expect(dimensions.join('x')).toBe(icon.sizes);
  }
  for (const route of ['/japz/menu','/japz/cart','/order/menu']) {
    const response = await page.goto(origin + route); expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading',{name:'Page not found',exact:true})).toHaveCount(0);
  }
  await page.evaluate(async () => {
    await fetch('/api/public/menu'); await fetch('/api/public/orders',{method:'POST',body:'{}',headers:{'Content-Type':'application/json'}});
    await fetch('/api/public/auth/me'); await fetch('/api/payments/pos/status/test');
  });
  const cached = await page.evaluate(async () => (await Promise.all((await caches.keys()).filter(key => key.startsWith('japz-grill-shell-')).map(async key => (await (await caches.open(key)).keys()).map(request => new URL(request.url).pathname)))).flat());
  expect(cached).toContain('/offline.html'); expect(cached).toContain('/index.html');
  expect(cached).toContain('/logo.jpg'); expect(cached).not.toContain('/rider-logo.svg');
  expect(cached.some(value => value.startsWith('/api/') || value.includes('/uploads/'))).toBe(false);
  await context.setOffline(true); await page.goto(origin + '/japz/menu');
  await expect(page.getByRole('heading',{name:'We’ll be right here.',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Try again',exact:true})).toBeVisible();
  await expect(page.getByRole('img',{name:'JAPZ GRILL logo',exact:true})).toHaveAttribute('src','/logo.jpg');
  await expect(page.getByText('No order or payment has been sent from this offline page.')).toBeVisible();
  await context.setOffline(false); await page.getByRole('button',{name:'Try again',exact:true}).click();
  await expect(page.getByRole('heading',{name:'We’ll be right here.',exact:true})).toHaveCount(0);
});
