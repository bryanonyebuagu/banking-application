import { NextResponse } from "next/server";
import { z } from "zod";
import { environment } from "@/config/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getVerifiedIdentity } from "@/server/auth/identity";
import { createPaystackReference, enabledPaystackChannels, initializePaystackTransaction, paystackChannels } from "@/server/payments/paystack";
import { requireSameOrigin } from "@/server/security/request";

const inputSchema=z.object({amountMinor:z.number().int().min(100).max(100_000_000),channel:z.enum(paystackChannels)});

export async function POST(request:Request){
  try{
    await requireSameOrigin();
    const identity=await getVerifiedIdentity();
    if(!identity?.email) return NextResponse.json({error:"Sign in with a verified email to continue."},{status:401});
    if(environment.PAYSTACK_MODE==="disabled") return NextResponse.json({error:"Online payments are not configured."},{status:503});
    const input=inputSchema.parse(await request.json());
    if(!enabledPaystackChannels().includes(input.channel)) return NextResponse.json({error:"That payment method is not enabled."},{status:400});
    const reference=createPaystackReference();
    const supabase=await createServerSupabaseClient();
    const created=await supabase.rpc("create_current_payment_collection",{p_reference:reference,p_amount_minor:input.amountMinor,p_currency:environment.PAYSTACK_CURRENCY,p_channel:input.channel});
    if(created.error) throw new Error("PAYMENT_COLLECTION_CREATE_FAILED");
    try{
      const initialized=await initializePaystackTransaction({email:identity.email,amountMinor:input.amountMinor,reference,channel:input.channel});
      const admin=createAdminSupabaseClient();
      const configured=await admin.rpc("configure_paystack_collection",{p_collection_id:created.data,p_authorization_url:initialized.authorization_url});
      if(configured.error) throw new Error("PAYMENT_COLLECTION_CONFIGURE_FAILED");
      return NextResponse.json({authorizationUrl:initialized.authorization_url});
    }catch(error){
      const admin=createAdminSupabaseClient();
      await admin.rpc("fail_paystack_collection",{p_collection_id:created.data,p_failure_code:error instanceof Error?error.message:"PAYSTACK_INITIALIZATION_FAILED"});
      throw error;
    }
  }catch(error){
    console.error(JSON.stringify({event:"PAYSTACK_INITIALIZE_FAILED",code:error instanceof Error?error.message:"UNKNOWN"}));
    const status=error instanceof z.ZodError?400:502;
    return NextResponse.json({error:status===400?"Check the payment amount and method.":"Payment setup could not be completed."},{status});
  }
}
