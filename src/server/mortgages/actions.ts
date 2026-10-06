"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireVerifiedIdentity } from "@/server/auth/identity";
import { requireSameOrigin } from "@/server/security/request";
function value(data: FormData, key: string) { const item = data.get(key); return typeof item === "string" ? item : ""; }
function minor(raw: string) { if (!/^\d{1,8}(\.\d{1,2})?$/.test(raw)) return null; const [whole, fraction = ""] = raw.split("."); return Number(whole) * 100 + Number(fraction.padEnd(2, "0")); }
async function client() { await requireSameOrigin(); await requireVerifiedIdentity(); return createServerSupabaseClient(); }

export async function submitMortgageApplicationAction(data: FormData) {
  const amount = minor(value(data, "amount"));
  const parsed = z.object({ property: z.string().regex(/^SIM-[A-Z0-9-]{3,60}$/), employment: z.string().regex(/^SIM-[A-Z0-9-]{3,60}$/), term: z.coerce.number().int() }).safeParse({ property: value(data, "property").toUpperCase(), employment: value(data, "employment").toUpperCase(), term: value(data, "term") });
  if (!parsed.success || !amount) redirect("/mortgages/apply?message=invalid");
  const supabase = await client();
  const result = await supabase.rpc("submit_current_mortgage_application", { p_property_id: parsed.data.property, p_employment_id: parsed.data.employment, p_amount_minor: amount, p_term_months: parsed.data.term });
  if (result.error || !result.data) redirect("/mortgages/apply?message=failed");
  revalidatePath("/mortgages"); redirect("/mortgages?message=submitted");
}
export async function reviewMortgageApplicationAction(data: FormData) {
  const id = z.uuid().safeParse(value(data, "applicationId")); if (!id.success) redirect("/mortgages");
  const supabase = await client(); const result = await supabase.rpc("review_current_simulated_mortgage_application", { p_application_id: id.data });
  revalidatePath("/mortgages"); revalidatePath("/dashboard");
  redirect(result.error || !result.data ? "/mortgages?message=failed" : "/mortgages/" + result.data + "?message=approved");
}
export async function payMortgageAction(data: FormData) {
  const parsed = z.object({ mortgage: z.uuid(), account: z.uuid(), commandKey: z.string().min(8).max(200) }).safeParse({ mortgage: value(data, "mortgageId"), account: value(data, "account"), commandKey: value(data, "commandKey") });
  if (!parsed.success) redirect("/mortgages");
  const supabase = await client(); const result = await supabase.rpc("pay_current_mortgage", { p_mortgage_id: parsed.data.mortgage, p_funding_account_id: parsed.data.account, p_idempotency_key: parsed.data.commandKey });
  revalidatePath("/mortgages/" + parsed.data.mortgage); revalidatePath("/dashboard");
  redirect("/mortgages/" + parsed.data.mortgage + "?message=" + (result.error ? "failed" : "paid"));
}
