"use client";
import { useState } from "react";

type Props={currency:string;channels:string[];accounts:{id:string;nickname:string;maskedAccountNumber:string}[]};
const labels:Record<string,string>={card:"Card",bank:"Pay with bank",bank_transfer:"Bank transfer",ussd:"USSD",qr:"QR",mobile_money:"Mobile money",apple_pay:"Apple Pay"};

export function PaystackPaymentForm({currency,channels,accounts}:Props){
  const [accountId,setAccountId]=useState(accounts[0]?.id??"");const [amount,setAmount]=useState("");const [channel,setChannel]=useState(channels[0]??"card");const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setError("");
    const normalized=amount.trim();
    if(!/^\d{1,9}(?:\.\d{1,2})?$/.test(normalized)){setError("Enter a valid amount with no more than two decimal places.");return;}
    const [whole="",fraction=""]=normalized.split(".");
    const amountMinor=Number(BigInt(whole)*100n+BigInt(fraction.padEnd(2,"0")));
    if(amountMinor<100||amountMinor>100_000_000){setError("Enter an amount between 1.00 and 1,000,000.00.");return;}
    setBusy(true);
    try{
      const response=await fetch("/api/payments/paystack/initialize",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({accountId,amountMinor,channel})});
      const result=(await response.json()) as {authorizationUrl?:string;error?:string};
      if(!response.ok||!result.authorizationUrl) throw new Error(result.error??"Payment setup failed.");
      window.location.assign(result.authorizationUrl);
    }catch(cause){setError(cause instanceof Error?cause.message:"Payment setup failed.");setBusy(false);}
  }
  return <form className="space-y-5" onSubmit={submit}><div><label className="font-semibold" htmlFor="deposit-account">Deposit to</label><select id="deposit-account" className="mt-2 min-h-12 w-full rounded-control border border-border bg-white px-3" required value={accountId} onChange={(event)=>setAccountId(event.target.value)}><option value="" disabled>Select an account</option>{accounts.map((account)=><option key={account.id} value={account.id}>{account.nickname} {account.maskedAccountNumber}</option>)}</select></div><div><label className="font-semibold" htmlFor="payment-amount">Amount ({currency})</label><input id="payment-amount" className="mt-2 min-h-12 w-full rounded-control border border-border px-3" inputMode="decimal" required value={amount} onChange={(event)=>setAmount(event.target.value)} placeholder="0.00"/></div><div><label className="font-semibold" htmlFor="payment-channel">Payment method</label><select id="payment-channel" className="mt-2 min-h-12 w-full rounded-control border border-border bg-white px-3" value={channel} onChange={(event)=>setChannel(event.target.value)}>{channels.map((item)=><option key={item} value={item}>{labels[item]??item}</option>)}</select></div>{error&&<p role="alert" className="text-sm font-semibold text-danger">{error}</p>}<button className="min-h-12 rounded-control bg-action px-6 py-3 font-semibold text-white disabled:opacity-60" disabled={busy||channels.length===0||accounts.length===0}>{busy?"Opening secure payment…":"Continue to Paystack"}</button></form>;
}
