import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { screenshotPath } from './local-paths';

async function attendanceFixture(page: Page, role = 'cashier', clockedIn = false) {
  const user = { id: 42, name: 'Alex Santos', email: `${role}@staff.test`, role, assignedCategories: [] };
  type Record = { id: number; date: string; clockIn: string; clockOut: string | null; totalHours: number };
  const fixture = {
    record: clockedIn ? { id: 7, date: '2026-11-16', clockIn: new Date(Date.now() - 3600000).toISOString(), clockOut: null, totalHours: 0 } as Record : null as Record | null,
    unavailable: false, rejectPunch: false, clockIns: 0,
  };
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url()), endpoint = url.pathname;
    let json: unknown = [];
    if (endpoint === '/api/auth/login') json = { token: 'fixture-staff-token', user };
    else if (endpoint === '/api/auth/user') json = { user };
    else if (endpoint === '/api/business-hours') json = { openTime: '00:00:00', closeTime: '23:59:00', applyCashier: false, applyKitchen: false };
    else if (endpoint === '/api/employee/today') {
      if (fixture.unavailable) return route.fulfill({ status: 503, json: { message: 'Attendance service is offline.' } });
      json = { success: true, data: { record: fixture.record } };
    } else if (endpoint === '/api/employee/clock-in') {
      fixture.clockIns++;
      if (fixture.rejectPunch) return route.fulfill({ status: 503, json: { message: 'Your clock-in was not saved. Try again.' } });
      fixture.record = { id: 7, date: '2026-11-16', clockIn: new Date().toISOString(), clockOut: null, totalHours: 0 };
      json = { success: true, data: fixture.record };
    } else if (endpoint === '/api/employee/clock-out') {
      if (fixture.record) fixture.record = { ...fixture.record, clockOut: new Date().toISOString(), totalHours: 1 };
      json = { success: true, data: fixture.record };
    } else if (endpoint === '/api/rider/deliveries') json = { active: [], history: [], availability: 'offline' };
    else if (endpoint.includes('/kitchen/orders')) json = { orders: [] };
    else if (endpoint.includes('/sales/')) json = { topItems: [] };
    else if (endpoint === '/api/inventory/summary') json = null;
    else if (endpoint === '/api/inventory/settings') json = { refreshSeconds: 30 };
    else if (endpoint === '/api/employee/payslips') json = { success: true, data: [] };
    await route.fulfill({ json });
  });
  await page.goto('/login');
  await page.evaluate(() => localStorage.setItem('authToken', 'fixture-staff-token'));
  return fixture;
}

for (const [role, destination] of [['cashier', '/cashier/pos'], ['kitchen', '/kitchen/incoming'], ['inventory', '/inventory/overview'], ['rider', '/rider/deliveries']]) {
  test(`${role}: direct station links require a saved clock-in and survive refresh`, async ({ page }) => {
    const fixture = await attendanceFixture(page, role);
    await page.goto(destination);
    await expect(page).toHaveURL(/\/attendance$/);
    await expect(page.getByRole('heading', { name: 'Ready for your shift, Alex?' })).toBeVisible();
    await page.getByRole('button', { name: 'Clock in & open station' }).click();
    await expect(page).toHaveURL(destination);
    await expect(page.getByRole('navigation', { name: 'Workspace navigation' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Clock in / out', exact: true })).toHaveCount(1);
    await expect(page.locator('.workspace-topbar').getByRole('link', { name: 'Clock in / out', exact: true })).toBeVisible();
    await expect(page.locator('.workspace-sidebar').getByRole('link', { name: /attendance|clock|on duty/i })).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: 'Find a page' })).toHaveCount(0);
    expect(fixture.clockIns).toBe(1);
    await page.reload();
    await expect(page).toHaveURL(destination);
    await expect(page.locator('.workspace-top-duty')).toContainText('On duty');
  });
}

for (const approved of [false,true]) test(`after-hours login ${approved ? 'accepts server-approved shift overtime' : 'keeps the existing hours restriction without approval'}`, async ({page}) => {
  await attendanceFixture(page,'kitchen',true);
  await page.evaluate(() => localStorage.removeItem('authToken'));
  await page.route('**/api/business-hours',route => route.fulfill({json:{openTime:'00:00',closeTime:'00:00',applyKitchen:true,applyCashier:true}}));
  await page.route('**/api/auth/login',route => route.fulfill({json:{token:'fixture-staff-token',overtimeApprovedForShift:approved,user:{id:42,name:'Alex Santos',email:'kitchen@staff.test',role:'kitchen',assignedCategories:[]}}}));
  await page.goto('/login');
  await page.getByLabel('Email',{exact:true}).fill('kitchen@staff.test');
  await page.getByLabel('Password',{exact:true}).fill('TestPassword123!');
  await page.getByRole('button',{name:'Login',exact:true}).click();
  if (approved) {
    await expect(page).toHaveURL('/attendance');
    await page.getByRole('link',{name:'Continue to kitchen station',exact:true}).click();
    await expect(page).toHaveURL('/kitchen/incoming');
  }
  else { await expect(page.getByRole('alert')).toContainText('Access is restricted'); await expect(page).toHaveURL('/login'); }
});

