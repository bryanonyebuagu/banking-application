import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { createAuthFixtures } from "./auth-test-fixtures.mjs";
import { connectHostedDatabase, reportDatabaseError } from "./hosted-db.mjs";
import { cleanupTestAuthFixtures } from "./test-auth-fixture-cleanup.mjs";

const config = parseEnv(await readFile(new URL("../.env.test.local", import.meta.url), "utf8"));
const options = {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(20000) }) },
};
let client;
let fixtures;
let stage = "connect";
try {
  client = await connectHostedDatabase("test");
  await client.query("notify pgrst,'reload schema'");
  fixtures = await createAuthFixtures("test");
  const anon = createClient(config.NEXT_PUBLIC_SUPABASE_URL, config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, options);
  stage = "anonymous-command-denial";
  assert.ok((await anon.rpc("sync_current_session")).error);

  for (const user of fixtures.users) {
    const api = createClient(config.NEXT_PUBLIC_SUPABASE_URL, config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
      ...options,
      global: { ...options.global, headers: { Authorization: `Bearer ${user.accessToken}` } },
    });
    user.api = api;
    stage = "authenticated-session-sync";
    const synced = await api.rpc("sync_current_session");
    assert.equal(synced.error, null);
    assert.match(synced.data, /^[0-9a-f-]{36}$/);
    stage = "authenticated-login-audit";
    assert.equal((await api.rpc("record_current_login_event", { p_event_type: "login" })).error, null);
    stage = "direct-session-write-denial";
    assert.ok((await api.from("app_sessions").insert({
      auth_user_id: user.id,
      provider_session_id: crypto.randomUUID(),
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      idle_expires_at: new Date(Date.now() + 1800000).toISOString(),
    })).error);
  }

  const [revoked] = fixtures.users;
  stage = "session-revoke-command";
  assert.equal((await revoked.api.rpc("record_current_login_event", { p_event_type: "logout" })).error, null);
  assert.equal((await revoked.api.rpc("revoke_current_session")).data, true);
  stage = "revoked-session-resync-denial";
  assert.ok((await revoked.api.rpc("sync_current_session")).error);
  console.log("Auth session API tests passed on test: anonymous/direct-write denial, sync, audit, revoke and revoked-session denial.");
} catch (error) {
  console.error(`Verification stage: ${stage}`);
  reportDatabaseError(error);
} finally {
  if (client && fixtures) {
    try {
      const removed = await cleanupTestAuthFixtures();
      assert.equal(removed, fixtures.users.length);
      console.log("Synthetic auth-session rows and provider users removed.");
    } catch (error) {
      reportDatabaseError(error);
      console.error("Fixture cleanup needs attention.");
    }
  }
  await client?.end();
}
