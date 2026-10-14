import Link from "next/link";
import { Card } from "@/components/ui/surfaces";
import { requireVerifiedIdentity } from "@/server/auth/identity";
import { verifyPaystackTransaction } from "@/server/payments/paystack";

export default async function PaystackCallbackPage({searchParams}:{searchParams:Promise<{reference?:string;trxref?:string}>}){
  await requireVerifiedIdentity();
  const parameters=await searchParams;
  const reference=parameters.reference??parameters.trxref;
  let successful=false;
  if(reference&&/^chaze_[a-zA-Z0-9_-]{16,80}$/.test(reference)){
    try{const transaction=await verifyPaystackTransaction(reference);successful=transaction.status==="success";}catch{successful=false;}
  }
  return <main id="main-content" className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6"><Card><p className="text-sm font-semibold uppercase tracking-widest text-action">Payment status</p><h1 className="mt-3 text-3xl font-semibold">{successful?"Payment received":"Payment confirmation pending"}</h1><p className="mt-4 text-muted">{successful?"Paystack confirmed the payment. Chaze Bank will retain the provider receipt for reconciliation.":"The provider has not confirmed a completed payment. Check again later or start a new payment."}</p><div className="mt-7 flex gap-4"><Link className="font-semibold text-action underline" href="/receive-money">Return to payments</Link><Link className="font-semibold text-action underline" href="/dashboard">Dashboard</Link></div></Card></main>;
}
