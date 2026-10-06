import type { ButtonHTMLAttributes } from "react";
import { classes } from "@/utils/classes";

const variants = {
  primary: "bg-action text-white hover:bg-action-hover",
  secondary: "border border-action bg-surface text-action hover:bg-subtle",
  tertiary: "text-action underline underline-offset-4 hover:bg-subtle",
  destructive: "bg-danger text-white hover:brightness-90",
};

export function Button({ className, variant = "primary", pending = false, disabled, children, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants; pending?: boolean }) {
  return <button {...props} type={type} disabled={disabled || pending} aria-busy={pending || undefined} className={classes("inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 py-2 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60", variants[variant], className)}>{pending ? "Please wait…" : children}</button>;
}
