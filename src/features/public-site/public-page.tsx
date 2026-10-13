import Link from "next/link";
import { HeroCarousel, type HeroAction, type HeroSlide } from "@/components/marketing/hero-carousel";
import { Alert, Card } from "@/components/ui/surfaces";
import type { PublicPage } from "./content";
import { productHeroSlides, withHeroActions } from "./hero-content";
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

const fallbackImages: Record<string, { src: string; alt: string }> = {
  checking: { src: "/images/everyday-banking-v1.webp", alt: "A customer reviewing everyday finances on her phone" },
  "credit-cards": { src: "/images/credit-cards-v1.webp", alt: "A selection of unbranded payment cards" },
  mortgage: { src: "/images/home-lending-v1.png", alt: "A family celebrating outside their new home" },
  investing: { src: "/images/investing-v1.webp", alt: "A customer planning long-term financial goals" },
  "business-banking": { src: "/images/business-banking-v1.png", alt: "A small-business owner working in her bakery" },
  commercial: { src: "/images/business-banking-v1.png", alt: "A business owner using digital tools" },
  "wealth-management": { src: "/images/investing-v1.webp", alt: "A customer considering long-term financial plans" },
  "help-center": { src: "/images/everyday-banking-v1.webp", alt: "A customer accessing online banking support" },
  faq: { src: "/images/investing-v1.webp", alt: "A customer reviewing helpful financial information" },
  contact: { src: "/images/business-banking-v1.png", alt: "A business customer using a tablet" },
};

export async function PublicProductPage({ page }: { page: PublicPage }) {
  const identity = await getVerifiedIdentity();
  const authenticatedAction = authenticatedDestinations[page.slug] ?? { label: "Go to Dashboard", href: "/dashboard" };
  const actions: HeroAction[] = identity
    ? [{ ...authenticatedAction }, { label: "My Profile", href: "/settings", variant: "secondary" }]
    : [{ label: "Create an Account", href: "/sign-up" }, { label: "Sign in", href: "/login", variant: "secondary" }];
  const configuredSlides = productHeroSlides[page.slug];
  const fallbackImage = fallbackImages[page.slug] ?? { src: "/images/bank-hero-v1.png", alt: "Customers using Chaze Bank services" };
  const slides: HeroSlide[] = configuredSlides
    ? withHeroActions(configuredSlides, actions)
    : [{ eyebrow: page.eyebrow, title: page.title, description: page.summary, image: fallbackImage.src, alt: fallbackImage.alt, actions }];
  return <main id="main-content">
    <HeroCarousel label={`${page.title} highlights`} slides={slides} />
    <div className="mx-auto max-w-public px-4 py-10 sm:px-6 lg:px-8">
      <Alert title="Development availability">{page.availability} All accounts, balances and activity in this application are synthetic and have no monetary value.</Alert>
      <section aria-labelledby="features-heading" className="mt-10"><h2 id="features-heading" className="text-2xl font-semibold">What to expect</h2><div className="mt-6 grid gap-5 md:grid-cols-3">{page.features.map((feature)=><Card key={feature.title}><h3 className="text-xl font-semibold">{feature.title}</h3><p className="mt-3 text-muted">{feature.description}</p></Card>)}</div></section>
      <section className="mt-10 border-t border-border pt-8"><h2 className="text-2xl font-semibold">Banking with confidence</h2><p className="mt-3 max-w-3xl text-muted">{page.guidance}</p><Link className="mt-5 inline-flex min-h-11 items-center font-semibold text-action underline underline-offset-4" href="/security">Visit the Security Center</Link></section>
    </div>
  </main>;
}
