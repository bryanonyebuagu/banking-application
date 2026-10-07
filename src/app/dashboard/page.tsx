import { Alert, Card } from "@/components/ui/surfaces";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DashboardOverview } from "@/features/dashboard/dashboard-overview";
import { logoutAction } from "@/server/auth/actions";
import { requireVerifiedIdentity } from "@/server/auth/identity";
import { getDashboardOverview } from "@/server/dashboard/overview";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const identity=await requireVerifiedIdentity();
  const [overview,params]=await Promise.all([getDashboardOverview(),searchParams]);
  const firstName=overview.customer?.first_name??identity.firstName;
  return <main id="main-content" className="mx-auto w-full max-w-banking px-4 py-8 sm:px-6 lg:px-8">
    <nav aria-label="Online banking sections" className="mb-7 flex gap-5 overflow-x-auto border-b border-border pb-3 text-sm font-semibold"><a className="shrink-0 text-action underline underline-offset-4" href="#accounts">Accounts</a><Link className="shrink-0 text-action underline underline-offset-4" href="/transactions">Transactions</Link><Link className="shrink-0 text-action underline underline-offset-4" href="/receive-money">Receive money</Link><Link className="shrink-0 text-action underline underline-offset-4" href="/bill-pay">Bill Pay</Link><Link className="shrink-0 text-action underline underline-offset-4" href="/cards">Cards</Link><Link className="shrink-0 text-action underline underline-offset-4" href="/statements">Statements</Link><Link className="shrink-0 text-action underline underline-offset-4" href="/loans">Loans</Link><Link className="shrink-0 text-action underline underline-offset-4" href="/mortgages">Mortgages</Link><Link className="shrink-0 text-action underline underline-offset-4" href="/investments">Investments</Link><Link className="shrink-0 text-action underline underline-offset-4" href="/analytics">Analytics</Link><Link className="shrink-0 text-action underline underline-offset-4" href="/notifications">Notifications</Link><Link className="shrink-0 text-action underline underline-offset-4" href="/settings">Settings</Link><Link className="shrink-0 text-action underline underline-offset-4" href="/security-center">Security</Link><Link className="shrink-0 text-action underline underline-offset-4" href="/support">Support</Link><a className="shrink-0 text-action underline underline-offset-4" href="#actions">Quick actions</a><a className="shrink-0 text-action underline underline-offset-4" href="#alerts">Alerts</a></nav>
    {params.message==="step-up-required"&&<div className="mb-6"><Alert title="Additional verification is required">Complete MFA before this sensitive action.</Alert></div>}
    <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-sm font-semibold uppercase tracking-widest text-action">Online banking</p><h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">{firstName?`Hi, ${firstName}`:"Hi, welcome to Chaze Bank"}</h1><p className="mt-2 text-muted">See your accounts, balances and recent activity.</p></div><form action={logoutAction}><Button type="submit" variant="secondary">Sign out</Button></form></div>
    <DashboardOverview overview={overview}/>
    <Card className="mt-10"><h2 className="text-xl font-semibold">Session security</h2><dl className="mt-4 grid gap-4 sm:grid-cols-3"><div><dt className="text-sm text-muted">Account email</dt><dd className="font-semibold">{identity.email??"Verified account"}</dd></div><div><dt className="text-sm text-muted">Current assurance</dt><dd className="font-semibold">{identity.currentAssuranceLevel?.toUpperCase()??"Unavailable"}</dd></div><div><dt className="text-sm text-muted">Available assurance</dt><dd className="font-semibold">{identity.nextAssuranceLevel?.toUpperCase()??"Unavailable"}</dd></div></dl></Card>
  </main>;
}
