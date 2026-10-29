import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { mkdir } from "node:fs/promises";
import path from "node:path";

export async function browserFlow({ apiUrl, date }) {
  const qaPath = process.env.JAPZ_QA_PATH;
  if (!qaPath)
    throw new Error(
      "JAPZ_QA_PATH must point to a temporary directory with Playwright installed.",
    );
  const { chromium } = await import(
    pathToFileURL(path.join(qaPath, "node_modules/playwright/index.mjs")).href
  );
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.JAPZ_BROWSER_PATH ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const screenshots = path.join(qaPath, "screenshots");
  await mkdir(screenshots, { recursive: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const failures = [];
  page.on("pageerror", (error) => failures.push(error.message));
  // Browser actions use the isolated integration database, never the real guest list.
  await page.route("**/api/**", async (route) => {
    const requested = new URL(route.request().url());
    const response = await route.fetch({
      url: `${apiUrl}${requested.pathname}${requested.search}`,
    });
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "*",
        "access-control-allow-methods": "*",
      },
    });
  });
  const baseUrl = process.env.JAPZ_WEB_URL || "http://127.0.0.1:5173";
  const fits = async (label) =>
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
      `${label} has horizontal overflow`,
    );
  try {
    await page.goto(baseUrl);
    await page
      .getByRole("heading", {
        name: "Good food. Great company. Your table awaits.",
      })
      .waitFor();
    await page.screenshot({
      path: path.join(screenshots, "desktop-home.png"),
      fullPage: true,
    });
    await fits("Desktop home");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: path.join(screenshots, "mobile-home.png"),
      fullPage: true,
    });
    await fits("Mobile home");
    await page
      .getByRole("link", { name: "Reserve a table", exact: true })
      .click();
    await page.getByLabel("Date", { exact: true }).fill(date);
    await page.getByRole("button", { name: "3:00 PM", exact: true }).click();
    await page.screenshot({
      path: path.join(screenshots, "mobile-reserve.png"),
      fullPage: true,
    });
    await fits("Mobile reservation");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Full name", exact: true })
      .fill("Browser Guest");
    await page
      .getByRole("textbox", { name: "Email address", exact: true })
      .fill("browser@example.test");
    await page
      .getByRole("textbox", { name: "Contact number", exact: true })
      .fill("09123456789");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("checkbox").check();
    await page
      .getByRole("button", { name: "Request reservation", exact: true })
      .click();
    await page.getByRole("heading", { name: "Your request is in." }).waitFor();
    const reference = await page.locator(".reference-box > strong").innerText();
    assert.match(reference, /^JPZ-[A-F0-9]{16}$/);
    await page.getByRole("link", { name: "View my reservation" }).click();
    await page.getByRole("button", { name: "Change reservation" }).waitFor();
    await page.getByRole("button", { name: "Change reservation" }).click();
    await page.getByRole("button", { name: "4:00 PM", exact: true }).click();
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await page
      .getByText(
        "Your changes have been saved and are awaiting confirmation from Japz.",
      )
      .waitFor();
    await fits("Mobile manage");
    await page.goto(`${baseUrl}/login`);
    await page
      .getByRole("textbox", { name: "Email address", exact: true })
      .fill("manager@example.test");
    await page.getByLabel("Password", { exact: true }).fill("TestPassword123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.getByRole("heading", { name: "The guest list." }).waitFor();
    await page.getByLabel("Reservation date", { exact: true }).fill(date);
    const row = page.getByRole("row").filter({ hasText: reference });
    await row
      .getByRole("button", { name: "Confirm booking", exact: true })
      .click();
    await row.getByText("Confirmed", { exact: true }).waitFor();
    await fits("Mobile manager list");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({
      path: path.join(screenshots, "desktop-manager.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Booking settings" }).click();
    await page
      .getByRole("heading", { name: "Reservation settings", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Save settings", exact: true })
      .click();
    await page
      .getByText("Reservation settings saved.", { exact: true })
      .waitFor();
    await page.goto(`${baseUrl}/manage`);
    await page
      .getByRole("textbox", { name: "Booking reference", exact: true })
      .fill(reference);
    await page
      .getByRole("textbox", { name: "Booking email", exact: true })
      .fill("browser@example.test");
    await page
      .getByRole("button", { name: "Find reservation", exact: true })
      .click();
    await page.locator(".booking-summary .status.confirmed").waitFor();
    await page
      .getByRole("button", { name: "Cancel reservation", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Yes, cancel reservation", exact: true })
      .click();
    await page.locator(".booking-summary .status.cancelled").waitFor();
    assert.deepEqual(failures, [], "Browser page errors");
    console.log(
      "Browser flow passed: mobile booking, lookup, rescheduling, manager confirmation/settings, guest cancellation, and responsive layouts.",
    );
    console.log(`Screenshots: ${screenshots}`);
  } catch (error) {
    await page.screenshot({
      path: path.join(screenshots, "failure.png"),
      fullPage: true,
    });
    console.error(
      "Browser diagnostics:",
      await page.locator('[role="alert"]').allTextContents(),
    );
    throw error;
  } finally {
    await browser.close();
  }
}
