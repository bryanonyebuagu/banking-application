import type { HTMLAttributes, ReactNode } from "react";
import { classes } from "@/utils/classes";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={classes("min-w-0 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6", className)} />;
}
export function Alert({ title, children, tone = "info" }: { title: string; children?: ReactNode; tone?: "info" | "success" | "error" }) {
  return <div role={tone === "error" ? "alert" : "status"} className={classes("rounded-control border-l-4 bg-subtle p-4", tone === "error" ? "border-danger" : tone === "success" ? "border-success" : "border-action")}><p className="font-semibold">{title}</p>{children && <div className="mt-1 text-sm">{children}</div>}</div>;
}
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) { return <div className="rounded-card border border-dashed border-border p-6 text-center"><h3 className="text-lg font-semibold">{title}</h3><div className="mt-2 text-muted">{children}</div></div>; }
export function ErrorState({ children }: { children: ReactNode }) { return <Alert title="Something went wrong" tone="error">{children}</Alert>; }
export function Skeleton({ className }: { className?: string }) { return <div aria-hidden="true" className={classes("h-6 animate-pulse rounded-control bg-border motion-reduce:animate-none", className)} />; }
export function Spinner({ label = "Loading" }: { label?: string }) { return <span role="status" className="inline-flex items-center gap-2"><span aria-hidden="true" className="size-5 animate-spin rounded-full border-2 border-border border-t-action motion-reduce:animate-none" />{label}</span>; }
