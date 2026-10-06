import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { createAuthFixtures } from "./auth-test-fixtures.mjs";
import { cleanupTestAuthFixtures } from "./test-auth-fixture-cleanup.mjs";
import { reportDatabaseError } from "./hosted-db.mjs";

const config = parseEnv(await readFile(new URL("../.env.test.local", import.meta.url), "utf8"));
let fixtures;
let stage = "setup";

async function register(client, label) {
  await client.rpc("sync_current_session");
  await client.rpc("save_current_registration_personal", { p_first_name: "Synthetic", p_middle_name: "", p_last_name: label, p_date_of_birth: "1990-01-01", p_phone: "+1 555 010 1000" });
  await client.rpc("save_current_registration_address", { p_line1: "100 Test Avenue", p_line2: "", p_city: "Testville", p_state: "CA", p_postal_code: "90001", p_country: "US" });
  await client.rpc("save_current_registration_employment", { p_employment: "Synthetic tester", p_income_range: "50000_74999" });
  await client.rpc("complete_current_registration");
  const pending = await client.rpc("begin_current_synthetic_verification", { p_fixture_id: "SIM-VERIFIED-001" });
  await client.rpc("complete_current_synthetic_verification", { p_record_id: pending.data, p_test_answer: "BANK-SYNTHETIC-ONLY" });
}

try {
  fixtures = await createAuthFixtures("test");
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const clients = fixtures.users.map((user) => createClient(config.NEXT_PUBLIC_SUPABASE_URL, config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { ...options, global: { headers: { Authorization: "Bearer " + user.accessToken } } }));
  const anon = createClient(config.NEXT_PUBLIC_SUPABASE_URL, config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, options);
  await register(clients[0], "StatementOwner");
  await register(clients[1], "StatementOther");
  const account = (await clients[0].rpc("open_current_account", { p_account_type: "checking", p_nickname: "Statements" })).data;
  await clients[0].rpc("fund_current_account_synthetic", { p_account_id: account, p_amount_minor: 10000, p_idempotency_key: randomUUID() });
  const customer = (await clients[0].from("customers").select("id").single()).data;
  const today = new Date();
  const end = today.toISOString().slice(0, 10);
  today.setUTCDate(today.getUTCDate() - 1);
  const start = today.toISOString().slice(0, 10);
  const id = randomUUID();
  const objectKey = customer.id + "/" + id + ".pdf";
  const pdf = new TextEncoder().encode("%PDF-1.4\n1 0 obj <<>> endobj\ntrailer <<>>\n%%EOF\n");

  stage = "begin";
  assert.equal((await clients[0].rpc("begin_current_account_statement", { p_statement_id: id, p_account_id: account, p_period_start: start, p_period_end: end, p_object_key: objectKey })).error, null);
  const activity = (await clients[0].rpc("get_current_statement_activity", { p_statement_id: id })).data;
  assert.equal(activity.length, 1);
  assert.deepEqual({ direction: activity[0].direction, amount_minor: activity[0].amount_minor }, { direction: "credit", amount_minor: 10000 });
  assert.deepEqual((await clients[1].rpc("get_current_statement_activity", { p_statement_id: id })).data, []);
  assert.ok((await anon.storage.from("bank-statements").upload("forbidden/" + id + ".pdf", pdf, { contentType: "application/pdf" })).error);
  assert.ok((await clients[1].storage.from("bank-statements").upload(objectKey, pdf, { contentType: "application/pdf" })).error);

  stage = "finalize";
  assert.equal((await clients[0].storage.from("bank-statements").upload(objectKey, pdf, { contentType: "application/pdf" })).error, null);
  assert.ok((await clients[1].rpc("finalize_current_statement", { p_statement_id: id })).error);
  assert.equal((await clients[0].rpc("finalize_current_statement", { p_statement_id: id })).error, null);

  stage = "owner read";
  assert.equal((await clients[0].storage.from("bank-statements").download(objectKey)).error, null);
  stage = "cross-owner isolation";
  assert.ok((await clients[1].storage.from("bank-statements").download(objectKey)).error);
  assert.deepEqual((await clients[1].from("statements").select("id")).data, []);
  stage = "snapshot";
  const snapshot = (await clients[0].from("statements").select("opening_minor,closing_minor,version,status").eq("id", id).single()).data;
  assert.deepEqual(snapshot, { opening_minor: 0, closing_minor: 10000, version: 1, status: "ready" });
  stage = "ready delete denial";
  await clients[0].storage.from("bank-statements").remove([objectKey]);
  assert.equal((await clients[0].storage.from("bank-statements").download(objectKey)).error, null);
  console.log("Statement API tests passed: owner-bound upload/read, anonymous and cross-owner denial, immutable balance snapshot and ready-file delete denial.");
} catch (error) {
  console.error("Statement API stage: " + stage);
  reportDatabaseError(error);
} finally {
  if (fixtures) {
    try {
      await cleanupTestAuthFixtures();
      console.log("Statement API fixtures removed.");
    } catch (error) {
      reportDatabaseError(error);
    }
  }
}
