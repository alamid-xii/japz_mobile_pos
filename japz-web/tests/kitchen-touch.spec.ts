import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { screenshotPath } from './local-paths';

test.use({ hasTouch: true });
type Status = 'pending' | 'preparing' | 'ready';
interface Item { id: number; name: string; quantity: number; status: Status; modifiers: Record<string, unknown> }
interface Order { id: number; orderNumber: string; createdAt: string; placedAt: string; status: Status; customerName: string; orderType: string; tableNumber: string; notes: string; allReady: boolean; items: Item[] }
const makeOrders = (count = 12): Order[] => Array.from({ length: count }, (_, index) => {
  const placedAt = new Date(Date.now() - (30 - index) * 60000).toISOString();
  return { id: index + 1, orderNumber: `K${String(index + 1).padStart(3, '0')}`, status: 'pending', createdAt: placedAt, placedAt, customerName: 'Touchscreen test', orderType: 'dine-in', tableNumber: `${index + 1}`, notes: index === 0 ? 'No peanuts — allergy. Keep separate.' : '', allReady: false, items: [
    { id: (index + 1) * 100 + 1, name: 'Grilled chicken rice bowl', quantity: 2, status: 'pending', modifiers: { size: 'Large', flavors: ['Garlic', 'No chili'] } },
    { id: (index + 1) * 100 + 2, name: 'Iced coffee', quantity: 1, status: 'pending', modifiers: { size: 'Large', temperature: 'Iced' } },
  ] };
});
async function fixtureFor(page: Page, count = 12) {
  const fixture = { orders: makeOrders(count), unavailable: false, rejectWrites: false, reads: 0, writes: [] as { path: string; status: Status }[], writeGate: null as Promise<void> | null, nextReadGate: null as Promise<void> | null };
  await page.addInitScript(() => localStorage.setItem('authToken', 'kitchen-touch-fixture'));
  await page.route('**/api/**', async route => {
    const endpoint = new URL(route.request().url()).pathname;
    if (endpoint === '/api/auth/user') return route.fulfill({ json: { user: { id: 77, role: 'kitchen', name: 'Kitchen staff', email: 'kitchen@touch.test', assignedCategories: [] } } });
    if (endpoint === '/api/employee/today') return route.fulfill({ json: { success: true, data: { record: { id: 1, clockIn: new Date().toISOString(), clockOut: null } } } });
    if (endpoint === '/api/kitchen/orders' || endpoint === '/api/kitchen/orders/incoming') {
      fixture.reads++;
      if (fixture.unavailable) return route.fulfill({ status: 503, json: { error: 'Kitchen connection is offline.' } });
      const orders = JSON.parse(JSON.stringify(fixture.orders));
      if (fixture.nextReadGate && endpoint === '/api/kitchen/orders') { const gate = fixture.nextReadGate; fixture.nextReadGate = null; await gate; }
      return route.fulfill({ json: { orders } });
    }
    if (route.request().method() === 'PUT') {
      const { status } = route.request().postDataJSON() as { status: Status };
      fixture.writes.push({ path: endpoint, status });
      if (fixture.writeGate) await fixture.writeGate;
      if (fixture.rejectWrites) return route.fulfill({ status: 409, json: { error: 'This ticket could not be saved. Refresh and retry.' } });
      if (endpoint.startsWith('/api/orders/')) {
        const order = fixture.orders.find(order => order.id === Number(endpoint.split('/')[3]))!;
        order.status = status;
        order.items.forEach(item => { item.status = status; });
        order.allReady = status === 'ready';
        return route.fulfill({ json: { order } });
      }
      const itemId = Number(endpoint.split('/')[4]);
      const order = fixture.orders.find(order => order.items.some(item => item.id === itemId))!;
      order.items.find(item => item.id === itemId)!.status = status;
      order.allReady = order.items.every(item => item.status === 'ready');
      order.status = order.allReady ? 'ready' : order.items.some(item => item.status !== 'pending') ? 'preparing' : 'pending';
      return route.fulfill({ json: { allReady: order.allReady, orderStatus: order.status } });
    }
    return route.fulfill({ json: [] });
  });
  return fixture;
}
test.afterEach(async ({ page }) => { await page.unrouteAll({ behavior: 'wait' }); });

