import { expect, test, type Page } from '@playwright/test';
import { Buffer } from 'node:buffer';
import type { RiderLocation } from '../src/types/delivery';

const RIDER_TOKEN = 'delivery-rider-fixture';
const CUSTOMER_TOKEN = 'delivery-customer-fixture';
const ORDER_NUMBER = 'WEB-LIVE-1';
const PROOF_PATH = '/api/deliveries/71/proof';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
interface RecordedRequest { path: string; method: string; authorization: string | undefined; body?: unknown }

async function fixtureFor(page: Page, permissionDenied = false) {
  const now = Date.now();
  const iso = new Date(now).toISOString();
  const location: RiderLocation = { status: 'live', lat: 12.752, lng: 121.486, accuracy: 8, capturedAt: iso, updatedAt: iso, staleAfterSeconds: 90 };
  const order = {
    orderNumber: ORDER_NUMBER, status: 'out-for-delivery', orderType: 'delivery', tableNumber: null,
    total: 150, notes: 'Leave at the front gate', canRate: false, rated: false,
    items: [{ name: 'JAPZ Burger', quantity: 1, total: 150 }],
    delivery: {
      address: 'Customer gate, Bongabong', lat: 12.76, lng: 121.49, storeLat: 12.748, storeLng: 121.48,
      riderName: 'Alex Rider', riderPhone: '09123456789', dispatchedAt: iso,
      etaMinMinutes: 20, etaMaxMinutes: 30, etaFrom: new Date(now + 1200000).toISOString(), etaTo: new Date(now + 1800000).toISOString(), location,
    },
  };
  const deliveryOrder = {
    orderNumber: ORDER_NUMBER, customerName: 'Ana Customer', customerPhone: '09123456789',
    deliveryAddress: 'Customer gate, Bongabong', deliveryLat: 12.76, deliveryLng: 121.49,
    total: 150, notes: null, items: [{ name: 'JAPZ Burger', quantity: 1 }],
  };
  const fixture = {
    now, order, unavailable: false, reads: 0, requests: [] as RecordedRequest[], directProofRequests: [] as string[], stopGate: null as Promise<void> | null,
    active: [{ deliveryId: 70, status: 'out-for-delivery', assignedAt: iso, startedAt: iso, deliveredAt: null, proofPhotoUrl: null, order: deliveryOrder }],
    history: [{ deliveryId: 71, status: 'delivered', assignedAt: iso, startedAt: iso, deliveredAt: iso, proofPhotoUrl: PROOF_PATH, order: { ...deliveryOrder, orderNumber: 'WEB-HISTORY-1' } }],
  };

  await page.addInitScript(({ denied, riderToken, customerToken }) => {
    localStorage.setItem('authToken', riderToken);
    localStorage.setItem('japz.customerToken', customerToken);
    sessionStorage.setItem('japz.intro.entered', 'yes');
    const state = { watchCalls: 0, currentCalls: 0, clearCalls: 0 };
    Object.defineProperty(window, '__deliveryGps', { value: state });
    const sample = () => ({ coords: { latitude: 12.752, longitude: 121.486, accuracy: 8, altitude: null, altitudeAccuracy: null, heading: null, speed: null }, timestamp: Date.now() }) as GeolocationPosition;
    const send = (success: PositionCallback, failure?: PositionErrorCallback | null) => queueMicrotask(() => {
      if (denied) failure?.({ code: 1, message: 'Permission denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
      else success(sample());
    });
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
      getCurrentPosition(success: PositionCallback, failure?: PositionErrorCallback | null) { state.currentCalls++; send(success, failure); },
      watchPosition(success: PositionCallback, failure?: PositionErrorCallback | null) { state.watchCalls++; send(success, failure); return 41; },
      clearWatch() { state.clearCalls++; },
    } });
  }, { denied: permissionDenied, riderToken: RIDER_TOKEN, customerToken: CUSTOMER_TOKEN });

  // Only the local application assets can reach the network. APIs and map
  // tiles below are fixtures, so no database or third-party service is used.
  await page.route('**/*', route => {
    const host = new URL(route.request().url()).hostname;
    return ['localhost', '127.0.0.1', '[::1]', new URL(process.env.JAPZ_UI_BASE_URL || 'http://127.0.0.1:5173').hostname].includes(host)
      ? route.continue() : route.abort();
  });
  await page.route('https://tile.openstreetmap.org/**', route => route.fulfill({ contentType: 'image/png', body: PNG }));
  await page.route('**/uploads/pod/**', route => { fixture.directProofRequests.push(route.request().url()); return route.abort(); });
  await page.route('**/api/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname, method = request.method();
    const authorization = request.headers().authorization;
    const json = (value: unknown, status = 200) => route.fulfill({ status, json: value, headers: { 'Cache-Control': 'no-store' } });
    if (path === '/api/auth/user') return json({ user: { id: 8, name: 'Alex Rider', email: 'rider@delivery.test', role: 'rider', assignedCategories: [] } });
    if (path === '/api/employee/today') return json({ success: true, data: { record: { id: 1, clockIn: iso, clockOut: null } } });
    if (path === '/api/rider/deliveries') return json({ active: fixture.active, history: fixture.history, availability: 'on-delivery' });
    if (/^\/api\/rider\/deliveries\/\d+\/location$/.test(path)) {
      fixture.requests.push({ path, method, authorization, body: method === 'PUT' ? request.postDataJSON() : undefined });
      if (method === 'DELETE' && fixture.stopGate) {
        const gate = fixture.stopGate;
        fixture.stopGate = null;
        await gate;
      }
      return json({ ok: true });
    }
    if (path === `/api/public/orders/${ORDER_NUMBER}`) {
      fixture.reads++;
      return fixture.unavailable ? json({ error: 'Connection lost.' }, 503) : json({ order: fixture.order });
    }
    if (path === '/api/public/route') return json({ points: [[12.752, 121.486], [12.76, 121.49]], distanceMeters: 1200, durationSeconds: 240 });
    if (path === PROOF_PATH) {
      fixture.requests.push({ path, method, authorization });
      return route.fulfill({ contentType: 'image/png', body: PNG, headers: { 'Cache-Control': 'private, no-store' } });
    }
    if (path === `/api/receipts/${ORDER_NUMBER}` || path === '/api/receipts/WEB-HISTORY-1') {
      fixture.requests.push({ path, method, authorization });
      return json({ receipt: {
        orderNumber: path.split('/').at(-1), source: 'online', cashierName: null, placedAt: iso, completedAt: iso,
        status: 'completed', orderType: 'delivery', tableNumber: null, customerName: 'Ana Customer', customerPhone: '09123456789',
        deliveryAddress: deliveryOrder.deliveryAddress, notes: null,
        items: [{ name: 'JAPZ Burger', quantity: 1, price: 150, total: 150, modifiers: null }], subtotal: 150, discount: 0, total: 150,
        payment: { method: 'cash', provider: null, reference: null, status: 'completed', amount: 150, amountReceived: 150, change: 0 },
        delivery: { status: 'delivered', riderName: 'Alex Rider', riderPhone: '09123456789', assignedAt: iso, startedAt: iso, deliveredAt: iso, proofPhotoUrl: PROOF_PATH, proofLat: 12.76, proofLng: 121.49 },
      } });
    }
    if (path === '/api/public/auth/me') return json({ user: { id: 22, name: 'Ana Customer', email: 'ana@delivery.test', phone: '09123456789' } });
    if (path === '/api/public/status') return json({ acceptingOrders: true, openTime: '00:00:00', closeTime: '23:59:00', paymentMethods: [] });
    if (path === '/api/public/notifications') return json({ notifications: [], unreadCount: 0 });
    if (path === '/api/public/addresses') return json({ addresses: [] });
    if (path === '/api/public/promos') return json({ promos: [] });
    if (path === '/api/public/popular') return json({ popular: [] });
    return json([]);
  });
  return fixture;
}

