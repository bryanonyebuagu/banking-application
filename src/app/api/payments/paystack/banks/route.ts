import { NextResponse } from "next/server";
import { environment } from "@/config/server";
import { getVerifiedIdentity } from "@/server/auth/identity";
import { listPaystackBanks } from "@/server/payments/paystack";

export async function GET(){
  const identity=await getVerifiedIdentity();
  if(!identity) return NextResponse.json({error:"Sign in to continue."},{status:401});
  if(environment.PAYSTACK_MODE==="disabled"||!environment.PAYSTACK_TRANSFERS_ENABLED||environment.PAYSTACK_CURRENCY!=="NGN") return NextResponse.json({error:"Withdrawals are not configured."},{status:503});
  try{return NextResponse.json({banks:await listPaystackBanks(environment.PAYSTACK_CURRENCY)});}catch(error){
    console.error(JSON.stringify({event:"PAYSTACK_BANK_LIST_FAILED",code:error instanceof Error?error.message:"UNKNOWN"}));
    return NextResponse.json({error:"Banks could not be loaded."},{status:502});
  }
}
