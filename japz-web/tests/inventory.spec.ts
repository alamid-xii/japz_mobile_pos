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
      30000,
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
test.afterAll(async () => {
  if (child?.exitCode === null) {
    child.stdin.write("STOP\n");
    await new Promise((resolve) => child.once("exit", resolve));
  }
});
async function openRole(page: Page, role: string, route: string) {
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
  for (const width of [320, 375, 390, 768, 1024, 1440]) {
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
