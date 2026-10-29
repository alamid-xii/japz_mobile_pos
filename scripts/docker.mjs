import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const environmentPath = new URL("../.env", import.meta.url);
const expectedServices = ["db", "backend", "frontend", "phpmyadmin"];
const action = process.argv[2] || "up";

function docker(args, { capture = false, timeout } = {}) {
  const result = spawnSync("docker", args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
    timeout,
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.error?.code === "ENOENT")
    throw new Error(
      "Docker CLI was not found. Install Docker Desktop and reopen your terminal.",
    );
  if (result.error?.code === "ETIMEDOUT")
    throw new Error(
      "Docker Desktop is not responding. If Windows has a pending restart, restart it first, then open Docker Desktop and rerun npm run docker:up. For persistent virtualization errors, see DOCKER_SETUP.md.",
    );
  if (result.error || result.status !== 0) {
    // Compose configuration may contain secrets; do not print captured configuration.
    const detail =
      capture && args[0] !== "compose" ? result.stderr?.trim() : "";
    throw new Error(
      `docker ${args.slice(0, 2).join(" ")} failed${detail ? `: ${detail}` : "."}`,
    );
  }
  return result.stdout?.trim() || "";
}

function setup() {
  if (!existsSync(environmentPath)) {
    const random = () => randomBytes(24).toString("hex");
    const lines = [
      "# Local Docker Compose credentials. Do not commit this file.",
      "FRONTEND_PORT=8080",
      "BACKEND_PORT=5000",
      "MYSQL_PORT=3307",
      "PHPMYADMIN_PORT=8081",
      `MYSQL_PASSWORD=${random()}`,
      `MYSQL_ROOT_PASSWORD=${random()}`,
      `JWT_SECRET=${randomBytes(48).toString("hex")}`,
      "ADMIN_EMAIL=admin@japz.local",
      `ADMIN_PASSWORD=Japz!${randomBytes(12).toString("hex")}A1`,
      "MAILJET_API_KEY=",
      "MAILJET_SECRET_KEY=",
      "MAILJET_FROM_EMAIL=",
      "",
    ];
    writeFileSync(environmentPath, lines.join("\n"), {
      flag: "wx",
      mode: 0o600,
    });
    console.log(
      "Created .env with random database, JWT, and manager credentials. Existing local development configuration is unchanged.",
    );
  } else {
    console.log(
      "Using the existing Docker Compose .env; credentials are preserved.",
    );
  }
  docker(["compose", "config", "--quiet"]);
  console.log(
    "Compose configuration is valid. Manager login details are in the root .env (ADMIN_EMAIL / ADMIN_PASSWORD).",
  );
}

function requireEngine() {
  const os = docker(["info", "--format", "{{.OSType}}"], {
    capture: true,
    timeout: 20000,
  });
  if (os !== "linux")
    throw new Error(
      "Switch Docker Desktop to Linux containers before starting this project.",
    );
}

function model() {
  return JSON.parse(
    docker(["compose", "config", "--format", "json"], {
      capture: true,
      timeout: 15000,
    }),
  );
}

async function response(url, json = false, options = {}) {
  const result = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(15000),
  });
  if (!result.ok) throw new Error(`${url} returned HTTP ${result.status}.`);
  console.log(`OK HTTP ${result.status}: ${url}`);
  return json ? result.json() : result.text();
}

async function verify() {
  requireEngine();
  const config = model();
  for (const name of expectedServices) {
    const id = docker(["compose", "ps", "--all", "--quiet", name], {
      capture: true,
      timeout: 15000,
    });
    if (!id)
      throw new Error(
        `The ${name} container is missing. Run npm run docker:up.`,
      );
    const [container] = JSON.parse(
      docker(["inspect", id], { capture: true, timeout: 15000 }),
    );
    if (
      container.State.Status !== "running" ||
      container.State.Health?.Status !== "healthy"
    )
      throw new Error(
        `${name} is ${container.State.Status}/${container.State.Health?.Status || "no healthcheck"}. Check npm run docker:logs.`,
      );
    console.log(`OK healthy container: ${container.Name.replace(/^\//, "")}`);
    for (const mount of config.services[name].volumes || []) {
      if (mount.type !== "volume") continue;
      const volumeName = config.volumes[mount.source].name;
      if (
        !container.Mounts.some(
          (actual) =>
            actual.Type === "volume" &&
            actual.Name === volumeName &&
            actual.Destination === mount.target,
        )
      )
        throw new Error(
          `${name} is missing its expected volume mount ${volumeName}.`,
        );
    }
    docker(
      ["image", "inspect", config.services[name].image, "--format", "{{.Id}}"],
      { capture: true, timeout: 15000 },
    );
    console.log(`OK image: ${config.services[name].image}`);
  }
  for (const volume of Object.values(config.volumes)) {
    docker(["volume", "inspect", volume.name], {
      capture: true,
      timeout: 15000,
    });
    console.log(`OK named volume: ${volume.name}`);
  }
  const hostPort = (service) =>
    config.services[service].ports.find(
      (port) => port.target === (service === "backend" ? 5000 : 80),
    ).published;
  const frontend = `http://localhost:${hostPort("frontend")}`;
  const backend = `http://localhost:${hostPort("backend")}`;
  const admin = `http://localhost:${hostPort("phpmyadmin")}`;
  const html = await response(frontend);
  if (!html.includes("Japz Grill"))
    throw new Error("The frontend did not return the Japz application.");
  for (const route of ["/reserve", "/manage", "/login"])
    await response(frontend + route);
  await response(backend + "/api/health", true);
  await response(frontend + "/api/health", true);
  const settings = await response(frontend + "/api/reservation-settings", true);
  if (!Number.isInteger(settings.capacity) || settings.capacity < 1)
    throw new Error("Database-backed reservation settings are invalid.");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const today = ["year", "month", "day"]
    .map((type) => parts.find((part) => part.type === type).value)
    .join("-");
  const tomorrow = new Date(`${today}T00:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const availability = await response(
    `${frontend}/api/reservations/availability?date=${tomorrow.toISOString().slice(0, 10)}&guests=1`,
    true,
  );
  if (!Array.isArray(availability.slots) || availability.slots.length === 0)
    throw new Error(
      "The reservation availability endpoint did not return time slots.",
    );
  await response(admin);
  docker(["compose", "exec", "-T", "frontend", "nginx", "-t"]);
  console.log(
    "All four containers, four application images, two named volumes, and application endpoints are present and working.",
  );
  console.log(
    `Japz: ${frontend} | Manager: ${frontend}/login | phpMyAdmin: ${admin}`,
  );
}

try {
  if (action === "setup") setup();
  else if (action === "config") {
    setup();
  } else if (action === "up") {
    setup();
    requireEngine();
    docker([
      "compose",
      "up",
      "--build",
      "--detach",
      "--wait",
      "--wait-timeout",
      "180",
    ]);
    await verify();
  } else if (action === "verify") await verify();
  else if (action === "status") {
    requireEngine();
    docker(["compose", "ps", "--all"]);
    docker(["compose", "images"]);
    docker([
      "volume",
      "ls",
      "--filter",
      "label=com.docker.compose.project=japz-reservations",
    ]);
  } else if (action === "logs") docker(["compose", "logs", "--tail=60"]);
  else if (action === "down") {
    requireEngine();
    docker(["compose", "down"]);
  } else throw new Error("Use setup, up, verify, status, logs, or down.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
