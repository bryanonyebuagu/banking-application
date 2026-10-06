"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/fields";
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
    <Input name="password" type="password" autoComplete="current-password" label="Password" required error={state.fieldErrors?.password?.[0]} />
    <div className="text-right"><Link className="text-action underline underline-offset-4" href="/forgot-password">Forgot password?</Link></div>
    <SubmitButton>Sign in</SubmitButton>
    <p className="text-center text-sm text-muted">New to Chaze Bank? <Link className="text-action underline underline-offset-4" href="/sign-up">Create an account</Link></p>
  </form>;
}

export function SignUpForm() {
  const [state, action] = useActionState(signUpAction, initialState);
  return <form action={action} className="space-y-5" noValidate>
    <Message state={state} />
    <Input name="email" type="email" autoComplete="email" label="Email address" required error={state.fieldErrors?.email?.[0]} />
    <Input name="password" type="password" autoComplete="new-password" label="Password" required hint="Use 12–128 characters with uppercase, lowercase, a number and a symbol." error={state.fieldErrors?.password?.[0]} />
    <Input name="confirmPassword" type="password" autoComplete="new-password" label="Confirm password" required error={state.fieldErrors?.confirmPassword?.[0]} />
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
    <Input name="password" type="password" autoComplete="new-password" label="New password" required hint="Use 12–128 characters with uppercase, lowercase, a number and a symbol." error={state.fieldErrors?.password?.[0]} />
    <Input name="confirmPassword" type="password" autoComplete="new-password" label="Confirm new password" required error={state.fieldErrors?.confirmPassword?.[0]} />
    <SubmitButton>Update password</SubmitButton>
  </form>;
}
