import Link from "next/link";
import { BankLogo } from "@/components/ui/bank-logo";
import { ThemeToggle } from "@/components/theme/theme-control";
import { logoutAction } from "@/server/auth/actions";

function HeaderIcon({ kind }: { kind: "notifications" | "settings" }) {
  return kind === "notifications"
    ? <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/></svg>
    : <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path strokeLinecap="round" strokeLinejoin="round" d="M19 13.5v-3l-2-.7-.7-1.7.9-1.9-2.1-2.1-1.9.9-1.7-.7L10.5 2h-3l-.7 2.3-1.7.7-1.9-.9-2.1 2.1.9 1.9-.7 1.7-2 .7v3l2 .7.7 1.7-.9 1.9 2.1 2.1 1.9-.9 1.7.7.7 2.3h3l.7-2.3 1.7-.7 1.9.9 2.1-2.1-.9-1.9.7-1.7 2-.7Z" transform="translate(1.5) scale(.875)"/></svg>;
}

export function SiteHeader({ viewer }: { viewer: { firstName: string | null } | null }) {
  return <header className="border-b border-border bg-surface shadow-sm"><div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-3 px-4 py-4 sm:flex-nowrap sm:px-6 xl:px-8"><Link href={viewer?"/dashboard":"/"} aria-label="Chaze Bank home" className="mr-auto shrink-0 text-brand"><BankLogo/></Link><div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:gap-3"><ThemeToggle/>{viewer&&<><Link href="/notifications" aria-label="Notifications" title="Notifications" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-action shadow-card hover:bg-subtle"><HeaderIcon kind="notifications"/></Link><Link href="/settings" aria-label="Settings" title="Settings" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-action shadow-card hover:bg-subtle"><HeaderIcon kind="settings"/></Link><form action={logoutAction}><button className="min-h-11 whitespace-nowrap rounded-control bg-action px-3 font-semibold text-white hover:bg-action-hover sm:px-4">Sign out</button></form></>}</div></div></header>;
}
