import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createAuthFixtures } from "./auth-test-fixtures.mjs";
import { connectHostedDatabase, reportDatabaseError } from "./hosted-db.mjs";

const migration = await readFile(
  new URL("../supabase/migrations/20260929000300_registration_verification_commands.sql", import.meta.url),
  "utf8",
);
let database;
let fixtures;
try {
  database = await connectHostedDatabase("test");
  fixtures = await createAuthFixtures("test");
  await database.query("begin");
  await database.query(migration);

  await database.query("set local role anon");
  await database.query("savepoint anonymous_denial");
  await assert.rejects(database.query("select public.complete_current_registration()"));
  await database.query("rollback to savepoint anonymous_denial");
  await database.query("reset role");

  for (const [index, user] of fixtures.users.entries()) {
    await database.query("set local role authenticated");
    await database.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify(user.claims)]);
    await database.query("select public.sync_current_session()");
    await database.query("savepoint direct_write_denial");
    await assert.rejects(database.query("insert into public.registration_drafts(auth_user_id) values(auth.uid())"));
    await database.query("rollback to savepoint direct_write_denial");
    await database.query("select public.save_current_registration_personal($1,$2,$3,$4,$5)", ["Synthetic", null, `User${index}`, "1990-01-01", "+1 555 010 1000"]);
    await database.query("select public.save_current_registration_address($1,$2,$3,$4,$5,$6)", ["100 Test Avenue", null, "Testville", "CA", "90001", "US"]);
    await database.query("select public.save_current_registration_employment($1,$2)", ["Synthetic tester", "50000_74999"]);
    const completed = await database.query("select public.complete_current_registration() as id");
    assert.ok(completed.rows[0].id);
    const fixtureId = index === 0 ? "SIM-VERIFIED-001" : "SIM-FAILED-001";
    const verification = await database.query("select public.begin_current_synthetic_verification($1) as id", [fixtureId]);
    const result = await database.query("select public.complete_current_synthetic_verification($1,$2) as status", [verification.rows[0].id, "BANK-SYNTHETIC-ONLY"]);
    assert.equal(result.rows[0].status, index === 0 ? "verified" : "failed");
    const own = await database.query("select verification_status from public.customers");
    assert.deepEqual(own.rows.map((row) => row.verification_status), [result.rows[0].status]);
    await database.query("reset role");
  }

  await database.query("rollback");
  assert.equal((await database.query("select to_regclass('public.registration_drafts') as table_name")).rows[0].table_name, null);
  console.log("Registration and verification migration rehearsal passed and rolled back.");
} catch (error) {
  reportDatabaseError(error);
} finally {
  await database?.query("rollback").catch(() => {});
  if (fixtures) {
    try {
      await fixtures.cleanup();
      console.log("Synthetic provider users removed.");
    } catch (error) {
      reportDatabaseError(error);
      console.error("Registration fixture cleanup needs attention.");
    }
  }
  await database?.end();
}
