import { test, expect, type Page } from "@playwright/test";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { screenshotPath } from "./local-paths";
let child: ChildProcessWithoutNullStreams;
interface Account {
  token: string;
  password: string;
  user: { id: number; email: string; name: string; role: string };
}
let fixture: {
  url: string;
  accounts: Record<string, Account>;
  ids: Record<string, number>;
};
test.beforeAll(async () => {
  test.setTimeout(120000);
  mkdirSync(screenshotPath, { recursive: true });
  child = spawn(process.execPath, ["tests/ui-server.js"], {
    cwd: path.resolve("../japz-backend"),
    windowsHide: true,
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  });
  fixture = await new Promise((resolve, reject) => {
    let buffer = "";
    const timeout = setTimeout(
      () => reject(new Error("Test database fixture did not start")),
      90000,
    );
    child.stdout.on("data", (data) => {
      buffer += data.toString();
      const line = buffer
        .split("\n")
        .find((line) => line.startsWith("QA_READY "));
      if (line) {
        clearTimeout(timeout);
        resolve(JSON.parse(line.slice(9)));
      }
    });
    child.stderr.on("data", () => {
      /* Process exit reports fixture failures; warnings are not failures. */
    });
    child.on("exit", (code) => {
      if (code) reject(new Error("Test fixture exited"));
    });
  });
});
test.afterEach(async ({ page }) => {
  // Drain intercepted API handlers before Playwright closes the page/context.
  await page.unrouteAll({ behavior: 'wait' });
});
test.afterAll(async () => {
  if (child?.exitCode === null) {
    child.stdin.write("STOP\n");
    await new Promise((resolve) => child.once("exit", resolve));
  }
});
async function openRole(page: Page, role: string, route: string) {
  await page.unrouteAll({ behavior: 'wait' });
  await page.route("**/api/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (url.port === "3000") {
      const response = await route.fetch({
        url: fixture.url + url.pathname + url.search,
      });
      await route.fulfill({ response });
    } else await route.continue();
  });
  await page.goto("/login");
  await page.evaluate(
    (token) => localStorage.setItem("authToken", token),
    fixture.accounts[role].token,
  );
  await page.goto(route);
  await page.getByRole("heading", { level: 1 }).waitFor();
}
async function noOverflow(page: Page) {
  const result = await page.evaluate(() => {
    const root = document.querySelector(".inv-content") as HTMLElement | null;
    const dialog = document.querySelector("dialog[open]") as HTMLElement | null;
    return {
      document: document.documentElement.scrollWidth <= innerWidth + 1,
      content: !root || root.scrollWidth <= root.clientWidth + 1,
      dialog: !dialog || dialog.getBoundingClientRect().width <= innerWidth,
    };
  });
  expect(result).toEqual({ document: true, content: true, dialog: true });
}
test("inventory routes and forms fit 320 to 1440px", async ({ page }) => {
  test.setTimeout(180000);
  await openRole(page, "inventory", "/inventory/overview");
  const paths = [
    "overview",
    "supplies",
    "receiving",
    "prepared",
    "menu",
    "counts",
    "losses",
    "suppliers",
    "movements",
    "reports",
    "settings",
    "profile",
    "guide",
  ];
  for (const width of [320, 360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 850 });
    for (const route of paths) {
      await page.goto(`/inventory/${route}`);
      await page.getByRole("heading", { level: 1 }).waitFor();
      await noOverflow(page);
    }
  }
  await page.setViewportSize({ width: 375, height: 700 });
  for (const [route, label] of [
    ["supplies", "Add supply item"],
    ["receiving", "Receive delivery"],
    ["counts", "Record stock count"],
    ["losses", "Record waste"],
    ["suppliers", "Add supplier"],
  ]) {
    await page.goto(`/inventory/${route}`);
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await noOverflow(page);
    const buttons = await page
      .getByRole("dialog")
      .locator("footer button")
      .evaluateAll((buttons) =>
        buttons.map((button) => ({
          height: button.getBoundingClientRect().height,
          bottom: button.getBoundingClientRect().bottom,
        })),
      );
    expect(
      buttons.every((button) => button.height >= 44 && button.bottom <= 700),
    ).toBeTruthy();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  }
  await page.goto("/inventory/overview");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(
    page.getByRole("link", { name: "Ingredients & packaging", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.screenshot({ path: path.join(screenshotPath, "inventory-mobile.png") });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: path.join(screenshotPath, "inventory-desktop.png"),
  });
});
test("receiving, batch count approval and supplier editing work through the UI", async ({
  page,
}) => {
  await openRole(page, "inventory", "/inventory/suppliers");
  await page.getByRole("button", { name: "Add supplier", exact: true }).click();
  await page
    .getByLabel("Supplier name", { exact: true })
    .fill("QA Added supplier");
  await page.getByLabel("Contact person").fill("QA Receiver");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.goto("/inventory/receiving");
  await page
    .getByRole("button", { name: "Receive delivery", exact: true })
    .click();
  await page
    .getByLabel("Supplier", { exact: true })
    .selectOption({ label: "QA Added supplier" });
  await page.getByLabel("Invoice or reference").fill("QA Added invoice");
  await page
    .getByLabel("Supply item", { exact: true })
    .selectOption({ label: "QA-001 · QA Coffee beans" });
  await page.getByLabel("Quantity", { exact: true }).fill("1");
  await page.getByLabel("Cost per kg (₱)", { exact: true }).fill("100");
  await page
    .getByRole("button", { name: "Record delivery", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(
    page.getByText("QA Added invoice", { exact: true }),
  ).toBeVisible();
  await page.goto("/inventory/counts");
  await page
    .getByRole("button", { name: "Record stock count", exact: true })
    .click();
  await page
    .getByLabel("Supply item", { exact: true })
    .selectOption({ label: "QA-001 · QA Coffee beans" });
  await page.getByLabel("Batch", { exact: true }).selectOption({ index: 1 });
  await page.getByLabel("Counted on hand (g)").fill("80");
  await page
    .getByLabel("Reason", { exact: true })
    .fill("QA Physical count discrepancy");
  await page.getByRole("button", { name: "Record count", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByText("Admin approval required")).toBeVisible();
  await page.evaluate(
    (token) => localStorage.setItem("authToken", token),
    fixture.accounts.admin.token,
  );
  await page.goto("/admin/inventory/counts");
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await page
    .getByRole("button", { name: "Approve count", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(
    page.locator(".inv-badge").filter({ hasText: /^applied$/ }),
  ).toBeVisible();
});
test("recipe and availability dialogs fit phones; filtering resets pagination", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await openRole(page, "inventory", "/inventory/menu");
  const row = page.locator("tr").filter({ hasText: "QA Recipe coffee" });
  await row.getByRole("button", { name: "Recipe", exact: true }).click();
  await noOverflow(page);
  await expect(page.getByLabel("Recipe name")).toHaveValue("Coffee recipe");
  await page.keyboard.press("Escape");
  await row.getByRole("button", { name: "Availability", exact: true }).click();
  await noOverflow(page);
  await page.keyboard.press("Escape");
  await page.goto("/inventory/supplies");
  await page.getByRole("button", { name: "Next page" }).click();
  await page.getByRole("searchbox").fill("Coffee beans");
  await expect(page.getByText("1 / 1", { exact: true })).toBeVisible();
  await expect(
    page.getByText("QA Coffee beans", { exact: true }),
  ).toBeVisible();
});
test("Admin dashboard has no colored card stripes and fits mobile", async ({
  page,
}) => {
  await openRole(page, "admin", "/admin/dashboard");
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 850 });
    await noOverflow(page);
  }
  const stripes = await page.locator('[class*="border-l-"]').count();
  expect(stripes).toBe(0);
  await page.setViewportSize({ width: 375, height: 850 });
  await page.screenshot({
    path: path.join(screenshotPath, "admin-dashboard-mobile.png"),
  });
});
test("Cashier order reservations and Kitchen consumption update Inventory together", async ({
  page,
  request,
}) => {
  const payload = {
    clientRequestId: crypto.randomUUID(),
    orderNumber: `QA-${Date.now()}`,
    total: 20,
    subtotal: 20,
    discount: 0,
    orderType: "take-out",
    status: "pending",
    customerName: "QA customer",
    items: [
      {
        id: fixture.ids.coffee,
        name: "QA Recipe coffee",
        price: 20,
        quantity: 1,
        total: 20,
        modifiers: { size: "Large" },
      },
    ],
    payment: { method: "cash", amount: 20, amountReceived: 20 },
  };
  const response = await request.post(fixture.url + "/api/orders", {
    headers: { Authorization: `Bearer ${fixture.accounts.cashier.token}` },
    data: payload,
  });
  expect(response.status()).toBe(201);
  const order = (await response.json()).order;
  await openRole(page, "kitchen", "/kitchen/incoming");
  await page
    .getByRole("button", { name: /Start Preparing/i })
    .first()
    .click();
  await expect
    .poll(
      async () =>
        (
          await (
            await request.get(fixture.url + `/api/orders/${order.id}`, {
              headers: {
                Authorization: `Bearer ${fixture.accounts.kitchen.token}`,
              },
            })
          ).json()
        ).status,
    )
    .toBe("preparing");
  const items = await (
    await request.get(fixture.url + "/api/inventory/items", {
      headers: { Authorization: `Bearer ${fixture.accounts.inventory.token}` },
    })
  ).json();
  expect(
    Number(
      items.find((item: { id: number }) => item.id === fixture.ids.cup).onHand,
    ),
  ).toBe(11);
  expect(
    Number(
      items.find((item: { id: number }) => item.id === fixture.ids.cup)
        .reserved,
    ),
  ).toBe(0);
});
test("Inventory settings save on mobile, persist and handle another Admin edit", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await openRole(page, "inventory", "/inventory/settings");
  await expect(
    page.getByLabel("Supply count approval policy", { exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByLabel("Default prepared reorder level"),
  ).toBeDisabled();
  await page.getByLabel("Expiry warning days").fill("9");
  await page.getByLabel("Refresh interval", { exact: true }).selectOption("60");
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(
    page.getByText("Inventory settings saved.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Expiry warning days")).toHaveValue("9");
  await expect(
    page.getByLabel("Refresh interval", { exact: true }),
  ).toHaveValue("60");
  await noOverflow(page);
  const settingsUrl = fixture.url + "/api/inventory/settings";
  const headers = { Authorization: `Bearer ${fixture.accounts.admin.token}` };
  const current = await (await request.get(settingsUrl, { headers })).json();
  await request.put(settingsUrl, {
    headers,
    data: {
      expectedVersion: current.version,
      expiryWarningDays: 14,
      countApproval: "admin_review",
    },
  });
  await page.getByLabel("Expiry warning days").fill("12");
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Settings changed");
  await page.getByRole("button", { name: "Use current settings" }).click();
  await expect(page.getByLabel("Expiry warning days")).toHaveValue("14");
  await expect(
    page.getByLabel("Supply count approval policy", { exact: true }),
  ).toHaveValue("admin_review");
  await page.getByLabel("Expiry warning days").fill("12");
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(
    page.getByText("Inventory settings saved.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("heading", { level: 1 }).click();
  await page.screenshot({
    path: path.join(screenshotPath, "inventory-settings-mobile.png"),
    fullPage: true,
  });
  const color = await page
    .locator(".inv-primary")
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(color).toBe("rgb(255, 206, 27)");
});

test('all workspaces render without viewport overflow', async ({ page }) => {
  test.setTimeout(240000);
  const failures: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const groups: Record<string, string[]> = {
    admin: ['dashboard', 'employees', 'menu', 'sales', 'discounts-vouchers', 'feedback', 'settings'],
    cashier: ['pos', 'orders', 'history', 'menuboard', 'profile', 'payment', 'cash-payment', 'receipt'],
    kitchen: ['incoming', 'completed', 'waste', 'profile'],
  };
  for (const [role, paths] of Object.entries(groups)) {
    await openRole(page, role, `/${role}/${paths[0]}`);
    for (const width of [360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 850 });
      for (const route of paths) {
        await page.goto(`/${role}/${route}`, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('.spinner')).toHaveCount(0);
        await page.locator('main').waitFor();
        const overflow = await page.evaluate(() => {
          const scroller = document.querySelector('.inv-content, .app-main') as HTMLElement;
          return { document: document.documentElement.scrollWidth > innerWidth + 1,
            content: scroller.scrollWidth > scroller.clientWidth + 1 };
        });
        if (overflow.document || overflow.content) failures.push(`${role}/${route} at ${width}: ${JSON.stringify(overflow)}`);
        if ([360, 1440].includes(width)) await page.screenshot({ path: path.join(screenshotPath, `refined-${role}-${route}-${width}.png`) });
      }
    }
  }
  expect(failures, failures.join('\n')).toEqual([]);
  expect(errors).toEqual([]);
});

test('public pages reflow on narrow and short screens; authentication stays keyboard accessible', async ({ page }) => {
  test.setTimeout(120000);
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: fixture.url + url.pathname + url.search });
    await route.fulfill({ response });
  });
  const failures: string[] = [];
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 450 : 850 });
    for (const route of ['/', '/login', '/register', '/forgot-password', '/reset-password', '/role-selection', '/feedback', '/missing-page']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('.spinner')).toHaveCount(0);
      const bad = await page.evaluate(() => {
        const shell = document.querySelector('.auth-shell') as HTMLElement | null;
        return document.documentElement.scrollWidth > innerWidth + 1 || !!shell && shell.scrollWidth > shell.clientWidth + 1;
      });
      if (bad) failures.push(`${route} at ${width}`);
      if (width === 360) await page.screenshot({ path: path.join(screenshotPath, `refined-public-${route.replaceAll('/', '') || 'welcome'}.png`) });
    }
  }
  await page.setViewportSize({ width: 390, height: 450 });
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('invalid@example.test');
  await page.getByLabel('Password', { exact: true }).fill('invalid-password');
  await page.getByRole('button', { name: 'Show password', exact: true }).click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Hide password', exact: true }).click();
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await expect(page).toHaveURL(/forgot-password/);
  expect(failures).toEqual([]);
});

