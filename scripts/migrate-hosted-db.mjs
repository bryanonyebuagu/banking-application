import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { connectHostedDatabase, reportDatabaseError } from "./hosted-db.mjs";

const mode = process.argv[2];
const target = process.argv[3] ?? "development";
assert.ok(["plan", "apply"].includes(mode), "Use plan or apply; remote reset is not supported.");
assert.ok(["development", "test"].includes(target), "Use development or test target.");
const directory = new URL("../supabase/migrations/", import.meta.url);
const migrations = await Promise.all((await readdir(directory)).filter((file) => /^\d{14}_[a-z0-9_]+\.sql$/.test(file)).sort().map(async (file) => {
  const sql = await readFile(new URL(file, directory), "utf8");
  return { version: file.slice(0,14), name: file.slice(15,-4), sql, checksum: createHash("sha256").update(sql).digest("hex") };
}));
assert.equal(new Set(migrations.map((migration) => migration.version)).size,migrations.length);
let client;
try {
  client = await connectHostedDatabase(target);
  await client.query("select pg_advisory_lock(9282026,2)");
  const exists = await client.query("select to_regclass('supabase_migrations.schema_migrations') as history, to_regclass('supabase_migrations.banking_checksums') as checksums");
  let applied = [];
  if (exists.rows[0].history) {
    assert.ok(exists.rows[0].checksums, "Existing migration history needs explicit reconciliation.");
    applied = (await client.query("select m.version, c.sha256 from supabase_migrations.schema_migrations m left join supabase_migrations.banking_checksums c using(version) order by m.version")).rows;
  } else {
    assert.equal((await client.query("select count(*)::int as count from pg_tables where schemaname in ('public','private')")).rows[0].count,0,"Untracked database objects need review.");
  }
  for (const [index, row] of applied.entries()) {
    assert.equal(migrations[index]?.version,row.version,"Applied history is not a prefix of repository migrations.");
    assert.equal(migrations[index].checksum,row.sha256,"Applied migration checksum changed.");
  }
  const pending = migrations.slice(applied.length);
  console.log(JSON.stringify({target,mode,applied:applied.length,pending:pending.map((migration)=>migration.version)}));
  if (mode === "apply") {
    for (const migration of pending) {
      await client.query("begin");
      await client.query("set local statement_timeout='30s'");
      await client.query("create schema if not exists supabase_migrations");
      await client.query("revoke all on schema supabase_migrations from public,anon,authenticated,service_role");
      await client.query("create table if not exists supabase_migrations.schema_migrations(version text primary key,statements text[],name text)");
      await client.query("create table if not exists supabase_migrations.banking_checksums(version text primary key references supabase_migrations.schema_migrations(version),sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'),applied_at timestamptz not null default now())");
      await client.query("revoke all on all tables in schema supabase_migrations from public,anon,authenticated,service_role");
      await client.query(migration.sql);
      await client.query("insert into supabase_migrations.schema_migrations(version,statements,name) values($1,$2,$3)",[migration.version,[migration.sql],migration.name]);
      await client.query("insert into supabase_migrations.banking_checksums(version,sha256) values($1,$2)",[migration.version,migration.checksum]);
      await client.query("commit");
      console.log(`Applied ${migration.version}_${migration.name}`);
    }
  }
} catch(error) { reportDatabaseError(error); }
finally {
  if(client) {
    await client.query("rollback").catch(()=>{});
    await client.query("select pg_advisory_unlock(9282026,2)").catch(()=>{});
    await client.end();
  }
}
