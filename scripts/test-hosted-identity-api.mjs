import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { createAuthFixtures } from "./auth-test-fixtures.mjs";
import { connectHostedDatabase,reportDatabaseError } from "./hosted-db.mjs";

const target = process.argv[2] ?? "development";
assert.ok(["development","test"].includes(target));
const configFile = target === "test" ? "../.env.test.local" : "../.env.local";
const expectedUrl = target === "test" ? "https://icdaoukkzpiwspirqver.supabase.co" : "https://hqormbkdnbdvcxfusozf.supabase.co";
const config = parseEnv(await readFile(new URL(configFile,import.meta.url),"utf8"));
assert.equal(config.NEXT_PUBLIC_SUPABASE_URL,expectedUrl);
let fixtures,db;
let step="connect";
try {
  db=await connectHostedDatabase(target);
  fixtures=await createAuthFixtures(target);
  step="seed-identity-only";
  await db.query("begin");
  for(const user of fixtures.users) {
    const profile=await db.query("insert into public.profiles(auth_user_id,display_name) values($1,'Synthetic API Test') returning id",[user.id]);
    user.profileId=profile.rows[0].id;
    const customer=await db.query("insert into public.customers(auth_user_id,profile_id,first_name,last_name,contact_email) values($1,$2,'Synthetic','Test',$3) returning id",[user.id,user.profileId,user.email]);
    user.customerId=customer.rows[0].id;
    await db.query("insert into public.app_sessions(auth_user_id,provider_session_id,expires_at,idle_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '30 minutes')",[user.id,user.sessionId]);
    await db.query("insert into public.addresses(customer_id,line1,city,postal_code,country,type) values($1,'1 Test Street','Test City','00000','US','home')",[user.customerId]);
  }
  await db.query("commit");
  await db.query("notify pgrst,'reload schema'");
  const options={ auth:{persistSession:false,autoRefreshToken:false}, global:{fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(20000)})} };
  const anon=createClient(config.NEXT_PUBLIC_SUPABASE_URL,config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
  step="anonymous-data-api";
  assert.ok((await anon.from("customers").select("id")).error);
  for(const user of fixtures.users) {
    const api=createClient(config.NEXT_PUBLIC_SUPABASE_URL,config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{...options,global:{...options.global,headers:{Authorization:`Bearer ${user.accessToken}`}}});
    user.api=api;
    step="owner-data-api";
    const own=await api.from("customers").select("id");
    assert.equal(own.error,null);
    assert.deepEqual(own.data,[{id:user.customerId}]);
    const other=fixtures.users.find((entry)=>entry.id!==user.id);
    step="cross-customer-data-api";
    const cross=await api.from("customers").select("id").eq("id",other.customerId);
    assert.equal(cross.error,null);
    assert.deepEqual(cross.data,[]);
    const addresses=await api.from("addresses").select("customer_id");
    assert.equal(addresses.error,null);
    assert.deepEqual(addresses.data,[{customer_id:user.customerId}]);
    step="protected-field-write";
    assert.ok((await api.from("customers").update({verification_status:"verified"}).eq("id",user.customerId)).error);
    step="private-schema-not-exposed";
    assert.ok((await api.schema("private").from("staff_assignments").select("id")).error);
    step="no-private-helper-rpc";
    assert.ok((await api.rpc("session_is_active")).error);
  }
  step="revoked-token-data-api";
  const [user]=fixtures.users;
  await db.query("update public.app_sessions set revoked_at=now() where provider_session_id=$1",[user.sessionId]);
  const revoked=await user.api.from("customers").select("id");
  assert.equal(revoked.error,null);
  assert.deepEqual(revoked.data,[]);
  console.log(`Direct Data API tests passed on ${target}: anonymous denial, A/B ownership, protected writes, private schema/RPC denial and revoked-token reuse.`);
} catch(error) {
  console.error(`Verification stage: ${step}`);
  reportDatabaseError(error);
} finally {
  if(db) await db.query("rollback").catch(()=>{});
  if(db&&fixtures) {
    try {
      await db.query("begin");
      for(const user of fixtures.users) {
        await db.query("delete from public.addresses where customer_id in (select id from public.customers where auth_user_id=$1)",[user.id]);
        await db.query("delete from public.app_sessions where auth_user_id=$1",[user.id]);
        await db.query("delete from public.customers where auth_user_id=$1",[user.id]);
        await db.query("delete from public.profiles where auth_user_id=$1",[user.id]);
      }
      await db.query("commit");
      await fixtures.cleanup();
      console.log("Synthetic identity rows and provider users removed.");
    } catch(error) { await db.query("rollback").catch(()=>{}); reportDatabaseError(error); console.error("Fixture cleanup needs attention; IDs are recorded in work/auth-fixtures files."); }
  }
  await db?.end();
}
