import { readFile } from "node:fs/promises";
import pg from "pg";

const targets = {
  development: {
    passwordFile: "../.env.db-password",
    user: "postgres.hqormbkdnbdvcxfusozf",
    applicationName: "banking-platform-development-tooling",
  },
  test: {
    passwordFile: "../.env.test-db-password",
    user: "postgres.icdaoukkzpiwspirqver",
    applicationName: "banking-platform-test-tooling",
  },
};

async function connectionConfiguration(target) {
  const configuration = targets[target];
  if (!configuration) throw new Error("UNKNOWN_DATABASE_TARGET");
  const password = (await readFile(new URL(configuration.passwordFile, import.meta.url), "utf8")).trim();
  if (!password || password.startsWith("REPLACE_THIS_LINE")) throw new Error("DATABASE_PASSWORD_NOT_CONFIGURED");
  return {
    host: "aws-1-eu-west-1.pooler.supabase.com", port: 5432, database: "postgres",
    user: configuration.user, password,
    ssl: { rejectUnauthorized: true, ca: await readFile(new URL("../supabase/certificates/prod-ca-2021.crt", import.meta.url), "utf8") },
    connectionTimeoutMillis: 15000, query_timeout: 30000,
    application_name: configuration.applicationName,
  };
}

export async function connectHostedDatabase(target = "development") {
  const client = new pg.Client(await connectionConfiguration(target));
  try { await client.connect(); return client; }
  catch (error) { await client.end(); throw error; }
}

export async function createHostedDatabasePool(target = "development") {
  const pool = new pg.Pool({ ...(await connectionConfiguration(target)), max: 5 });
  try { await pool.query("select 1"); return pool; }
  catch (error) { await pool.end(); throw error; }
}

export function reportDatabaseError(error) {
  const safeCode = typeof error.code === "string" && /^[A-Z0-9_]+$/.test(error.code) ? error.code : "DATABASE_TOOL_FAILED";
  console.error(JSON.stringify({ ok: false, code: safeCode }));
  process.exitCode = 1;
}
