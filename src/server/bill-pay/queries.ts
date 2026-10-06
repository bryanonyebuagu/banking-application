import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getBillPayOptions() {
  const supabase=await createServerSupabaseClient();
  const [accounts,balances,payees]=await Promise.all([
    supabase.from("accounts").select("id,nickname,masked_account_number,currency,status").eq("status","active").order("opened_at"),
    supabase.rpc("get_current_account_balances"),
    supabase.from("payees").select("id,name,synthetic_reference,archived_at").is("archived_at",null).order("name"),
  ]);
  if(accounts.error||balances.error||payees.error)throw new Error("BILL_PAY_OPTIONS_FAILED");
  return{accounts:accounts.data.map(account=>({...account,balance:balances.data.find(item=>item.account_id===account.id)??null})),payees:payees.data};
}

export async function listCurrentPayments(){
  const supabase=await createServerSupabaseClient();
  const result=await supabase.from("payments").select("id,account_id,payee_id,amount_minor,currency,scheduled_at,status,created_at,payees(name)").order("created_at",{ascending:false}).limit(100);
  if(result.error)throw new Error("PAYMENT_LIST_FAILED");return result.data;
}

export async function getCurrentPayment(id:string){
  const supabase=await createServerSupabaseClient();
  const payment=await supabase.from("payments").select("id,account_id,payee_id,amount_minor,currency,scheduled_at,status,journal_id,created_at").eq("id",id).maybeSingle();
  if(payment.error||!payment.data)return null;
  const[account,payee]=await Promise.all([supabase.from("accounts").select("nickname,masked_account_number").eq("id",payment.data.account_id).maybeSingle(),supabase.from("payees").select("name,synthetic_reference").eq("id",payment.data.payee_id).maybeSingle()]);
  if(account.error||payee.error)return null;return{...payment.data,account:account.data,payee:payee.data};
}
