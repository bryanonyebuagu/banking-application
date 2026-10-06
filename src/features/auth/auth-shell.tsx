import { Card } from "@/components/ui/surfaces";

export function AuthShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <main id="main-content" className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6 sm:py-16">
    <Card>
      <p className="text-sm font-semibold uppercase tracking-widest text-action">Chaze Bank secure access</p>
      <h1 className="mt-3 text-3xl font-semibold">{title}</h1>
      <p className="mt-3 text-muted">{description}</p>
      <div className="mt-7">{children}</div>
      <p className="mt-7 border-t border-border pt-5 text-xs text-muted">For your security, never share your password or verification code.</p>
    </Card>
  </main>;
}
