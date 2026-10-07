import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createConnection } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { parseEnv } from "node:util";
import { chromium, expect as baseExpect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createAuthFixtures } from "./auth-test-fixtures.mjs";
import { cleanupTestAuthFixtures } from "./test-auth-fixture-cleanup.mjs";
import { connectHostedDatabase, reportDatabaseError } from "./hosted-db.mjs";

const port = 3100;
const origin = `http://localhost:${port}`;
const registrationWidths = [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920];
const expect = baseExpect.configure({ timeout: 45000 });
const config = parseEnv(await readFile(new URL("../.env.test.local", import.meta.url), "utf8"));
const secret = (await readFile(new URL("../.env.test-supabase-secret", import.meta.url), "utf8")).trim();
let server;
let browser;
let database;
let fixtures;
let stage = "initialize";

function portIsOccupied() {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host: "127.0.0.1" });
    socket.setTimeout(1000);
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("error", () => { socket.destroy(); resolve(false); });
    socket.once("timeout", () => { socket.destroy(); resolve(true); });
  });
}

async function waitUntilReady() {
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null || server.signalCode !== null) throw new Error("AUTH_TEST_SERVER_EXITED");
    try {
      const response = await fetch(origin, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return;
    } catch { /* The development server may still be compiling. */ }
    await delay(300);
  }
  throw new Error("AUTH_TEST_SERVER_TIMEOUT");
}

