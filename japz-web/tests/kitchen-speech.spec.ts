import { expect, test, type BrowserContext, type Page } from '@playwright/test';

interface Order {
  id: number; orderNumber: string; createdAt: string; placedAt: string; status: string; customerName: string; notes: string;
  items: { id: number; name: string; quantity: number; modifiers: Record<string, unknown>; notes?: string }[];
}
const ticket = (id: number, customerName = 'Ana'): Order => ({ id, orderNumber: `S${id}`, status: 'pending', customerName, notes: '', createdAt: new Date(1794816000000 + id * 1000).toISOString(), placedAt: new Date(1794816000000 + id * 1000).toISOString(), items: [{ id: id * 100, name: 'Burger', quantity: 2, modifiers: {} }, { id: id * 100 + 1, name: 'Iced tea', quantity: 1, modifiers: {} }] });

interface SpeechMock {
  blocked: boolean;
  autoEnd: boolean;
  attempts: string[];
  pauses: number;
  resumes: number;
  cancels: number;
  overlap: boolean;
  finish: () => void;
  heard: () => string[];
}
declare global { interface Window { kitchenSpeechMock: SpeechMock } }

async function installSpeech(context: BrowserContext, options: { autoEnd?: boolean; blocked?: boolean; unsupported?: boolean } = {}) {
  await context.addInitScript((options) => {
    localStorage.setItem('authToken', 'kitchen-speech-fixture');
    let current: SpeechSynthesisUtterance | null = null;
    const mock: SpeechMock = {
      blocked: options.blocked || false, autoEnd: options.autoEnd ?? true, attempts: [], pauses: 0, resumes: 0, cancels: 0, overlap: false,
      heard: () => JSON.parse(sessionStorage.getItem('speech-test-heard') || '[]') as string[],
      finish: () => { const active = current; current = null; active?.onend?.(new Event('end') as SpeechSynthesisEvent); },
    };
    window.kitchenSpeechMock = mock;
    if (options.unsupported) { Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined }); return; }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: class {
      text: string; lang = ''; rate = 1; pitch = 1; volume = 1; voice = null;
      onstart = null; onend = null; onerror = null;
      constructor(text: string) { this.text = text; }
    } });
    const synth = {
      paused: false,
      getVoices: () => [{ name: 'Local English', lang: 'en-PH', localService: true, default: true, voiceURI: 'local-test' }],
      speak: (utterance: SpeechSynthesisUtterance) => {
        mock.attempts.push(utterance.text);
        if (mock.blocked) { queueMicrotask(() => utterance.onerror?.({ error: 'not-allowed' } as SpeechSynthesisErrorEvent)); return; }
        if (current) mock.overlap = true;
        current = utterance;
        queueMicrotask(() => {
          if (current !== utterance) return;
          utterance.onstart?.(new Event('start') as SpeechSynthesisEvent);
          sessionStorage.setItem('speech-test-heard', JSON.stringify([...mock.heard(), utterance.text]));
          if (mock.autoEnd) queueMicrotask(mock.finish);
        });
      },
      pause: () => { synth.paused = true; mock.pauses++; },
      resume: () => { synth.paused = false; mock.resumes++; },
      cancel: () => { current = null; synth.paused = false; mock.cancels++; },
    };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synth });
  }, options);
}

