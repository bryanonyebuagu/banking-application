import Link from "next/link";
import { Card } from "@/components/ui/surfaces";
import { OpenAccountForm } from "@/features/accounts/account-forms";
import { requireVerifiedIdentity } from "@/server/auth/identity";
export default async function NewAccountPage(){await requireVerifiedIdentity();return <main id="main-content" className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6"><Link className="font-semibold text-action underline" href="/dashboard">Back to dashboard</Link><p className="mt-8 text-sm font-semibold uppercase tracking-widest text-action">Accounts</p><h1 className="mt-2 text-3xl font-semibold">Open an account</h1><p className="mt-3 text-muted">Choose checking or savings and give your new account a name.</p><Card className="mt-7"><OpenAccountForm/></Card></main>}