try {
  assert.equal(await portIsOccupied(), false, `Port ${port} is already in use.`);
  fixtures = await createAuthFixtures("test");
  database = await connectHostedDatabase("test");
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: new URL("..", import.meta.url),
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    env: {
      ...process.env,
      APP_ENV: "test",
      APP_ORIGIN: origin,
      NEXT_PUBLIC_SUPABASE_URL: config.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      NEXT_TELEMETRY_DISABLED: "1",
    },
  });
  const redactServerOutput = (chunk) => String(chunk).replace(/(token_hash|code)=[^&\s]+/g, "$1=[REDACTED]");
  server.stdout.on("data", (chunk) => process.stdout.write(redactServerOutput(chunk)));
  server.stderr.on("data", (chunk) => process.stderr.write(redactServerOutput(chunk)));
  await waitUntilReady();
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || "msedge" });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(45000);
  const [user] = fixtures.users;
  const admin = createClient(config.NEXT_PUBLIC_SUPABASE_URL, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const verificationOnly = process.env.AUTH_VERIFICATION_ONLY === "1";

  if (process.env.AUTH_RECOVERY_ONLY !== "1" && !verificationOnly) {
  stage = "protected-route-redirect";
  await page.goto(`${origin}/dashboard`);
  await expect(page).toHaveURL(/\/login\?message=session-required$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  stage = "signup-validation";
  await page.goto(`${origin}/sign-up`);
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await page.locator('input[name="email"]').fill("invalid-address");
  await page.locator('input[name="password"]').fill("weak");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(page.getByText("Use at least 10 characters.")).toBeVisible();
  const signupPassword = page.locator('input[name="password"]');
  await expect(signupPassword).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show password" }).first().click();
  await expect(signupPassword).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(signupPassword).toHaveAttribute("type", "password");

  stage = "forgot-password-uniform-response";
  await page.goto(`${origin}/forgot-password`);
  await page.getByLabel("Email address").fill(`unknown-${crypto.randomUUID()}@example.invalid`);
  await page.getByRole("button", { name: "Send reset instructions" }).click();
  await expect(page.getByText("If an account matches that address, we sent password reset instructions.")).toBeVisible();
  await page.goto(`${origin}/login`);
  const loginPassword = page.locator('input[name="password"]');
  await expect(loginPassword).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(loginPassword).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password" }).click();

  stage = "uniform-invalid-login";
  await page.getByLabel("Email address").fill(user.email);
  await page.locator('input[name="password"]').fill("Incorrect-password-1!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("We couldn’t sign you in. Check your details or try again shortly.")).toBeVisible();

  stage = "valid-login";
  await page.getByLabel("Email address").fill(user.email);
  await page.locator('input[name="password"]').fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(`${origin}/dashboard`);
  await expect(page.getByRole("heading", { name: "Welcome to Chaze Bank" })).toBeVisible();
  await expect(page.getByText(user.email)).toBeVisible();
  await expect(page.getByRole("heading", { name: "No banking products yet" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open account" })).toBeDisabled();

  stage = "registration-personal";
  await page.getByRole("link", { name: "Start registration" }).click();
  await expect(page).toHaveURL(`${origin}/register`);
  for (const width of registrationWidths) {
    await page.setViewportSize({ width, height: width < 768 ? 800 : 900 });
    await expect(page.getByRole("heading", { name: "Tell us about yourself" })).toBeVisible();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.locator('input[name="firstName"]').fill("Synthetic");
  await page.locator('input[name="middleName"]').fill("Browser");
  await page.locator('input[name="lastName"]').fill("Registrant");
  await page.locator('input[name="dateOfBirth"]').fill("1990-01-01");
  await page.locator('input[name="phone"]').fill("+1 555 010 1000");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(`${origin}/register?step=address`);
  stage = "registration-resume";
  await page.reload();
  await expect(page.getByRole("heading", { name: "Add your home address" })).toBeVisible();
  stage = "registration-address";
  await page.locator('input[name="line1"]').fill("100 Test Avenue");
  await page.locator('input[name="city"]').fill("Testville");
  await page.locator('input[name="state"]').fill("CA");
  await page.locator('input[name="postalCode"]').fill("90001");
  await page.locator('input[name="country"]').fill("US");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(`${origin}/register?step=employment`);
  stage = "registration-employment";
  await page.locator('input[name="employment"]').fill("Test Company — Analyst");
  await page.locator('select[name="incomeRange"]').selectOption("50000_74999");
  await page.getByRole("button", { name: "Save and review" }).click();
  await expect(page).toHaveURL(`${origin}/register?step=review`);
  await expect(page.getByText("Synthetic Browser Registrant")).toBeVisible();
  stage = "registration-complete";
  await page.getByRole("button", { name: "Create customer profile" }).click();
  await expect(page).toHaveURL(`${origin}/register?step=verification`);
  stage = "verification-failed-path";
  await page.locator('select[name="scenario"]').selectOption("failed");
  await page.getByRole("button", { name: "Run synthetic verification" }).click();
  await expect(page.getByText("Current status: failed")).toBeVisible();
  stage = "verification-retry-success";
  await page.locator('select[name="scenario"]').selectOption("verified");
  await page.getByRole("button", { name: "Run synthetic verification" }).click();
  await expect(page.getByText("Current status: verified")).toBeVisible();
  await page.getByRole("link", { name: "Continue to dashboard" }).click();
  await expect(page).toHaveURL(`${origin}/dashboard`);
  await expect(page.getByRole("heading", { name: "Welcome, Synthetic" })).toBeVisible();
  await expect(page.getByText("Your synthetic identity verification is complete.")).toBeVisible();
  for (const width of registrationWidths) {
    await page.setViewportSize({ width, height: width < 768 ? 800 : 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await expect(page.getByRole("link", { name: "Transfer money" })).toBeVisible();
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  stage = "account-open";
  await page.getByRole("link", { name: "Open account" }).click();
  await expect(page.getByRole("heading", { name: "Open a synthetic account" })).toBeVisible();
  await page.getByLabel("Account type").selectOption("checking");
  await page.getByLabel("Account nickname").fill("Everyday checking");
  await page.getByRole("button", { name: "Open account" }).click();
  await expect(page.getByText("Your synthetic checking account is ready with a $0.00 starting balance.")).toBeVisible();
  await expect(page.getByText("$0.00", { exact: true })).toBeVisible();
  stage = "account-rename";
  await page.getByLabel("Account nickname").fill("Daily spending");
  await page.getByRole("button", { name: "Save nickname" }).click();
  await expect(page.getByText("Your change was saved.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Daily spending" })).toBeVisible();
  stage = "ledger-funding";
  await page.getByLabel("Synthetic amount").fill("125.50");
  await page.getByRole("button", { name: "Add synthetic funds" }).click();
  await expect(page.getByText("Synthetic funds were posted through a balanced journal.")).toBeVisible();
  await expect(page.getByText("$125.50", { exact: true })).toBeVisible();
  stage = "ledger-reversal";
  await page.getByRole("button", { name: "Reverse" }).click();
  await expect(page.getByText("The equal-and-opposite journal was posted.")).toBeVisible();
  await expect(page.getByText("$0.00", { exact: true })).toBeVisible();
  stage = "ledger-refunding";
  await page.getByLabel("Synthetic amount").fill("100.00");
  await page.getByRole("button", { name: "Add synthetic funds" }).click();
  await expect(page.getByText("$100.00", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Back to dashboard" }).click();
  await expect(page.getByRole("link", { name: "Daily spending" })).toBeVisible();
  stage = "second-account-open";
  await page.getByRole("link", { name: "Open account" }).click();
  await page.getByLabel("Account type").selectOption("savings");
  await page.getByLabel("Account nickname").fill("Goal savings");
  await page.getByRole("button", { name: "Open account" }).click();
  await expect(page.getByRole("heading", { name: "Goal savings" })).toBeVisible();
  await page.getByRole("link", { name: "Back to dashboard" }).click();
  stage = "own-account-transfer";
  await page.getByRole("link", { name: "Transfer money" }).click();
  await page.getByLabel("From account").selectOption({ index: 1 });
  await page.getByLabel("To account or recipient").selectOption({ index: 2 });
  await page.getByLabel("Amount").fill("25.00");
  await page.getByLabel("Memo").fill("Test transfer");
  await page.getByRole("button", { name: "Review transfer" }).click();
  await expect(page.getByRole("heading", { name: "Review transfer" })).toBeVisible();
  await expect(page.getByText("$25.00", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Confirm transfer" }).click();
  await expect(page.getByText("This persisted receipt can be safely revisited.")).toBeVisible();
  await expect(page.getByText("completed", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Back to transfers" }).click();
  await expect(page.getByText("Test transfer", { exact: true })).toBeVisible();
  stage = "scheduled-transfer";
  await page.getByRole("link", { name: "New transfer" }).click();
  await page.getByLabel("From account").selectOption({ index: 1 });
  await page.getByLabel("To account or recipient").selectOption({ index: 2 });
  await page.getByLabel("Amount").fill("10.00");
  await page.getByLabel("Memo").fill("Scheduled transfer test");
  await page.getByLabel("When").selectOption("later");
  const scheduledAt = new Date(Date.now() + 86_400_000).toISOString().slice(0, 16);
  await page.getByLabel("First execution (UTC)").fill(scheduledAt);
  await page.getByRole("button", { name: "Review transfer" }).click();
  await expect(page.getByRole("heading", { name: "Review transfer" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm transfer" }).click();
  await expect(page.getByText("The transfer will be processed at the scheduled time.")).toBeVisible();
  await expect(page.getByText("scheduled", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancel scheduled transfer" }).click();
  await expect(page.getByText("cancelled", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Back to transfers" }).click();
  await expect(page.getByText("Scheduled transfer test", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Back to dashboard" }).click();
  stage = "bill-pay-payee";
  await page.getByRole("link", { name: "Pay bills" }).click();
  await expect(page.getByRole("heading", { name: "Pay a bill" })).toBeVisible();
  await page.getByRole("link", { name: "Manage payees" }).click();
  await page.getByLabel("Payee name").fill("Synthetic Utility");
  await page.getByLabel("Synthetic payee reference").fill("SIM-UTILITY-0001");
  await page.getByRole("button", { name: "Save payee" }).click();
  await expect(page.getByText("Synthetic Utility", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Back to Bill Pay" }).click();
  stage = "immediate-bill-payment";
  await page.getByLabel("Pay from").selectOption({ index: 1 });
  await page.getByLabel("Payee").selectOption({ index: 1 });
  await page.getByLabel("Amount").fill("15.00");
  await page.getByRole("button", { name: "Review payment" }).click();
  await expect(page.getByRole("heading", { name: "Review payment" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm payment" }).click();
  await expect(page.getByText("Payment complete")).toBeVisible();
  await expect(page.getByText("completed", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Back to Bill Pay" }).click();
  await expect(page.getByText("Synthetic Utility", { exact: true })).toBeVisible();
  stage = "scheduled-bill-payment";
  await page.getByRole("link", { name: "Pay a bill" }).click();
  await page.getByLabel("Pay from").selectOption({ index: 1 });
  await page.getByLabel("Payee").selectOption({ index: 1 });
  await page.getByLabel("Amount").fill("5.00");
  await page.getByLabel("When").selectOption("later");
  const paymentAt = new Date(Date.now() + 86_400_000).toISOString().slice(0, 16);
  await page.getByLabel("First payment (UTC)").fill(paymentAt);
  await page.getByRole("button", { name: "Review payment" }).click();
  await page.getByRole("button", { name: "Confirm payment" }).click();
  await expect(page.getByText("The bill payment will be processed at the scheduled time.")).toBeVisible();
  await page.getByRole("button", { name: "Cancel scheduled payment" }).click();
  await expect(page.getByText("cancelled", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Back to Bill Pay" }).click();
  await page.getByRole("link", { name: "Back to dashboard" }).click();
  stage = "credit-card-open";
  await page.getByRole("link", { name: "Manage cards" }).click();
  await page.getByRole("link", { name: "Open simulated card" }).click();
  await page.getByLabel("Cardholder name").fill("SYNTHETIC CUSTOMER");
  await page.getByLabel("Credit limit (USD)").fill("1000.00");
  await page.getByRole("button", { name: "Open simulated card" }).click();
  await expect(page.getByRole("heading", { name: /Card ending/ })).toBeVisible();
  stage = "credit-card-purchase";
  const purchaseForm = page.getByRole("button", { name: "Authorize purchase" }).locator("xpath=ancestor::form");
  await purchaseForm.getByLabel("Merchant").fill("Synthetic Market");
  await purchaseForm.getByLabel("Amount").fill("100.00");
  await purchaseForm.getByRole("button", { name: "Authorize purchase" }).click();
  const postPurchase=page.getByRole("button", { name: "Post purchase" });
  await expect(postPurchase).toBeVisible();
  await postPurchase.click();
  await expect(page.getByText("purchase · posted", { exact: false })).toBeVisible();
  await page.getByLabel("Refund amount").fill("20.00");
  await page.getByRole("button", { name: "Refund" }).click();
  await expect(page.getByText("refund · posted", { exact: false })).toBeVisible();
  stage = "credit-card-payment-controls";
  await page.getByLabel("Pay from").selectOption({ index: 1 });
  await page.getByLabel("Payment amount").fill("25.00");
  await page.getByRole("button", { name: "Pay card" }).click();
  await page.getByRole("button", { name: "Lock card" }).click();
  await expect(page.getByText("locked", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Unlock card" }).click();
  await page.getByLabel("Purchase limit (USD)").fill("500.00");
  await page.getByLabel("Alert threshold (USD)").fill("10.00");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await page.getByRole("button", { name: "Replace card" }).click();
  await expect(page).toHaveURL(/\/cards\/[0-9a-f-]+\?message=replaced$/);
  await page.getByRole("link", { name: "Back to cards" }).click();
  await expect(page.getByText("replaced", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Back to dashboard" }).click();
  stage = "check-deposit";
  await page.getByRole("link", { name: "Deposit check" }).click();
  await page.getByLabel("Deposit to").selectOption({ index: 1 });
  await page.getByLabel("Check amount").fill("12.34");
  await page.getByLabel("Synthetic check image").setInputFiles({
    name: "synthetic-check.png",
    mimeType: "image/png",
    buffer: Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x00]),
  });
  await page.getByRole("button", { name: "Review deposit" }).click();
  await expect(page.getByText("submitted", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Begin synthetic review" }).click();
  await expect(page.getByText("reviewing", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Accept test check" }).click();
  await expect(page.getByText("accepted", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Back to check deposits" }).click();
  await page.getByRole("link", { name: "Back to dashboard" }).click();
  stage = "statement-generation";
  await page.getByRole("link", { name: "Generate statement" }).click();
  await page.getByLabel("Account").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Generate private PDF" }).click();
  await expect(page.getByText("Statement generated")).toBeVisible();
  const statementLink = page.getByRole("link", { name: "Open private PDF" });
  const statementUrl = await statementLink.getAttribute("href");
  assert.ok(statementUrl);
  const statementDownload = await page.request.get(statementUrl);
  assert.equal(statementDownload.ok(), true);
  assert.match(statementDownload.headers()["content-type"] ?? "", /^application\/pdf/);
  assert.equal((await statementDownload.body()).subarray(0, 4).toString("ascii"), "%PDF");
  await page.getByRole("link", { name: "Back to statements" }).click();
  await expect(page.getByText("Version 1", { exact: false })).toBeVisible();
  await page.getByRole("link", { name: "Back to dashboard" }).click();
  stage = "transaction-history";
  await page.getByRole("link", { name: "Transactions" }).click();
  await expect(page.getByRole("heading", { name: "Transaction history" })).toBeVisible();
  await page.getByLabel("Search").fill("Synthetic simulator");
  await page.getByLabel("Status").selectOption("reversed");
  await page.getByRole("button", { name: "Apply filters" }).click();
  const historyItem=page.getByRole("link", { name: /Synthetic simulator funding/ });
  await expect(historyItem).toBeVisible();
  await historyItem.click();
  await expect(page.getByRole("heading", { name: "Synthetic simulator funding" })).toBeVisible();
  await expect(page.getByText("reversed", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Back to transactions" }).click();
  await page.getByRole("link", { name: "Back to dashboard" }).click();
  await expect(page).toHaveURL(`${origin}/dashboard`);
  await expect(page.getByRole("heading", { name: "Welcome, Synthetic" })).toBeVisible();
  stage = "session-persistence";
  await page.reload();
  await expect(page).toHaveURL(`${origin}/dashboard`);

  stage = "database-session-query";
  const firstSession = await database.query(
    "select id from public.app_sessions where auth_user_id=$1 and revoked_at is null order by created_at desc limit 1",
    [user.id],
  );
  assert.equal(firstSession.rowCount, 1);
  stage = "database-session-expire";
  await database.query("update public.app_sessions set idle_expires_at=now()-interval '1 second' where id=$1", [firstSession.rows[0].id]);
  stage = "expired-browser-redirect";
  await page.goto(`${origin}/dashboard`);
  await expect(page).toHaveURL(/\/login\?message=session-required$/);

  stage = "login-after-expiration";
  await page.getByLabel("Email address").fill(user.email);
  await page.locator('input[name="password"]').fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(`${origin}/dashboard`);
  const secondSession = await database.query(
    "select id from public.app_sessions where auth_user_id=$1 and revoked_at is null and idle_expires_at>now() order by created_at desc limit 1",
    [user.id],
  );
  assert.equal(secondSession.rowCount, 1);
  stage = "database-session-revoke";
  await database.query("update public.app_sessions set revoked_at=now() where id=$1", [secondSession.rows[0].id]);
  stage = "revoked-browser-redirect";
  await page.goto(`${origin}/dashboard`);
  await expect(page).toHaveURL(/\/login\?message=session-required$/);

  stage = "login-after-revocation";
  await page.getByLabel("Email address").fill(user.email);
  await page.locator('input[name="password"]').fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(`${origin}/dashboard`);
  stage = "logout";
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login\?message=signed-out$/);
  await page.goto(`${origin}/dashboard`);
  await expect(page).toHaveURL(/\/login\?message=session-required$/);
  }

  if (process.env.AUTH_RECOVERY_ONLY !== "1") {
  stage = "provider-signup-verification";
  const verificationEmail = `banking-verification-${crypto.randomUUID()}@example.invalid`;
  const verificationPassword = `Verified-${crypto.randomUUID()}-aA1!`;
  const verification = await admin.auth.admin.generateLink({
    type: "signup",
    email: verificationEmail,
    password: verificationPassword,
  });
  assert.equal(verification.error, null);
  assert.ok(verification.data.user);
  const tagged = await admin.auth.admin.updateUserById(verification.data.user.id, {
    app_metadata: { synthetic_test_run: `browser-${crypto.randomUUID()}` },
  });
  assert.equal(tagged.error, null);
  await page.goto(`${origin}/auth/confirm?token_hash=${encodeURIComponent(verification.data.properties.hashed_token)}&type=signup&next=/dashboard`);
  await expect(page).toHaveURL(`${origin}/login?verified=true`);
  await expect(page.getByText("Email verified. Sign in with the email and password you used to create your account.")).toBeVisible();
  await page.getByLabel("Email address").fill(verificationEmail);
  await page.locator('input[name="password"]').fill(verificationPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(`${origin}/dashboard`);
  await expect(page.getByText(verificationEmail)).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login\?message=signed-out$/);
  }

  if (!verificationOnly) {
  stage = "password-recovery";
  const recovery = await admin.auth.admin.generateLink({ type: "recovery", email: user.email });
  assert.equal(recovery.error, null);
  const token = recovery.data.properties.hashed_token;
  await page.goto(`${origin}/auth/confirm?token_hash=${encodeURIComponent(token)}&type=recovery&next=/reset-password`);
  await expect(page).toHaveURL(`${origin}/reset-password`);
  await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();
  const changedPassword = `Changed-${crypto.randomUUID()}-aA1!`;
  const newPassword = page.locator('input[name="password"]');
  const confirmPassword = page.locator('input[name="confirmPassword"]');
  stage = "password-recovery-fill-new";
  await newPassword.fill(changedPassword);
  stage = "password-recovery-fill-confirmation";
  await confirmPassword.fill(changedPassword);
  stage = "password-recovery-submit";
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page).toHaveURL(/\/login\?message=password-updated$/);
  await page.getByLabel("Email address").fill(user.email);
  await page.locator('input[name="password"]').fill(changedPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(`${origin}/dashboard`);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login\?message=signed-out$/);

  stage = "audit-session-results";
  const results = await database.query(
    "select count(*)::int as sessions, count(*) filter(where revoked_at is not null)::int as revoked from public.app_sessions where auth_user_id=$1",
    [user.id],
  );
  assert.ok(results.rows[0].sessions >= 2);
  assert.equal(results.rows[0].sessions, results.rows[0].revoked);
  }
  if (verificationOnly) {
    console.log("Provider signup verification journey passed: hashed-token confirmation, verified login message, explicit sign-in and logout.");
  } else {
  console.log("Browser banking journey passed: registration, accounts, balanced funding/reversal, transaction history, transfers, Bill Pay, credit cards, check deposit, private statements, provider auth, session controls, recovery and logout.");
  }
} catch (error) {
  console.error(`Auth browser verification stage: ${stage}`);
  console.error(JSON.stringify({
    event: "AUTH_BROWSER_ASSERTION_FAILED",
    name: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message.split("\n", 1)[0] : "Unknown failure",
  }));
  reportDatabaseError(error);
} finally {
  await browser?.close().catch(() => {});
  if (server) {
    server.kill();
    for (let attempt = 0; attempt < 50 && server.exitCode === null && server.signalCode === null; attempt++) await delay(100);
    if (server.exitCode === null && server.signalCode === null) server.kill("SIGKILL");
  }
  await database?.end();
  if (fixtures) {
    try {
      const removed = await cleanupTestAuthFixtures();
      assert.ok(removed >= fixtures.users.length);
      console.log("Browser auth fixtures removed.");
    } catch (error) {
      reportDatabaseError(error);
      console.error("Browser auth fixture cleanup needs attention.");
    }
  }
}
