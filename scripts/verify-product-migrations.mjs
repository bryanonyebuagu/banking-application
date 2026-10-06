import assert from "node:assert/strict";
import { readFile,readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createAuthFixtures } from "./auth-test-fixtures.mjs";
import { connectHostedDatabase,reportDatabaseError } from "./hosted-db.mjs";
let db,fixtures;let step="connect";
try{
 db=await connectHostedDatabase();fixtures=await createAuthFixtures();
 await db.query("begin");await db.query("select pg_advisory_xact_lock(9282026,2)");
 const dir=new URL("../supabase/migrations/",import.meta.url);
 for(const file of (await readdir(dir)).filter(name=>/^20260928000[3-6]00_.*\.sql$/.test(name)).sort()) {
  step=file;await db.query(await readFile(new URL(file,dir),"utf8"));
 }
 step="rls-and-default-denial";
 const tables=(await db.query("select n.nspname,c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private') and c.relkind='r'")).rows;
 assert.equal(tables.length,51);assert.ok(tables.every(table=>table.relrowsecurity));
 for(const role of ["anon","authenticated","service_role"])for(const table of tables){
  assert.equal((await db.query("select has_table_privilege($1,$2,'INSERT,UPDATE,DELETE,TRUNCATE') as writable",[role,`${table.nspname}.${table.relname}`])).rows[0].writable,false);
 }
 step="test-customers";
 for(const user of fixtures.users){
  user.profileId=(await db.query("insert into public.profiles(auth_user_id) values($1) returning id",[user.id])).rows[0].id;
  user.customerId=(await db.query("insert into public.customers(auth_user_id,profile_id,first_name,last_name,contact_email) values($1,$2,'Test','User',$3) returning id",[user.id,user.profileId,user.email])).rows[0].id;
  await db.query("insert into public.app_sessions(auth_user_id,provider_session_id,expires_at,idle_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '30 minutes')",[user.id,user.sessionId]);
  user.accountId=(await db.query("insert into public.accounts(customer_id,account_type,nickname,synthetic_identifier,masked_account_number) values($1,'checking','Test',$2,'****0001') returning id",[user.customerId,`SIM-${randomUUID().toUpperCase()}`])).rows[0].id;
  user.payeeId=(await db.query("insert into public.payees(customer_id,name,synthetic_reference) values($1,'Test payee','SIM-TEST') returning id",[user.customerId])).rows[0].id;
  user.paymentId=(await db.query("insert into public.payments(customer_id,account_id,payee_id,amount_minor,currency,status) values($1,$2,$3,100,'USD','scheduled') returning id",[user.customerId,user.accountId,user.payeeId])).rows[0].id;
  user.ticketId=(await db.query("insert into public.support_tickets(customer_id,subject,status) values($1,'Test ticket','open') returning id",[user.customerId])).rows[0].id;
  await db.query("insert into public.support_messages(customer_id,ticket_id,author_id,body,visibility) values($1,$2,$3,'Customer-safe test','customer'),($1,$2,$3,'Internal test','internal')",[user.customerId,user.ticketId,user.id]);
  await db.query("insert into public.customer_documents(customer_id,kind,object_key,mime_type,size_bytes,status) values($1,'generated',$2,'application/pdf',100,'ready')",[user.customerId,`${user.customerId}/test.pdf`]);
 }
 for(const user of fixtures.users){
  step="product-owner-isolation";await db.query("set local role authenticated");
  await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify(user.claims)]);
  for(const table of ["accounts","payees","payments","support_tickets","customer_documents"]){
   const result=await db.query(`select customer_id from public.${table}`);assert.deepEqual(result.rows,[{customer_id:user.customerId}]);
  }
  assert.deepEqual((await db.query("select visibility from public.support_messages")).rows,[{visibility:"customer"}]);
  await db.query("reset role");
 }
 const [a,b]=fixtures.users;
 async function reject(label,action,code){step=label;await db.query("savepoint invalid_input");let actual;try{await action();}catch(error){actual=error.code;}await db.query("rollback to savepoint invalid_input");assert.equal(actual,code);}
 await reject("cross-owner-payment",()=>db.query("insert into public.payments(customer_id,account_id,payee_id,amount_minor,currency,status) values($1,$2,$3,100,'USD','scheduled')",[a.customerId,a.accountId,b.payeeId]),"23503");
 await reject("cross-owner-message",()=>db.query("insert into public.support_messages(customer_id,ticket_id,author_id,body,visibility) values($1,$2,$3,'test','customer')",[a.customerId,b.ticketId,a.id]),"23503");
 await reject("cross-owner-object-key",()=>db.query("insert into public.customer_documents(customer_id,kind,object_key,mime_type,size_bytes,status) values($1,'generated',$2,'application/pdf',100,'ready')",[a.customerId,`${b.customerId}/forged.pdf`]),"23514");
 await reject("completed-payment-without-journal",()=>db.query("update public.payments set status='completed' where id=$1",[a.paymentId]),"23514");
 step="private-buckets";
 const buckets=(await db.query("select public from storage.buckets where id in ('bank-statements','bank-documents','bank-test-checks')")).rows;
 assert.equal(buckets.length,3);assert.ok(buckets.every(bucket=>bucket.public===false));
 await db.query("rollback");
 assert.equal((await db.query("select to_regclass('public.payments') as table_name")).rows[0].table_name,null);
 console.log("Product/services/processing/storage rehearsal passed: 51 RLS tables, denied writes, A/B product ownership, internal-message isolation, cross-owner constraints and 3 private buckets. Rolled back.");
}catch(error){console.error(`Verification stage: ${step}`);reportDatabaseError(error);}
finally{if(db){await db.query("rollback").catch(()=>{});await db.end();}if(fixtures){try{await fixtures.cleanup();console.log("Synthetic Auth fixtures removed.");}catch(error){reportDatabaseError(error);}}}
