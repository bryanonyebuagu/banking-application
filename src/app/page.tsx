import Image from "next/image";
import Link from "next/link";

type IconName = "checking" | "savings" | "card" | "home" | "travel" | "business";

const products: Array<{ title: string; description: string; href: string; icon: IconName }> = [
  { title: "Checking", description: "Bank with confidence every day.", href: "/checking", icon: "checking" },
  { title: "Savings", description: "Make progress toward your goals.", href: "/savings", icon: "savings" },
  { title: "Credit cards", description: "Find a card that fits your life.", href: "/credit-cards", icon: "card" },
  { title: "Home loans", description: "Move closer to the right home.", href: "/mortgage", icon: "home" },
  { title: "Travel", description: "Plan, book and enjoy the journey.", href: "/travel", icon: "travel" },
  { title: "Business", description: "Tools that help your business grow.", href: "/business-banking", icon: "business" },
];

function ProductIcon({ name }: { name: IconName }) {
  const shared = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return <svg aria-hidden="true" className="h-16 w-16" viewBox="0 0 64 64" {...shared}>
    {name === "checking" && <><rect x="9" y="14" width="46" height="34" rx="3"/><path d="M9 23h46M17 38h15M43 33h5"/><path d="m19 33 3 3 6-7"/></>}
    {name === "savings" && <><path d="M15 30c2-9 10-15 21-15 8 0 14 3 18 9h5v14h-6c-2 5-6 8-11 10v7h-8v-6h-9v6h-8v-9c-5-3-8-8-8-14 0-3 1-6 3-9l-5-5c6-1 10 0 13 3"/><circle cx="43" cy="27" r="1.5"/><path d="M28 20c4-2 9-2 13 0"/></>}
    {name === "card" && <><rect x="7" y="14" width="50" height="36" rx="5"/><path d="M7 25h50M16 40h12M45 40h4"/></>}
    {name === "home" && <><path d="m8 31 24-20 24 20M14 27v26h36V27"/><path d="M26 53V37h12v16M21 24h22"/></>}
    {name === "travel" && <path d="m7 35 21-4 13-19c2-3 5-4 7-2s2 5 0 8L38 32l17 5c2 1 3 3 2 5l-1 2-21-2-9 11-5-1 4-12-12 2z"/>}
    {name === "business" && <><rect x="8" y="20" width="48" height="34" rx="3"/><path d="M24 20v-7h16v7M8 34c14 5 34 5 48 0M28 34h8v7h-8z"/></>}
  </svg>;
}

export default function HomePage() {
  return <main id="main-content">
    <section className="relative isolate min-h-[560px] overflow-hidden bg-[#eaf3fb]">
      <Image src="/images/bank-hero-v1.png" alt="A couple managing their finances together at home" fill priority className="object-cover object-[64%_center]" sizes="100vw" />
      <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/0 lg:via-white/75" />
      <div className="relative mx-auto flex min-h-[560px] max-w-public items-center px-4 py-16 sm:px-6 lg:px-8"><div className="max-w-xl">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-action">Banking built around you</p>
        <h1 className="mt-4 text-4xl font-semibold leading-[1.08] text-ink sm:text-6xl">Make more of every money moment.</h1>
        <p className="mt-6 max-w-lg text-lg leading-8 text-muted">Manage everyday spending, build savings, plan big purchases and keep moving toward what matters.</p>
        <div className="mt-8 flex flex-wrap gap-3"><Link className="inline-flex min-h-12 items-center rounded-control bg-action px-6 py-3 font-semibold text-white shadow-sm hover:bg-action-hover" href="/sign-up">Open an account</Link><Link className="inline-flex min-h-12 items-center rounded-control border-2 border-action bg-white/90 px-6 py-3 font-semibold text-action" href="/login">Sign in</Link></div>
      </div></div>
    </section>

    <section className="border-b border-border bg-white" aria-labelledby="products-heading"><div className="mx-auto max-w-public px-4 py-14 sm:px-6 lg:px-8">
      <h2 id="products-heading" className="text-center text-3xl font-semibold">What can we help you find?</h2>
      <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">{products.map((product) => <Link key={product.title} href={product.href} className="group flex flex-col items-center text-center text-[#59636e] transition hover:-translate-y-1 hover:text-action"><span className="flex h-24 w-24 items-center justify-center rounded-full bg-subtle transition group-hover:bg-[#e5f2ff]"><ProductIcon name={product.icon}/></span><h3 className="mt-4 text-lg font-semibold text-ink group-hover:text-action">{product.title}</h3><p className="mt-1 text-sm leading-5 text-muted">{product.description}</p></Link>)}</div>
    </div></section>

    <section className="mx-auto max-w-public px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center"><p className="text-sm font-bold uppercase tracking-[0.16em] text-action">Explore what’s possible</p><h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Your next move starts here</h2></div>
      <div className="mt-10 grid gap-7 lg:grid-cols-2">
        <article className="overflow-hidden rounded-card border border-border bg-white shadow-card"><div className="relative aspect-[3/2]"><Image src="/images/home-lending-v1.png" alt="A family celebrating outside their new home" fill className="object-cover" sizes="(min-width: 1024px) 50vw, 100vw" /></div><div className="p-7"><p className="text-sm font-bold uppercase tracking-wider text-action">Home lending</p><h3 className="mt-2 text-2xl font-semibold">A place to make your own</h3><p className="mt-3 text-muted">Explore home financing with clear terms, useful tools and support along the way.</p><Link className="mt-5 inline-flex min-h-11 items-center font-semibold text-action underline underline-offset-4" href="/mortgage">Explore home loans</Link></div></article>
        <article className="overflow-hidden rounded-card border border-border bg-white shadow-card"><div className="relative aspect-[3/2]"><Image src="/images/business-banking-v1.png" alt="A small-business owner working in her bakery" fill className="object-cover" sizes="(min-width: 1024px) 50vw, 100vw" /></div><div className="p-7"><p className="text-sm font-bold uppercase tracking-wider text-action">Business banking</p><h3 className="mt-2 text-2xl font-semibold">Built for your next big idea</h3><p className="mt-3 text-muted">Keep cash flow, payments and account controls organized as your business grows.</p><Link className="mt-5 inline-flex min-h-11 items-center font-semibold text-action underline underline-offset-4" href="/business-banking">Explore business banking</Link></div></article>
      </div>
    </section>

    <section className="bg-brand text-white"><div className="mx-auto grid max-w-public items-center gap-8 px-4 py-14 sm:px-6 md:grid-cols-[1fr_auto] lg:px-8"><div><p className="text-sm font-bold uppercase tracking-[0.16em] text-white/75">BANK online</p><h2 className="mt-3 text-3xl font-semibold">Your finances, together in one place</h2><p className="mt-3 max-w-2xl text-white/85">View balances, move money, manage cards, review statements and control account security.</p></div><Link className="inline-flex min-h-12 items-center justify-center rounded-control bg-white px-6 py-3 font-semibold text-brand" href="/login">Sign in to continue</Link></div></section>
  </main>;
}
