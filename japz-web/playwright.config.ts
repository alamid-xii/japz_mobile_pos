import { defineConfig } from "@playwright/test";
import path from "node:path";
import { localRuntimePath } from "./tests/local-paths";
export default defineConfig({
  testDir: "./tests",
  timeout: 90000,
  workers: 1,
  outputDir: path.join(localRuntimePath, "ui-test-results"),
  reporter: "list",
  use: {
    baseURL: process.env.JAPZ_UI_BASE_URL || "http://127.0.0.1:5173",
    channel: "chrome",
    headless: true,
    trace: "off",
    screenshot: "off",
  },
});
