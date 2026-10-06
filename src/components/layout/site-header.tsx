"use client";

import Link from "next/link";
import { useState } from "react";
import { BankLogo } from "@/components/ui/bank-logo";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/dialog";

const audiences = [{label:"Personal",href:"/"},{label:"Business",href:"/business-banking"},{label:"Commercial",href:"/commercial"},{label:"Wealth Management",href:"/wealth-management"}];
const products = [{label:"Checking",href:"/checking"},{label:"Savings",href:"/savings"},{label:"Credit Cards",href:"/credit-cards"},{label:"Home Loans",href:"/mortgage"},{label:"Auto",href:"/auto-financing"},{label:"Investing",href:"/investing"},{label:"Education",href:"/education"},{label:"Security",href:"/security"},{label:"Help",href:"/help-center"}];

export function SiteHeader({ showPreview: _showPreview }: { showPreview: boolean }) {
  const [open,setOpen] = useState(false);
  return <header className="bg-surface shadow-sm">
    <div className="border-b border-border"><div className="mx-auto hidden max-w-public items-center justify-between px-6 lg:flex lg:px-8">
      <nav aria-label="Audience navigation" className="flex">{audiences.map((item)=><Link key={item.href} href={item.href} className="border-b-2 border-transparent px-4 py-3 text-sm font-semibold hover:border-action hover:text-action">{item.label}</Link>)}</nav>
      <div className="flex items-center gap-5 text-sm"><Link className="font-semibold text-action underline underline-offset-4" href="/contact">Contact</Link><Link className="font-semibold text-action underline underline-offset-4" href="/faq">FAQ</Link></div>
    </div></div>
    <div className="mx-auto flex max-w-public items-center justify-between gap-5 px-4 py-4 sm:px-6 lg:px-8"><Link href="/" aria-label="Bank home" className="shrink-0 text-brand"><BankLogo /></Link>
      <nav aria-label="Product navigation" className="hidden items-center gap-1 lg:flex">{products.map((item)=><Link key={item.href} className="rounded-control px-3 py-3 text-sm font-semibold hover:bg-subtle hover:text-action" href={item.href}>{item.label}</Link>)}</nav>
      <div className="hidden shrink-0 items-center gap-3 sm:flex"><Link className="inline-flex min-h-11 items-center rounded-control bg-action px-5 py-2 font-semibold text-white hover:bg-action-hover" href="/login">Sign in</Link><Link className="inline-flex min-h-11 items-center font-semibold text-action underline underline-offset-4" href="/sign-up">Open an account</Link></div>
      <Button variant="secondary" className="sm:hidden" aria-expanded={open} onClick={()=>setOpen(true)}>Menu</Button>
    </div>
    <Drawer open={open} onClose={()=>setOpen(false)} title="Navigation"><nav aria-label="Mobile navigation" className="flex flex-col">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Banking</p>{products.map((item)=><Link key={item.href} onClick={()=>setOpen(false)} className="border-b border-border py-3 font-semibold text-action" href={item.href}>{item.label}</Link>)}
      <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted">Audiences</p>{audiences.map((item)=><Link key={item.href} onClick={()=>setOpen(false)} className="py-3 text-action underline" href={item.href}>{item.label}</Link>)}
      <Link onClick={()=>setOpen(false)} className="py-3 text-action underline" href="/faq">FAQ</Link><Link onClick={()=>setOpen(false)} className="py-3 text-action underline" href="/contact">Contact</Link>
      <div className="mt-5 grid gap-3"><Link onClick={()=>setOpen(false)} className="inline-flex min-h-11 items-center justify-center rounded-control bg-action font-semibold text-white" href="/login">Sign in</Link><Link onClick={()=>setOpen(false)} className="inline-flex min-h-11 items-center justify-center rounded-control border border-action font-semibold text-action" href="/sign-up">Open an account</Link></div>
    </nav></Drawer>
  </header>;
}
