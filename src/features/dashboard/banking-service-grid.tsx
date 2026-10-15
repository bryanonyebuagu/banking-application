import Link from "next/link";

type ServiceIconName = "accounts" | "transactions" | "receive" | "bill-pay" | "cards" | "statements" | "loans" | "mortgages" | "investments" | "analytics";

const services: ReadonlyArray<{ href: string; label: string; icon: ServiceIconName }> = [
  { href: "/dashboard#accounts", label: "Accounts", icon: "accounts" },
  { href: "/transactions", label: "Transactions", icon: "transactions" },
  { href: "/receive-money", label: "Receive money", icon: "receive" },
  { href: "/bill-pay", label: "Bill Pay", icon: "bill-pay" },
  { href: "/cards", label: "Cards", icon: "cards" },
  { href: "/statements", label: "Statements", icon: "statements" },
  { href: "/loans", label: "Loans", icon: "loans" },
  { href: "/mortgages", label: "Mortgages", icon: "mortgages" },
  { href: "/investments", label: "Investments", icon: "investments" },
  { href: "/analytics", label: "Analytics", icon: "analytics" },
];

function ServiceIcon({ name }: { name: ServiceIconName }) {
  const common = { fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const, strokeWidth: 2.4 };
  if (name === "accounts") return <svg aria-hidden="true" viewBox="0 0 48 48" {...common}><path d="M7 19 24 9l17 10M10 21h28M13 23v13m8-13v13m8-13v13m8-13v13M8 40h32"/></svg>;
  if (name === "transactions") return <svg aria-hidden="true" viewBox="0 0 48 48" {...common}><path d="M8 16h29m0 0-6-6m6 6-6 6M40 32H11m0 0 6 6m-6-6 6-6"/></svg>;
  if (name === "receive") return <svg aria-hidden="true" viewBox="0 0 48 48" {...common}><path d="M24 7v24m0 0-8-8m8 8 8-8M9 35v5h30v-5"/></svg>;
  if (name === "bill-pay") return <svg aria-hidden="true" viewBox="0 0 48 48" {...common}><path d="M13 7h22v34l-5-3-6 3-6-3-5 3V7Z"/><path d="M19 17h10M19 24h10M19 31h6"/></svg>;
  if (name === "cards") return <svg aria-hidden="true" viewBox="0 0 48 48" {...common}><rect x="6" y="12" width="36" height="25" rx="4"/><path d="M6 20h36M12 30h9"/></svg>;
  if (name === "statements") return <svg aria-hidden="true" viewBox="0 0 48 48" {...common}><path d="M13 6h16l7 7v29H13V6Z"/><path d="M29 6v8h7M19 22h11M19 29h11M19 36h7"/></svg>;
  if (name === "loans") return <svg aria-hidden="true" viewBox="0 0 48 48" {...common}><path d="M8 29h8l5 4h8l11-8c-2-3-5-3-8-1l-5 3"/><path d="M8 22h7l7 5h7c2 0 3 1 3 3M29 11c-3-3-9-1-9 4 0 6 9 10 9 10s9-4 9-10c0-5-6-7-9-4Z"/></svg>;
  if (name === "mortgages") return <svg aria-hidden="true" viewBox="0 0 48 48" {...common}><path d="m6 23 18-15 18 15M11 21v20h26V21M20 41V29h8v12"/></svg>;
  if (name === "investments") return <svg aria-hidden="true" viewBox="0 0 48 48" {...common}><path d="M8 39V25m10 14V18m11 21V11m11 28V6M6 39h36"/><path d="m8 20 10-7 10 2L40 6"/></svg>;
  return <svg aria-hidden="true" viewBox="0 0 48 48" {...common}><path d="M8 38V27h7v11M20 38V19h7v19M32 38V10h7v28M6 42h36"/></svg>;
}

export function DashboardServiceGrid() {
  return <section className="mt-8" aria-labelledby="banking-services-heading">
    <div className="mb-5 flex items-end justify-between gap-4">
      <div><p className="text-sm font-semibold uppercase tracking-wider text-action">Your Chaze Bank</p><h2 id="banking-services-heading" className="mt-1 text-2xl font-semibold">Banking services</h2></div>
      <p className="hidden text-sm text-muted md:block">Choose where you want to go</p>
    </div>
    <div className="rounded-[1.75rem] bg-[var(--dashboard-panel)] p-4 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.18)] sm:p-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {services.map((service)=><Link key={service.label} href={service.href} className="group flex min-h-36 flex-col items-center justify-center rounded-[1.25rem] border border-[var(--dashboard-tile-border)] bg-[linear-gradient(to_bottom,var(--dashboard-tile-from),var(--dashboard-tile-to))] px-3 py-5 text-center shadow-[0_7px_0_var(--dashboard-tile-step),0_13px_20px_rgb(0_0_0_/_0.18)] transition duration-200 hover:-translate-y-1 hover:border-action hover:shadow-[0_10px_0_var(--dashboard-tile-step),0_18px_28px_rgb(0_0_0_/_0.24)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-action active:translate-y-1 active:shadow-[0_3px_0_var(--dashboard-tile-step),0_7px_12px_rgb(0_0_0_/_0.2)] motion-reduce:transform-none motion-reduce:transition-none">
          <span className="grid size-17 place-items-center rounded-[1.15rem] bg-gradient-to-br from-[#1485df] via-[#006ac3] to-[#003f78] text-white shadow-[inset_0_1px_0_rgb(255_255_255_/_0.4),inset_0_-3px_5px_rgb(0_30_70_/_0.3),0_8px_14px_rgb(0_66_128_/_0.3)] transition-transform duration-200 group-hover:scale-105 motion-reduce:transform-none"><span className="size-9"><ServiceIcon name={service.icon}/></span></span>
          <span className="mt-4 text-sm font-bold leading-tight text-ink sm:text-base">{service.label}</span>
        </Link>)}
      </div>
    </div>
  </section>;
}
