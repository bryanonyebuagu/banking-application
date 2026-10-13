"use client";

import Link from "next/link";
import { useState } from "react";
import { BankLogo } from "@/components/ui/bank-logo";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/dialog";
import { logoutAction } from "@/server/auth/actions";

const audiences = [{label:"Personal",href:"/"},{label:"Business",href:"/business-banking"},{label:"Commercial",href:"/commercial"},{label:"Wealth Management",href:"/wealth-management"}];
const products = [{label:"Checking",href:"/checking"},{label:"Savings",href:"/savings"},{label:"Credit Cards",href:"/credit-cards"},{label:"Home Loans",href:"/mortgage"},{label:"Auto",href:"/auto-financing"},{label:"Investing",href:"/investing"},{label:"Education",href:"/education"},{label:"Security",href:"/security"},{label:"Help",href:"/help-center"}];

export function SiteHeader({ viewer }: { viewer: { firstName: string | null } | null }) {
  const [open,setOpen] = useState(false);
  return <header className="bg-surface shadow-sm">
    <div className="border-b border-border"><div className="mx-auto hidden w-full max-w-[1600px] items-center justify-between px-6 xl:flex xl:px-8">
      <nav aria-label="Audience navigation" className="flex">{audiences.map((item)=><Link key={item.href} href={item.href} className="whitespace-nowrap border-b-2 border-transparent px-4 py-3 text-sm font-semibold hover:border-action hover:text-action">{item.label}</Link>)}</nav>
      <div className="flex items-center gap-5 text-sm"><Link className="font-semibold text-action underline underline-offset-4" href="/contact">Contact</Link><Link className="font-semibold text-action underline underline-offset-4" href="/faq">FAQ</Link></div>
    </div></div>
    <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-6 px-4 py-4 sm:px-6 xl:px-8"><Link href="/" aria-label="Chaze Bank home" className="shrink-0 text-brand"><BankLogo /></Link>
      <nav aria-label="Product navigation" className="hidden min-w-0 flex-1 items-center justify-between gap-2 pl-8 xl:flex">{products.map((item)=><Link key={item.href} className="whitespace-nowrap rounded-control px-3 py-3 text-sm font-semibold hover:bg-subtle hover:text-action" href={item.href}>{item.label}</Link>)}</nav>
      <div className="hidden shrink-0 items-center gap-3 xl:flex">{viewer?<><Link className="whitespace-nowrap font-semibold text-action underline underline-offset-4" href="/dashboard">Dashboard</Link><Link className="whitespace-nowrap font-semibold text-action underline underline-offset-4" href="/settings">My profile</Link><form action={logoutAction}><button className="min-h-11 whitespace-nowrap rounded-control border border-action px-4 font-semibold text-action">Sign out</button></form></>:<><Link className="whitespace-nowrap font-semibold text-action underline underline-offset-4" href="/login">Sign in</Link><Link className="min-h-11 whitespace-nowrap rounded-control bg-action px-4 py-3 font-semibold text-white" href="/sign-up">Create an Account</Link></>}</div>
      <Button variant="secondary" className="xl:hidden" aria-expanded={open} onClick={()=>setOpen(true)}>Menu</Button>
    </div>
    <Drawer open={open} onClose={()=>setOpen(false)} title="Navigation"><nav aria-label="Mobile navigation" className="flex flex-col">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Banking</p>{products.map((item)=><Link key={item.href} onClick={()=>setOpen(false)} className="border-b border-border py-3 font-semibold text-action" href={item.href}>{item.label}</Link>)}
      <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted">Audiences</p>{audiences.map((item)=><Link key={item.href} onClick={()=>setOpen(false)} className="py-3 text-action underline" href={item.href}>{item.label}</Link>)}
      <Link onClick={()=>setOpen(false)} className="py-3 text-action underline" href="/faq">FAQ</Link><Link onClick={()=>setOpen(false)} className="py-3 text-action underline" href="/contact">Contact</Link>
      <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted">{viewer?`Signed in${viewer.firstName?` as ${viewer.firstName}`:""}`:"Online banking"}</p>
      {viewer?<><Link onClick={()=>setOpen(false)} className="py-3 font-semibold text-action underline" href="/dashboard">Dashboard</Link><Link onClick={()=>setOpen(false)} className="py-3 font-semibold text-action underline" href="/accounts/new">My accounts</Link><Link onClick={()=>setOpen(false)} className="py-3 font-semibold text-action underline" href="/settings">My profile</Link><form action={logoutAction}><button className="min-h-11 w-full text-left font-semibold text-action underline">Sign out</button></form></>:<><Link onClick={()=>setOpen(false)} className="py-3 font-semibold text-action underline" href="/login">Sign in</Link><Link onClick={()=>setOpen(false)} className="py-3 font-semibold text-action underline" href="/sign-up">Create an Account</Link></>}
    </nav></Drawer>
  </header>;
}
