import Link from "next/link";
import { Alert, Card } from "@/components/ui/surfaces";
import { environment } from "@/config/server";
import { PaystackPaymentForm } from "@/features/payments/paystack-payment-form";
import { requireVerifiedIdentity } from "@/server/auth/identity";
import { listCurrentAccounts } from "@/server/accounts/queries";
import { getPaymentRailCapabilities } from "@/server/payments/provider";
import { enabledPaystackChannels } from "@/server/payments/paystack";

const statusLabel = {
  production_credentials_configured: "Credentials configured",
  provider_configuration_required: "Provider setup required",
  institutional_approval_required: "Institution approval required",
} as const;

export default async function ReceiveMoneyPage() {
  await requireVerifiedIdentity();
  const [capabilities,accounts] = await Promise.all([Promise.resolve(getPaymentRailCapabilities()),listCurrentAccounts()]);
  const connected = capabilities.some((item) => item.status === "production_credentials_configured");
  const paystackEnabled = environment.PAYSTACK_MODE !== "disabled";
  const paymentChannels = paystackEnabled ? enabledPaystackChannels() : [];
  const depositAccounts=accounts.filter((account)=>account.status==="active"&&account.currency===environment.PAYSTACK_CURRENCY).map((account)=>({id:account.id,nickname:account.nickname,maskedAccountNumber:account.masked_account_number}));
  return <main id="main-content" className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-widest text-action">Provider integrations</p><h1 className="mt-2 text-3xl font-semibold">Receive money</h1><p className="mt-3 max-w-2xl text-muted">Use an activated online checkout or review the regulated provider connections required for customer banking rails.</p></div><Link className="font-semibold text-action underline" href="/dashboard">Back to dashboard</Link></div>
    <div className="mt-7"><Card><p className="text-sm font-semibold uppercase tracking-widest text-action">Account deposit</p><h2 className="mt-2 text-2xl font-semibold">Deposit securely online</h2><p className="mt-3 text-muted">Choose an account and complete Paystack-hosted checkout. The deposit is posted only after Paystack sends a signed confirmation matching the original amount and currency.</p>{paystackEnabled&&depositAccounts.length>0?<div className="mt-6 max-w-xl"><PaystackPaymentForm currency={environment.PAYSTACK_CURRENCY} channels={paymentChannels} accounts={depositAccounts}/></div>:paystackEnabled?<div className="mt-5"><Alert title={`Open a ${environment.PAYSTACK_CURRENCY} account first`}>Deposits can only be posted to an active account in the same currency as the payment provider. <Link className="font-semibold text-action underline" href="/accounts/new">Open an account</Link>.</Alert></div>:<div className="mt-5"><Alert title="Online checkout is not configured">A server-side Paystack secret key and enabled payment channels are required before checkout can accept a payment.</Alert></div>}</Card></div>
    {!connected && <div className="mt-7"><Alert title="Banking rails are awaiting activation">Customer account details, ACH, wire, RTP/FedNow, debit-card issuing and Zelle require an approved sponsor-bank or banking provider. Chaze Bank will not invent receiving instructions or submit those transfers without provider-issued entitlements.</Alert></div>}
    <div className="mt-8 grid gap-5 md:grid-cols-2">{capabilities.map((item) => <Card key={item.rail}><div className="flex items-start justify-between gap-4"><h2 className="text-xl font-semibold">{item.name}</h2><span className={item.status === "production_credentials_configured" ? "text-sm font-semibold text-success" : "text-sm font-semibold text-muted"}>{statusLabel[item.status]}</span></div><p className="mt-3 text-muted">{item.description}</p>{item.status === "production_credentials_configured" ? <p className="mt-5 text-sm font-semibold text-action">Provider credentials are present. Receiving instructions remain hidden until the approved API operation is connected.</p> : <p className="mt-5 text-sm text-muted">No receiving details are shown until activation is complete.</p>}</Card>)}</div>
  </main>;
}
