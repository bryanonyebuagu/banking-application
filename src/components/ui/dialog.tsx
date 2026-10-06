"use client";

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { Button } from "./button";
import { classes } from "@/utils/classes";

export function Modal({ open, onClose, title, children, placement = "center" }: { open: boolean; onClose: () => void; title: string; children: ReactNode; placement?: "center" | "drawer" }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  function containFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )).filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!open) { dialog.close(); return; }
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [open]);
  return <dialog ref={ref} aria-labelledby={titleId} onKeyDown={containFocus} onCancel={(event) => { event.preventDefault(); onClose(); }} className={classes("max-h-dvh border border-border bg-surface p-6 text-ink shadow-overlay", placement === "drawer" ? "m-0 ml-auto h-dvh w-full max-w-sm" : "m-auto w-[calc(100%-2rem)] max-w-lg rounded-dialog")}><div className="mb-6 flex items-start justify-between gap-4"><h2 id={titleId} className="text-xl font-semibold">{title}</h2><Button variant="tertiary" onClick={onClose} aria-label={`Close ${title}`}>Close</Button></div>{children}</dialog>;
}
export function Drawer(props: Omit<Parameters<typeof Modal>[0], "placement">) { return <Modal {...props} placement="drawer" />; }
