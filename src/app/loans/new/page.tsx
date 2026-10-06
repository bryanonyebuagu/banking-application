import { randomUUID } from "node:crypto";
import Link from "next/link";
import { Alert, Card, EmptyState } from "@/components/ui/surfaces";
import { Input, Select } from "@/components/ui/fields";
import { requireVerifiedIdentity } from "@/server/auth/identity";
import { openLoanAction } from "@/server/loans/actions";
import { getLoanAccountOptions } from "@/server/loans/queries";

export default async function NewLoanPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  await requireVerifiedIdentity();
  const [accounts, params] = await Promise.all([getLoanAccountOptions(), searchParams]);
  return <main id="main-content" className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
    <Link className="inline-flex min-h-11 items-center font-semibold text-action underline" href="/loans">Back to loans</Link>
    <h1 className="mt-8 text-3xl font-semibold">Open a loan</h1>
    <p className="mt-3 text-muted">Choose your terms and a deposit account for the proceeds. Personal loans use a fixed 12.00% APR; auto loans use 7.50% APR.</p>
    {params.message && <div className="mt-5"><Alert title={params.message === "invalid" ? "Check the loan details" : "Loan not opened"} tone="error">Use an eligible amount, term and active USD account, then try again.</Alert></div>}
    {accounts.length === 0 ? <div className="mt-8"><EmptyState title="No active deposit account">Open an active checking or savings account before creating a loan.</EmptyState></div> : <Card className="mt-8"><form action={openLoanAction} className="space-y-5">
      <input type="hidden" name="loanId" value={randomUUID()}/><input type="hidden" name="commandKey" value={randomUUID()}/>
      <Select name="kind" label="Loan type" required defaultValue="personal"><option value="personal">Personal loan</option><option value="auto">Auto loan</option></Select>
      <Input name="amount" label="Principal amount" inputMode="decimal" required placeholder="5000.00"/>
      <Select name="term" label="Term" required defaultValue="36"><option value="12">12 months</option><option value="24">24 months</option><option value="36">36 months</option><option value="48">48 months</option><option value="60">60 months</option></Select>
      <Select name="account" label="Deposit proceeds to" required defaultValue=""><option value="" disabled>Select account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.nickname} {account.masked_account_number}</option>)}</Select>
      <Alert title="Review your terms">Confirm the amount, term, rate and deposit account before continuing.</Alert>
      <button className="min-h-11 rounded-control bg-action px-4 font-semibold text-white" type="submit">Open loan</button>
    </form></Card>}
  </main>;
}
