import "server-only";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type TransactionSearchInput={q?:string;status?:string;category?:string;from?:string;to?:string;min?:string;max?:string;cursor?:string};
const optional=(maximum:number)=>z.string().trim().max(maximum).optional().transform(value=>value||undefined);
const money=z.string().regex(/^\d{1,10}(\.\d{1,2})?$/).optional().or(z.literal("").transform(()=>undefined));
const schema=z.object({q:optional(100),status:z.enum(["pending","posted","failed","reversed"]).optional().or(z.literal("").transform(()=>undefined)),category:optional(80),from:z.iso.date().optional().or(z.literal("").transform(()=>undefined)),to:z.iso.date().optional().or(z.literal("").transform(()=>undefined)),min:money,max:money,cursor:optional(500)});
function minor(value:string|undefined){if(!value)return undefined;const[whole,fraction=""]=value.split(".");return Number(whole)*100+Number(fraction.padEnd(2,"0"))}
function decodeCursor(value:string|undefined){if(!value)return null;try{const parsed=z.object({createdAt:z.string().min(1),id:z.uuid()}).parse(JSON.parse(Buffer.from(value,"base64url").toString("utf8")));return parsed}catch{return null}}
export function encodeTransactionCursor(createdAt:string,id:string){return Buffer.from(JSON.stringify({createdAt,id})).toString("base64url")}

export async function searchCurrentTransactions(input:TransactionSearchInput){
  const parsed=schema.safeParse(input);if(!parsed.success)return{items:[],hasMore:false,filters:input,invalid:true as const};
  const cursor=decodeCursor(parsed.data.cursor);if(parsed.data.cursor&&!cursor)return{items:[],hasMore:false,filters:parsed.data,invalid:true as const};
  const minimum=minor(parsed.data.min),maximum=minor(parsed.data.max);if(minimum!==undefined&&maximum!==undefined&&minimum>maximum)return{items:[],hasMore:false,filters:parsed.data,invalid:true as const};
  const supabase=await createServerSupabaseClient();const result=await supabase.rpc("search_current_transactions",{
    p_query:parsed.data.q,p_status:parsed.data.status,p_category:parsed.data.category,p_date_from:parsed.data.from,p_date_to:parsed.data.to,
    p_amount_min:minimum,p_amount_max:maximum,p_cursor_created_at:cursor?.createdAt,p_cursor_id:cursor?.id,p_page_size:21,
  });
  if(result.error)throw new Error("TRANSACTION_SEARCH_FAILED");return{items:(result.data??[]).slice(0,20),hasMore:(result.data?.length??0)>20,filters:parsed.data,invalid:false as const};
}

export async function getCurrentTransaction(id:string){
  const valid=z.uuid().safeParse(id);if(!valid.success)return null;const supabase=await createServerSupabaseClient();const transaction=await supabase.from("transactions").select("id,account_id,type,direction,amount_minor,currency,merchant,description,category,status,posted_at,created_at,original_transaction_id").eq("id",id).maybeSingle();
  if(transaction.error)throw new Error("TRANSACTION_READ_FAILED");if(!transaction.data)return null;const data=transaction.data;const[account,balances]=await Promise.all([supabase.from("accounts").select("id,nickname,masked_account_number").eq("id",data.account_id).maybeSingle(),supabase.rpc("get_current_account_balances")]);if(account.error||balances.error||!account.data)return null;return{...data,account:account.data,balance:balances.data.find(item=>item.account_id===data.account_id)??null};
}
