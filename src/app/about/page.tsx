import Link from "next/link";
import { Card } from "@/components/ui/surfaces";

export const metadata = { title: "About this project" };

export default function AboutPage() {
  return <main id="main-content" className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
    <p className="text-sm font-semibold uppercase tracking-widest text-action">Project transparency</p>
    <h1 className="mt-3 text-4xl font-semibold">About Chaze Bank</h1>
    <p className="mt-5 text-lg leading-8 text-muted">Chaze Bank is a development portfolio application that demonstrates how a modern banking interface, authentication system, ledger and provider-neutral integration boundary can be engineered.</p>
    <div className="mt-8 grid gap-5 md:grid-cols-2">
      <Card><h2 className="text-xl font-semibold">What it is</h2><p className="mt-3 text-muted">A software project using Supabase authentication and synthetic application records to demonstrate account and servicing workflows.</p></Card>
      <Card><h2 className="text-xl font-semibold">What it is not</h2><p className="mt-3 text-muted">It is not a chartered bank, credit union, lender, broker, money transmitter or payment network. It cannot accept deposits, issue real credit, or settle real payments.</p></Card>
      <Card><h2 className="text-xl font-semibold">Information to use</h2><p className="mt-3 text-muted">Use an application-specific password and synthetic profile, identity, account and document information. Never submit real banking credentials or sensitive identity numbers.</p></Card>
      <Card><h2 className="text-xl font-semibold">Independence</h2><p className="mt-3 text-muted">Chaze Bank is an independent software project and is not affiliated with JPMorgan Chase &amp; Co., Zelle, or any financial institution.</p></Card>
    </div>
    <p className="mt-8 text-muted">Read the <Link className="font-semibold text-action underline" href="/privacy">privacy notice</Link> and <Link className="font-semibold text-action underline" href="/terms">terms of use</Link> before creating an application account. The project’s <a className="font-semibold text-action underline" href="https://github.com/bryanonyebuagu/banking-application" rel="noreferrer">source code is publicly available on GitHub</a>.</p>
  </main>;
}
