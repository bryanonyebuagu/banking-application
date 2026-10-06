import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function listCurrentAccounts() {
  const supabase=await createServerSupabaseClient();
  const result=await supabase.from("accounts").select("id,account_type,nickname,masked_account_number,routing_identifier,currency,status,opened_at").order("opened_at");
  if(result.error) throw new Error("ACCOUNT_LIST_FAILED");
  return result.data;
}

export async function getCurrentAccount(id:string) {
  const supabase=await createServerSupabaseClient();
  const [result,balances,transactions]=await Promise.all([
    supabase.from("accounts").select("id,account_type,nickname,masked_account_number,routing_identifier,currency,status,opened_at").eq("id",id).maybeSingle(),
    supabase.rpc("get_current_account_balances"),
    supabase.from("transactions").select("id,type,direction,amount_minor,currency,description,status,posted_at,created_at").eq("account_id",id).order("created_at",{ascending:false}).limit(20),
  ]);
  if(result.error||balances.error||transactions.error) throw new Error("ACCOUNT_READ_FAILED");
  return result.data?{...result.data,balance:balances.data.find((item)=>item.account_id===id)??null,transactions:transactions.data}:null;
}
