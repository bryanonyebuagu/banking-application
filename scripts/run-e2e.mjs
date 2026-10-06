import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { setTimeout as delay } from "node:timers/promises";

const children = new Set();

function launch(args, extraEnvironment = {}) {
  const child = spawn(process.execPath, args, {
    stdio: "inherit", windowsHide: true,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", ...extraEnvironment },
  });
  children.add(child);
  child.once("exit", () => children.delete(child));
  child.on("error", (error) => console.error(error.message));
  return child;
}

async function portIsOccupied(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host: "127.0.0.1" });
    socket.setTimeout(1000);
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("error", () => { socket.destroy(); resolve(false); });
    socket.once("timeout", () => { socket.destroy(); resolve(true); });
  });
}

async function ready(port, child) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error(`Test server ${port} exited before becoming ready.`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}`, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return;
    } catch { /* The server may still be starting. */ }
    await delay(250);
  }
  throw new Error(`Test server ${port} did not become ready.`);
}

async function cleanup() {
  await Promise.all([...children].map(async (child) => {
    child.kill();
    for (let attempt = 0; attempt < 50 && child.exitCode === null && child.signalCode === null; attempt++) await delay(100);
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
  }));
}

for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => { void cleanup().then(() => process.exit(130)); });

try {
  for (const port of [3000, 3001]) {
    if (await portIsOccupied(port)) throw new Error(`Port ${port} is already in use. Stop that server before testing; existing processes will not be touched.`);
  }
  const local = launch(["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3000"], { APP_ENV: "test" });
  const demo = launch(["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3001"], {
    APP_ENV: "demo", APP_ORIGIN: "https://demo.example.test",
    // Synthetic config for shell gating only. This server makes no Supabase requests.
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "synthetic-test-publishable-key",
  });
  await Promise.all([ready(3000, local), ready(3001, demo)]);
  const tests = launch(["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)]);
  process.exitCode = await new Promise((resolve) => { tests.once("exit", (code) => resolve(code ?? 1)); tests.once("error", () => resolve(1)); });
} catch (error) {
  console.error(error instanceof Error ? error.message : "Browser test runner failed.");
  process.exitCode = 1;
} finally {
  await cleanup();
}
