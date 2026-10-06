"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireVerifiedIdentity } from "@/server/auth/identity";
import { requireSameOrigin } from "@/server/security/request";
function value(data: FormData, key: string) { const item = data.get(key); return typeof item === "string" ? item : ""; }
function minor(raw: string) { if (!/^\d{1,7}(\.\d{1,2})?$/.test(raw)) return null; const [whole, fraction = ""] = raw.split("."); return Number(whole) * 100 + Number(fraction.padEnd(2, "0")); }
async function client() { await requireSameOrigin(); await requireVerifiedIdentity(); return createServerSupabaseClient(); }
export async function openInvestmentAccountAction() { const supabase = await client(); const result = await supabase.rpc("open_current_investment_account"); revalidatePath("/investments"); redirect("/investments?message=" + (result.error ? "failed" : "opened")); }
export async function fundInvestmentAccountAction(data: FormData) {
  const amount = minor(value(data, "amount")); const parsed = z.object({ investment: z.uuid(), account: z.uuid(), commandKey: z.string().min(8) }).safeParse({ investment: value(data, "investmentId"), account: value(data, "account"), commandKey: value(data, "commandKey") });
  if (!parsed.success || !amount) redirect("/investments?message=failed"); const supabase = await client();
  const result = await supabase.rpc("fund_current_investment_account", { p_investment_account_id: parsed.data.investment, p_funding_account_id: parsed.data.account, p_amount_minor: amount, p_idempotency_key: parsed.data.commandKey });
  revalidatePath("/investments"); revalidatePath("/dashboard"); redirect("/investments?message=" + (result.error ? "failed" : "funded"));
}
export async function tradeInvestmentAction(data: FormData) {
  const parsed = z.object({ investment: z.uuid(), instrument: z.uuid(), kind: z.enum(["buy", "sell"]), quantity: z.coerce.number().positive().max(100000), commandKey: z.string().min(8) }).safeParse({ investment: value(data, "investmentId"), instrument: value(data, "instrument"), kind: value(data, "kind"), quantity: value(data, "quantity"), commandKey: value(data, "commandKey") });
  if (!parsed.success) redirect("/investments?message=failed"); const supabase = await client();
  const result = await supabase.rpc("trade_current_investment", { p_investment_account_id: parsed.data.investment, p_instrument_id: parsed.data.instrument, p_kind: parsed.data.kind, p_quantity: parsed.data.quantity, p_idempotency_key: parsed.data.commandKey || randomUUID() });
  revalidatePath("/investments"); redirect("/investments?message=" + (result.error ? "failed" : "traded"));
}
