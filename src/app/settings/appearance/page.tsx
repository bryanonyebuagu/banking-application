import Link from "next/link";
import { Card } from "@/components/ui/surfaces";
import { ThemeSelector } from "@/components/theme/theme-control";
import { requireVerifiedIdentity } from "@/server/auth/identity";

export default async function AppearanceSettingsPage() {
  await requireVerifiedIdentity();
  return <main id="main-content" className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6"><Link className="font-semibold text-action underline" href="/settings">Back to settings</Link><p className="mt-8 text-sm font-semibold uppercase tracking-widest text-action">Settings</p><h1 className="mt-2 text-3xl font-semibold">Appearance</h1><p className="mt-2 text-muted">Choose how Chaze Bank looks on this browser. Your selection remains after navigation and refresh.</p><Card className="mt-8"><ThemeSelector/></Card></main>;
}
