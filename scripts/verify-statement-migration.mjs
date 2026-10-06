import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createAuthFixtures } from "./auth-test-fixtures.mjs";
import { connectHostedDatabase, reportDatabaseError } from "./hosted-db.mjs";

const migration = await readFile(new URL("../supabase/migrations/20260930001000_statement_activity.sql", import.meta.url), "utf8");
let db;
let fixtures;
let stage = "migration";

try {
  db = await connectHostedDatabase("test");
  fixtures = await createAuthFixtures("test");
  await db.query("begin");
  await db.query(migration);
  const user = fixtures.users[0];
  await db.query("set local role authenticated");
  await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify(user.claims)]);
  await db.query("select public.sync_current_session()");
  await db.query("select public.save_current_registration_personal('Statement','','Tester','1990-01-01','+1 555 010 1000')");
  await db.query("select public.save_current_registration_address('100 Test Avenue','','Testville','CA','90001','US')");
  await db.query("select public.save_current_registration_employment('Synthetic tester','50000_74999')");
  await db.query("select public.complete_current_registration()");
  const verify = await db.query("select public.begin_current_synthetic_verification('SIM-VERIFIED-001') id");
  await db.query("select public.complete_current_synthetic_verification($1,'BANK-SYNTHETIC-ONLY')", [verify.rows[0].id]);
  const account = (await db.query("select public.open_current_account('checking','Statements') id")).rows[0].id;
  await db.query("select public.fund_current_account_synthetic($1,10000,$2)", [account, randomUUID()]);
  const customer = (await db.query("select id from public.customers where auth_user_id=$1", [user.id])).rows[0].id;

  stage = "snapshot";
  const first = randomUUID();
  await db.query("select public.begin_current_account_statement($1,$2,current_date-1,current_date,$3)", [first, account, `${customer}/${first}.pdf`]);
  const row = (await db.query("select opening_minor,closing_minor,version,ledger_cutoff from public.statements where id=$1", [first])).rows[0];
  assert.equal(row.opening_minor, "0");
  assert.equal(row.closing_minor, "10000");
  assert.equal(row.version, 1);
  const activity = (await db.query("select * from public.get_current_statement_activity($1)", [first])).rows;
  assert.equal(activity.length, 1);
  assert.equal(activity[0].direction, "credit");
  assert.equal(activity[0].amount_minor, "10000");

  stage = "ledger audit";
  await db.query("reset role");
  const movement = (await db.query("select coalesce(sum(case e.side when 'credit' then e.amount_minor else -e.amount_minor end),0)::bigint amount from private.ledger_entries e join private.ledger_journals j on j.id=e.journal_id join private.ledger_accounts la on la.id=e.ledger_account_id join public.statements s on s.id=$2 where la.account_id=$1 and j.effective_at>=s.period_start::timestamptz and j.effective_at<(s.period_end+1)::timestamptz and j.posted_at<=s.ledger_cutoff", [account, first])).rows[0].amount;
  assert.equal((BigInt(row.opening_minor) + BigInt(movement)).toString(), row.closing_minor);

  stage = "versioning";
  await db.query("set local role authenticated");
  const second = randomUUID();
  await db.query("select public.begin_current_account_statement($1,$2,current_date-1,current_date,$3)", [second, account, `${customer}/${second}.pdf`]);
  assert.equal((await db.query("select version from public.statements where id=$1", [second])).rows[0].version, 2);
  await db.query("rollback");
  console.log("Statement rehearsal passed: ledger cutoff, opening plus movements equals closing, and reruns version snapshots.");
} catch (error) {
  console.error(`Statement rehearsal stage: ${stage}`);
  if (error instanceof Error) console.error(error.message);
  reportDatabaseError(error);
} finally {
  await db?.query("rollback").catch(() => {});
  await fixtures?.cleanup().catch(() => {});
  await db?.end();
}
