import Link from "next/link";
import { EmptyState } from "@/components/ui/surfaces";
import { requireVerifiedIdentity } from "@/server/auth/identity";
import { listCurrentStatements } from "@/server/statements/queries";

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value / 100);
}

export default async function StatementsPage() {
  await requireVerifiedIdentity();
  const statements = await listCurrentStatements();
  return <main id="main-content" className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-sm font-semibold uppercase tracking-widest text-action">Documents</p><h1 className="mt-2 text-3xl font-semibold">Statements</h1><p className="mt-2 text-muted">Private, ledger-derived snapshots of your account activity.</p></div>
      <div className="flex flex-wrap gap-4"><Link className="inline-flex min-h-11 items-center font-semibold text-action underline" href="/dashboard">Back to dashboard</Link><Link className="inline-flex min-h-11 items-center rounded-control bg-action px-4 font-semibold text-white" href="/statements/new">Generate statement</Link></div>
    </div>
    {statements.length === 0 ? <div className="mt-8"><EmptyState title="No statements yet">Generate a statement for an active account and completed date range.</EmptyState></div> : <div className="mt-8 divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">{statements.map((item) => <Link className="grid min-h-20 items-center gap-2 p-4 hover:bg-subtle sm:grid-cols-[1fr_auto]" href={"/statements/" + item.id} key={item.id}><span><span className="block font-semibold">{item.accounts?.nickname ?? "Account"} {item.accounts?.masked_account_number}</span><span className="text-sm text-muted">{item.period_start} through {item.period_end} · Version {item.version}</span></span><span className="font-semibold tabular-nums">{money(item.closing_minor, item.currency)}</span></Link>)}</div>}
  </main>;
}
