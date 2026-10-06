import { AuthShell } from "@/features/auth/auth-shell";
import { SignUpForm } from "@/features/auth/auth-forms";

export default function SignUpPage() {
  return <AuthShell title="Create your account" description="Start with email verification, then complete your personal profile and identity check.">
    <SignUpForm />
  </AuthShell>;
}
