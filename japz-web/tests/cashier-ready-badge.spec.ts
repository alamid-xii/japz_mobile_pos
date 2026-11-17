import { expect, test, type Page } from '@playwright/test';

interface ReadyOrder {
  id: number;
  orderNumber: string;
  allReady: boolean;
  status?: string;
  delivery: { id: number; status: string; rider: { id: number; name: string } | null } | null;
}
const readyOrder = (id: number): ReadyOrder => ({ id, orderNumber: `R${id}`, allReady: true, delivery: null });

async function fixtureFor(page: Page, orders: ReadyOrder[] = []) {
  const fixture = { orders, unavailable: false, reads: 0 };
  await page.addInitScript(() => localStorage.setItem('authToken', 'cashier-ready-badge-fixture'));
  await page.route('**/api/**', async route => {
    const endpoint = new URL(route.request().url()).pathname;
    if (endpoint === '/api/auth/user') return route.fulfill({ json: { user: { id: 42, role: 'cashier', name: 'Alex Santos', email: 'cashier@badge.test' } } });
    if (endpoint === '/api/employee/today') return route.fulfill({ json: { success: true, data: { record: { id: 1, clockIn: new Date().toISOString(), clockOut: null } } } });
    if (endpoint === '/api/employee/payslips') return route.fulfill({ json: { success: true, data: [] } });
    if (endpoint === '/api/cashier/ready-orders') {
      fixture.reads++;
      return fixture.unavailable
        ? route.fulfill({ status: 503, json: { error: 'Connection unavailable.' } })
        : route.fulfill({ json: { orders: fixture.orders } });
    }
    if (endpoint === '/api/cashier/available-riders') return route.fulfill({ json: { riders: [] } });
    return route.fulfill({ json: [] });
  });
  return fixture;
}

test.afterEach(async ({ page }) => { await page.unrouteAll({ behavior: 'wait' }); });

test('ready sidebar polls actionable orders and recovers from a connection failure', async ({ page }) => {
  const fixture = await fixtureFor(page);
  await page.goto('/cashier/payslips');
  const ready = page.getByRole('link', { name: 'Ready for pickup', exact: true });
  const badge = ready.locator('.workspace-notification-badge');
  await expect(ready).toHaveAccessibleDescription('No ready orders awaiting handover.');
  await expect(badge).toHaveCount(0);

  fixture.orders = [
    readyOrder(1),
    { ...readyOrder(2), allReady: false },
    { ...readyOrder(3), delivery: { id: 3, status: 'assigned', rider: null } },
    { ...readyOrder(4), delivery: { id: 4, status: 'out-for-delivery', rider: { id: 8, name: 'Rider' } } },
    { ...readyOrder(5), delivery: { id: 5, status: 'delivered', rider: { id: 8, name: 'Rider' } } },
    { ...readyOrder(6), status: 'completed' },
  ];
  // The kitchen can finish an order while the cashier stays on another page.
  await expect(badge).toHaveText('1', { timeout: 10000 });
  await expect(ready).toHaveAccessibleName('Ready for pickup');
  await expect(ready).toHaveAccessibleDescription('1 ready order awaiting handover.');
  await expect(page.getByRole('status').filter({ hasText: '1 ready order awaiting handover.' })).toHaveAttribute('aria-live', 'polite');

  fixture.unavailable = true;
  const failedRead = page.waitForResponse(response => response.url().includes('/api/cashier/ready-orders') && response.status() === 503);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await failedRead;
  await expect(badge).toHaveText('1');

  fixture.unavailable = false;
  fixture.orders = [readyOrder(7), readyOrder(8)];
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(badge).toHaveText('2');
  fixture.orders = [];
  await page.evaluate(() => window.dispatchEvent(new Event('japz:workflow-changed')));
  await expect(badge).toHaveCount(0);
  await expect(ready).toHaveAccessibleDescription('No ready orders awaiting handover.');
});

test('ready count stays legible in expanded, collapsed and mobile navigation', async ({ page }) => {
  const fixture = await fixtureFor(page, Array.from({ length: 12 }, (_, index) => readyOrder(index + 1)));
  await page.goto('/cashier/payslips');
  const ready = page.getByRole('link', { name: 'Ready for pickup', exact: true });
  const badge = ready.locator('.workspace-notification-badge');
  await expect(badge).toHaveText('12');
  await expect(ready).toHaveAccessibleDescription('12 ready orders awaiting handover.');
  await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
  await expect(ready).toHaveAttribute('title', 'Ready for pickup');
  await expect(badge).toBeVisible();
  const linkBox = await ready.boundingBox(), badgeBox = await badge.boundingBox();
  expect(badgeBox && linkBox && badgeBox.x >= linkBox.x && badgeBox.x + badgeBox.width <= linkBox.x + linkBox.width).toBe(true);

  fixture.orders = Array.from({ length: 105 }, (_, index) => readyOrder(index + 1));
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(badge).toHaveText('99+');
  await expect(ready).toHaveAccessibleDescription('105 ready orders awaiting handover.');
  await page.setViewportSize({ width: 320, height: 640 });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  const navigation = page.getByRole('dialog', { name: 'Cashier navigation' });
  await expect(navigation.getByRole('link', { name: 'Ready for pickup', exact: true }).locator('.workspace-notification-badge')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await navigation.getByRole('link', { name: 'My payslips', exact: true }).click();
  await expect(navigation).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Clock in / out', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await navigation.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL('/login');
  const readsAfterLogout = fixture.reads;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  expect(fixture.reads).toBe(readsAfterLogout);
});
