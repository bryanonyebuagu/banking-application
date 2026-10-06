import { Card } from "@/components/ui/surfaces";

const labels = ["Personal", "Address", "Employment", "Review", "Verification"];

export function RegistrationShell({ active, title, description, children }: { active: number; title: string; description: string; children: React.ReactNode }) {
  return <main id="main-content" className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
    <p className="text-sm font-semibold uppercase tracking-widest text-action">Customer registration</p>
    <h1 className="mt-3 text-3xl font-semibold">{title}</h1>
    <p className="mt-3 max-w-2xl text-muted">{description}</p>
    <ol aria-label="Registration progress" className="mt-7 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
      {labels.map((label,index) => <li key={label} aria-current={index === active ? "step" : undefined} className={`rounded-control border px-3 py-2 ${index === active ? "border-action bg-subtle font-semibold text-action" : index < active ? "border-success" : "border-border text-muted"}`}><span className="mr-2" aria-hidden="true">{index + 1}</span>{label}</li>)}
    </ol>
    <Card className="mt-6">{children}</Card>
    <p className="mt-5 text-sm text-muted">Your information is protected and used to complete your account registration.</p>
  </main>;
}
