import { randomBytes, randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

// Dedicated development/test projects only. Never export the privileged client to app code.
const targets = {
  development: {
    projectUrl: "https://hqormbkdnbdvcxfusozf.supabase.co",
    secretFile: "../.env.supabase-secret",
  },
  test: {
    projectUrl: "https://icdaoukkzpiwspirqver.supabase.co",
    secretFile: "../.env.test-supabase-secret",
  },
};

export async function createAuthFixtures(target = "development") {
  const configuration = targets[target];
  if (!configuration) throw new Error("UNKNOWN_AUTH_FIXTURE_TARGET");
  const { projectUrl } = configuration;
  const runId = randomUUID();
  const receipt = new URL(`../work/auth-fixtures-${target}-${runId}.json`, import.meta.url);
  const key = (await readFile(new URL(configuration.secretFile, import.meta.url), "utf8")).trim();
  if (!key.startsWith("sb_secret_")) throw new Error("SUPABASE_SECRET_NOT_CONFIGURED");
  const options = {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(20000) }) },
  };
  const admin = createClient(projectUrl, key, options);
  const users = [];
  async function saveReceipt() {
    await mkdir(new URL("../work/", import.meta.url), { recursive: true });
    await writeFile(receipt, JSON.stringify({ target, projectUrl, runId, userIds: users.map((user) => user.id) }));
  }
  async function cleanup() {
    let failed = false;
    for (const user of [...users]) {
      const { error } = await admin.auth.admin.deleteUser(user.id);
      if (error) { failed = true; continue; }
      users.splice(users.indexOf(user), 1);
      await saveReceipt();
    }
    if (failed) throw new Error("AUTH_FIXTURE_CLEANUP_FAILED");
  }
  try {
    for (const label of ["a", "b"]) {
      const email = `banking-test-${runId}-${label}@example.invalid`;
      const password = `${randomBytes(32).toString("base64url")}aA1!`;
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { synthetic_test_run: runId } });
      if (created.error || !created.data.user) throw new Error("AUTH_FIXTURE_CREATE_FAILED");
      // Password stays in process memory for browser/API tests and is never written to the receipt.
      const fixture = { id: created.data.user.id, email, password };
      users.push(fixture);
      await saveReceipt();
      const authClient = createClient(projectUrl, key, options);
      const signed = await authClient.auth.signInWithPassword({ email, password });
      if (signed.error || !signed.data.session) throw new Error("AUTH_FIXTURE_SIGNIN_FAILED");
      // Test fixture claims come directly from this provider sign-in, not user input.
      fixture.claims = JSON.parse(Buffer.from(signed.data.session.access_token.split(".")[1], "base64url").toString("utf8"));
      fixture.accessToken = signed.data.session.access_token;
      fixture.sessionId = fixture.claims.session_id;
      if (!fixture.sessionId || fixture.claims.sub !== fixture.id) throw new Error("AUTH_FIXTURE_INVALID_SESSION");
    }
    return { users, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
