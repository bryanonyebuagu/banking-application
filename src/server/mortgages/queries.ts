import "server-only";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getLoanAccountOptions } from "@/server/loans/queries";

export async function listCurrentMortgages() {
  const supabase = await createServerSupabaseClient();
  const [mortgages, applications, balances] = await Promise.all([
    supabase.from("mortgages").select("id,principal_minor,rate,term_months,monthly_payment_minor,next_due_date,status,currency,created_at").order("created_at", { ascending: false }),
    supabase.from("mortgage_applications").select("id,requested_amount_minor,requested_term_months,status,mortgage_id,created_at").order("created_at", { ascending: false }),
    supabase.rpc("get_current_mortgage_balances"),
  ]);
  if (mortgages.error || applications.error || balances.error) throw new Error("MORTGAGE_LIST_FAILED");
  return { mortgages: mortgages.data.map((item) => ({ ...item, balance: balances.data.find((balance) => balance.mortgage_id === item.id) ?? null })), applications: applications.data };
}

export async function getCurrentMortgage(id: string) {
  const valid = z.uuid().safeParse(id);
  if (!valid.success) return null;
  const supabase = await createServerSupabaseClient();
  const [mortgage, balances, accounts] = await Promise.all([
    supabase.from("mortgages").select("id,principal_minor,rate,term_months,monthly_payment_minor,escrow_monthly_minor,next_due_date,status,currency,created_at,mortgage_payments(id,principal_minor,interest_minor,escrow_minor,status,paid_at,created_at,accounts(nickname,masked_account_number))").eq("id", valid.data).maybeSingle(),
    supabase.rpc("get_current_mortgage_balances"),
    getLoanAccountOptions(),
  ]);
  if (mortgage.error || balances.error || !mortgage.data) return null;
  const currentMortgage = mortgage.data;
  return { ...currentMortgage, balance: balances.data.find((item) => item.mortgage_id === currentMortgage.id) ?? null, fundingAccounts: accounts, mortgage_payments: [...currentMortgage.mortgage_payments].sort((a, b) => (b.paid_at ?? b.created_at).localeCompare(a.paid_at ?? a.created_at)) };
}