async function setup(page: Page, options: Parameters<typeof installSpeech>[1] = {}) {
  const fixture = { orders: [ticket(1, 'Existing customer')], reads: 0 };
  const context = page.context();
  await installSpeech(context, options);
  await context.route('**/api/**', route => {
    const endpoint = new URL(route.request().url()).pathname;
    if (endpoint === '/api/auth/user') return route.fulfill({ json: { user: { id: 88, role: 'kitchen', name: 'Kitchen speaker', email: 'speaker@kitchen.test', assignedCategories: [] } } });
    if (endpoint === '/api/employee/today') return route.fulfill({ json: { success: true, data: { record: { id: 1, clockIn: new Date().toISOString(), clockOut: null } } } });
    if (endpoint === '/api/kitchen/orders/incoming' || endpoint === '/api/kitchen/orders') {
      if (endpoint.endsWith('/incoming')) fixture.reads++;
      return route.fulfill({ json: { orders: fixture.orders.map(order => ({ ...order, allReady: order.status === 'ready' })) } });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto('/kitchen/incoming');
  await expect(page.getByRole('article', { name: 'Order S1', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const key = Object.keys(localStorage).find(key => key.startsWith('japz.kitchen.speech.v1:'));
    return key ? JSON.parse(localStorage.getItem(key)!).initialized : false;
  })).toBe(true);
  return fixture;
}
const heard = (page: Page) => page.evaluate(() => window.kitchenSpeechMock.heard());
const refresh = async (page: Page) => {
  await page.getByRole('button', { name: 'Refresh orders', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Refresh orders', exact: true })).toBeEnabled();
};
test.afterEach(async ({ context }) => { await context.unrouteAll({ behavior: 'wait' }); });

test('reads customer, quantities, item modifiers and notes in clear order', async ({ page }) => {
  const fixture = await setup(page);
  expect(await heard(page)).toEqual([]);
  const order = ticket(2, 'Maria Santos');
  order.items[0].modifiers = { size: 'Large', flavors: ['no onions', 'extra spicy'], price: 150 };
  order.items[1].modifiers = { temperature: 'Iced', extras: [{ name: 'less sugar', price: 10 }] };
  order.items[1].notes = 'No straw';
  order.notes = 'Keep the sauce separate.';
  fixture.orders.push(order);
  await refresh(page);
  await expect.poll(async () => (await heard(page)).join(' ')).toContain('Keep the sauce separate.');
  const speech = (await heard(page)).join(' ');
  expect(speech).toContain('New order for Maria Santos: 2 Burger, Large, no onions, extra spicy, 1 Iced tea, Iced, less sugar, item note: No straw.');
  expect(speech).toContain('Order notes: Keep the sauce separate.');
  expect(speech).not.toContain('150');
  expect(speech).not.toContain('[object Object]');
});

test('queues simultaneous and later orders without interrupting the current order', async ({ page }) => {
  const fixture = await setup(page, { autoEnd: false });
  fixture.orders.push(ticket(3, 'Ben'), ticket(2, 'Ana'));
  await refresh(page);
  await expect.poll(() => heard(page)).toEqual(['New order for Ana: 2 Burger, 1 Iced tea.']);
  fixture.orders.push(ticket(4, 'Carla'));
  await refresh(page);
  expect(await heard(page)).toHaveLength(1);
  expect(await page.evaluate(() => window.kitchenSpeechMock.cancels)).toBe(0);
  await page.evaluate(() => window.kitchenSpeechMock.finish());
  await expect.poll(() => heard(page)).toHaveLength(2);
  expect((await heard(page))[1]).toContain('New order for Ben:');
  await page.evaluate(() => window.kitchenSpeechMock.finish());
  await expect.poll(() => heard(page)).toHaveLength(3);
  expect((await heard(page))[2]).toContain('New order for Carla:');
  expect(await page.evaluate(() => window.kitchenSpeechMock.overlap)).toBe(false);
});

test('does not repeat after polling, status changes, temporary disappearance, navigation or reload', async ({ page }) => {
  const fixture = await setup(page);
  const order = ticket(2);
  fixture.orders.push(order);
  await refresh(page);
  await expect.poll(() => heard(page)).toHaveLength(1);
  await refresh(page);
  order.status = 'preparing';
  await refresh(page);
  fixture.orders = [fixture.orders[0]];
  await refresh(page);
  fixture.orders.push(order);
  await refresh(page);
  await page.getByRole('link', { name: 'Prep board', exact: true }).click();
  await expect(page).toHaveURL('/kitchen/prep');
  await page.getByRole('link', { name: 'Incoming orders', exact: true }).click();
  await refresh(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Incoming orders', exact: true })).toBeVisible();
  await refresh(page);
  expect(await heard(page)).toHaveLength(1);
  const ledger = await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('japz.kitchen.speech.v1:')).map(key => localStorage.getItem(key)).join(''));
  expect(ledger).not.toContain('Burger');
  expect(ledger).not.toContain('Ana');
});

test('automatically announces new orders while the employee is using Prep Board', async ({ page }) => {
  const fixture = await setup(page);
  await page.getByRole('link', { name: 'Prep board', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Prep Board', exact: true })).toBeVisible();
  fixture.orders.push(ticket(2, 'Prep arrival'));
  await expect.poll(() => heard(page), { timeout: 10000 }).toEqual(['New order for Prep arrival: 2 Burger, 1 Iced tea.']);
  await expect(page).toHaveURL('/kitchen/prep');
});

test('mute retains waiting orders and resumes current speech without repeating it', async ({ page }) => {
  const fixture = await setup(page, { autoEnd: false });
  await page.getByRole('button', { name: 'Mute order alerts', exact: true }).click();
  fixture.orders.push(ticket(2), ticket(3, 'Ben'));
  await refresh(page);
  expect(await heard(page)).toEqual([]);
  await page.getByRole('button', { name: 'Enable order alerts', exact: true }).click();
  await expect.poll(() => heard(page)).toHaveLength(1);
  await page.getByRole('button', { name: 'Mute order alerts', exact: true }).click();
  expect(await page.evaluate(() => window.kitchenSpeechMock.pauses)).toBe(1);
  await page.getByRole('button', { name: 'Enable order alerts', exact: true }).click();
  expect(await page.evaluate(() => window.kitchenSpeechMock.resumes)).toBeGreaterThan(0);
  expect(await heard(page)).toHaveLength(1);
  await page.evaluate(() => window.kitchenSpeechMock.finish());
  await expect.poll(() => heard(page)).toHaveLength(2);
  expect(await page.evaluate(() => window.kitchenSpeechMock.cancels)).toBe(0);
});

test('blocked autoplay exposes Enable speaker and retries the unsaid order once', async ({ page }) => {
  const fixture = await setup(page, { blocked: true });
  fixture.orders.push(ticket(2));
  await refresh(page);
  await expect(page.getByRole('button', { name: 'Enable speaker', exact: true })).toBeVisible();
  expect(await heard(page)).toEqual([]);
  await page.evaluate(() => { window.kitchenSpeechMock.blocked = false; });
  await page.getByRole('button', { name: 'Enable speaker', exact: true }).click();
  await expect.poll(() => heard(page)).toHaveLength(1);
  await refresh(page);
  expect(await heard(page)).toHaveLength(1);
});

test('long orders finish their modifiers and notes before the next customer is announced', async ({ page }) => {
  const fixture = await setup(page);
  const long = ticket(2, 'Long order');
  long.notes = 'No onions, extra spicy, keep the sauce separate. '.repeat(18) + 'Final note: allergy instructions end here.';
  fixture.orders.push(long, ticket(3, 'Next customer'));
  await refresh(page);
  await expect.poll(async () => (await heard(page)).some(text => text.includes('New order for Next customer:'))).toBe(true);
  const parts = await heard(page), next = parts.findIndex(text => text.includes('New order for Next customer:'));
  expect(parts.slice(0, next).join(' ')).toContain('Final note: allergy instructions end here.');
  expect(parts.every(text => text.length <= 220)).toBe(true);
  expect(await page.evaluate(() => window.kitchenSpeechMock.overlap)).toBe(false);
});

test('refresh resumes unsaid queued orders but does not repeat the order already started', async ({ page }) => {
  const fixture = await setup(page, { autoEnd: false });
  fixture.orders.push(ticket(2), ticket(3, 'Ben'));
  await refresh(page);
  await expect.poll(() => heard(page)).toHaveLength(1);
  await page.reload();
  await expect.poll(() => heard(page)).toHaveLength(2);
  expect((await heard(page))[1]).toContain('New order for Ben:');
  expect((await heard(page)).filter(text => text.includes('New order for Ana:'))).toHaveLength(1);
});

test('two kitchen tabs do not announce the same order twice', async ({ page, context }) => {
  const fixture = await setup(page, { autoEnd: false });
  const other = await context.newPage();
  await other.goto('/kitchen/incoming');
  await expect(other.getByRole('heading', { name: 'Incoming orders', exact: true })).toBeVisible();
  fixture.orders.push(ticket(2));
  await Promise.all([refresh(page), refresh(other)]);
  await expect.poll(async () => (await heard(page)).length + (await heard(other)).length).toBe(1);
  await page.evaluate(() => window.kitchenSpeechMock.finish());
  await other.evaluate(() => window.kitchenSpeechMock.finish());
  await Promise.all([refresh(page), refresh(other)]);
  expect((await heard(page)).length + (await heard(other)).length).toBe(1);
});

test('announces a walk-in name and boolean instructions when customer details are missing', async ({ page }) => {
  const fixture = await setup(page);
  const order = ticket(2, '');
  order.items[0].modifiers = { noOnions: true, extraSpicy: true, addSauce: false };
  fixture.orders.push(order);
  await refresh(page);
  await expect.poll(async () => (await heard(page)).join(' ')).toContain('New order for Walk-in customer:');
  const text = (await heard(page)).join(' ').toLowerCase();
  expect(text).toContain('no onions');
  expect(text).toContain('extra spicy');
  expect(text).not.toContain('add sauce');
});

test('unsupported speech does not block the kitchen', async ({ page }) => {
  await setup(page, { unsupported: true });
  await expect(page.getByRole('button', { name: 'Speaker unavailable', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Start Preparing', exact: true })).toBeEnabled();
});
