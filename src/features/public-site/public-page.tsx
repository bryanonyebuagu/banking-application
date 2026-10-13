import Image from "next/image";
import Link from "next/link";
import { Alert, Card } from "@/components/ui/surfaces";
import type { PublicPage } from "./content";
import { getVerifiedIdentity } from "@/server/auth/identity";

const authenticatedDestinations: Record<string, { label: string; href: string }> = {
  checking: { label: "View My Accounts", href: "/dashboard#accounts" },
  savings: { label: "View My Accounts", href: "/dashboard#accounts" },
  "credit-cards": { label: "View My Cards", href: "/cards" },
  mortgage: { label: "My Applications", href: "/mortgages" },
  "auto-financing": { label: "My Loans", href: "/loans" },
  investing: { label: "View Investments", href: "/investments" },
  security: { label: "Security Center", href: "/security-center" },
  "help-center": { label: "Secure Support", href: "/support" },
  contact: { label: "Secure Support", href: "/support" },
};

const pageImages: Record<string, { src: string; alt: string }> = {
  checking: { src: "/images/everyday-banking-v1.webp", alt: "A customer reviewing everyday finances on her phone" },
  savings: { src: "/images/everyday-banking-v1.webp", alt: "A customer planning savings at home" },
  "credit-cards": { src: "/images/credit-cards-v1.webp", alt: "A selection of unbranded payment cards" },
  mortgage: { src: "/images/home-lending-v1.png", alt: "A family celebrating outside their new home" },
  "auto-financing": { src: "/images/everyday-banking-v1.webp", alt: "A customer reviewing a financing plan" },
  investing: { src: "/images/investing-v1.webp", alt: "A customer planning long-term financial goals" },
  education: { src: "/images/investing-v1.webp", alt: "A customer learning about financial goals" },
  "business-banking": { src: "/images/business-banking-v1.png", alt: "A small-business owner working in her bakery" },
  travel: { src: "/images/everyday-banking-v1.webp", alt: "A customer using mobile banking at home" },
  commercial: { src: "/images/business-banking-v1.png", alt: "A business owner using digital tools" },
  "wealth-management": { src: "/images/investing-v1.webp", alt: "A customer considering long-term financial plans" },
  security: { src: "/images/everyday-banking-v1.webp", alt: "A customer safely accessing mobile banking" },
  "help-center": { src: "/images/everyday-banking-v1.webp", alt: "A customer accessing online banking support" },
  faq: { src: "/images/investing-v1.webp", alt: "A customer reviewing helpful financial information" },
  contact: { src: "/images/business-banking-v1.png", alt: "A business customer using a tablet" },
};

export async function PublicProductPage({ page }: { page: PublicPage }) {
  const identity = await getVerifiedIdentity();
  const authenticatedAction = authenticatedDestinations[page.slug] ?? { label: "Go to Dashboard", href: "/dashboard" };
  const image = pageImages[page.slug];
  return <main id="main-content">
    <section className="overflow-hidden bg-brand text-white"><div className="mx-auto grid max-w-public items-stretch lg:grid-cols-[1.05fr_0.95fr]">
      <div className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20"><p className="text-sm font-semibold uppercase tracking-widest text-white/80">{page.eyebrow}</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">{page.title}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-white/90">{page.summary}</p>
        <div className="mt-7 flex flex-wrap gap-3">{identity?<><Link className="inline-flex min-h-11 items-center rounded-control bg-white px-5 py-2 font-semibold text-brand" href={authenticatedAction.href}>{authenticatedAction.label}</Link><Link className="inline-flex min-h-11 items-center rounded-control border border-white px-5 py-2 font-semibold text-white" href="/settings">My Profile</Link></>:<><Link className="inline-flex min-h-11 items-center rounded-control bg-white px-5 py-2 font-semibold text-brand" href="/sign-up">Create an Account</Link><Link className="inline-flex min-h-11 items-center rounded-control border border-white px-5 py-2 font-semibold text-white" href="/login">Sign in</Link></>}</div>
      </div>
      {image&&<div className="relative min-h-64 lg:min-h-full"><Image src={image.src} alt={image.alt} fill className="object-cover" sizes="(min-width: 1024px) 48vw, 100vw" /></div>}
    </div></section>
    <div className="mx-auto max-w-public px-4 py-10 sm:px-6 lg:px-8">
      <Alert title="Development availability">{page.availability} All accounts, balances and activity in this application are synthetic and have no monetary value.</Alert>
      <section aria-labelledby="features-heading" className="mt-10"><h2 id="features-heading" className="text-2xl font-semibold">What to expect</h2><div className="mt-6 grid gap-5 md:grid-cols-3">{page.features.map((feature)=><Card key={feature.title}><h3 className="text-xl font-semibold">{feature.title}</h3><p className="mt-3 text-muted">{feature.description}</p></Card>)}</div></section>
      <section className="mt-10 border-t border-border pt-8"><h2 className="text-2xl font-semibold">Banking with confidence</h2><p className="mt-3 max-w-3xl text-muted">{page.guidance}</p><Link className="mt-5 inline-flex min-h-11 items-center font-semibold text-action underline underline-offset-4" href="/security">Visit the Security Center</Link></section>
    </div>
  </main>;
}
