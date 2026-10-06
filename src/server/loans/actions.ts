"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireVerifiedIdentity } from "@/server/auth/identity";
import { requireSameOrigin } from "@/server/security/request";

function value(data: FormData, key: string) {
  const item = data.get(key);
  return typeof item === "string" ? item : "";
}
function minor(raw: string) {
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(raw)) return null;
  const [whole, fraction = ""] = raw.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
async function authorize() {
  await requireSameOrigin();
  await requireVerifiedIdentity();
  return createServerSupabaseClient();
}

export async function openLoanAction(data: FormData) {
  const amount = minor(value(data, "amount"));
  const parsed = z.object({
    loanId: z.uuid(), kind: z.enum(["personal", "auto"]), term: z.coerce.number().int(),
    account: z.uuid(), commandKey: z.string().min(8).max(200),
  }).safeParse({
    loanId: value(data, "loanId"), kind: value(data, "kind"), term: value(data, "term"),
    account: value(data, "account"), commandKey: value(data, "commandKey"),
  });
  if (!parsed.success || !amount) redirect("/loans/new?message=invalid");
  const supabase = await authorize();
  const result = await supabase.rpc("open_current_simulated_loan", {
    p_loan_id: parsed.data.loanId, p_kind: parsed.data.kind, p_principal_minor: amount,
    p_term_months: parsed.data.term, p_funding_account_id: parsed.data.account,
    p_idempotency_key: parsed.data.commandKey,
  });
  if (result.error || !result.data) redirect("/loans/new?message=failed");
  revalidatePath("/loans");
  revalidatePath("/dashboard");
  redirect("/loans/" + result.data + "?message=opened");
}

export async function payLoanAction(data: FormData) {
  const parsed = z.object({ loanId: z.uuid(), account: z.uuid(), commandKey: z.string().min(8).max(200) }).safeParse({
    loanId: value(data, "loanId"), account: value(data, "account"), commandKey: value(data, "commandKey"),
  });
  if (!parsed.success) redirect("/loans");
  const supabase = await authorize();
  const result = await supabase.rpc("pay_current_loan", {
    p_loan_id: parsed.data.loanId, p_funding_account_id: parsed.data.account, p_idempotency_key: parsed.data.commandKey,
  });
  revalidatePath("/loans/" + parsed.data.loanId);
  revalidatePath("/dashboard");
  redirect("/loans/" + parsed.data.loanId + "?message=" + (result.error ? "failed" : "paid"));
}
