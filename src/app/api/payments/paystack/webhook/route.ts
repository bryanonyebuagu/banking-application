import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { payloadHash, verifyPaystackWebhook } from "@/server/payments/paystack";

const envelopeSchema=z.object({event:z.string(),data:z.unknown()});
const chargeSchema=z.object({id:z.number().int(),reference:z.string(),amount:z.number().int(),currency:z.string(),paid_at:z.string().nullable().optional()});

export async function POST(request:Request){
  const rawBody=await request.text();
  if(!verifyPaystackWebhook(rawBody,request.headers.get("x-paystack-signature"))) return NextResponse.json({error:"Invalid signature."},{status:401});
  try{
    const event=envelopeSchema.parse(JSON.parse(rawBody));
    if(event.event!=="charge.success") return NextResponse.json({received:true,processed:false});
    const charge=chargeSchema.parse(event.data);
    const admin=createAdminSupabaseClient();
    const result=await admin.rpc("process_paystack_event",{
      p_event_key:`${event.event}:${charge.id}`,p_event_type:event.event,p_payload_hash:payloadHash(rawBody),p_reference:charge.reference,
      p_provider_transaction_id:charge.id,p_amount_minor:charge.amount,p_currency:charge.currency,p_paid_at:charge.paid_at??new Date().toISOString(),
    });
    if(result.error) throw new Error("PAYSTACK_EVENT_PERSIST_FAILED");
    return NextResponse.json({received:true,processed:result.data});
  }catch(error){
    console.error(JSON.stringify({event:"PAYSTACK_WEBHOOK_FAILED",code:error instanceof Error?error.message:"UNKNOWN"}));
    return NextResponse.json({error:"Webhook processing failed."},{status:500});
  }
}
