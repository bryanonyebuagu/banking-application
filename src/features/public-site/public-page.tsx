import Link from "next/link";
import { Alert, Card } from "@/components/ui/surfaces";
import type { PublicPage } from "./content";

export function PublicProductPage({ page }: { page: PublicPage }) {
  return <main id="main-content">
    <section className="bg-brand text-white"><div className="mx-auto max-w-public px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
      <p className="text-sm font-semibold uppercase tracking-widest text-white/80">{page.eyebrow}</p>
      <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">{page.title}</h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-white/90">{page.summary}</p>
      <div className="mt-7 flex flex-wrap gap-3"><Link className="inline-flex min-h-11 items-center rounded-control bg-white px-5 py-2 font-semibold text-brand" href="/sign-up">Create a demo account</Link><Link className="inline-flex min-h-11 items-center rounded-control border border-white px-5 py-2 font-semibold text-white" href="/login">Sign in</Link></div>
    </div></section>
    <div className="mx-auto max-w-public px-4 py-10 sm:px-6 lg:px-8">
      <Alert title="Development availability">{page.availability} All accounts, balances and activity in this application are synthetic and have no monetary value.</Alert>
      <section aria-labelledby="features-heading" className="mt-10"><h2 id="features-heading" className="text-2xl font-semibold">What to expect</h2><div className="mt-6 grid gap-5 md:grid-cols-3">{page.features.map((feature)=><Card key={feature.title}><h3 className="text-xl font-semibold">{feature.title}</h3><p className="mt-3 text-muted">{feature.description}</p></Card>)}</div></section>
      <section className="mt-10 border-t border-border pt-8"><h2 className="text-2xl font-semibold">Banking with confidence</h2><p className="mt-3 max-w-3xl text-muted">{page.guidance}</p><Link className="mt-5 inline-flex min-h-11 items-center font-semibold text-action underline underline-offset-4" href="/security">Visit the Security Center</Link></section>
    </div>
  </main>;
}
