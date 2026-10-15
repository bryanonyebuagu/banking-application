import Link from "next/link";
import { Card } from "@/components/ui/surfaces";
import { requireVerifiedIdentity } from "@/server/auth/identity";

const categories = [
  { href: "/settings/profile", title: "Profile Settings", description: "Personal details, address, display and privacy preferences, documents and account information." },
  { href: "/settings/notifications", title: "Notification Settings", description: "Choose email and SMS preferences for account, transfer and security activity." },
  { href: "/settings/security", title: "Login & Security", description: "Password, sign-in email, authenticator MFA, active sessions and account protection." },
  { href: "/settings/appearance", title: "Appearance", description: "Select the light or dark Chaze Bank theme for this browser." },
] as const;

export default async function SettingsPage() {
  await requireVerifiedIdentity();
  return <main id="main-content" className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-widest text-action">Your account</p><h1 className="mt-2 text-3xl font-semibold">Settings</h1><p className="mt-2 text-muted">Manage your profile, communications, security and display.</p></div><Link className="font-semibold text-action underline" href="/dashboard">Back to dashboard</Link></div><nav aria-label="Settings categories" className="mt-8 grid gap-5 sm:grid-cols-2">{categories.map((category)=><Link href={category.href} key={category.href} className="group"><Card className="h-full transition group-hover:-translate-y-1 group-hover:border-action group-hover:shadow-overlay motion-reduce:transform-none"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold group-hover:text-action">{category.title}</h2><p className="mt-2 text-muted">{category.description}</p></div><span aria-hidden="true" className="text-2xl text-action">→</span></div></Card></Link>)}</nav></main>;
}
