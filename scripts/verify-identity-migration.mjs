import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { connectHostedDatabase, reportDatabaseError } from "./hosted-db.mjs";
import { createAuthFixtures } from "./auth-test-fixtures.mjs";

// Transactional rehearsal on the explicitly selected empty development DB.
// Roll back all DDL and fixtures even on success; never reset the hosted DB.
let client;
let fixtures;
let step = "connect";
try {
  if (process.argv.includes("--with-auth")) {
    step = "provider-fixtures";
    fixtures = await createAuthFixtures();
  }
  client = await connectHostedDatabase();
  await client.query("begin");
  await client.query("set local statement_timeout = '20s'");
  await client.query("select pg_advisory_xact_lock(9282026, 2)");
  step = "empty-target-guard";
  const existing = await client.query("select count(*)::int as count from pg_tables where schemaname in ('public','private')");
  assert.equal(existing.rows[0].count, 0);
  step = "identity-migration";
  await client.query(await readFile(new URL("../supabase/migrations/20260928000100_identity_access.sql", import.meta.url), "utf8"));
  step = "rls-and-grants";
  const tables = await client.query("select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private') and c.relkind='r'");
  assert.equal(tables.rowCount, 10);
  assert.ok(tables.rows.every((row) => row.relrowsecurity));
  for (const role of ["anon", "authenticated", "service_role"]) {
    for (const table of ["public.profiles", "public.customers", "public.addresses", "public.devices", "public.app_sessions", "private.staff_roles", "private.staff_permissions", "private.staff_assignments", "private.audit_logs"]) {
      const grants = await client.query("select has_table_privilege($1,$2,'INSERT,UPDATE,DELETE,TRUNCATE') as writable", [role, table]);
      assert.equal(grants.rows[0].writable, false);
    }
  }
  step = "function-owner";
  const helper = await client.query("select p.prosecdef, r.rolname, r.rolcanlogin, r.rolbypassrls, p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_roles r on r.oid=p.proowner where n.nspname='private' and p.proname='session_is_active'");
  assert.equal(helper.rows[0].rolname, "bank_policy_reader");
  assert.equal(helper.rows[0].rolcanlogin, false);
  assert.equal(helper.rows[0].rolbypassrls, false);
  assert.equal(helper.rows[0].prosecdef, true);
  assert.ok(helper.rows[0].proconfig.some((item) => item.startsWith("search_path=")));
  step = "anonymous-denial";
  await client.query("savepoint denied");
  await client.query("set local role anon");
  let denied = false;
  try { await client.query("select * from public.customers"); }
  catch (error) { assert.equal(error.code, "42501"); denied = true; }
  assert.ok(denied);
  await client.query("rollback to savepoint denied");
  step = "unregistered-session-denial";
  await client.query("set local role authenticated");
  await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: "00000000-0000-4000-8000-000000000001", session_id: "00000000-0000-4000-8000-000000000002", user_metadata: { role: "administrator" } })]);
  assert.equal((await client.query("select private.session_is_active() as active")).rows[0].active, false);
  assert.equal((await client.query("select * from public.customers")).rowCount, 0);
  await client.query("reset role");
  step = "audit-immutability";
  await client.query("savepoint audit_test");
  denied = false;
  try { await client.query("truncate private.audit_logs"); }
  catch (error) { assert.equal(error.code, "42501"); denied = true; }
  assert.ok(denied);
  await client.query("rollback to savepoint audit_test");
  if (fixtures) {
    step = "provider-backed-fixtures";
    for (const user of fixtures.users) {
      const profile = await client.query("insert into public.profiles(auth_user_id,display_name) values ($1,'Synthetic Test') returning id", [user.id]);
      user.profileId = profile.rows[0].id;
      const customer = await client.query("insert into public.customers(auth_user_id,profile_id,first_name,last_name,contact_email) values ($1,$2,'Synthetic','Test',$3) returning id", [user.id, user.profileId, user.email]);
      user.customerId = customer.rows[0].id;
      await client.query("insert into public.app_sessions(auth_user_id,provider_session_id,expires_at,idle_expires_at) values ($1,$2,now()+interval '1 hour',now()+interval '30 minutes')", [user.id,user.sessionId]);
      await client.query("insert into public.addresses(customer_id,line1,city,postal_code,country,type,is_primary) values ($1,'1 Test Street','Test City','00000','US','home',true)", [user.customerId]);
    }
    for (const user of fixtures.users) {
      step = "owner-and-cross-customer-reads";
      await client.query("set local role authenticated");
      await client.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify(user.claims)]);
      assert.equal((await client.query("select private.session_is_active() as active")).rows[0].active,true);
      const customers = await client.query("select id from public.customers");
      assert.deepEqual(customers.rows.map((row) => row.id), [user.customerId]);
      assert.equal((await client.query("select * from public.profiles")).rowCount,1);
      assert.equal((await client.query("select * from public.addresses")).rowCount,1);
      assert.equal((await client.query("select id from public.app_sessions")).rowCount,1);
      const other = fixtures.users.find((candidate) => candidate.id !== user.id);
      assert.equal((await client.query("select * from public.customers where id=$1",[other.customerId])).rowCount,0);
      await client.query("reset role");
    }
    step = "revoked-session-denial";
    const [user, other] = fixtures.users;
    await client.query("update public.app_sessions set revoked_at=now() where provider_session_id=$1",[user.sessionId]);
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify(user.claims)]);
    assert.equal((await client.query("select private.session_is_active() as active")).rows[0].active,false);
    for (const table of ["profiles","customers","addresses"]) assert.equal((await client.query(`select * from public.${table}`)).rowCount,0);
    await client.query("reset role");
    step = "expired-session-denial";
    await client.query("update public.app_sessions set idle_expires_at=now()-interval '1 second' where provider_session_id=$1",[other.sessionId]);
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify(other.claims)]);
    assert.equal((await client.query("select private.session_is_active() as active")).rows[0].active,false);
    await client.query("reset role");
    step = "cross-owner-foreign-key";
    await client.query("savepoint owner_constraint");
    let rejected = false;
    try { await client.query("update public.customers set profile_id=$1 where id=$2",[other.profileId,user.customerId]); }
    catch (error) { assert.ok(["23503","23505"].includes(error.code)); rejected=true; }
    assert.ok(rejected);
    await client.query("rollback to savepoint owner_constraint");
  }
  await client.query("rollback");
  step = "rollback-verification";
  const after = await client.query("select count(*)::int as count from pg_tables where schemaname in ('public','private')");
  assert.equal(after.rows[0].count, 0);
  console.log("Identity rehearsal passed: 10 RLS tables, direct-write denials, restricted helper, anonymous/session denial, immutable audit; changes rolled back.");
  console.log(fixtures ? "Provider-backed A/B isolation, revoked/expired sessions and owner constraints passed." : "Run with --with-auth for provider-backed authorization tests.");
} catch (error) {
  console.error(`Verification stage: ${step}`);
  if (error.code === "42501" && /^permission denied for (schema|table|function) [a-z_]+$/.test(error.message)) console.error(error.message);
  reportDatabaseError(error);
} finally {
  if (client) { await client.query("rollback").catch(() => {}); await client.end(); }
  if (fixtures) {
    try { await fixtures.cleanup(); console.log("Synthetic Auth fixtures removed."); }
    catch (error) { reportDatabaseError(error); console.error("Auth cleanup needs attention; IDs are recorded in ignored work/auth-fixtures files."); }
  }
}
