import Link from "next/link";
import { Alert, Card, EmptyState } from "@/components/ui/surfaces";
import { Input, Select } from "@/components/ui/fields";
import { requireVerifiedIdentity } from "@/server/auth/identity";
import { generateStatementAction } from "@/server/statements/actions";
import { getStatementAccountOptions } from "@/server/statements/queries";

function dateDefaults() {
  const today = new Date();
  const end = today.toISOString().slice(0, 10);
  const startDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  let start = startDate.toISOString().slice(0, 10);
  if (start === end) {
    startDate.setUTCDate(startDate.getUTCDate() - 1);
    start = startDate.toISOString().slice(0, 10);
  }
  return { start, end };
}

export default async function NewStatementPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  await requireVerifiedIdentity();
  const [accounts, params] = await Promise.all([getStatementAccountOptions(), searchParams]);
  const dates = dateDefaults();
  return <main id="main-content" className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
    <Link className="inline-flex min-h-11 items-center font-semibold text-action underline" href="/statements">Back to statements</Link>
    <h1 className="mt-8 text-3xl font-semibold">Generate a statement</h1>
    <p className="mt-3 text-muted">Choose a completed period. Each generation creates a new immutable version using a fixed ledger cutoff.</p>
    {params.message && <div className="mt-5"><Alert title={params.message === "invalid" ? "Check the statement period" : "Statement not generated"} tone="error">{params.message === "invalid" ? "Use an active account and a date range from 1 to 366 days that ends today or earlier." : "The snapshot, activity, and PDF could not be reconciled. No statement was retained."}</Alert></div>}
    {accounts.length === 0 ? <div className="mt-8"><EmptyState title="No active accounts">Open and verify an account before generating a statement.</EmptyState></div> : <Card className="mt-8"><form action={generateStatementAction} className="space-y-5">
      <Select name="account" label="Account" required defaultValue=""><option value="" disabled>Select account</option>{accounts.map((account) => <option value={account.id} key={account.id}>{account.nickname} {account.masked_account_number}</option>)}</Select>
      <div className="grid gap-5 sm:grid-cols-2"><Input name="start" label="Period start" type="date" required defaultValue={dates.start}/><Input name="end" label="Period end" type="date" required defaultValue={dates.end}/></div>
      <button className="min-h-11 rounded-control bg-action px-4 font-semibold text-white" type="submit">Generate private PDF</button>
    </form></Card>}
  </main>;
}
