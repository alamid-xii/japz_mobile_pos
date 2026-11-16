import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspacePath = path.resolve(fileURLToPath(new URL("../../", import.meta.url)));
const workspaceKey = createHash("sha256")
  .update(process.platform === "win32" ? workspacePath.toLowerCase() : workspacePath)
  .digest("hex")
  .slice(0, 12);

// Match start-local.ps1 on Windows; keep test artifacts outside other checkouts too.
export const localRuntimePath = path.join(
  process.env.LOCALAPPDATA || os.tmpdir(),
  "JAPZ",
  workspaceKey,
);
export const screenshotPath = path.join(localRuntimePath, "screenshots");
