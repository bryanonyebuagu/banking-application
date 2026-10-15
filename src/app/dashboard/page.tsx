import { Alert, Card } from "@/components/ui/surfaces";
import Link from "next/link";
import { DashboardOverview } from "@/features/dashboard/dashboard-overview";
import { DashboardServiceGrid } from "@/features/dashboard/banking-service-grid";
import { DashboardAutoRefresh } from "@/features/dashboard/dashboard-auto-refresh";
import { requireVerifiedIdentity } from "@/server/auth/identity";
import { getDashboardOverview } from "@/server/dashboard/overview";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const identity=await requireVerifiedIdentity();
  const [overview,params]=await Promise.all([getDashboardOverview(),searchParams]);
  const firstName=overview.customer?.first_name??identity.firstName;
  return <main id="main-content" className="mx-auto w-full max-w-banking px-4 py-8 sm:px-6 lg:px-8">
    {params.message==="step-up-required"&&<div className="mb-6"><Alert title="Additional verification is required">Complete MFA before this sensitive action.</Alert></div>}
    <DashboardAutoRefresh/>
    <div className="rounded-[1.5rem] bg-gradient-to-br from-brand to-[#003f78] px-6 py-7 text-white shadow-overlay sm:px-8"><p className="text-sm font-semibold uppercase tracking-widest text-white/85">Online banking</p><h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">{firstName?`Hi, ${firstName}`:"Hi, welcome to Chaze Bank"}</h1><div className="mt-6"><p className="text-sm font-semibold text-white/85">Total Balance</p><p className="mt-1 text-4xl font-bold tabular-nums">{new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(overview.totalAvailableUsdMinor/100)}</p><p className="mt-1 text-xs text-white/75">Available balance across active USD accounts</p></div></div>
    <DashboardServiceGrid/>
    <DashboardOverview overview={overview}/>
    <Card className="mt-10"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Session security</h2><Link className="font-semibold text-action underline underline-offset-4" href="/security-center">Open Security Center</Link></div><dl className="mt-4 grid gap-4 sm:grid-cols-3"><div><dt className="text-sm text-muted">Account email</dt><dd className="font-semibold">{identity.email??"Verified account"}</dd></div><div><dt className="text-sm text-muted">Current assurance</dt><dd className="font-semibold">{identity.currentAssuranceLevel?.toUpperCase()??"Unavailable"}</dd></div><div><dt className="text-sm text-muted">Available assurance</dt><dd className="font-semibold">{identity.nextAssuranceLevel?.toUpperCase()??"Unavailable"}</dd></div></dl></Card>
    <section className="mt-10 rounded-[1.5rem] bg-[var(--dashboard-support)] px-5 py-6 text-white shadow-overlay sm:px-7" aria-labelledby="support-heading"><div><h2 id="support-heading" className="text-xl font-bold">Need help?</h2><p className="mt-1 text-sm text-white/80">Get answers and contact Chaze Bank support.</p></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><Link className="inline-flex min-h-11 items-center justify-center rounded-full bg-surface px-4 font-bold text-action shadow-card" href="/support">Visit Support</Link><Link className="inline-flex min-h-11 items-center justify-center rounded-full bg-surface px-4 text-center font-bold text-action shadow-card" href="/faq">Frequently Asked Questions</Link><Link className="inline-flex min-h-11 items-center justify-center rounded-full bg-surface px-4 font-bold text-action shadow-card" href="/support/new">Contact Us</Link></div></section>
  </main>;
}