test('Start Preparing opens the selected ticket; Done sends it and returns to incoming', async ({ page }) => {
  const fixture = await fixtureFor(page);
  // Target a newer ticket to prove that Prep Board opens the selected order.
  await page.goto('/kitchen/incoming');
  const incoming = page.getByRole('article', { name: 'Order K003', exact: true });
  await incoming.getByRole('button', { name: 'Start Preparing', exact: true }).tap();
  await expect(page).toHaveURL(/\/kitchen\/prep\?order=3$/);
  const current = page.locator('.kitchen-ticket-selected');
  await expect(current).toHaveAccessibleName('Order K003');
  await expect(page.getByRole('article').first()).toHaveAccessibleName('Order K003');
  await current.getByRole('button', { name: 'Done · send to cashier', exact: true }).tap();
  await expect(page).toHaveURL(/\/kitchen\/incoming$/);
  await expect(page.locator('.kitchen-sync-message')).toContainText('K003 sent to cashier');
  expect(fixture.orders[2].status).toBe('ready');
  expect(fixture.orders[2].items.every(item => item.status === 'ready')).toBe(true);
  expect(fixture.writes).toEqual([{ path: '/api/orders/3/status', status: 'preparing' }, { path: '/api/orders/3/status', status: 'ready' }]);
});

for (const route of ['incoming', 'prep']) {
  test(`${route}: filters and ticket actions stay in place while tickets scroll`, async ({ page }) => {
    const fixture = await fixtureFor(page, 24);
    fixture.orders[0].items = Array.from({ length: 10 }, (_, index) => ({ ...fixture.orders[0].items[0], id: 1001 + index, name: `Grilled chicken with a long preparation description ${index + 1}` }));
    await page.goto(`/kitchen/${route}`);
    await expect(page.getByRole('article').first()).toBeVisible();
    for (const [width, height] of [[320, 640], [768, 1024], [1366, 768]]) {
      await page.setViewportSize({ width, height });
      const filters = page.getByRole('group', { name: 'Order status' });
      const before = await filters.boundingBox();
      const buttons = await filters.getByRole('button').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height));
      expect(buttons.every(height => height >= 60)).toBe(true);
      const scroll = page.locator('.kitchen-scroll');
      await scroll.evaluate(element => { element.scrollTop = element.scrollHeight; });
      expect(await scroll.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
      expect((await filters.boundingBox())?.y).toBe(before?.y);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await scroll.evaluate(element => { element.scrollTop = 0; });
      const ticket = page.getByRole('article').first(), body = ticket.locator('.kitchen-ticket-body'), footer = ticket.locator('.kitchen-ticket-footer');
      const footerBefore = await footer.boundingBox();
      await body.evaluate(element => { element.scrollTop = element.scrollHeight; });
      expect((await footer.boundingBox())?.y).toBe(footerBefore?.y);
      const actionHeights = await ticket.locator('.kitchen-ticket-footer button').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height));
      expect(actionHeights.every(height => height >= 48)).toBe(true);
      await body.evaluate(element => { element.scrollTop = 0; });
    }
    mkdirSync(screenshotPath, { recursive: true });
    await page.screenshot({ path: path.join(screenshotPath, `kitchen-${route}-touch-desktop.png`), animations: 'disabled' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(screenshotPath, `kitchen-${route}-touch-mobile.png`), animations: 'disabled' });
  });
}

