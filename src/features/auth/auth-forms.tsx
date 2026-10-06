"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/fields";
import { PasswordField } from "@/components/ui/password-field";
import { PASSWORD_REQUIREMENT } from "@/lib/auth/password-policy";
import {
  forgotPasswordAction,
  loginAction,
  resetPasswordAction,
  signUpAction,
  type AuthActionState,
} from "@/server/auth/actions";

const initialState: AuthActionState = { status: "idle" };

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <Button className="w-full" type="submit" pending={pending}>{children}</Button>;
}

function Message({ state }: { state: AuthActionState }) {
  if (!state.message) return null;
  return <Alert title={state.status === "success" ? "Check your email" : "Unable to continue"} tone={state.status === "success" ? "success" : "error"}>{state.message}</Alert>;
}

export function LoginForm() {
  const [state, action] = useActionState(loginAction, initialState);
  return <form action={action} className="space-y-5" noValidate>
    <Message state={state} />
    <Input name="email" type="email" autoComplete="email" label="Email address" required error={state.fieldErrors?.email?.[0]} />
    <PasswordField name="password" autoComplete="current-password" label="Password" required maxLength={128} error={state.fieldErrors?.password?.[0]} />
    <div className="text-right"><Link className="text-action underline underline-offset-4" href="/forgot-password">Forgot password?</Link></div>
    <SubmitButton>Sign in</SubmitButton>
    <p className="text-center text-sm text-muted">New to Chaze Bank? <Link className="text-action underline underline-offset-4" href="/sign-up">Create an account</Link></p>
  </form>;
}

export function SignUpForm() {
  const [state, action] = useActionState(signUpAction, initialState);
  if (state.status === "success") {
    return <div className="space-y-6" role="status">
      <Alert title="Check your email" tone="success">{state.message}</Alert>
      <p className="text-sm text-muted">Use the verification link before signing in. The link will return you to Chaze Bank.</p>
      <Link className="inline-flex min-h-11 items-center justify-center rounded-control border border-action px-5 py-2 font-semibold text-action hover:bg-subtle" href="/login">Return to sign in</Link>
    </div>;
  }
  return <form action={action} className="space-y-5" noValidate>
    <Message state={state} />
    <Input name="email" type="email" autoComplete="email" label="Email address" required error={state.fieldErrors?.email?.[0]} />
    <PasswordField name="password" autoComplete="new-password" label="Password" required minLength={10} maxLength={128} hint={PASSWORD_REQUIREMENT} error={state.fieldErrors?.password?.[0]} />
    <PasswordField name="confirmPassword" autoComplete="new-password" label="Confirm password" required minLength={10} maxLength={128} error={state.fieldErrors?.confirmPassword?.[0]} />
    <SubmitButton>Create account</SubmitButton>
    <p className="text-center text-sm text-muted">Already registered? <Link className="text-action underline underline-offset-4" href="/login">Sign in</Link></p>
  </form>;
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPasswordAction, initialState);
  return <form action={action} className="space-y-5" noValidate>
    <Message state={state} />
    <Input name="email" type="email" autoComplete="email" label="Email address" required error={state.fieldErrors?.email?.[0]} />
    <SubmitButton>Send reset instructions</SubmitButton>
    <p className="text-center text-sm"><Link className="text-action underline underline-offset-4" href="/login">Return to sign in</Link></p>
  </form>;
}

export function ResetPasswordForm() {
  const [state, action] = useActionState(resetPasswordAction, initialState);
  return <form action={action} className="space-y-5" noValidate>
    <Message state={state} />
    <PasswordField name="password" autoComplete="new-password" label="New password" required minLength={10} maxLength={128} hint={PASSWORD_REQUIREMENT} error={state.fieldErrors?.password?.[0]} />
    <PasswordField name="confirmPassword" autoComplete="new-password" label="Confirm new password" required minLength={10} maxLength={128} error={state.fieldErrors?.confirmPassword?.[0]} />
    <SubmitButton>Update password</SubmitButton>
  </form>;
}
