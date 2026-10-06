import assert from "node:assert/strict";
import { connectHostedDatabase, reportDatabaseError } from "./hosted-db.mjs";

const queries = {
  tables: `
    select n.nspname as schema_name, c.relname as table_name, c.relrowsecurity as rls_enabled,
           c.relforcerowsecurity as rls_forced
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public','private') and c.relkind in ('r','p')
    order by 1,2`,
  columns: `
    select n.nspname as schema_name, c.relname as table_name, a.attnum as ordinal,
           a.attname as column_name, pg_catalog.format_type(a.atttypid,a.atttypmod) as data_type,
           a.attnotnull as not_null, pg_get_expr(d.adbin,d.adrelid) as default_expression
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
    where n.nspname in ('public','private') and c.relkind in ('r','p')
      and a.attnum > 0 and not a.attisdropped
    order by 1,2,3`,
  constraints: `
    select n.nspname as schema_name, c.relname as table_name, x.conname as constraint_name,
           x.contype as constraint_type, pg_get_constraintdef(x.oid,true) as definition
    from pg_constraint x
    join pg_class c on c.oid = x.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public','private')
    order by 1,2,3`,
  indexes: `
    select schemaname as schema_name, tablename as table_name, indexname as index_name, indexdef
    from pg_indexes where schemaname in ('public','private')
    order by 1,2,3`,
  policies: `
    select schemaname as schema_name, tablename as table_name, policyname as policy_name,
           permissive, roles::text, cmd, qual, with_check
    from pg_policies where schemaname in ('public','private')
    order by 1,2,3`,
  triggers: `
    select n.nspname as schema_name, c.relname as table_name, t.tgname as trigger_name,
           pg_get_triggerdef(t.oid,true) as definition
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public','private') and not t.tgisinternal
    order by 1,2,3`,
  functions: `
    select n.nspname as schema_name, p.proname as function_name,
           pg_get_function_identity_arguments(p.oid) as arguments,
           pg_get_function_result(p.oid) as result,
           pg_get_functiondef(p.oid) as definition
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public','private')
    order by 1,2,3`,
  tablePrivileges: `
    select table_schema, table_name, grantee, privilege_type
    from information_schema.table_privileges
    where table_schema in ('public','private')
      and grantee in ('anon','authenticated','service_role')
    order by 1,2,3,4`,
  routinePrivileges: `
    select routine_schema, routine_name, grantee, privilege_type
    from information_schema.routine_privileges
    where routine_schema in ('public','private')
      and grantee in ('PUBLIC','anon','authenticated','service_role')
    order by 1,2,3,4`,
  buckets: `
    select id, name, public, file_size_limit, allowed_mime_types::text
    from storage.buckets
    where id like 'bank-%'
    order by id`,
};

async function snapshot(client) {
  const result = {};
  for (const [name, sql] of Object.entries(queries)) result[name] = (await client.query(sql)).rows;
  return result;
}

let development;
let test;
try {
  development = await connectHostedDatabase("development");
  test = await connectHostedDatabase("test");
  const developmentSnapshot = await snapshot(development);
  const testSnapshot = await snapshot(test);
  assert.deepEqual(testSnapshot, developmentSnapshot);
  console.log(JSON.stringify({
    matching: true,
    tables: testSnapshot.tables.length,
    columns: testSnapshot.columns.length,
    policies: testSnapshot.policies.length,
    buckets: testSnapshot.buckets.length,
  }));
} catch (error) {
  reportDatabaseError(error);
} finally {
  if (development) await development.end();
  if (test) await test.end();
}
