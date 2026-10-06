import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { createAuthFixtures } from "./auth-test-fixtures.mjs";
import { cleanupTestAuthFixtures } from "./test-auth-fixture-cleanup.mjs";
import { reportDatabaseError } from "./hosted-db.mjs";

const config = parseEnv(await readFile(new URL("../.env.test.local", import.meta.url), "utf8"));
const options = { auth: { persistSession: false, autoRefreshToken: false } };
let fixtures;
try {
  fixtures = await createAuthFixtures("test");
  const anon = createClient(config.NEXT_PUBLIC_SUPABASE_URL, config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, options);
  assert.ok((await anon.rpc("save_current_registration_personal", {
    p_first_name: "Anonymous", p_middle_name: null, p_last_name: "Denied", p_date_of_birth: "1990-01-01", p_phone: "+1 555 010 1000",
  })).error);

  const clients = fixtures.users.map((user) => createClient(
    config.NEXT_PUBLIC_SUPABASE_URL,
    config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { ...options, global: { headers: { Authorization: `Bearer ${user.accessToken}` } } },
  ));
  for (const client of clients) assert.equal((await client.rpc("sync_current_session")).error, null);
  const [owner, other] = clients;
  assert.ok((await owner.from("registration_drafts").insert({ auth_user_id: fixtures.users[0].id })).error);
  assert.equal((await owner.rpc("save_current_registration_personal", {
    p_first_name: "Synthetic", p_middle_name: "API", p_last_name: "Registrant", p_date_of_birth: "1990-01-01", p_phone: "+1 555 010 1000",
  })).error, null);
  assert.equal((await owner.rpc("save_current_registration_address", {
    p_line1: "100 Test Avenue", p_line2: null, p_city: "Testville", p_state: "CA", p_postal_code: "90001", p_country: "US",
  })).error, null);
  assert.equal((await owner.rpc("save_current_registration_employment", {
    p_employment: "Synthetic tester", p_income_range: "50000_74999",
  })).error, null);
  const ownerDraft = await owner.from("registration_drafts").select("current_step");
  assert.equal(ownerDraft.data?.[0]?.current_step, "review");
  assert.deepEqual((await other.from("registration_drafts").select("id")).data, []);
  const completed = await owner.rpc("complete_current_registration");
  assert.equal(completed.error, null);
  assert.ok(completed.data);
  assert.ok((await owner.from("customers").update({ verification_status: "verified" }).eq("id", completed.data)).error);
  const pending = await owner.rpc("begin_current_synthetic_verification", { p_fixture_id: "SIM-VERIFIED-001" });
  assert.equal(pending.error, null);
  assert.equal((await owner.from("customers").select("verification_status").single()).data?.verification_status, "pending");
  const verified = await owner.rpc("complete_current_synthetic_verification", {
    p_record_id: pending.data,
    p_test_answer: "BANK-SYNTHETIC-ONLY",
  });
  assert.equal(verified.error, null);
  assert.equal(verified.data, "verified");
  assert.equal((await owner.from("customers").select("verification_status").single()).data?.verification_status, "verified");
  assert.deepEqual((await other.from("customers").select("id")).data, []);

  assert.equal((await other.rpc("save_current_registration_personal", {
    p_first_name: "Synthetic", p_middle_name: "", p_last_name: "Review", p_date_of_birth: "1991-02-02", p_phone: "+1 555 010 2000",
  })).error, null);
  assert.equal((await other.rpc("save_current_registration_address", {
    p_line1: "200 Test Avenue", p_line2: "", p_city: "Testville", p_state: "CA", p_postal_code: "90002", p_country: "US",
  })).error, null);
  assert.equal((await other.rpc("save_current_registration_employment", { p_employment: "Synthetic reviewer", p_income_range: "25000_49999" })).error, null);
  assert.equal((await other.rpc("complete_current_registration")).error, null);
  const reviewPending = await other.rpc("begin_current_synthetic_verification", { p_fixture_id: "SIM-REVIEW-001" });
  assert.equal(reviewPending.error, null);
  assert.equal((await other.from("customers").select("verification_status").single()).data?.verification_status, "pending");
  const review = await other.rpc("complete_current_synthetic_verification", { p_record_id: reviewPending.data, p_test_answer: "BANK-SYNTHETIC-ONLY" });
  assert.equal(review.data, "manual_review");
  assert.equal((await other.from("customers").select("verification_status").single()).data?.verification_status, "manual_review");
  console.log("Registration API tests passed: anonymous/direct-write denial, persisted resume, isolation, completion and synthetic verification.");
} catch (error) {
  reportDatabaseError(error);
} finally {
  if (fixtures) {
    try {
      const removed = await cleanupTestAuthFixtures();
      assert.ok(removed >= fixtures.users.length);
      console.log("Registration API fixtures removed.");
    } catch (error) {
      reportDatabaseError(error);
      console.error("Registration API fixture cleanup needs attention.");
    }
  }
}
