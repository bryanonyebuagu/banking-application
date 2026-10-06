import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { createAuthFixtures } from "./auth-test-fixtures.mjs";
import { connectHostedDatabase, reportDatabaseError } from "./hosted-db.mjs";

const config = parseEnv(await readFile(new URL("../.env.test.local", import.meta.url), "utf8"));
const secret = (await readFile(new URL("../.env.test-supabase-secret", import.meta.url), "utf8")).trim();
assert.equal(config.NEXT_PUBLIC_SUPABASE_URL, "https://icdaoukkzpiwspirqver.supabase.co");
assert.ok(config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.startsWith("sb_publishable_"));
assert.ok(secret.startsWith("sb_secret_"), "SUPABASE_SECRET_NOT_CONFIGURED");

const options = {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(20000) }) },
};
const admin = createClient(config.NEXT_PUBLIC_SUPABASE_URL, secret, options);
const bucket = "bank-documents";
const body = new TextEncoder().encode("%PDF-1.4\n% synthetic storage policy fixture\n%%EOF\n");
let db;
let fixtures;
let objectKey;
let uploaded = false;
let step = "connect";

try {
  db = await connectHostedDatabase("test");
  fixtures = await createAuthFixtures("test");
  step = "seed-identity";
  await db.query("begin");
  for (const user of fixtures.users) {
    const profile = await db.query(
      "insert into public.profiles(auth_user_id,display_name) values($1,'Synthetic Storage Test') returning id",
      [user.id],
    );
    user.profileId = profile.rows[0].id;
    const customer = await db.query(
      "insert into public.customers(auth_user_id,profile_id,first_name,last_name,contact_email) values($1,$2,'Synthetic','Storage',$3) returning id",
      [user.id, user.profileId, user.email],
    );
    user.customerId = customer.rows[0].id;
    await db.query(
      "insert into public.app_sessions(auth_user_id,provider_session_id,expires_at,idle_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '30 minutes')",
      [user.id, user.sessionId],
    );
  }
  await db.query("commit");

  const [owner, other] = fixtures.users;
  objectKey = `${owner.customerId}/synthetic-storage-policy.pdf`;
  step = "admin-upload-fixture";
  const upload = await admin.storage.from(bucket).upload(objectKey, body, {
    contentType: "application/pdf",
    upsert: false,
  });
  assert.equal(upload.error, null);
  uploaded = true;
  await db.query(
    "insert into public.customer_documents(customer_id,kind,object_key,mime_type,size_bytes,status) values($1,'generated',$2,'application/pdf',$3,'ready')",
    [owner.customerId, objectKey, body.byteLength],
  );

  const anon = createClient(config.NEXT_PUBLIC_SUPABASE_URL, config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, options);
  const ownerApi = createClient(config.NEXT_PUBLIC_SUPABASE_URL, config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    ...options,
    global: { ...options.global, headers: { Authorization: `Bearer ${owner.accessToken}` } },
  });
  const otherApi = createClient(config.NEXT_PUBLIC_SUPABASE_URL, config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    ...options,
    global: { ...options.global, headers: { Authorization: `Bearer ${other.accessToken}` } },
  });

  step = "anonymous-download-denial";
  assert.ok((await anon.storage.from(bucket).download(objectKey)).error);
  step = "cross-customer-download-denial";
  assert.ok((await otherApi.storage.from(bucket).download(objectKey)).error);
  step = "owner-download";
  const ownedDownload = await ownerApi.storage.from(bucket).download(objectKey);
  assert.equal(ownedDownload.error, null);
  assert.equal(ownedDownload.data.size, body.byteLength);
  step = "customer-upload-denial";
  assert.ok((await ownerApi.storage.from(bucket).upload(
    `${owner.customerId}/forbidden-upload.pdf`,
    body,
    { contentType: "application/pdf", upsert: false },
  )).error);

  console.log("Private Storage API tests passed on test: anonymous/cross-owner download denial, owner read and customer upload denial.");
} catch (error) {
  console.error(`Verification stage: ${step}`);
  reportDatabaseError(error);
} finally {
  if (uploaded && objectKey) {
    const removal = await admin.storage.from(bucket).remove([objectKey]);
    if (removal.error) {
      process.exitCode = 1;
      console.error("Storage fixture cleanup needs attention.");
    }
  }
  if (db && fixtures) {
    try {
      await db.query("begin");
      for (const user of fixtures.users) {
        await db.query(
          "delete from public.customer_documents where customer_id in (select id from public.customers where auth_user_id=$1)",
          [user.id],
        );
        await db.query("delete from public.app_sessions where auth_user_id=$1", [user.id]);
        await db.query("delete from public.customers where auth_user_id=$1", [user.id]);
        await db.query("delete from public.profiles where auth_user_id=$1", [user.id]);
      }
      await db.query("commit");
      await fixtures.cleanup();
      console.log("Synthetic storage rows, object and provider users removed.");
    } catch (error) {
      await db.query("rollback").catch(() => {});
      reportDatabaseError(error);
      console.error("Fixture cleanup needs attention; IDs are recorded in work/auth-fixtures files.");
    }
  }
  await db?.end();
}
