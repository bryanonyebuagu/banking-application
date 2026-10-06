import Link from "next/link";
import { Alert, Card } from "@/components/ui/surfaces";
import { Input, Select } from "@/components/ui/fields";
import { requireVerifiedIdentity } from "@/server/auth/identity";
import { submitMortgageApplicationAction } from "@/server/mortgages/actions";
export default async function MortgageApplyPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  await requireVerifiedIdentity(); const query = await searchParams;
  return <main id="main-content" className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6"><Link className="font-semibold text-action underline" href="/mortgages">Back to mortgages</Link><h1 className="mt-8 text-3xl font-semibold">Mortgage application</h1><p className="mt-3 text-muted">Tell us about the property, your employment and the financing you need.</p>{query.message && <div className="mt-5"><Alert title="Application not submitted" tone="error">Check the identifiers, amount and term.</Alert></div>}<Card className="mt-8"><form action={submitMortgageApplicationAction} className="space-y-5"><Input name="property" label="Property reference" required placeholder="SIM-HOME-001"/><Input name="employment" label="Employment reference" required placeholder="SIM-JOB-001"/><Input name="amount" label="Requested amount" required inputMode="decimal" placeholder="250000.00"/><Select name="term" label="Term" required defaultValue="360"><option value="180">15 years</option><option value="360">30 years</option></Select><button className="min-h-11 rounded-control bg-action px-4 font-semibold text-white">Submit application</button></form></Card></main>;
}
