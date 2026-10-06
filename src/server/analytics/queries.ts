import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
const excluded = new Set(["transfer", "reversal", "loan_disbursement", "investment_deposit", "card_payment"]);
export async function getSpendingAnalytics() {
  const supabase = await createServerSupabaseClient();
  const since = new Date(); since.setUTCMonth(since.getUTCMonth() - 11); since.setUTCDate(1); since.setUTCHours(0, 0, 0, 0);
  const [transactions, cardActivity] = await Promise.all([
    supabase.from("transactions").select("id,type,direction,amount_minor,currency,category,posted_at,created_at").eq("status", "posted").gte("created_at", since.toISOString()),
    supabase.from("card_transactions").select("id,kind,status,amount_minor,currency,category,created_at").eq("status", "posted").gte("created_at", since.toISOString()),
  ]);
  if (transactions.error || cardActivity.error) throw new Error("ANALYTICS_QUERY_FAILED");
  const rows = transactions.data.filter((item) => !excluded.has(item.type)).map((item) => ({ date: item.posted_at ?? item.created_at, direction: item.direction, amount: item.amount_minor, category: item.category || "Other", currency: item.currency }));
  for (const item of cardActivity.data) rows.push({ date: item.created_at, direction: item.kind === "refund" ? "credit" : "debit", amount: item.amount_minor, category: item.category || "Card purchases", currency: item.currency });
  const income = rows.filter((item) => item.direction === "credit").reduce((sum, item) => sum + item.amount, 0);
  const spending = rows.filter((item) => item.direction === "debit").reduce((sum, item) => sum + item.amount, 0);
  const categoryMap = new Map<string, number>();
  const monthMap = new Map<string, { income: number; spending: number }>();
  for (const item of rows) {
    const month = item.date.slice(0, 7); const current = monthMap.get(month) ?? { income: 0, spending: 0 };
    if (item.direction === "credit") current.income += item.amount; else { current.spending += item.amount; categoryMap.set(item.category, (categoryMap.get(item.category) ?? 0) + item.amount); }
    monthMap.set(month, current);
  }
  return {
    currency: rows[0]?.currency ?? "USD", income, spending, cashFlow: income - spending,
    categories: [...categoryMap.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount),
    months: [...monthMap.entries()].map(([month, totals]) => ({ month, ...totals })).sort((a, b) => a.month.localeCompare(b.month)),
  };
}
