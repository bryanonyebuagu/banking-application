import { NextResponse } from "next/server";
import { z } from "zod";
import { environment } from "@/config/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getVerifiedIdentity } from "@/server/auth/identity";
import { createPaystackReference,createPaystackTransferRecipient,initiatePaystackTransfer,listPaystackBanks,resolvePaystackAccount } from "@/server/payments/paystack";
import { requireSameOrigin } from "@/server/security/request";

const inputSchema=z.object({accountId:z.uuid(),amountMinor:z.number().int().min(100).max(100_000_000),bankCode:z.string().regex(/^[A-Za-z0-9_-]{2,20}$/),accountNumber:z.string().regex(/^\d{10}$/)});

export async function POST(request:Request){
  let withdrawalId:string|undefined;
  let transferAttempted=false;
  try{
    await requireSameOrigin();
    const identity=await getVerifiedIdentity();
    if(!identity) return NextResponse.json({error:"Sign in to continue."},{status:401});
    if(identity.currentAssuranceLevel!=="aal2") return NextResponse.json({error:"Complete MFA verification before withdrawing."},{status:403});
    if(environment.PAYSTACK_MODE==="disabled"||!environment.PAYSTACK_TRANSFERS_ENABLED||environment.PAYSTACK_CURRENCY!=="NGN") return NextResponse.json({error:"NGN withdrawals are not configured."},{status:503});
    const input=inputSchema.parse(await request.json());
    const resolved=await resolvePaystackAccount(input.accountNumber,input.bankCode);
    const banks=await listPaystackBanks(environment.PAYSTACK_CURRENCY);
    const bank=banks.find((item)=>item.code===input.bankCode);
    if(!bank) return NextResponse.json({error:"Select a supported bank."},{status:400});
    const reference=createPaystackReference();
    const supabase=await createServerSupabaseClient();
    const created=await supabase.rpc("create_current_paystack_withdrawal",{p_account_id:input.accountId,p_reference:reference,p_amount_minor:input.amountMinor,p_currency:environment.PAYSTACK_CURRENCY,p_beneficiary_name:resolved.account_name,p_bank_name:bank.name,p_masked_destination:`******${input.accountNumber.slice(-4)}`});
    if(created.error||!created.data?.[0]) throw new Error("WITHDRAWAL_HOLD_FAILED");
    withdrawalId=created.data[0].withdrawal_id;
    const recipient=await createPaystackTransferRecipient({name:resolved.account_name,accountNumber:input.accountNumber,bankCode:input.bankCode,currency:environment.PAYSTACK_CURRENCY});
    transferAttempted=true;
    const transfer=await initiatePaystackTransfer({amountMinor:input.amountMinor,recipientCode:recipient.recipient_code,reference,reason:"Chaze Bank withdrawal"});
    const admin=createAdminSupabaseClient();
    const configured=await admin.rpc("configure_paystack_withdrawal",{p_withdrawal_id:withdrawalId,p_recipient_code:recipient.recipient_code,p_transfer_id:transfer.id,p_transfer_code:transfer.transfer_code});
    if(configured.error) throw new Error("WITHDRAWAL_CONFIGURE_FAILED");
    return NextResponse.json({accepted:true,reference,providerApprovalRequired:transfer.status==="otp"});
  }catch(error){
    if(withdrawalId&&!transferAttempted){const admin=createAdminSupabaseClient();await admin.rpc("fail_paystack_withdrawal",{p_withdrawal_id:withdrawalId,p_failure_code:error instanceof Error?error.message:"WITHDRAWAL_INITIALIZATION_FAILED"});}
    console.error(JSON.stringify({event:"PAYSTACK_WITHDRAWAL_FAILED",code:error instanceof Error?error.message:"UNKNOWN"}));
    if(withdrawalId&&transferAttempted)return NextResponse.json({accepted:true,pending:true},{status:202});
    const status=error instanceof z.ZodError?400:502;
    return NextResponse.json({error:status===400?"Check the withdrawal details.":"The withdrawal could not be submitted."},{status});
  }
}
