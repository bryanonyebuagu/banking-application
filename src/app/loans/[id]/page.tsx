import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Card, EmptyState } from "@/components/ui/surfaces";
import { Select } from "@/components/ui/fields";
import { requireVerifiedIdentity } from "@/server/auth/identity";
import { payLoanAction } from "@/server/loans/actions";
import { getCurrentLoan } from "@/server/loans/queries";

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value / 100);
}

export default async function LoanDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ message?: string }> }) {
  await requireVerifiedIdentity();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const loan = await getCurrentLoan(id);
  if (!loan) notFound();
  const due = Math.min(loan.monthly_payment_minor, loan.balance?.payoff_minor ?? loan.monthly_payment_minor);
  return <main id="main-content" className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
    <Link className="inline-flex min-h-11 items-center font-semibold text-action underline" href="/loans">Back to loans</Link>
    {query.message && <div className="mt-5"><Alert title={query.message === "opened" ? "Loan opened" : query.message === "paid" ? "Payment posted" : "Payment not completed"} tone={query.message === "failed" ? "error" : "success"}>{query.message === "opened" ? "The proceeds and loan receivable were posted through a balanced journal." : query.message === "paid" ? "Principal and interest were applied to the ledger and payment history." : "Check the funding account balance and loan status, then try again."}</Alert></div>}
    <div className="mt-8 flex flex-wrap items-end justify-between gap-5"><div><p className="text-sm font-semibold uppercase tracking-widest text-action">{loan.kind} loan</p><h1 className="mt-2 text-3xl font-semibold">{money(loan.balance?.outstanding_minor ?? 0, loan.currency)} outstanding</h1><p className="mt-2 capitalize text-muted">{loan.status.replace("_", " ")} · opened {new Date(loan.created_at).toLocaleDateString("en-US")}</p></div><div className="text-right"><p className="text-sm text-muted">Next payment</p><p className="text-2xl font-semibold tabular-nums">{money(due, loan.currency)}</p><p className="text-sm text-muted">Due {loan.next_due_date ?? "Paid off"}</p></div></div>
    <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_.75fr]"><Card><h2 className="text-xl font-semibold">Loan terms</h2><dl className="mt-5 grid gap-4 sm:grid-cols-2"><div><dt className="text-sm text-muted">Original principal</dt><dd className="font-semibold">{money(loan.principal_minor, loan.currency)}</dd></div><div><dt className="text-sm text-muted">Fixed APR</dt><dd className="font-semibold">{(loan.rate * 100).toFixed(2)}%</dd></div><div><dt className="text-sm text-muted">Term</dt><dd className="font-semibold">{loan.term_months} months</dd></div><div><dt className="text-sm text-muted">Scheduled payment</dt><dd className="font-semibold">{money(loan.monthly_payment_minor, loan.currency)}</dd></div><div><dt className="text-sm text-muted">Accrued monthly interest</dt><dd className="font-semibold">{money(loan.balance?.accrued_interest_minor ?? 0, loan.currency)}</dd></div><div><dt className="text-sm text-muted">Current payoff</dt><dd className="font-semibold">{money(loan.balance?.payoff_minor ?? 0, loan.currency)}</dd></div></dl></Card>
      <Card><h2 className="text-xl font-semibold">Make a payment</h2>{loan.status === "active" ? <form action={payLoanAction} className="mt-5 space-y-4"><input type="hidden" name="loanId" value={loan.id}/><input type="hidden" name="commandKey" value={randomUUID()}/><Select name="account" label="Pay from" required defaultValue=""><option value="" disabled>Select account</option>{loan.fundingAccounts.map((account) => <option key={account.id} value={account.id}>{account.nickname} {account.masked_account_number} — {money(account.balance?.available_balance_minor ?? 0, account.currency)}</option>)}</Select><p className="text-sm text-muted">This payment will be {money(due, loan.currency)}. The ledger applies interest first and principal second.</p><button className="min-h-11 rounded-control bg-action px-4 font-semibold text-white" type="submit">Pay loan</button></form> : <Alert title="Loan paid off" tone="success">No further payments are due.</Alert>}</Card></div>
    <section className="mt-8" aria-labelledby="history-heading"><h2 id="history-heading" className="text-2xl font-semibold">Payment history</h2>{loan.loan_payments.length === 0 ? <div className="mt-5"><EmptyState title="No payments yet">Posted loan payments will appear here.</EmptyState></div> : <div className="mt-5 divide-y divide-border rounded-card border border-border bg-surface">{loan.loan_payments.map((payment) => <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto]" key={payment.id}><div><p className="font-semibold">{payment.accounts?.nickname ?? "Deposit account"} {payment.accounts?.masked_account_number}</p><p className="text-sm text-muted">{new Date(payment.paid_at ?? payment.created_at).toLocaleString("en-US")} · {payment.status}</p></div><div className="text-right text-sm"><p className="font-semibold">Principal {money(payment.principal_minor, loan.currency)}</p><p className="text-muted">Interest {money(payment.interest_minor, loan.currency)}</p></div></div>)}</div>}</section>
  </main>;
}
