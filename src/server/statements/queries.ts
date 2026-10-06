import "server-only";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getStatementAccountOptions() {
  const supabase = await createServerSupabaseClient();
  const result = await supabase.from("accounts").select("id,nickname,masked_account_number,currency,status").eq("status", "active").order("opened_at");
  if (result.error) throw new Error("STATEMENT_OPTIONS_FAILED");
  return result.data;
}

export async function listCurrentStatements() {
  const supabase = await createServerSupabaseClient();
  const result = await supabase.from("statements").select("id,account_id,currency,period_start,period_end,version,opening_minor,closing_minor,created_at,accounts(nickname,masked_account_number)").eq("status", "ready").order("created_at", { ascending: false }).limit(100);
  if (result.error) throw new Error("STATEMENT_LIST_FAILED");
  return result.data;
}

export async function getCurrentStatement(id: string) {
  const valid = z.uuid().safeParse(id);
  if (!valid.success) return null;
  const supabase = await createServerSupabaseClient();
  const result = await supabase.from("statements").select("id,account_id,currency,period_start,period_end,version,opening_minor,closing_minor,ledger_cutoff,object_key,created_at,accounts(nickname,masked_account_number)").eq("id", valid.data).eq("status", "ready").maybeSingle();
  if (result.error || !result.data || !result.data.object_key) return null;
  const signed = await supabase.storage.from("bank-statements").createSignedUrl(result.data.object_key, 300);
  if (signed.error) throw new Error("STATEMENT_DOWNLOAD_FAILED");
  return { ...result.data, downloadUrl: signed.data.signedUrl };
}

export async function getPendingStatementData(id: string) {
  const supabase = await createServerSupabaseClient();
  const statement = await supabase.from("statements").select("id,account_id,currency,period_start,period_end,version,opening_minor,closing_minor,ledger_cutoff,object_key,accounts(nickname,masked_account_number)").eq("id", id).eq("status", "pending").single();
  if (statement.error || !statement.data || !statement.data.account_id || !statement.data.object_key || !statement.data.accounts) throw new Error("STATEMENT_SNAPSHOT_FAILED");
  const account = statement.data.accounts;
  const lines = await supabase.rpc("get_current_statement_activity", { p_statement_id: id });
  if (lines.error) throw new Error("STATEMENT_LINES_FAILED");
  return { statement: { ...statement.data, accounts: account }, lines: lines.data };
}