test('item Start and Ready stay separate; finishing the final item returns automatically', async ({ page }) => {
  const fixture = await fixtureFor(page, 1);
  await page.goto('/kitchen/prep');
  const ticket = page.getByRole('article', { name: 'Order K001', exact: true });
  const start = ticket.getByRole('button', { name: 'Start Grilled chicken rice bowl', exact: true });
  const ready = ticket.getByRole('button', { name: 'Mark Grilled chicken rice bowl ready', exact: true });
  await expect(ready).toBeDisabled();
  const startBefore = await start.boundingBox(), readyBefore = await ready.boundingBox();
  await start.tap();
  await expect(ready).toBeEnabled();
  await expect(start).toBeDisabled();
  expect((await start.boundingBox())?.x).toBe(startBefore?.x);
  expect((await ready.boundingBox())?.x).toBe(readyBefore?.x);
  await ready.tap();
  await expect(ticket.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  await ticket.getByRole('button', { name: 'Start Iced coffee', exact: true }).tap();
  await ticket.getByRole('button', { name: 'Mark Iced coffee ready', exact: true }).tap();
  await expect(page).toHaveURL('/kitchen/incoming');
  expect(fixture.orders[0].allReady).toBe(true);
});

test('failed Start or Done keeps the ticket open and retry does not lose progress', async ({ page }) => {
  const fixture = await fixtureFor(page, 1);
  fixture.rejectWrites = true;
  await page.goto('/kitchen/incoming');
  await page.getByRole('button', { name: 'Start Preparing', exact: true }).tap();
  await expect(page.getByRole('alert')).toContainText('could not be saved');
  await expect(page).toHaveURL('/kitchen/incoming');
  fixture.rejectWrites = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).tap();
  await page.getByRole('button', { name: 'Start Preparing', exact: true }).tap();
  await expect(page).toHaveURL(/\/prep\?order=1$/);
  fixture.rejectWrites = true;
  await page.getByRole('button', { name: 'Done · send to cashier', exact: true }).tap();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/\/prep\?order=1$/);
  expect(fixture.orders[0].status).toBe('preparing');
});

test('an in-flight double tap produces one update and opens one prep ticket', async ({ page }) => {
  const fixture = await fixtureFor(page, 1);
  let release!: () => void;
  fixture.writeGate = new Promise(resolve => { release = resolve; });
  await page.goto('/kitchen/incoming');
  const button = page.getByRole('button', { name: 'Start Preparing', exact: true });
  await button.dblclick();
  await expect.poll(() => fixture.writes.length).toBe(1);
  await expect(page.getByRole('button', { name: 'Starting…', exact: true })).toBeDisabled();
  release();
  await expect(page).toHaveURL(/\/prep\?order=1$/);
  expect(fixture.writes).toHaveLength(1);
});

test('connection errors preserve tickets and filter positions; retry restores actions', async ({ page }) => {
  const fixture = await fixtureFor(page, 1);
  await page.goto('/kitchen/incoming');
  const filters = page.getByRole('group', { name: 'Order status' });
  await expect(page.getByRole('article')).toHaveCount(1);
  const position = await filters.boundingBox();
  fixture.unavailable = true;
  await page.getByRole('button', { name: 'Refresh orders', exact: true }).tap();
  await expect(page.getByRole('alert')).toContainText('connection is offline');
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Start Preparing', exact: true })).toBeDisabled();
  expect((await filters.boundingBox())?.y).toBe(position?.y);
  fixture.unavailable = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).tap();
  await expect(page.getByRole('button', { name: 'Start Preparing', exact: true })).toBeEnabled();
});

test('a missing selected order does not expose a different ticket as the current order', async ({ page }) => {
  await fixtureFor(page, 3);
  await page.goto('/kitchen/prep?order=999');
  await expect(page.getByRole('heading', { name: 'This order is no longer in the kitchen' })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0);
  await page.getByRole('button', { name: 'Back to incoming', exact: true }).tap();
  await expect(page).toHaveURL('/kitchen/incoming');
});

test('an older refresh cannot put an item back to pending after Start succeeds', async ({ page }) => {
  const fixture = await fixtureFor(page, 1);
  await page.goto('/kitchen/prep');
  const ready = page.getByRole('button', { name: 'Mark Grilled chicken rice bowl ready', exact: true });
  await expect(ready).toBeDisabled();
  let release!: () => void;
  fixture.nextReadGate = new Promise(resolve => { release = resolve; });
  const reads = fixture.reads;
  await page.getByRole('button', { name: 'Refresh orders', exact: true }).tap();
  await expect.poll(() => fixture.reads).toBeGreaterThan(reads);
  await page.getByRole('button', { name: 'Start Grilled chicken rice bowl', exact: true }).tap();
  await expect(ready).toBeEnabled();
  const olderResponse = page.waitForResponse(async response => response.url().endsWith('/api/kitchen/orders') && (await response.json()).orders[0].status === 'pending');
  release();
  await olderResponse;
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(ready).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Start Grilled chicken rice bowl', exact: true })).toBeDisabled();
});
