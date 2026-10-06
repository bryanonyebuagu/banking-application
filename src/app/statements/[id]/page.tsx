import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Card } from "@/components/ui/surfaces";
import { requireVerifiedIdentity } from "@/server/auth/identity";
import { getCurrentStatement } from "@/server/statements/queries";

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value / 100);
}

export default async function StatementDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ message?: string }> }) {
  await requireVerifiedIdentity();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const statement = await getCurrentStatement(id);
  if (!statement) notFound();
  return <main id="main-content" className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
    <Link className="inline-flex min-h-11 items-center font-semibold text-action underline" href="/statements">Back to statements</Link>
    {query.message === "generated" && <div className="mt-5"><Alert title="Statement generated" tone="success">The reconciled PDF is ready in private storage.</Alert></div>}
    <div className="mt-8"><p className="text-sm font-semibold uppercase tracking-widest text-action">Account statement</p><h1 className="mt-2 text-3xl font-semibold">{statement.accounts?.nickname ?? "Account"} {statement.accounts?.masked_account_number}</h1><p className="mt-2 text-muted">{statement.period_start} through {statement.period_end} · Version {statement.version}</p></div>
    <Card className="mt-6"><dl className="grid gap-5 sm:grid-cols-2"><div><dt className="text-sm text-muted">Opening balance</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{money(statement.opening_minor, statement.currency)}</dd></div><div><dt className="text-sm text-muted">Closing balance</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{money(statement.closing_minor, statement.currency)}</dd></div><div><dt className="text-sm text-muted">Ledger cutoff</dt><dd className="font-semibold">{new Date(statement.ledger_cutoff).toLocaleString("en-US")}</dd></div><div><dt className="text-sm text-muted">Created</dt><dd className="font-semibold">{new Date(statement.created_at).toLocaleString("en-US")}</dd></div></dl>
      <a className="mt-6 inline-flex min-h-11 items-center rounded-control bg-action px-4 font-semibold text-white" href={statement.downloadUrl} target="_blank" rel="noreferrer">Open private PDF</a><p className="mt-3 text-xs text-muted">This secure link expires after five minutes.</p>
    </Card>
  </main>;
}
