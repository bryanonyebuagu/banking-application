import Link from "next/link";
import { Alert, Card } from "@/components/ui/surfaces";
import { requireVerifiedIdentity } from "@/server/auth/identity";
import { getPaymentRailCapabilities } from "@/server/payments/provider";

const statusLabel = {
  production_credentials_configured: "Credentials configured",
  provider_configuration_required: "Provider setup required",
  institutional_approval_required: "Institution approval required",
} as const;

export default async function ReceiveMoneyPage() {
  await requireVerifiedIdentity();
  const capabilities = getPaymentRailCapabilities();
  const connected = capabilities.some((item) => item.status === "production_credentials_configured");
  return <main id="main-content" className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-widest text-action">Move money</p><h1 className="mt-2 text-3xl font-semibold">Receive money</h1><p className="mt-3 max-w-2xl text-muted">Choose an available payment rail and use the provider-issued receiving instructions for your account.</p></div><Link className="font-semibold text-action underline" href="/dashboard">Back to dashboard</Link></div>
    {!connected && <div className="mt-7"><Alert title="Receiving rails are awaiting activation">BANK will not display account instructions or accept external payment requests until an approved provider has issued production credentials and account entitlements.</Alert></div>}
    <div className="mt-8 grid gap-5 md:grid-cols-2">{capabilities.map((item) => <Card key={item.rail}><div className="flex items-start justify-between gap-4"><h2 className="text-xl font-semibold">{item.name}</h2><span className={item.status === "production_credentials_configured" ? "text-sm font-semibold text-success" : "text-sm font-semibold text-muted"}>{statusLabel[item.status]}</span></div><p className="mt-3 text-muted">{item.description}</p>{item.status === "production_credentials_configured" ? <p className="mt-5 text-sm font-semibold text-action">Provider credentials are present. Receiving instructions remain hidden until the approved API operation is connected.</p> : <p className="mt-5 text-sm text-muted">No receiving details are shown until activation is complete.</p>}</Card>)}</div>
  </main>;
}
