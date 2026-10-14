import Link from "next/link";

type ActionKind = "deposit" | "withdraw";

function ActionIcon({ kind }: { kind: ActionKind }) {
  if (kind === "deposit") {
    return <svg aria-hidden="true" viewBox="0 0 64 64" className="size-12" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 25h36v25H14z"/><path d="m10 25 22-13 22 13M21 25v25m11-25v25m11-25v25M9 53h46"/><path d="M32 5v15m-6-6 6 6 6-6"/></svg>;
  }
  return <svg aria-hidden="true" viewBox="0 0 64 64" className="size-12" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14h36v25H14z"/><path d="m10 14 22-9 22 9M21 14v25m11-25v25m11-25v25M9 42h46"/><path d="M32 45v14m-6-6 6 6 6-6"/></svg>;
}

export function MoneyActionTile({ kind, href, title, description }: { kind: ActionKind; href: string; title: string; description: string }) {
  return <Link href={href} className="group flex min-h-44 flex-col items-center justify-center rounded-card border border-border bg-surface p-5 text-center shadow-card transition hover:-translate-y-0.5 hover:border-action focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-action motion-reduce:transform-none">
    <span className="grid size-20 place-items-center rounded-[1.4rem] bg-action text-white shadow-lg transition group-hover:bg-action-hover"><ActionIcon kind={kind}/></span>
    <span className="mt-4 text-lg font-semibold text-ink">{title}</span>
    <span className="mt-1 text-sm text-muted">{description}</span>
  </Link>;
}