const gpsState = (page: Page) => page.evaluate(() => (window as unknown as { __deliveryGps: { watchCalls: number; currentCalls: number; clearCalls: number } }).__deliveryGps);
async function setVisibility(page: Page, value: DocumentVisibilityState) {
  await page.evaluate(state => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
    document.dispatchEvent(new Event('visibilitychange'));
  }, value);
}
test.afterEach(async ({ page }) => { await page.unrouteAll({ behavior: 'wait' }); });

test('rider shares fresh GPS heartbeats and Pause clears the server location and watcher', async ({ page }) => {
  const fixture = await fixtureFor(page);
  await page.clock.install({ time: fixture.now });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/rider/deliveries');
  const sharing = page.getByRole('region', { name: 'Live location sharing' });
  await sharing.getByRole('button', { name: 'Share live location', exact: true }).click();
  await expect(sharing).toContainText('Live location is sharing');
  await expect.poll(() => fixture.requests.filter(request => request.method === 'PUT').length).toBe(1);
  expect(fixture.requests[0]).toMatchObject({ path: '/api/rider/deliveries/70/location', authorization: `Bearer ${RIDER_TOKEN}`, body: { lat: 12.752, lng: 121.486, accuracy: 8 } });
  const firstCapture = (fixture.requests[0].body as { capturedAt: string }).capturedAt;
  await page.clock.runFor(10050);
  await expect.poll(() => fixture.requests.filter(request => request.method === 'PUT').length).toBe(2);
  const secondCapture = (fixture.requests.filter(request => request.method === 'PUT')[1].body as { capturedAt: string }).capturedAt;
  // The watch interval starts before the first asynchronous GPS callback;
  // allow that setup offset while still requiring a near-10-second heartbeat.
  expect(Date.parse(secondCapture) - Date.parse(firstCapture)).toBeGreaterThanOrEqual(9000);
  await sharing.getByRole('button', { name: 'Pause sharing', exact: true }).click();
  await expect(sharing).toContainText('Live location is paused');
  await expect.poll(() => fixture.requests.filter(request => request.method === 'DELETE').length).toBe(1);
  expect(fixture.requests.find(request => request.method === 'DELETE')).toMatchObject({ path: '/api/rider/deliveries/70/location', authorization: `Bearer ${RIDER_TOKEN}` });
  expect((await gpsState(page)).clearCalls).toBeGreaterThan(0);
  const currentCalls = (await gpsState(page)).currentCalls;
  await page.clock.runFor(20050);
  expect((await gpsState(page)).currentCalls).toBe(currentCalls);
  expect(fixture.requests.filter(request => request.method === 'PUT')).toHaveLength(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('blocked rider GPS permission reports the problem without claiming live sharing', async ({ page }) => {
  const fixture = await fixtureFor(page, true);
  await page.clock.install({ time: fixture.now });
  await page.goto('/rider/deliveries');
  const sharing = page.getByRole('region', { name: 'Live location sharing' });
  await sharing.getByRole('button', { name: 'Share live location', exact: true }).click();
  await expect(sharing.getByRole('status')).toContainText('Location permission is blocked.');
  await expect(sharing).not.toContainText('Live location is sharing');
  await page.clock.runFor(10050);
  expect(fixture.requests.filter(request => request.method === 'PUT')).toHaveLength(0);
  await sharing.getByRole('button', { name: 'Pause sharing', exact: true }).click();
  await expect(sharing).toContainText('Live location is paused');
  expect((await gpsState(page)).clearCalls).toBeGreaterThan(0);
});

test('rider resume waits for Pause deletion and background visibility stops GPS until a fresh foreground fix', async ({ page }) => {
  const fixture = await fixtureFor(page);
  await page.clock.install({ time: fixture.now });
  await page.goto('/rider/deliveries');
  const sharing = page.getByRole('region', { name: 'Live location sharing' });
  const publishes = () => fixture.requests.filter(request => request.method === 'PUT');
  const stops = () => fixture.requests.filter(request => request.method === 'DELETE');
  await sharing.getByRole('button', { name: 'Share live location', exact: true }).click();
  await expect(sharing).toContainText('Live location is sharing');
  await expect.poll(() => publishes().length).toBe(1);

  let releaseStop!: () => void;
  fixture.stopGate = new Promise<void>(resolve => { releaseStop = resolve; });
  try {
    await sharing.getByRole('button', { name: 'Pause sharing', exact: true }).click();
    await expect.poll(() => stops().length).toBe(1);
    // Resume while the prior stop is still in flight. A watch sample and the
    // next heartbeat must both wait for deletion to reach the server.
    await sharing.getByRole('button', { name: 'Share live location', exact: true }).click();
    await page.clock.runFor(10050);
    expect(publishes()).toHaveLength(1);
    await expect(sharing).not.toContainText('Live location is sharing');
    const releasedAt = await page.evaluate(() => Date.now());
    releaseStop();
    await expect.poll(() => publishes().length).toBe(2);
    expect(Date.parse((publishes()[1].body as { capturedAt: string }).capturedAt)).toBeGreaterThanOrEqual(releasedAt);
    expect(fixture.requests.map(request => request.method)).toEqual(['PUT', 'DELETE', 'PUT']);
    await expect(sharing).toContainText('Live location is sharing');

    const clearCalls = (await gpsState(page)).clearCalls;
    await setVisibility(page, 'hidden');
    await expect.poll(() => stops().length).toBe(2);
    await expect.poll(async () => (await gpsState(page)).clearCalls).toBeGreaterThan(clearCalls);
    const currentCalls = (await gpsState(page)).currentCalls;
    await page.clock.runFor(20050);
    expect((await gpsState(page)).currentCalls).toBe(currentCalls);
    expect(publishes()).toHaveLength(2);

    const foregroundAt = await page.evaluate(() => Date.now());
    await setVisibility(page, 'visible');
    await expect.poll(() => publishes().length).toBe(3);
    expect(Date.parse((publishes()[2].body as { capturedAt: string }).capturedAt)).toBeGreaterThanOrEqual(foregroundAt);
    expect(fixture.requests.map(request => request.method)).toEqual(['PUT', 'DELETE', 'PUT', 'DELETE', 'PUT']);
    await expect(sharing).toContainText('Live location is sharing');
    await sharing.getByRole('button', { name: 'Pause sharing', exact: true }).click();
    await expect.poll(() => stops().length).toBe(3);
  } finally {
    // Never leave the route handler blocked if an assertion fails.
    releaseStop();
  }
});

test('customer sees a fresh blue rider marker and keyless Google links; stale and completed locations disappear', async ({ page }) => {
  const fixture = await fixtureFor(page);
  await page.clock.install({ time: fixture.now });
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(`/japz/track/${ORDER_NUMBER}`);
  const tracking = page.getByRole('region', { name: 'Live rider tracking' });
  const marker = page.getByRole('img', { name: 'Rider location', exact: true });
  // The storefront is a lazy route and can need a cold Vite compilation.
  await expect(tracking).toBeVisible({ timeout: 15000 });
  await expect(tracking.getByText('Live', { exact: true })).toBeVisible();
  await expect(tracking).toContainText('GPS accuracy ±8 m');
  await expect(marker).toBeVisible();
  const mapBox = (await page.getByRole('img', { name: /Map from/ }).boundingBox())!;
  const statusBox = (await tracking.boundingBox())!;
  expect(mapBox.y + mapBox.height).toBeLessThan(statusBox.y);
  await expect(page.getByRole('img', { name: /Map from/ })).toBeInViewport();
  await expect(marker.locator('circle').first()).toHaveAttribute('fill', '#2563eb');
  const riderUrl = new URL((await tracking.getByRole('link', { name: 'View rider in Google Maps' }).getAttribute('href'))!);
  expect(riderUrl.pathname).toBe('/maps/search/');
  expect(riderUrl.searchParams.get('api')).toBe('1');
  expect(riderUrl.searchParams.get('query')).toBe('12.752,121.486');
  expect(riderUrl.searchParams.has('key')).toBe(false);
  const navigationUrl = new URL((await page.getByRole('link', { name: 'Navigate with Google Maps', exact: true }).getAttribute('href'))!);
  expect(navigationUrl.searchParams.get('destination')).toBe('12.76,121.49');
  expect(navigationUrl.searchParams.get('origin')).toBe('12.752,121.486');
  expect(navigationUrl.searchParams.get('dir_action')).toBe('navigate');
  expect(navigationUrl.searchParams.has('key')).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  fixture.order.delivery.location = { ...fixture.order.delivery.location, status: 'stale' };
  await page.clock.runFor(5050);
  await expect(marker).toHaveCount(0);
  await expect(tracking).toContainText('The last GPS update is old.');
  fixture.order.delivery.location = { ...fixture.order.delivery.location, status: 'live', capturedAt: new Date(fixture.now - 120000).toISOString() };
  await page.clock.runFor(5050);
  await expect(marker).toHaveCount(0);
  await expect(tracking).toContainText('The last GPS update is old.');
  fixture.order.delivery.location = { ...fixture.order.delivery.location, capturedAt: new Date(fixture.now + 10000).toISOString(), updatedAt: new Date(fixture.now + 10000).toISOString() };
  await page.clock.runFor(5050);
  await expect(marker).toBeVisible();
  fixture.order.status = 'completed';
  await page.clock.runFor(5050);
  await expect(marker).toHaveCount(0);
  await expect(tracking).toContainText('Delivery complete. Live location sharing has ended.');
  await expect(tracking.getByText('Ended', { exact: true })).toBeVisible();
});

test('customer connection loss keeps order details but hides the rider until fresh updates recover', async ({ page }) => {
  const fixture = await fixtureFor(page);
  await page.clock.install({ time: fixture.now });
  await page.goto(`/japz/track/${ORDER_NUMBER}`);
  const marker = page.getByRole('img', { name: 'Rider location', exact: true });
  await expect(marker).toBeVisible();
  fixture.unavailable = true;
  await page.clock.runFor(5050);
  await expect(page.getByRole('status').filter({ hasText: 'Connection interrupted. Showing the last order details' })).toBeVisible();
  await expect(page.getByText(ORDER_NUMBER, { exact: true })).toBeVisible();
  await expect(page.getByText('Leave at the front gate', { exact: false })).toBeVisible();
  await expect(marker).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Live rider tracking' })).toContainText('Reconnecting to location updates');
  fixture.unavailable = false;
  fixture.order.delivery.location = { ...fixture.order.delivery.location, lat: 12.755, lng: 121.488, capturedAt: new Date(fixture.now + 5050).toISOString(), updatedAt: new Date(fixture.now + 5050).toISOString() };
  await page.clock.runFor(5050);
  await expect(marker).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Connection interrupted. Showing the last order details' })).toHaveCount(0);
  const riderLink = page.getByRole('link', { name: 'View rider in Google Maps' });
  expect(new URL((await riderLink.getAttribute('href'))!).searchParams.get('query')).toBe('12.755,121.488');
});

test('private rider proof and customer receipt photos use their own identity and render blob images', async ({ page }) => {
  const fixture = await fixtureFor(page);
  await page.goto('/rider/deliveries');
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await page.getByRole('button', { name: 'Proof', exact: true }).click();
  const proof = page.getByRole('dialog', { name: 'Proof of delivery' }).getByRole('img', { name: 'Proof of delivery', exact: true });
  await expect(proof).toHaveAttribute('src', /^blob:/);
  await expect.poll(() => proof.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const riderProofRequests = fixture.requests.filter(request => request.path === PROOF_PATH);
  // StrictMode can begin an initial fetch before cleaning it up and retrying.
  // Every request in this phase must still carry the rider's own identity.
  expect(riderProofRequests.length).toBeGreaterThanOrEqual(1);
  expect(riderProofRequests.every(request => request.method === 'GET' && request.authorization === `Bearer ${RIDER_TOKEN}`)).toBe(true);
  const riderPhaseCount = riderProofRequests.length;
  await page.getByRole('button', { name: 'Close proof', exact: true }).click();

  await page.goto(`/japz/track/${ORDER_NUMBER}`);
  await page.getByRole('button', { name: 'View receipt', exact: true }).click();
  const customerProof = page.getByRole('img', { name: 'Proof of delivery', exact: true });
  await expect(customerProof).toHaveAttribute('src', /^blob:/);
  await expect.poll(() => customerProof.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const customerReceipts = fixture.requests.filter(request => request.path === `/api/receipts/${ORDER_NUMBER}`);
  expect(customerReceipts.length).toBeGreaterThanOrEqual(1);
  expect(customerReceipts.every(request => request.authorization === `Bearer ${CUSTOMER_TOKEN}`)).toBe(true);
  const customerProofRequests = fixture.requests.filter(request => request.path === PROOF_PATH).slice(riderPhaseCount);
  expect(customerProofRequests.length).toBeGreaterThanOrEqual(1);
  expect(customerProofRequests.every(request => request.method === 'GET' && request.authorization === `Bearer ${CUSTOMER_TOKEN}`)).toBe(true);
  expect(fixture.directProofRequests).toEqual([]);
  await expect(customerProof).not.toHaveAttribute('src', /token|\/uploads\/pod\//);
});
