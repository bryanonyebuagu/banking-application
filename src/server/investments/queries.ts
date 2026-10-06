import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getLoanAccountOptions } from "@/server/loans/queries";
export async function getInvestmentDashboard() {
  const supabase = await createServerSupabaseClient();
  const [accounts, overview, instruments, holdings, transactions, fundingAccounts] = await Promise.all([
    supabase.from("investment_accounts").select("id,currency,status,created_at").eq("status", "active").maybeSingle(),
    supabase.rpc("get_current_investment_overview"),
    supabase.rpc("get_current_investment_instruments"),
    supabase.from("investment_holdings").select("id,investment_account_id,instrument_id,currency,quantity,cost_basis_minor").order("created_at"),
    supabase.from("investment_transactions").select("id,investment_account_id,instrument_id,kind,quantity,price,cash_amount_minor,currency,occurred_at").order("occurred_at", { ascending: false }).limit(100),
    getLoanAccountOptions(),
  ]);
  if (accounts.error || overview.error || instruments.error || holdings.error || transactions.error) throw new Error("INVESTMENT_DASHBOARD_FAILED");
  return {
    account: accounts.data, overview: overview.data[0] ?? null, instruments: instruments.data,
    holdings: holdings.data.map((item) => ({ ...item, instrument: instruments.data.find((instrument) => instrument.id === item.instrument_id) ?? null })),
    transactions: transactions.data.map((item) => ({ ...item, instrument: instruments.data.find((instrument) => instrument.id === item.instrument_id) ?? null })),
    fundingAccounts,
  };
}
