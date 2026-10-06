import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createAuthFixtures } from "./auth-test-fixtures.mjs";
import { connectHostedDatabase, reportDatabaseError } from "./hosted-db.mjs";

const migration = await readFile(
  new URL("../supabase/migrations/20260929000200_session_expiration_enforcement.sql", import.meta.url),
  "utf8",
);
let client;
let fixtures;
try {
  client = await connectHostedDatabase("test");
  fixtures = await createAuthFixtures("test");
  const [user] = fixtures.users;
  await client.query("begin");
  await client.query(migration);
  await client.query("set local role authenticated");
  await client.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify(user.claims)]);
  const session = await client.query("select public.sync_current_session() as id");
  assert.ok(session.rows[0].id);
  await client.query("reset role");
  await client.query(
    "update public.app_sessions set idle_expires_at=now()-interval '1 second' where id=$1",
    [session.rows[0].id],
  );
  await client.query("set local role authenticated");
  await client.query("savepoint expired_denial");
  await assert.rejects(client.query("select public.sync_current_session()"));
  await client.query("rollback to savepoint expired_denial");
  await client.query("reset role");
  await client.query("rollback");
  console.log("Session expiration migration rehearsal passed and rolled back.");
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
