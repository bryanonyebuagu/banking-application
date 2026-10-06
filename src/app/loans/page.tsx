import Link from "next/link";
import { Card, EmptyState } from "@/components/ui/surfaces";
import { requireVerifiedIdentity } from "@/server/auth/identity";
import { listCurrentLoans } from "@/server/loans/queries";

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value / 100);
}

export default async function LoansPage() {
  await requireVerifiedIdentity();
  const loans = await listCurrentLoans();
  return <main id="main-content" className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-widest text-action">Borrowing</p><h1 className="mt-2 text-3xl font-semibold">Loans</h1><p className="mt-2 text-muted">Personal and auto loans with clear, ledger-backed balances.</p></div><div className="flex flex-wrap gap-4"><Link className="inline-flex min-h-11 items-center font-semibold text-action underline" href="/dashboard">Back to dashboard</Link><Link className="inline-flex min-h-11 items-center rounded-control bg-action px-4 font-semibold text-white" href="/loans/new">Open a loan</Link></div></div>
    {loans.length === 0 ? <div className="mt-8"><EmptyState title="No loans yet">Open a loan to see terms, outstanding balance and payment history.</EmptyState></div> : <div className="mt-8 grid gap-5 sm:grid-cols-2">{loans.map((loan) => <Card key={loan.id}><p className="text-xs font-semibold uppercase tracking-widest text-action">{loan.kind} loan</p><h2 className="mt-3 text-2xl font-semibold tabular-nums">{money(loan.balance?.outstanding_minor ?? 0, loan.currency)}</h2><p className="mt-1 text-sm text-muted">Outstanding · {loan.status.replace("_", " ")}</p><dl className="mt-5 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-muted">Monthly payment</dt><dd className="font-semibold">{money(loan.monthly_payment_minor, loan.currency)}</dd></div><div><dt className="text-muted">Next due</dt><dd className="font-semibold">{loan.next_due_date ?? "Paid off"}</dd></div></dl><Link className="mt-5 inline-flex min-h-11 items-center font-semibold text-action underline" href={"/loans/" + loan.id}>View loan</Link></Card>)}</div>}
  </main>;
}
