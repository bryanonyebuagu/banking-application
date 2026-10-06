import { connectHostedDatabase, reportDatabaseError } from "./hosted-db.mjs";
let client;
try {
  client = await connectHostedDatabase();
  const result = await client.query("select current_database() as database, current_user as role, current_setting('server_version') as version");
  console.log(JSON.stringify({ connected: true, certificateVerified: true, ...result.rows[0] }));
  const tables = await client.query("select tablename from pg_tables where schemaname = 'public' order by tablename");
  console.log(JSON.stringify({ publicTables: tables.rows.map((row) => row.tablename) }));
} catch (error) {
  reportDatabaseError(error);
} finally {
  await client?.end();
}
