import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { screenshotPath } from './local-paths';

test.use({ hasTouch: true });
interface SavedOrder { total: number; discount: number; voucherAmount: number | null; status: string; clientRequestId: string; payment: { amount: number; amountReceived: number; change: number; method: string } }
const completedOrders = () => Array.from({ length: 27 }, (_, index) => ({ id: index + 1, orderNumber: `C${String(index + 1).padStart(3, '0')}`, status: 'completed', customerName: `Guest ${String(index + 1).padStart(2, '0')}`, orderType: 'dine-in', tableNumber: `${index + 1}`, createdAt: new Date(1794800000000 + index * 60000).toISOString(), completedAt: new Date(1794800600000 + index * 60000).toISOString(), notes: 'No onions', items: [{ id: index + 1, name: 'Test meal', quantity: 2, modifiers: { size: 'Large' } }] }));
async function setup(page: Page, role = 'cashier') {
  const fixture = { completed: completedOrders(), stockError: false, gateway: false, paid: false, posts: [] as SavedOrder[], orderGate: null as Promise<void> | null, discountPercent: 20 };
  await page.addInitScript(() => {
    localStorage.setItem('authToken', 'payment-table-test');
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined });
  });
  await page.route('**/api/**', async route => {
    const endpoint = new URL(route.request().url()).pathname;
    if (endpoint === '/api/auth/user') return route.fulfill({ json: { user: { id: 90, role, name: 'Touchscreen staff', email: 'staff@touch.test', assignedCategories: [] } } });
    if (endpoint === '/api/employee/today') return route.fulfill({ json: { success: true, data: { record: { id: 1, clockIn: new Date().toISOString(), clockOut: null } } } });
    if (endpoint === '/api/kitchen/orders/completed') return route.fulfill({ json: { orders: fixture.completed } });
    if (endpoint === '/api/kitchen/orders/incoming') return route.fulfill({ json: { orders: [{ id: 1, orderNumber: 'K1', status: 'pending', createdAt: new Date().toISOString(), items: [{ name: 'Test meal', quantity: 1 }] }] } });
    if (endpoint === '/api/menu-categories') return route.fulfill({ json: [{ id: 1, name: 'Meals' }] });
    if (endpoint === '/api/menu-items') return route.fulfill({ json: [{ id: 1, name: 'Test meal', price: 20, categoryId: 1, stock: 100, trackStock: false, status: 'available' }] });
    if (endpoint.includes('/sales/')) return route.fulfill({ json: { topItems: [] } });
    if (endpoint === '/api/discounts') return route.fulfill({ json: [{ id: 1, name: 'Staff discount', percentage: fixture.discountPercent, enabled: true }] });
    if (endpoint === '/api/vouchers') return route.fulfill({ json: [{ id: 1, code: 'SAVE5', amount: 5, enabled: true, used: false, startDate: '2020-01-01', endDate: '2099-12-31' }] });
    if (endpoint === '/api/public/payments/config') return route.fulfill({ json: { enabled: fixture.gateway } });
    if (endpoint === '/api/inventory/cart-check') return route.fulfill({ status: fixture.stockError ? 409 : 200, json: fixture.stockError ? { error: 'Not enough stock.' } : { available: true } });
    if (endpoint === '/api/orders' && route.request().method() === 'POST') {
      const order = route.request().postDataJSON(); fixture.posts.push(order);
      if (fixture.orderGate) await fixture.orderGate;
      return route.fulfill({ status: 201, json: { order: { id: 1, ...order } } });
    }
    if (endpoint === '/api/payments/pos/checkout') return route.fulfill({ json: { qr: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="180" height="180"%3E%3Crect width="180" height="180" fill="black"/%3E%3C/svg%3E', checkoutUrl: 'https://example.test/payment' } });
    if (endpoint.startsWith('/api/payments/pos/status/')) return route.fulfill({ json: { paid: fixture.paid } });
    return route.fulfill({ json: [] });
  });
  return fixture;
}
async function openCheckout(page: Page) {
  await page.goto('/cashier/pos');
  await page.getByRole('button', { name: 'Add', exact: true }).first().tap();
  const cart = page.getByRole('button', { name: /View cart/ });
  if (await cart.isVisible()) await cart.tap();
  await page.getByRole('button', { name: 'Proceed to Checkout', exact: true }).tap();
  await expect(page).toHaveURL('/cashier/payment');
}
async function enterDetails(page: Page) {
  await page.getByLabel('Customer Name', { exact: false }).fill('Ana');
  await page.getByRole('button', { name: 'Takeout', exact: true }).tap();
}
test.afterEach(async ({ page }) => { await page.unrouteAll({ behavior: 'wait' }); });

test('completed orders use a paginated table with working search and order details', async ({ page }) => {
  const fixture = await setup(page, 'kitchen');
  await page.goto('/kitchen/completed');
  const table = page.getByRole('table');
  await expect(table.locator('tbody tr')).toHaveCount(10);
  await expect(table.locator('tbody tr').first()).toContainText('C027');
  await page.getByRole('button', { name: 'Next page', exact: true }).tap();
  await expect(table.locator('tbody tr').first()).toContainText('C017');
  await page.getByRole('button', { name: 'Last page', exact: true }).tap();
  await expect(table.locator('tbody tr')).toHaveCount(7);
  await page.getByRole('searchbox', { name: 'Search completed orders' }).fill('Guest 04');
  await expect(table.locator('tbody tr')).toHaveCount(1);
  await expect(table.locator('tbody tr')).toContainText('C004');
  await page.getByRole('button', { name: 'View order C004', exact: true }).tap();
  const dialog = page.getByRole('dialog', { name: 'Order C004 details', exact: true });
  await expect(dialog).toContainText('No onions');
  await expect(dialog).toContainText('2× Test meal');
  await expect(dialog).toContainText('Large');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Clear order search', exact: true }).tap();
  await page.getByRole('combobox', { name: 'Rows per page', exact: true }).selectOption('25');
  await expect(table.locator('tbody tr')).toHaveCount(25);
  await page.getByRole('button', { name: 'Next page', exact: true }).tap();
  fixture.completed = fixture.completed.slice(0, 5);
  await page.getByRole('button', { name: 'Refresh', exact: true }).tap();
  await expect(table.locator('tbody tr')).toHaveCount(5);
  await expect(page.locator('.completed-page-controls')).toContainText('Page 1 of 1');
});

test('table pagination remains visible when orders scroll on touch-sized screens', async ({ page }) => {
  await setup(page, 'kitchen');
  await page.goto('/kitchen/completed');
  await page.getByRole('combobox', { name: 'Rows per page', exact: true }).selectOption('25');
  for (const [width, height] of [[320, 640], [768, 1024], [1366, 768]]) {
    await page.setViewportSize({ width, height });
    const footer = page.locator('.completed-pagination'), y = (await footer.boundingBox())!.y;
    await page.locator('.completed-table-scroll').evaluate(element => { element.scrollTop = element.scrollHeight; });
    expect((await footer.boundingBox())!.y).toBe(y);
    await expect(page.getByRole('button', { name: 'Next page', exact: true })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  mkdirSync(screenshotPath, { recursive: true });
  await page.screenshot({ path: path.join(screenshotPath, 'completed-table-desktop.png'), animations: 'disabled' });
});

test('today’s kitchen and sidebar primary controls use the original yellow', async ({ page }) => {
  await setup(page, 'kitchen');
  await page.goto('/kitchen/incoming');
  await expect(page.getByRole('button', { name: 'Start Preparing', exact: true })).toHaveCSS('background-color', 'rgb(255, 206, 27)');
  await expect(page.getByRole('link', { name: 'Incoming orders', exact: true })).toHaveCSS('background-color', 'rgb(255, 206, 27)');
  await expect(page.locator('.workspace-sidebar').getByRole('button', { name: 'Sign out', exact: true })).toHaveCSS('background-color', 'rgb(255, 206, 27)');
});

test('payment method, total and proceed action stay visible while details scroll', async ({ page }) => {
  await setup(page);
  await openCheckout(page);
  await enterDetails(page);
  await page.getByRole('button', { name: 'Delivery', exact: true }).tap();
  await page.getByLabel('Delivery Address', { exact: false }).fill('Long delivery address');
  await page.locator('.checkout-notes summary').tap();
  await page.getByLabel('Notes', { exact: true }).fill('No onions. Keep separate.');
  await page.getByLabel('Notes', { exact: true }).evaluate(element => { (element as HTMLElement).style.height = '600px'; });
  for (const [width, height] of [[1366, 768], [1024, 768], [390, 700], [320, 640]]) {
    await page.setViewportSize({ width, height });
    const control = page.getByRole('button', { name: 'Proceed to Payment', exact: true }), y = (await control.boundingBox())!.y;
    await page.locator('.checkout-details-scroll').evaluate(element => { element.scrollTop = element.scrollHeight; });
    expect((await control.boundingBox())!.y).toBe(y);
    await expect(control).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Cash Payment', exact: true })).toBeInViewport();
    await expect(page.locator('.checkout-pay-controls .checkout-total')).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  mkdirSync(screenshotPath, { recursive: true });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByLabel('Notes', { exact: true }).evaluate(element => { (element as HTMLElement).style.removeProperty('height'); });
  await page.locator('.checkout-details-scroll').evaluate(element => { element.scrollTop = 0; });
  await page.screenshot({ path: path.join(screenshotPath, 'checkout-fixed-desktop.png'), animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 700 });
  await page.screenshot({ path: path.join(screenshotPath, 'checkout-fixed-mobile.png'), animations: 'disabled' });
});

test('discount and voucher totals reach the fixed cash keypad and save the correct change', async ({ page }) => {
  const fixture = await setup(page);
  await openCheckout(page);
  await enterDetails(page);
  await page.getByRole('button', { name: /Discount, voucher & breakdown/ }).tap();
  const dialog = page.getByRole('dialog', { name: 'Discounts and voucher', exact: true });
  await dialog.getByRole('button', { name: /Staff discount/ }).tap();
  await dialog.getByRole('textbox', { name: 'Voucher code', exact: true }).fill('SAVE5');
  await dialog.getByRole('button', { name: 'Apply', exact: true }).tap();
  await expect(dialog).toContainText('SAVE5 · −₱5.00');
  await dialog.getByRole('button', { name: 'Done', exact: true }).tap();
  await expect(page.locator('.checkout-pay-controls .checkout-total')).toContainText('₱11.00');
  await page.getByRole('button', { name: 'Proceed to Payment', exact: true }).tap();
  await expect(page).toHaveURL('/cashier/cash-payment');
  await expect(page.getByRole('button', { name: 'Complete Transaction', exact: true })).toBeDisabled();
  await page.getByRole('group', { name: 'Cash keypad', exact: true }).getByRole('button', { name: '2', exact: true }).tap();
  await page.getByRole('group', { name: 'Cash keypad', exact: true }).getByRole('button', { name: '0', exact: true }).tap();
  await expect(page.getByLabel('Amount Received', { exact: true })).toHaveValue('20');
  await expect(page.locator('.cash-change')).toContainText('₱9.00');
  await page.getByRole('button', { name: 'Complete Transaction', exact: true }).tap();
  await expect(page.getByRole('heading', { name: 'Payment Successful!', exact: true })).toBeVisible();
  expect(fixture.posts).toHaveLength(1);
  expect(fixture.posts[0]).toMatchObject({ total: 11, discount: 4, voucherAmount: 5, payment: { amount: 11, amountReceived: 20, change: 9, method: 'cash' } });
});

test('cash controls stay on screen and rapid confirm taps send only one transaction', async ({ page }) => {
  const fixture = await setup(page);
  await openCheckout(page);
  await enterDetails(page);
  await page.getByRole('button', { name: 'Proceed to Payment', exact: true }).tap();
  for (const [width, height] of [[1366, 768], [1024, 768], [390, 700], [320, 640]]) {
    await page.setViewportSize({ width, height });
    await expect(page.getByLabel('Amount Received', { exact: true })).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Complete Transaction', exact: true })).toBeInViewport();
    const area = await page.locator('.cash-keypad-area').boundingBox();
    const buttons = await page.getByRole('group', { name: 'Cash keypad', exact: true }).getByRole('button').evaluateAll(elements => elements.map(element => { const box = element.getBoundingClientRect(); return { top: box.top, bottom: box.bottom, height: box.height }; }));
    expect(buttons.every(button => button.height >= 44 && button.top >= area!.y && button.bottom <= area!.y + area!.height + 1)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  mkdirSync(screenshotPath, { recursive: true });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.screenshot({ path: path.join(screenshotPath, 'cash-fixed-desktop.png'), animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 700 });
  await page.screenshot({ path: path.join(screenshotPath, 'cash-fixed-mobile.png'), animations: 'disabled' });
  await page.getByRole('button', { name: 'Review order', exact: true }).tap();
  const review = page.getByRole('dialog', { name: 'Review payment order', exact: true });
  await expect(review).toContainText('Test meal');
  await review.getByRole('button', { name: 'Back to payment', exact: true }).tap();
  await expect(page.getByRole('button', { name: 'Complete Transaction', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Exact amount', exact: true }).tap();
  let release!: () => void;
  fixture.orderGate = new Promise(resolve => { release = resolve; });
  await page.getByRole('button', { name: 'Complete Transaction', exact: true }).dblclick();
  await expect.poll(() => fixture.posts.length).toBe(1);
  release();
  await expect(page.getByRole('heading', { name: 'Payment Successful!', exact: true })).toBeVisible();
  expect(fixture.posts).toHaveLength(1);
});

test('stock failures keep checkout open and free orders do not start a gateway charge', async ({ page }) => {
  const fixture = await setup(page);
  fixture.stockError = true;
  fixture.gateway = true;
  fixture.discountPercent = 100;
  await openCheckout(page);
  await enterDetails(page);
  await page.getByRole('button', { name: 'Proceed to Payment', exact: true }).tap();
  await expect(page.getByRole('alert')).toContainText('Not enough stock');
  await expect(page).toHaveURL('/cashier/payment');
  fixture.stockError = false;
  await page.getByRole('button', { name: 'Card Payment', exact: true }).tap();
  await page.getByRole('button', { name: /Discount, voucher & breakdown/ }).tap();
  const dialog = page.getByRole('dialog', { name: 'Discounts and voucher', exact: true });
  await dialog.getByRole('button', { name: /Staff discount/ }).tap();
  await dialog.getByRole('button', { name: 'Done', exact: true }).tap();
  await page.getByRole('button', { name: 'Proceed to Payment', exact: true }).tap();
  await expect(page.getByRole('heading', { name: 'Order is Complimentary', exact: true })).toBeVisible();
  expect(fixture.posts).toHaveLength(0);
  await page.getByRole('button', { name: 'Complete Order (Free)', exact: true }).tap();
  await expect(page.getByRole('heading', { name: 'Payment Successful!', exact: true })).toBeVisible();
  expect(fixture.posts[0].total).toBe(0);
  expect(fixture.posts[0].status).toBe('pending');
});

test('gateway orders remain unpaid until the server confirms payment', async ({ page }) => {
  const fixture = await setup(page);
  fixture.gateway = true;
  await openCheckout(page);
  await enterDetails(page);
  await page.getByRole('button', { name: 'Card Payment', exact: true }).tap();
  await page.getByRole('button', { name: 'Proceed to Payment', exact: true }).tap();
  await expect(page.getByText('Waiting for payment…', { exact: false })).toBeVisible();
  for (const [width, height] of [[1366, 768], [390, 700], [320, 640]]) {
    await page.setViewportSize({ width, height });
    const check = page.getByRole('button', { name: 'Check now', exact: true }), y = (await check.boundingBox())!.y;
    await page.locator('.pos-gateway-body').evaluate(element => { element.scrollTop = element.scrollHeight; });
    expect((await check.boundingBox())!.y).toBe(y);
    await expect(check).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Cancel and pay another way', exact: true })).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Close payment', exact: true })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(fixture.posts[0].status).toBe('awaiting-payment');
  await page.getByRole('button', { name: 'Check now', exact: true }).tap();
  await expect(page.getByRole('heading', { name: 'Payment Successful!', exact: true })).toHaveCount(0);
  fixture.paid = true;
  await page.getByRole('button', { name: 'Check now', exact: true }).tap();
  await expect(page.getByRole('heading', { name: 'Payment Successful!', exact: true })).toBeVisible();
});
