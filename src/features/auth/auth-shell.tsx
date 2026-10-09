import { Card } from "@/components/ui/surfaces";

export function AuthShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <main id="main-content" className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6 sm:py-16">
    <Card>
      <p className="text-sm font-semibold uppercase tracking-widest text-action">Chaze Bank secure access</p>
      <h1 className="mt-3 text-3xl font-semibold">{title}</h1>
      <p className="mt-3 text-muted">{description}</p>
      <div className="mt-5 rounded-control border border-[#b9d7f2] bg-[#eef6fd] p-4 text-sm leading-6 text-ink">
        <p className="font-semibold">Development application</p>
        <p className="mt-1">Chaze Bank is not a financial institution. Accounts and balances are synthetic and no real funds can be deposited or transferred. Use only application-specific credentials and synthetic personal information.</p>
      </div>
      <div className="mt-7">{children}</div>
      <p className="mt-7 border-t border-border pt-5 text-xs text-muted">For your security, never share your password or verification code.</p>
    </Card>
  </main>;
}
