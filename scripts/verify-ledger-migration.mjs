import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createAuthFixtures } from "./auth-test-fixtures.mjs";
import { connectHostedDatabase,reportDatabaseError } from "./hosted-db.mjs";
let db,fixtures;
let step="connect";
try {
  db=await connectHostedDatabase();
  fixtures=await createAuthFixtures();
  await db.query("begin");
  await db.query("select pg_advisory_xact_lock(9282026,2)");
  step="migration";
  await db.query(await readFile(new URL("../supabase/migrations/20260928000200_ledger_schema.sql",import.meta.url),"utf8"));
  const accounts=await db.query("insert into private.ledger_accounts(class,normal_side,currency,system_code) values('asset','debit','USD','test_asset'),('liability','credit','USD','test_liability') returning id");
  const [debit,credit]=accounts.rows.map(row=>row.id);
  async function journal() {
    return (await db.query("insert into private.ledger_journals(operation_id,currency,effective_at,actor_id,correlation_id) values($1,'USD',now(),$2,$3) returning id",[randomUUID(),fixtures.users[0].id,randomUUID()])).rows[0].id;
  }
  async function entries(id,amount=100) {
    await db.query("insert into private.ledger_entries(journal_id,ledger_account_id,side,amount_minor,currency) values($1,$2,'debit',100,'USD'),($1,$3,'credit',$4,'USD')",[id,debit,credit,amount]);
  }
  async function rejected(label,expected,action) {
    step=label;
    await db.query("savepoint negative_case");
    let errorCode;
    try {await action();await db.query("set constraints all immediate");}
    catch(error) {errorCode=error.code;}
    await db.query("rollback to savepoint negative_case");
    assert.equal(errorCode,expected);
  }
  step="balanced-journal";
  const valid=await journal();await entries(valid);
  await db.query("set constraints all immediate");
  await db.query("set constraints all deferred");
  await rejected("unbalanced-journal","23514",async()=>entries(await journal(),99));
  await rejected("empty-journal","23514",async()=>{await journal();});
  await rejected("negative-entry","23514",async()=>entries(await journal(),-100));
  await rejected("mixed-currency","23503",async()=>{
    await db.query("insert into private.supported_currencies values('EUR',2)");
    await db.query("insert into private.ledger_entries(journal_id,ledger_account_id,side,amount_minor,currency) values($1,$2,'credit',100,'EUR')",[valid,credit]);
  });
  await rejected("immutable-entry","42501",()=>db.query("update private.ledger_entries set amount_minor=200 where journal_id=$1",[valid]));
  await rejected("immutable-journal","42501",()=>db.query("delete from private.ledger_journals where id=$1",[valid]));
  await rejected("late-entry","23514",async()=>{
    const old=(await db.query("insert into private.ledger_journals(operation_id,currency,effective_at,actor_id,correlation_id,creation_xid) values($1,'USD',now(),$2,$3,'0') returning id",[randomUUID(),fixtures.users[0].id,randomUUID()])).rows[0].id;
    await entries(old);
  });
  step="private-ledger-write-denial";
  for(const role of ["anon","authenticated","service_role"]) {
    for(const table of ["ledger_accounts","ledger_journals","ledger_entries","account_balances","balance_holds"]) {
      assert.equal((await db.query("select has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') as allowed",[role,`private.${table}`])).rows[0].allowed,false);
    }
  }
  await db.query("rollback");
  assert.equal((await db.query("select to_regclass('private.ledger_journals') as journal")).rows[0].journal,null);
  console.log("Ledger rehearsal passed: balanced journals, unbalanced/empty/negative/mixed-currency rejection, immutable history, late-entry rejection and private grants. All changes rolled back.");
}catch(error){console.error(`Verification stage: ${step}`);reportDatabaseError(error);}
finally{
  if(db){await db.query("rollback").catch(()=>{});await db.end();}
  if(fixtures){try{await fixtures.cleanup();console.log("Synthetic provider users removed.");}catch(error){reportDatabaseError(error);}}
}
