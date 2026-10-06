import { readFile } from "node:fs/promises";import{connectHostedDatabase,reportDatabaseError}from"./hosted-db.mjs";
const migration=await readFile(new URL("../supabase/migrations/20260930000700_credit_card_security_audit.sql",import.meta.url),"utf8");let db;
try{db=await connectHostedDatabase("test");await db.query("begin");await db.query(migration);await db.query("rollback");console.log("Credit card security forward migration rehearsal passed.")}catch(error){reportDatabaseError(error)}finally{await db?.query("rollback").catch(()=>{});await db?.end()}
