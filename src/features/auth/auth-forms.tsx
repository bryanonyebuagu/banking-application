"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/fields";
import { PasswordField } from "@/components/ui/password-field";
import { PASSWORD_REQUIREMENT } from "@/lib/auth/password-policy";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import {
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
    return <div role="status">
      <Alert title="Check your inbox" tone="success">{state.message}</Alert>
    </div>;
  }
  return <form action={action} className="space-y-5" noValidate>
    <Message state={state} />
    <div className="grid gap-5 sm:grid-cols-2">
      <Input name="firstName" autoComplete="given-name" label="First name" required maxLength={100} error={state.fieldErrors?.firstName?.[0]} />
      <Input name="lastName" autoComplete="family-name" label="Last name" required maxLength={100} error={state.fieldErrors?.lastName?.[0]} />
    </div>
    <Input name="email" type="email" autoComplete="email" label="Email address" required error={state.fieldErrors?.email?.[0]} />
    <PasswordField name="password" autoComplete="new-password" label="Password" required minLength={10} maxLength={128} hint={PASSWORD_REQUIREMENT} error={state.fieldErrors?.password?.[0]} />
    <SubmitButton>Create account</SubmitButton>
  </form>;
}

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [emailError, setEmailError] = useState<string>();
  const [notification, setNotification] = useState<{ tone: "success" | "error"; message: string }>();

  useEffect(() => {
    if (!notification) return;
    const timer = window.setTimeout(() => setNotification(undefined), 5_000);
    return () => window.clearTimeout(timer);
  }, [notification]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const emailValue = new FormData(event.currentTarget).get("email");
    const email = typeof emailValue === "string" ? emailValue.trim().toLowerCase() : "";
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Enter a valid email address.");
      setNotification(undefined);
      return;
    }

    setPending(true);
    setEmailError(undefined);
    setNotification(undefined);
    try {
      const supabase = createBrowserSupabaseClient();
      const result = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (result.error) {
        console.error(JSON.stringify({ event: "AUTH_RECOVERY_REQUEST_FAILED", providerCode: result.error.code ?? null }));
        setNotification({
          tone: "error",
          message: result.error.code === "over_email_send_rate_limit"
            ? "Please wait a minute before requesting another reset email."
            : "We couldn’t send password reset instructions. Try again shortly.",
        });
        return;
      }
      setNotification({ tone: "success", message: "Password reset instructions have been sent to your email." });
    } catch (error) {
      console.error(JSON.stringify({
        event: "AUTH_RECOVERY_REQUEST_FAILED",
        errorType: error instanceof Error ? error.name : "UnknownError",
      }));
      setNotification({ tone: "error", message: "We couldn’t send password reset instructions. Try again shortly." });
    } finally {
      setPending(false);
    }
  }

  return <form onSubmit={submit} className="space-y-5" noValidate>
    {notification && <Alert title={notification.tone === "success" ? "Check your email" : "Unable to continue"} tone={notification.tone}>{notification.message}</Alert>}
    <Input name="email" type="email" autoComplete="email" label="Email address" required error={emailError} />
    <Button className="w-full" type="submit" pending={pending}>Send reset instructions</Button>
    <p className="text-center text-sm"><Link className="text-action underline underline-offset-4" href="/login">Return to sign in</Link></p>
  </form>;
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [state, action] = useActionState(resetPasswordAction, initialState);
  useEffect(() => {
    if (state.status !== "success") return;
    const timer = window.setTimeout(() => router.replace("/login?message=password-updated"), 1_500);
    return () => window.clearTimeout(timer);
  }, [router, state.status]);
  return <form action={action} className="space-y-5" noValidate>
    <Message state={state} />
    <PasswordField name="password" autoComplete="new-password" label="New password" required minLength={10} maxLength={128} hint={PASSWORD_REQUIREMENT} error={state.fieldErrors?.password?.[0]} />
    <PasswordField name="confirmPassword" autoComplete="new-password" label="Confirm new password" required minLength={10} maxLength={128} error={state.fieldErrors?.confirmPassword?.[0]} />
    <SubmitButton>Update password</SubmitButton>
  </form>;
}
