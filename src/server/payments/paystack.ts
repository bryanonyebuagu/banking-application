import "server-only";
import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { environment } from "@/config/server";

const API = "https://api.paystack.co";
export const paystackChannels = ["card","bank","bank_transfer","ussd","qr","mobile_money","apple_pay"] as const;
export type PaystackChannel = typeof paystackChannels[number];

const envelope = z.object({ status:z.boolean(), message:z.string(), data:z.unknown().optional() });
const initializeData = z.object({ authorization_url:z.url(), access_code:z.string(), reference:z.string() });
const verifyData = z.object({ id:z.number().int(), status:z.string(), reference:z.string(), amount:z.number().int(), currency:z.string(), paid_at:z.string().nullable() });
const bankData=z.array(z.object({name:z.string(),code:z.string(),active:z.boolean().optional(),currency:z.string().optional()}));
const resolvedAccountData=z.object({account_number:z.string(),account_name:z.string(),bank_id:z.number().int().optional()});
const recipientData=z.object({recipient_code:z.string(),active:z.boolean().optional(),currency:z.string()});
const transferData=z.object({id:z.number().int(),transfer_code:z.string(),reference:z.string(),status:z.string(),amount:z.number().int(),currency:z.string()});

function secret() {
  if (environment.PAYSTACK_MODE === "disabled" || !environment.PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_NOT_CONFIGURED");
  return environment.PAYSTACK_SECRET_KEY;
}

async function request(path:string, init:RequestInit) {
  const response=await fetch(`${API}${path}`,{...init,headers:{Authorization:`Bearer ${secret()}`,"Content-Type":"application/json",...(init.headers??{})},cache:"no-store"});
  const payload=envelope.parse(await response.json());
  if(!response.ok||!payload.status) throw new Error(`PAYSTACK_API_${response.status}`);
  return payload.data;
}

export function enabledPaystackChannels():PaystackChannel[] {
  const allowed=new Set<string>(paystackChannels);
  return environment.PAYSTACK_ALLOWED_CHANNELS.split(",").map((item)=>item.trim()).filter((item):item is PaystackChannel=>allowed.has(item));
}

export function createPaystackReference(){return `chaze_${randomBytes(18).toString("hex")}`;}

export async function initializePaystackTransaction(input:{email:string;amountMinor:number;reference:string;channel:PaystackChannel}) {
  const data=await request("/transaction/initialize",{method:"POST",body:JSON.stringify({email:input.email,amount:input.amountMinor,currency:environment.PAYSTACK_CURRENCY,reference:input.reference,channels:[input.channel],callback_url:`${environment.APP_ORIGIN}/payments/paystack/callback`})});
  return initializeData.parse(data);
}

export async function verifyPaystackTransaction(reference:string){
  const data=await request(`/transaction/verify/${encodeURIComponent(reference)}`,{method:"GET"});
  return verifyData.parse(data);
}

export async function createPaystackRefund(transactionId:number,amountMinor?:number){
  return request("/refund",{method:"POST",body:JSON.stringify({transaction:transactionId,...(amountMinor?{amount:amountMinor}:{})})});
}

export async function createPaystackTransferRecipient(input:{name:string;accountNumber:string;bankCode:string;currency:string}){
  const data=await request("/transferrecipient",{method:"POST",body:JSON.stringify({type:"nuban",name:input.name,account_number:input.accountNumber,bank_code:input.bankCode,currency:input.currency})});
  return recipientData.parse(data);
}

export async function initiatePaystackTransfer(input:{amountMinor:number;recipientCode:string;reference:string;reason:string}){
  const data=await request("/transfer",{method:"POST",body:JSON.stringify({source:"balance",amount:input.amountMinor,recipient:input.recipientCode,reference:input.reference,reason:input.reason})});
  return transferData.parse(data);
}

export async function listPaystackBanks(currency:string){
  const data=await request(`/bank?currency=${encodeURIComponent(currency)}&pay_with_bank_transfer=true`,{method:"GET"});
  return bankData.parse(data).filter((bank)=>bank.active!==false);
}

export async function resolvePaystackAccount(accountNumber:string,bankCode:string){
  const data=await request(`/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,{method:"GET"});
  return resolvedAccountData.parse(data);
}

export function verifyPaystackWebhook(rawBody:string,signature:string|null){
  if(!signature) return false;
  const expected=createHmac("sha512",secret()).update(rawBody).digest("hex");
  const expectedBuffer=Buffer.from(expected,"utf8");
  const signatureBuffer=Buffer.from(signature,"utf8");
  if(expectedBuffer.length!==signatureBuffer.length) return false;
  return timingSafeEqual(expectedBuffer,signatureBuffer);
}

export function payloadHash(rawBody:string){return createHash("sha256").update(rawBody).digest("hex");}