test('mobile navigation and legacy dialogs support keyboard dismissal and focus restoration', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await openRole(page, 'admin', '/admin/menu');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('dialog', { name: 'Admin navigation' })).toBeVisible();
  await expect(page.locator('main')).toHaveAttribute('inert', '');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('dialog', { name: 'Admin navigation' }).getByRole('button', { name: 'Close navigation' }).click();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(page.locator('main')).not.toHaveAttribute('inert');
  await page.setViewportSize({ width: 390, height: 450 });
  const add = page.getByRole('button', { name: 'Add Item', exact: true });
  await add.click();
  const dialog = page.getByRole('dialog', { name: 'Menu details' });
  await expect(dialog).toBeVisible();
  await noOverflow(page);
  for (let step = 0; step < 15; step++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.closest('dialog')?.open)).toBe(true);
  }
  await expect(dialog.getByRole('button', { name: 'Close dialog', exact: true })).toBeInViewport();
  await page.screenshot({ path: path.join(screenshotPath, 'refined-menu-dialog-short-mobile.png') });
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(add).toBeFocused();
  await page.goto('/admin/employees');
  const deactivate = page.getByRole('button', { name: 'Deactivate account' }).first();
  await deactivate.click();
  await expect(page.getByRole('dialog', { name: 'Confirm action' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(deactivate).toBeFocused();
});

test('mobile checkout completes a real disposable order and renders its receipt', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await openRole(page, 'cashier', '/cashier/pos');
  await page.getByRole('button', { name: 'Add', exact: true }).first().click();
  await page.getByRole('button', { name: /View cart/ }).click();
  await page.getByRole('button', { name: /Proceed to Checkout/ }).click();
  await expect(page).toHaveURL(/cashier\/payment/);
  await page.getByLabel('Customer Name', { exact: false }).fill('QA mobile checkout');
  await page.getByRole('button', { name: 'Takeout', exact: true }).click();
  await page.screenshot({ path: path.join(screenshotPath, 'refined-checkout-mobile.png') });
  await noOverflow(page);
  await page.getByRole('button', { name: /Proceed to Payment/ }).click();
  await expect(page).toHaveURL(/cash-payment/);
  await page.getByLabel('Amount Received').fill('50');
  await page.getByRole('button', { name: 'Complete Transaction', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Payment Successful!' })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: path.join(screenshotPath, 'refined-receipt-mobile.png') });
});

test('form constraints show inline errors and focus the invalid field', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 450 });
  await page.goto('/login');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('Email', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Email', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const style = await page.locator(':root').evaluate(el => getComputedStyle(el).scrollbarColor);
  expect(style).not.toBe('auto');
  await page.goto('/cashier/pos');
  await expect(page).toHaveURL(/login/);
  await page.screenshot({ path: path.join(screenshotPath, 'refined-login-error-short-mobile.png') });
});

