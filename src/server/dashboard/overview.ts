import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getDashboardOverview() {
  const supabase = await createServerSupabaseClient();
  const [customer,accounts,balances,credit,loans,mortgages,investments,transactions,payments,notifications] = await Promise.all([
    supabase.from("customers").select("id,first_name,verification_status,account_status").maybeSingle(),
    supabase.from("accounts").select("id,account_type,nickname,masked_account_number,status,currency").order("opened_at"),
    supabase.rpc("get_current_account_balances"),
    supabase.from("credit_accounts").select("id",{count:"exact",head:true}),
    supabase.from("loans").select("id",{count:"exact",head:true}),
    supabase.from("mortgages").select("id",{count:"exact",head:true}),
    supabase.from("investment_accounts").select("id",{count:"exact",head:true}),
    supabase.from("transactions").select("id,description,amount_minor,currency,direction,status,posted_at,created_at").order("created_at",{ascending:false}).limit(5),
    supabase.from("payments").select("id,amount_minor,currency,status,scheduled_at").not("scheduled_at","is",null).order("scheduled_at").limit(5),
    supabase.from("notifications").select("id,title,body,read_at,created_at").order("created_at",{ascending:false}).limit(3),
  ]);
  const results = [customer,accounts,balances,credit,loans,mortgages,investments,transactions,payments,notifications];
  if (results.some((result)=>result.error)) throw new Error("DASHBOARD_QUERY_FAILED");
  return {
    customer:customer.data,
    accounts:(accounts.data ?? []).map((account)=>({...account,balance:balances.data?.find((item)=>item.account_id===account.id)??null})),
    productCounts:{credit:credit.count ?? 0,loans:(loans.count ?? 0)+(mortgages.count ?? 0),investments:investments.count ?? 0},
    transactions:transactions.data ?? [],payments:payments.data ?? [],notifications:notifications.data ?? [],
  };
}
