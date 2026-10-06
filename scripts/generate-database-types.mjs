import { mkdir, writeFile } from "node:fs/promises";
import { generateTypescript, sortGeneratorMetadata } from "@supabase/postgrest-typegen/generation";
import { introspect } from "@supabase/postgrest-typegen/introspection";
import { createHostedDatabasePool, reportDatabaseError } from "./hosted-db.mjs";

let pool;
try {
  pool = await createHostedDatabasePool("development");
  const metadata = sortGeneratorMetadata(await introspect(pool, { includedSchemas: ["public"] }));
  const source = await generateTypescript(metadata, {
    defaultSchema: "public",
    detectOneToOneRelationships: true,
    format: async (code) => code,
  });
  const output = new URL("../src/types/database.generated.ts", import.meta.url);
  await mkdir(new URL("../src/types/", import.meta.url), { recursive: true });
  await writeFile(output, source, "utf8");
  console.log(JSON.stringify({ generated: true, schema: "public", output: "src/types/database.generated.ts" }));
} catch (error) {
  reportDatabaseError(error);
} finally {
  if (pool) await pool.end();
}
