import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const backend = fileURLToPath(new URL("../japz-backend/", import.meta.url));
const frontend = fileURLToPath(new URL("../japz-web/", import.meta.url));
const children = [
  spawn(process.execPath, ["index.js"], {
    cwd: backend,
    stdio: "inherit",
  }),
  spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host"], {
    cwd: frontend,
    stdio: "inherit",
  }),
];
let closing = false;
function stop(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
for (const child of children) {
  child.on("error", (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on("exit", (code) => stop(code || 0));
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
