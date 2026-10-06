import "server-only";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getLoanAccountOptions() {
  const supabase = await createServerSupabaseClient();
  const [accounts, balances] = await Promise.all([
    supabase.from("accounts").select("id,nickname,masked_account_number,currency,status").eq("status", "active").eq("currency", "USD").order("opened_at"),
    supabase.rpc("get_current_account_balances"),
  ]);
  if (accounts.error || balances.error) throw new Error("LOAN_ACCOUNT_OPTIONS_FAILED");
  return accounts.data.map((account) => ({ ...account, balance: balances.data.find((item) => item.account_id === account.id) ?? null }));
}

export async function listCurrentLoans() {
  const supabase = await createServerSupabaseClient();
  const [loans, balances] = await Promise.all([
    supabase.from("loans").select("id,kind,principal_minor,rate,term_months,monthly_payment_minor,next_due_date,status,currency,created_at").order("created_at", { ascending: false }),
    supabase.rpc("get_current_loan_balances"),
  ]);
  if (loans.error || balances.error) throw new Error("LOAN_LIST_FAILED");
  return loans.data.map((loan) => ({ ...loan, balance: balances.data.find((item) => item.loan_id === loan.id) ?? null }));
}

export async function getCurrentLoan(id: string) {
  const valid = z.uuid().safeParse(id);
  if (!valid.success) return null;
  const supabase = await createServerSupabaseClient();
  const [loan, balances, accounts] = await Promise.all([
    supabase.from("loans").select("id,kind,principal_minor,rate,term_months,monthly_payment_minor,next_due_date,status,currency,created_at,loan_payments(id,funding_account_id,principal_minor,interest_minor,fee_minor,status,paid_at,created_at,accounts(nickname,masked_account_number))").eq("id", valid.data).maybeSingle(),
    supabase.rpc("get_current_loan_balances"),
    getLoanAccountOptions(),
  ]);
  if (loan.error || balances.error || !loan.data) return null;
  const currentLoan = loan.data;
  return {
    ...currentLoan,
    balance: balances.data.find((item) => item.loan_id === currentLoan.id) ?? null,
    fundingAccounts: accounts,
    loan_payments: [...currentLoan.loan_payments].sort((a, b) => (b.paid_at ?? b.created_at).localeCompare(a.paid_at ?? a.created_at)),
  };
}
