import { useId, type InputHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from "react";
import { classes } from "@/utils/classes";

const control = "min-h-11 w-full min-w-0 rounded-control border border-muted bg-surface px-3 py-2 text-base disabled:bg-subtle";
type FieldInfo = { label: string; hint?: string; error?: string };

export function Input({ label, hint, error, id: suppliedId, className, ...props }: InputHTMLAttributes<HTMLInputElement> & FieldInfo) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  return <div className="space-y-2"><label className="block font-semibold" htmlFor={id}>{label}{props.required && <span aria-hidden="true"> *</span>}</label><input {...props} id={id} aria-invalid={Boolean(error)} aria-describedby={[hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined} className={classes(control, error && "border-danger", className)} />{hint && <p id={`${id}-hint`} className="text-sm text-muted">{hint}</p>}{error && <p id={`${id}-error`} className="text-sm text-danger">{error}</p>}</div>;
}

export function Select({ label, hint, error, id: suppliedId, className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & FieldInfo) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  return <div className="space-y-2"><label className="block font-semibold" htmlFor={id}>{label}</label><select {...props} id={id} aria-invalid={Boolean(error)} aria-describedby={[hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined} className={classes(control, className)}>{children}</select>{hint && <p id={`${id}-hint`} className="text-sm text-muted">{hint}</p>}{error && <p id={`${id}-error`} className="text-sm text-danger">{error}</p>}</div>;
}

function Choice({ label, type, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; type: "checkbox" | "radio" }) {
  return <label className="flex min-h-11 cursor-pointer items-center gap-3"><input {...props} type={type} className={classes("size-5 shrink-0 accent-action", className)} /><span>{label}</span></label>;
}
export function Checkbox(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: ReactNode }) { return <Choice {...props} type="checkbox" />; }
export function Radio(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: ReactNode }) { return <Choice {...props} type="radio" />; }