test('customer feedback handles submission errors and success on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 500 });
  await page.route('**/api/qr-key/validate/**', route => route.fulfill({ json: { valid: true } }));
  let attempts = 0;
  await page.route('**/api/feedback/submit', route => {
    attempts++;
    return route.fulfill({ status: attempts === 1 ? 503 : 200, json: attempts === 1 ? { error: 'Please try again.' } : { success: true } });
  });
  await page.goto('/feedback?key=ui-state-fixture');
  await page.getByLabel('Order Number', { exact: false }).fill('12345678');
  await page.getByRole('button', { name: 'Rate 5 out of 5' }).click();
  await page.getByLabel('Share your thoughts', { exact: false }).fill('The order arrived as expected.');
  await page.getByRole('button', { name: /Submit Feedback/i }).click();
  await expect(page.getByText('Please try again.', { exact: true })).toBeVisible();
  await page.screenshot({ path: path.join(screenshotPath, 'refined-feedback-error-mobile.png') });
  await page.getByRole('button', { name: /Submit Feedback/i }).click();
  await expect(page.getByRole('heading', { name: 'Thank You!' })).toBeVisible();
  expect(attempts).toBe(2);
});

test('dashboard error recovery and intermediate widths remain usable', async ({ page }) => {
  await openRole(page, 'admin', '/admin/dashboard');
  await page.route('**/api/orders', route => route.fulfill({ status: 503, json: { error: 'Service unavailable' } }));
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('could not be loaded');
  await page.unroute('**/api/orders');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  for (const width of [767, 820, 900, 1280]) {
    await page.setViewportSize({ width, height: 600 });
    await page.goto('/admin/menu');
    await page.getByRole('heading', { name: 'Menu', exact: true }).waitFor();
    await noOverflow(page);
  }
});

