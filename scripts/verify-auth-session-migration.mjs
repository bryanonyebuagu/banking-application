import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createAuthFixtures } from "./auth-test-fixtures.mjs";
import { connectHostedDatabase, reportDatabaseError } from "./hosted-db.mjs";

const migration = await readFile(
  new URL("../supabase/migrations/20260929000100_auth_session_commands.sql", import.meta.url),
  "utf8",
);
let client;
let fixtures;
try {
  client = await connectHostedDatabase("test");
  assert.equal((await client.query("select to_regprocedure('public.sync_current_session()') as command")).rows[0].command, null);
  fixtures = await createAuthFixtures("test");
  const [user] = fixtures.users;
  await client.query("begin");
  await client.query(migration);

  await client.query("savepoint anonymous_denial");
  await client.query("set local role anon");
  await assert.rejects(client.query("select public.sync_current_session()"));
  await client.query("rollback to savepoint anonymous_denial");
  await client.query("reset role");

  await client.query("set local role authenticated");
  await client.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify(user.claims)]);
  const session = await client.query("select public.sync_current_session() as id");
  assert.ok(session.rows[0].id);
  assert.ok((await client.query("select public.record_current_login_event('login') as id")).rows[0].id);
  assert.ok((await client.query("select public.record_current_security_event('session_revoked') as id")).rows[0].id);
  assert.equal((await client.query("select public.revoke_current_session() as revoked")).rows[0].revoked, true);

  await client.query("savepoint revoked_denial");
  await assert.rejects(client.query("select public.sync_current_session()"));
  await client.query("rollback to savepoint revoked_denial");
  await client.query("reset role");
  assert.equal((await client.query(
    "select count(*)::int as count from public.app_sessions where auth_user_id=$1 and revoked_at is not null",
    [user.id],
  )).rows[0].count, 1);
  assert.equal((await client.query(
    "select count(*)::int as count from public.login_events where auth_user_id=$1",
    [user.id],
  )).rows[0].count, 1);
  assert.equal((await client.query(
    "select count(*)::int as count from public.security_events where auth_user_id=$1",
    [user.id],
  )).rows[0].count, 1);

  await client.query("rollback");
  assert.equal((await client.query("select to_regprocedure('public.sync_current_session()') as command")).rows[0].command, null);
  console.log("Auth session migration rehearsal passed and rolled back.");
} catch (error) {
  reportDatabaseError(error);
} finally {
  await client?.query("rollback").catch(() => {});
  if (fixtures) {
    try {
      await fixtures.cleanup();
      console.log("Synthetic provider users removed.");
    } catch (error) {
      reportDatabaseError(error);
      console.error("Auth fixture cleanup needs attention.");
    }
  }
  await client?.end();
}
