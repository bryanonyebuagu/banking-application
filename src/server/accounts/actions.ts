"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireVerifiedIdentity } from "@/server/auth/identity";
import { requireSameOrigin } from "@/server/security/request";

export type AccountActionState={status:"idle"|"error";message?:string;fieldErrors?:Record<string,string[]|undefined>};
const nickname=z.string().trim().min(1,"Enter an account nickname.").max(80,"Use 80 characters or fewer.");
function entry(data:FormData,key:string){const value=data.get(key);return typeof value==="string"?value:""}
async function authorize(){await requireSameOrigin();await requireVerifiedIdentity();return createServerSupabaseClient()}

export async function openAccountAction(_state:AccountActionState,formData:FormData):Promise<AccountActionState>{
  const parsed=z.object({accountType:z.enum(["checking","savings"]),nickname}).safeParse({accountType:entry(formData,"accountType"),nickname:entry(formData,"nickname")});
  if(!parsed.success)return{status:"error",message:"Check the highlighted information.",fieldErrors:parsed.error.flatten().fieldErrors};
  const supabase=await authorize();
  const result=await supabase.rpc("open_current_account",{p_account_type:parsed.data.accountType,p_nickname:parsed.data.nickname});
  if(result.error||!result.data)return{status:"error",message:"We couldn’t open this account. Confirm registration and verification are complete, then try again."};
  revalidatePath("/dashboard");redirect(`/accounts/${result.data}?message=opened`);
}

export async function renameAccountAction(_state:AccountActionState,formData:FormData):Promise<AccountActionState>{
  const parsed=z.object({accountId:z.uuid(),nickname}).safeParse({accountId:entry(formData,"accountId"),nickname:entry(formData,"nickname")});
  if(!parsed.success)return{status:"error",message:"Check the highlighted information.",fieldErrors:parsed.error.flatten().fieldErrors};
  const supabase=await authorize();const result=await supabase.rpc("rename_current_account",{p_account_id:parsed.data.accountId,p_nickname:parsed.data.nickname});
  if(result.error)return{status:"error",message:"We couldn’t update this account. Closed accounts cannot be renamed."};
  revalidatePath("/dashboard");revalidatePath(`/accounts/${parsed.data.accountId}`);redirect(`/accounts/${parsed.data.accountId}?message=renamed`);
}

export async function fundAccountAction(_state:AccountActionState,formData:FormData):Promise<AccountActionState>{
  const parsed=z.object({accountId:z.uuid(),amount:z.string().regex(/^\d{1,7}(\.\d{1,2})?$/,"Enter a valid amount."),commandKey:z.uuid()}).safeParse({accountId:entry(formData,"accountId"),amount:entry(formData,"amount"),commandKey:entry(formData,"commandKey")});
  if(!parsed.success)return{status:"error",message:"Enter a synthetic funding amount from $0.01 to $1,000,000.00.",fieldErrors:parsed.error.flatten().fieldErrors};
  const [whole,fraction=""]=parsed.data.amount.split(".");const amountMinor=Number(whole)*100+Number(fraction.padEnd(2,"0"));
  if(amountMinor<1||amountMinor>100000000)return{status:"error",message:"Enter a synthetic funding amount from $0.01 to $1,000,000.00."};
  const supabase=await authorize();const result=await supabase.rpc("fund_current_account_synthetic",{p_account_id:parsed.data.accountId,p_amount_minor:amountMinor,p_idempotency_key:parsed.data.commandKey});
  if(result.error)return{status:"error",message:"We couldn’t post the synthetic funds. Confirm the account is active and try again."};
  revalidatePath("/dashboard");revalidatePath(`/accounts/${parsed.data.accountId}`);redirect(`/accounts/${parsed.data.accountId}?message=funded`);
}

export async function reverseTransactionAction(formData:FormData){
  const parsed=z.object({accountId:z.uuid(),transactionId:z.uuid(),commandKey:z.uuid()}).safeParse({accountId:entry(formData,"accountId"),transactionId:entry(formData,"transactionId"),commandKey:entry(formData,"commandKey")});
  if(!parsed.success)redirect("/dashboard");const supabase=await authorize();const result=await supabase.rpc("reverse_current_transaction",{p_transaction_id:parsed.data.transactionId,p_idempotency_key:parsed.data.commandKey});
  revalidatePath("/dashboard");revalidatePath(`/accounts/${parsed.data.accountId}`);redirect(`/accounts/${parsed.data.accountId}?message=${result.error?"reversal-failed":"reversed"}`);
}
