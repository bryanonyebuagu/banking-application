import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { parseEnv } from "node:util";
import { chromium, expect as baseExpect } from "@playwright/test";
import { createAuthFixtures } from "./auth-test-fixtures.mjs";
import { cleanupTestAuthFixtures } from "./test-auth-fixture-cleanup.mjs";
import { connectHostedDatabase, reportDatabaseError } from "./hosted-db.mjs";

const port = 3200;
const origin = `http://localhost:${port}`;
const expect = baseExpect.configure({ timeout: 45000 });
const config = parseEnv(await readFile(new URL("../.env.test.local", import.meta.url), "utf8"));
let server;
let browser;
let database;
let fixtures;
let stage = "initialize";

try {
  fixtures = await createAuthFixtures("test");
  database = await connectHostedDatabase("test");
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: new URL("..", import.meta.url), windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, APP_ENV: "test", APP_ORIGIN: origin, NEXT_PUBLIC_SUPABASE_URL: config.NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_TELEMETRY_DISABLED: "1" },
  });
  server.stdout.on("data", (chunk) => process.stdout.write(String(chunk)));
  server.stderr.on("data", (chunk) => process.stderr.write(String(chunk)));
  for (let attempt = 0; attempt < 300; attempt++) {
    try { if ((await fetch(origin, { signal: AbortSignal.timeout(2000) })).ok) break; } catch { /* compiling */ }
    if (attempt === 299) throw new Error("UI_TEST_SERVER_TIMEOUT");
    await delay(300);
  }
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const user = fixtures.users[0];

  stage = "login";
  await page.goto(`${origin}/login`);
  await page.getByLabel("Email address").fill(user.email);
  await page.locator('input[name="password"]').fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(`${origin}/dashboard`);
  await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0);
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toHaveClass(/bg-danger/);
  await page.getByRole("button", { name: "Close menu" }).click();

  stage = "four-step-registration";
  await page.getByRole("link", { name: "Start registration" }).click();
  const progress = page.getByRole("list", { name: "Registration progress" });
  await expect(progress.getByRole("listitem")).toHaveCount(4);
  await expect(progress).not.toContainText("Verification");
  await page.locator('input[name="firstName"]').fill("UI");
  await page.locator('input[name="lastName"]').fill("Customer");
  await page.locator('input[name="dateOfBirth"]').fill("1990-01-01");
  await page.locator('input[name="phone"]').fill("+1 555 010 2000");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await page.locator('input[name="line1"]').fill("100 Interface Avenue");
  await page.locator('input[name="city"]').fill("Testville");
  await page.locator('input[name="state"]').fill("CA");
  await page.locator('input[name="postalCode"]').fill("90001");
  await page.locator('input[name="country"]').fill("US");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await page.locator('input[name="employment"]').fill("Interface Test Analyst");
  await page.locator('select[name="incomeRange"]').selectOption("50000_74999");
  await page.getByRole("button", { name: "Save and review" }).click();
  await expect(page.getByRole("list", { name: "Registration progress" }).getByRole("listitem")).toHaveCount(4);
  await page.getByRole("button", { name: "Create customer profile" }).click();
  await expect(page).toHaveURL(`${origin}/dashboard`);
  await expect(page.getByRole("heading", { name: "Hi, UI" })).toBeVisible();
  await expect(page.getByText("Verification review pending")).toBeVisible();
  await expect(page.getByText("$0.00", { exact: true })).toBeVisible();

  stage = "settings-and-theme";
  await page.getByRole("link", { name: "Settings" }).click();
  for (const title of ["Profile Settings","Notification Settings","Login & Security","Appearance"]) await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await page.getByRole("link", { name: /Appearance/ }).click();
  await page.getByRole("button", { name: "Dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  stage = "notification-preferences";
  await page.goto(`${origin}/settings`);
  await page.getByRole("link", { name: /Notification Settings/ }).click();
  const incoming = page.getByRole("heading", { name: "Incoming transfers" }).locator("xpath=ancestor::form");
  await incoming.getByLabel("SMS").check();
  await incoming.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Notification preference saved")).toBeVisible();
  const stored = await database.query("select enabled from public.notification_preferences p join public.customers c on c.id=p.customer_id where c.auth_user_id=$1 and p.type='incoming_transfers' and p.channel='sms'", [user.id]);
  assert.equal(stored.rows[0]?.enabled, true);

  stage = "ledger-balance";
  await database.query("update public.customers set verification_status='verified',account_status='active' where auth_user_id=$1", [user.id]);
  await page.goto(`${origin}/accounts/new`);
  await page.getByLabel("Account nickname").fill("Primary checking");
  await page.getByRole("button", { name: "Open account" }).click();
  await expect(page.getByText("$0.00", { exact: true })).toBeVisible();
  await page.getByLabel("Amount").fill("25.00");
  await page.getByRole("button", { name: "Add funds" }).click();
  await page.getByRole("link", { name: "Back to dashboard" }).click();
  await expect(page.getByText("$25.00", { exact: true })).toBeVisible();
  await expect(page.getByText("+$25.00", { exact: true })).toHaveClass(/text-success/);
  for (const name of ["Visit Support","Frequently Asked Questions","Contact Us"]) await expect(page.getByRole("link", { name })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("footer")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Settings" })).toBeHidden();
  await expect(page.getByRole("link", { name: "Notifications" })).toBeHidden();
  await expect(page.getByRole("button", { name: /Switch to (dark|light) mode/ })).toBeHidden();
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await expect(page.getByRole("navigation", { name: "Site menu" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Notifications" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Switch to (dark|light) mode/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out" })).toHaveClass(/bg-danger/);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  console.log("Dashboard, four-step registration, settings, theme persistence, notification storage and ledger balance checks passed.");
} catch (error) {
  console.error(`UI verification stage: ${stage}`);
  console.error(error instanceof Error ? error.message.split("\n",1)[0] : "Unknown UI verification failure");
  reportDatabaseError(error);
} finally {
  await browser?.close().catch(() => {});
  if (server) { server.kill(); for (let attempt=0;attempt<50&&server.exitCode===null&&server.signalCode===null;attempt++) await delay(100); if(server.exitCode===null&&server.signalCode===null) server.kill("SIGKILL"); }
  await database?.end();
  if (fixtures) await cleanupTestAuthFixtures().catch(reportDatabaseError);
}
