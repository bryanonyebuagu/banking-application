import { Button } from "./button";

export function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface p-4 shadow-card"><p>{message}</p><Button variant="tertiary" onClick={onDismiss}>Dismiss</Button></div>;
}
