"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BankLogo } from "@/components/ui/bank-logo";
import { ThemeToggle } from "@/components/theme/theme-control";
import { logoutAction } from "@/server/auth/actions";
import { siteNavigationGroups, type SiteNavigationIcon } from "@/components/layout/site-navigation";

function HeaderIcon({ kind }: { kind: "notifications" | "settings" }) {
  return kind === "notifications"
    ? <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/></svg>
    : <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path strokeLinecap="round" strokeLinejoin="round" d="M19 13.5v-3l-2-.7-.7-1.7.9-1.9-2.1-2.1-1.9.9-1.7-.7L10.5 2h-3l-.7 2.3-1.7.7-1.9-.9-2.1 2.1.9 1.9-.7 1.7-2 .7v3l2 .7.7 1.7-.9 1.9 2.1 2.1 1.9-.9 1.7.7.7 2.3h3l.7-2.3 1.7-.7 1.9.9 2.1-2.1-.9-1.9.7-1.7 2-.7Z" transform="translate(1.5) scale(.875)"/></svg>;
}

const navigationPaths: Record<SiteNavigationIcon, string> = {
  checking: "M3 7h18M5 7V5h14v2M5 11v7m4-7v7m6-7v7m4-7v7M3 21h18",
  savings: "M5 9c1.5-2 4-3 7-3 4.4 0 8 2.7 8 6.5 0 2-1 3.6-2.5 4.8V21h-3v-2h-5v2h-3v-3.5C4.9 16.5 4 14.9 4 13c0-1 .4-2 1-2.8L3 8h4m9 2h.01",
  card: "M3 6h18v12H3zM3 10h18M7 15h4",
  home: "M3 11 12 3l9 8M5 10v11h14V10M9 21v-7h6v7",
  auto: "M5 17h14l2-5-2-4H7l-2 4-2 1v4h2m14 0h2M7 8l1-3h8l1 3M7 17v2m10-2v2M7 13h.01M17 13h.01",
  investing: "M4 19V9m5 10V5m5 14v-7m5 7V3M3 21h18",
  education: "M4 5h6a3 3 0 0 1 3 3v12a3 3 0 0 0-3-3H4zM20 5h-6a3 3 0 0 0-3 3v12a3 3 0 0 1 3-3h6z",
  security: "M12 3 5 6v5c0 4.6 2.8 8.1 7 10 4.2-1.9 7-5.4 7-10V6zM9 12l2 2 4-5",
  help: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM9.8 9a2.4 2.4 0 1 1 3.8 2c-1 .7-1.6 1.1-1.6 2.5M12 17h.01",
  faq: "M4 5h16v11H9l-5 4zM8 9h8M8 12h5",
  contact: "M3 5h18v14H3zM3 7l9 7 9-7",
  privacy: "M6 10h12v11H6zM8 10V7a4 4 0 0 1 8 0v3M12 14v3",
  terms: "M6 3h9l3 3v15H6zM14 3v4h4M9 11h6M9 15h6M9 18h4",
  business: "M4 7h16v13H4zM9 7V4h6v3M4 12h16M10 12v2h4v-2",
  commercial: "M4 21V8l8-5 8 5v13M8 11h2m4 0h2M8 15h2m4 0h2M10 21v-3h4v3",
};

function NavigationIcon({ kind }: { kind: SiteNavigationIcon }) {
  return <svg aria-hidden="true" className="size-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d={navigationPaths[kind]}/></svg>;
}

export function SiteHeader({ viewer }: { viewer: { firstName: string | null } | null }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => { if (!menuRef.current?.contains(event.target as Node)) setOpen(false); };
    const closeWithEscape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); buttonRef.current?.focus(); } };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", closeWithEscape); };
  }, [open]);

  return <header className="relative z-40 border-b border-border bg-surface shadow-sm"><div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-3 px-4 py-4 sm:flex-nowrap sm:px-6 xl:px-8"><Link href={viewer?"/dashboard":"/"} aria-label="Chaze Bank home" className="mr-auto shrink-0 text-brand"><BankLogo/></Link><div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:gap-3"><ThemeToggle/>{viewer&&<><Link href="/notifications" aria-label="Notifications" title="Notifications" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-action shadow-card hover:bg-subtle"><HeaderIcon kind="notifications"/></Link><Link href="/settings" aria-label="Settings" title="Settings" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-action shadow-card hover:bg-subtle"><HeaderIcon kind="settings"/></Link><form action={logoutAction} className="hidden sm:block"><button className="min-h-11 whitespace-nowrap rounded-control bg-action px-4 font-semibold text-white hover:bg-action-hover">Sign out</button></form></>}<div className="relative" ref={menuRef}><button ref={buttonRef} type="button" aria-label={open?"Close menu":"Menu"} aria-expanded={open} aria-controls="site-menu" onClick={()=>setOpen((value)=>!value)} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface text-action shadow-card hover:bg-subtle"><svg aria-hidden="true" className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">{open?<><path d="M6 6l12 12"/><path d="M18 6 6 18"/></>:<><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></>}</svg></button>{open&&<div id="site-menu" className="absolute right-0 top-[calc(100%+0.75rem)] z-50 max-h-[calc(100dvh-7rem)] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-[1.25rem] border border-border bg-surface p-3 text-ink shadow-overlay"><div className="rounded-xl bg-subtle px-4 py-3"><p className="text-sm font-semibold text-action">{viewer?`Signed in${viewer.firstName?` as ${viewer.firstName}`:""}`:"Explore Chaze Bank"}</p><p className="mt-1 text-xs text-muted">Banking links and helpful information</p></div><nav aria-label="Site menu" className="mt-3">{siteNavigationGroups.map((group)=><section key={group.title} className="border-b border-border py-3 last:border-0"><h2 className="px-3 text-xs font-bold uppercase tracking-[0.15em] text-muted">{group.title}</h2><ul className="mt-2 grid gap-1">{group.links.map((link)=><li key={link.href}><Link onClick={()=>setOpen(false)} href={link.href} className="flex min-h-11 items-center justify-between gap-4 rounded-xl px-3 py-2 font-semibold text-ink transition hover:bg-subtle hover:text-action"><span>{link.label}</span><span className="text-action"><NavigationIcon kind={link.icon}/></span></Link></li>)}</ul></section>)}</nav>{viewer&&<form action={logoutAction} className="mt-3 border-t border-border pt-4 sm:hidden"><button className="flex min-h-12 w-full items-center justify-between rounded-xl bg-action px-4 font-semibold text-white hover:bg-action-hover"><span>Sign out</span><svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 17l5-5-5-5M15 12H3M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5"/></svg></button></form>}</div>}</div></div></div></header>;
}