test('login leads to check-in, a failed punch stays there, and retry opens the station', async ({ page }) => {
  const fixture = await attendanceFixture(page);
  await page.evaluate(() => localStorage.removeItem('authToken'));
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('cashier@staff.test');
  await page.getByLabel('Password', { exact: true }).fill('test-password');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page).toHaveURL(/\/attendance$/);
  fixture.rejectPunch = true;
  await page.getByRole('button', { name: 'Clock in & open station' }).click();
  await expect(page.getByRole('alert')).toContainText('Your clock-in was not saved');
  await expect(page).toHaveURL(/\/attendance$/);
  fixture.rejectPunch = false;
  await page.getByRole('button', { name: 'Clock in & open station' }).click();
  await expect(page).toHaveURL('/cashier/pos');
});

test('attendance failures block entry with an accessible retry', async ({ page }) => {
  const fixture = await attendanceFixture(page);
  fixture.unavailable = true;
  await page.goto('/cashier/pos');
  await expect(page.getByRole('alert')).toContainText('Attendance service is offline');
  await expect(page.getByRole('button', { name: 'Clock in & open station' })).toBeDisabled();
  fixture.unavailable = false;
  await page.getByRole('button', { name: 'Retry attendance check' }).click();
  await expect(page.getByRole('button', { name: 'Clock in & open station' })).toBeEnabled();
});

test('clock-out requires confirmation and closes station access', async ({ page }) => {
  await attendanceFixture(page, 'kitchen', true);
  await page.goto('/attendance');
  await page.getByRole('button', { name: 'End shift & clock out' }).click();
  await page.getByRole('button', { name: 'Keep working' }).click();
  await expect(page.getByRole('heading', { name: 'You’re on the clock' })).toBeVisible();
  await page.getByRole('button', { name: 'End shift & clock out' }).click();
  await page.getByRole('button', { name: 'Confirm clock out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your shift is complete' })).toBeVisible();
  await page.goto('/kitchen/incoming');
  await expect(page).toHaveURL(/\/attendance$/);
  await expect(page.getByRole('button', { name: 'Clock in & open station' })).toHaveCount(0);
});

test('sidebar groups, collapse, top-bar attendance and mobile sign-out stay usable', async ({ page }) => {
  await attendanceFixture(page, 'kitchen', true);
  await page.goto('/kitchen/incoming');
  await expect(page.getByRole('link', { name: 'Incoming orders', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('link', { name: 'My payslips', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Find a page' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Incoming orders', exact: true })).toHaveAttribute('title', 'Incoming orders');
  await page.getByRole('button', { name: 'Expand sidebar', exact: true }).click();
  mkdirSync(screenshotPath, { recursive: true });
  await page.screenshot({ path: path.join(screenshotPath, 'staff-sidebar-desktop.png'), animations: 'disabled' });
  await page.setViewportSize({ width: 320, height: 640 });
  await expect(page.getByRole('link', { name: 'Clock in / out', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Open navigation' }).click();
  const dialog = page.getByRole('dialog', { name: 'Kitchen navigation' });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close navigation' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Sign out' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.screenshot({ path: path.join(screenshotPath, 'staff-sidebar-mobile.png'), animations: 'disabled' });
  await dialog.getByRole('link', { name: 'My payslips', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('#main-content')).toBeFocused();
  await page.getByRole('link', { name: 'Clock in / out', exact: true }).click();
  await expect(page).toHaveURL('/attendance');
  await expect(page.getByRole('heading', { name: 'You’re on the clock' })).toBeVisible();
  await page.goto('/kitchen/incoming');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(dialog.getByRole('button', { name: 'Sign out', exact: true })).toHaveText('Sign out');
  await dialog.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL('/login');
});

test('check-in fits narrow screens and short windows', async ({ page }) => {
  await attendanceFixture(page);
  await page.goto('/attendance');
  for (const [width, height] of [[320, 568], [390, 640], [1440, 600]]) {
    await page.setViewportSize({ width, height });
    await expect(page.getByRole('button', { name: 'Clock in & open station' })).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Clock in & open station' }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: 'Clock in & open station' })).toBeInViewport();
  }
  await page.setViewportSize({ width: 390, height: 760 });
  mkdirSync(screenshotPath, { recursive: true });
  await page.screenshot({ path: path.join(screenshotPath, 'staff-clock-in-mobile.png') });
});

test('a clock-out from another tab returns an active station to check-in', async ({ page }) => {
  const fixture = await attendanceFixture(page, 'kitchen', true);
  await page.goto('/kitchen/incoming');
  await expect(page.locator('.workspace-top-duty')).toBeVisible();
  if (fixture.record) fixture.record = { ...fixture.record, clockOut: new Date().toISOString(), totalHours: 1 };
  await page.evaluate(() => window.dispatchEvent(new StorageEvent('storage', { key: 'japz.shiftChanged', newValue: 'clock-out' })));
  await expect(page).toHaveURL('/attendance');
  await expect(page.getByRole('heading', { name: 'Your shift is complete' })).toBeVisible();
});