test('Admin inventory mirrors and role entry redirects preserve their routes', async ({ page }) => {
  test.setTimeout(120000);
  await openRole(page, 'admin', '/admin/inventory');
  await expect(page).toHaveURL(/admin\/inventory\/overview/);
  for (const width of [360, 1024]) {
    await page.setViewportSize({ width, height: 768 });
    for (const route of ['overview', 'supplies', 'receiving', 'prepared', 'menu', 'counts', 'losses', 'suppliers', 'movements', 'reports', 'settings', 'profile', 'guide']) {
      await page.goto(`/admin/inventory/${route}`);
      await page.getByRole('heading', { level: 1 }).waitFor();
      await noOverflow(page);
    }
  }
  await page.goto('/admin/stocks');
  await expect(page).toHaveURL(/admin\/inventory\/prepared/);
  for (const [role, destination] of [['admin', 'dashboard'], ['cashier', 'pos'], ['kitchen', 'incoming'], ['inventory', 'overview']]) {
    await openRole(page, role, `/${role}`);
    await expect(page).toHaveURL(new RegExp(`${role}/${destination}$`));
  }
});

test('promotion dialogs create a discount and show dismissible success feedback', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 450 });
  await openRole(page, 'admin', '/admin/discounts-vouchers');
  await page.getByRole('button', { name: 'Add Discount', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Promotion details' });
  await dialog.getByLabel('Discount Name').fill('QA UI promotion');
  await dialog.getByLabel('Percentage (%)').fill('10');
  await expect(dialog.getByRole('button', { name: 'Close dialog' })).toBeInViewport();
  await noOverflow(page);
  await dialog.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('status')).toContainText('Discount created successfully');
  await page.getByRole('button', { name: 'Dismiss notification' }).click();
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByText('QA UI promotion', { exact: true })).toBeVisible();
  await page.screenshot({ path: path.join(screenshotPath, 'refined-promotion-mobile.png') });
});


test('integration preserves storefront, payroll and table reservation routes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await openRole(page, 'admin', '/admin/payroll');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/payroll/i);
  await page.goto('/admin/reservations');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/reservation/i);
  await page.goto('/japz');
  await expect(page.getByRole('textbox', { name: 'Search the menu' })).toBeVisible();
  await expect(page.getByText('Could not load the menu.', { exact: false })).toHaveCount(0);
  await expect(page).toHaveURL(/\/japz$/);
  await page.goto('/japz/reserve');
  await expect(page.locator('main')).toBeVisible();
  expect(errors).toEqual([]);
});
