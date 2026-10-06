"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { classes } from "@/utils/classes";

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  hint?: string;
  error?: string;
};

export function PasswordField({ label, hint, error, id: suppliedId, className, ...props }: PasswordFieldProps) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const [visible, setVisible] = useState(false);
  const description = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;

  return <div className="space-y-2">
    <label className="block font-semibold" htmlFor={id}>{label}{props.required && <span aria-hidden="true"> *</span>}</label>
    <div className="relative">
      <input
        {...props}
        id={id}
        type={visible ? "text" : "password"}
        aria-invalid={Boolean(error)}
        aria-describedby={description}
        className={classes("min-h-11 w-full min-w-0 rounded-control border border-muted bg-surface px-3 py-2 pr-12 text-base disabled:bg-subtle", error && "border-danger", className)}
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 inline-flex min-h-11 min-w-11 items-center justify-center rounded-control text-action hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
    {hint && <p id={`${id}-hint`} className="text-sm text-muted">{hint}</p>}
    {error && <p id={`${id}-error`} className="text-sm text-danger">{error}</p>}
  </div>;
}

function EyeIcon() {
  return <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.1 12a11.7 11.7 0 0 1 19.8 0 11.7 11.7 0 0 1-19.8 0Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>;
}

function EyeOffIcon() {
  return <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 3 18 18" />
    <path d="M10.6 10.6A2 2 0 0 0 13.4 13.4" />
    <path d="M9.9 4.2A11.8 11.8 0 0 1 21.9 12a12.8 12.8 0 0 1-3.2 4.2" />
    <path d="M6.6 6.6A12.5 12.5 0 0 0 2.1 12a11.7 11.7 0 0 0 12 7.8" />
  </svg>;
}
