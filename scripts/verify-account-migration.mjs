import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createAuthFixtures } from "./auth-test-fixtures.mjs";
import { connectHostedDatabase,reportDatabaseError } from "./hosted-db.mjs";
const migration=await readFile(new URL("../supabase/migrations/20260929000400_account_commands.sql",import.meta.url),"utf8");
let database,fixtures;
async function register(user,index){
  await database.query("set local role authenticated");await database.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify(user.claims)]);await database.query("select public.sync_current_session()");
  await database.query("select public.save_current_registration_personal($1,$2,$3,$4,$5)",["Synthetic",null,`Account${index}`,"1990-01-01","+1 555 010 1000"]);
  await database.query("select public.save_current_registration_address($1,$2,$3,$4,$5,$6)",["100 Test Avenue",null,"Testville","CA","90001","US"]);
  await database.query("select public.save_current_registration_employment($1,$2)",["Synthetic tester","50000_74999"]);await database.query("select public.complete_current_registration()");
  const pending=await database.query("select public.begin_current_synthetic_verification($1) id",["SIM-VERIFIED-001"]);await database.query("select public.complete_current_synthetic_verification($1,$2)",[pending.rows[0].id,"BANK-SYNTHETIC-ONLY"]);
}
try{database=await connectHostedDatabase("test");fixtures=await createAuthFixtures("test");await database.query("begin");await database.query(migration);
  await database.query("set local role anon");await database.query("savepoint anonymous_denial");await assert.rejects(database.query("select public.open_current_account('checking','Denied')"));await database.query("rollback to savepoint anonymous_denial");await database.query("reset role");
  await register(fixtures.users[0],0);await database.query("savepoint direct");await assert.rejects(database.query("insert into public.accounts(customer_id,account_type,nickname,synthetic_identifier,masked_account_number) select id,'checking','Direct','SIM-DIRECT1234','****1234' from public.customers"));await database.query("rollback to savepoint direct");
  const opened=await database.query("select public.open_current_account('checking','Everyday') id");const id=opened.rows[0].id;assert.ok(id);assert.deepEqual((await database.query("select nickname,status from public.accounts")).rows,[{nickname:"Everyday",status:"active"}]);
  await database.query("select public.rename_current_account($1,'Daily spending')",[id]);assert.equal((await database.query("select nickname from public.accounts where id=$1",[id])).rows[0].nickname,"Daily spending");await database.query("reset role");
  assert.deepEqual((await database.query("select ab.net_debit_minor::int balance,ab.version::int version from private.account_balances ab join private.ledger_accounts la on la.id=ab.ledger_account_id where la.account_id=$1",[id])).rows,[{balance:0,version:0}]);
  await register(fixtures.users[1],1);assert.deepEqual((await database.query("select id from public.accounts")).rows,[]);await database.query("savepoint foreign_rename");await assert.rejects(database.query("select public.rename_current_account($1,'Stolen')",[id]));await database.query("rollback to savepoint foreign_rename");
  await database.query("rollback");assert.equal((await database.query("select to_regprocedure('public.open_current_account(text,text)') exists")).rows[0].exists,null);console.log("Account command migration rehearsal passed and rolled back.");
}catch(error){reportDatabaseError(error)}finally{await database?.query("rollback").catch(()=>{});await fixtures?.cleanup().catch(()=>{});await database?.end()}
