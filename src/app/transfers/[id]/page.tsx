import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Card } from "@/components/ui/surfaces";
import { requireVerifiedIdentity } from "@/server/auth/identity";
import { cancelScheduledTransferAction } from "@/server/transfers/actions";
import { getCurrentTransfer } from "@/server/transfers/queries";

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value / 100);
}

export default async function TransferReceipt({ params }: { params: Promise<{ id: string }> }) {
  await requireVerifiedIdentity();
  const { id } = await params;
  const item = await getCurrentTransfer(id);
  if (!item) notFound();
  const isScheduled = item.status === "scheduled";

  return <main id="main-content" className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
    <Link className="font-semibold text-action underline" href="/transfers">Back to transfers</Link>
    <div className="mt-8">
      <Alert title={item.status === "completed" ? "Transfer complete" : isScheduled ? "Transfer scheduled" : "Transfer status"} tone={item.status === "completed" ? "success" : "info"}>
        {isScheduled ? "The transfer will be processed at the scheduled time." : "This persisted receipt can be safely revisited."}
      </Alert>
    </div>
    <h1 className="mt-6 text-3xl font-semibold">{money(item.amount_minor, item.currency)}</h1>
    <Card className="mt-6">
      <dl className="grid gap-5 sm:grid-cols-2">
        <div><dt className="text-sm text-muted">From</dt><dd className="font-semibold">{item.source?.nickname ?? "Account"} {item.source?.masked_account_number}</dd></div>
        <div><dt className="text-sm text-muted">To</dt><dd className="font-semibold">{item.destination ? `${item.destination.nickname} ${item.destination.masked_account_number}` : item.recipient ? `${item.recipient.label} ${item.recipient.masked_identifier}` : "External destination"}</dd></div>
        <div><dt className="text-sm text-muted">Status</dt><dd className="font-semibold capitalize">{item.status}</dd></div>
        <div><dt className="text-sm text-muted">Created</dt><dd className="font-semibold">{new Date(item.created_at).toLocaleString("en-US")}</dd></div>
        {item.scheduled_at && <div className="sm:col-span-2"><dt className="text-sm text-muted">Scheduled execution</dt><dd className="font-semibold">{new Date(item.scheduled_at).toLocaleString("en-US", { timeZone: "UTC", timeZoneName: "short" })}</dd></div>}
        <div className="sm:col-span-2"><dt className="text-sm text-muted">Memo</dt><dd className="font-semibold">{item.memo || "None"}</dd></div>
        <div className="sm:col-span-2"><dt className="text-sm text-muted">Receipt ID</dt><dd className="break-all font-mono text-sm">{item.id}</dd></div>
      </dl>
      {isScheduled && <form action={cancelScheduledTransferAction} className="mt-6 border-t border-border pt-6">
        <input type="hidden" name="transferId" value={item.id} />
        <button className="min-h-11 rounded-control border border-danger px-4 py-2 font-semibold text-danger" type="submit">Cancel scheduled transfer</button>
      </form>}
    </Card>
  </main>;
}
