import { Alert, Card } from "@/components/ui/surfaces";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DashboardOverview } from "@/features/dashboard/dashboard-overview";
import { DashboardServiceGrid, DashboardUtilityLink } from "@/features/dashboard/banking-service-grid";
import { logoutAction } from "@/server/auth/actions";
import { requireVerifiedIdentity } from "@/server/auth/identity";
import { getDashboardOverview } from "@/server/dashboard/overview";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const identity=await requireVerifiedIdentity();
  const [overview,params]=await Promise.all([getDashboardOverview(),searchParams]);
  const firstName=overview.customer?.first_name??identity.firstName;
  return <main id="main-content" className="mx-auto w-full max-w-banking px-4 py-8 sm:px-6 lg:px-8">
    {params.message==="step-up-required"&&<div className="mb-6"><Alert title="Additional verification is required">Complete MFA before this sensitive action.</Alert></div>}
    <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-sm font-semibold uppercase tracking-widest text-action">Online banking</p><h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">{firstName?`Hi, ${firstName}`:"Hi, welcome to Chaze Bank"}</h1><p className="mt-2 text-muted">See your accounts, balances and recent activity.</p></div><div className="ml-auto flex items-center gap-3"><DashboardUtilityLink kind="notifications" href="/notifications" label="Notifications"/><DashboardUtilityLink kind="settings" href="/settings" label="Settings"/><form action={logoutAction}><Button type="submit" variant="secondary">Sign out</Button></form></div></div>
    <DashboardServiceGrid/>
    <DashboardOverview overview={overview}/>
    <Card className="mt-10"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Session security</h2><Link className="font-semibold text-action underline underline-offset-4" href="/security-center">Open Security Center</Link></div><dl className="mt-4 grid gap-4 sm:grid-cols-3"><div><dt className="text-sm text-muted">Account email</dt><dd className="font-semibold">{identity.email??"Verified account"}</dd></div><div><dt className="text-sm text-muted">Current assurance</dt><dd className="font-semibold">{identity.currentAssuranceLevel?.toUpperCase()??"Unavailable"}</dd></div><div><dt className="text-sm text-muted">Available assurance</dt><dd className="font-semibold">{identity.nextAssuranceLevel?.toUpperCase()??"Unavailable"}</dd></div></dl></Card>
    <section className="mt-10 rounded-[1.5rem] bg-[#073b6f] px-5 py-6 text-white shadow-[0_9px_0_#052b51,0_16px_28px_rgb(0_35_73_/_0.2)] sm:flex sm:items-center sm:justify-between sm:px-7" aria-labelledby="support-heading"><div><h2 id="support-heading" className="text-xl font-bold">Need help?</h2><p className="mt-1 text-sm text-[#d9eaf8]">Get answers and contact Chaze Bank support.</p></div><Link className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 font-bold text-[#064f91] shadow-[0_4px_0_#a9c7df] transition hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[0_2px_0_#a9c7df] motion-reduce:transform-none sm:mt-0" href="/support">Visit Support</Link></section>
  </main>;
}
