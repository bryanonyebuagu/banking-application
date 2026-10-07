import { AuthShell } from "@/features/auth/auth-shell";
import { SignUpForm } from "@/features/auth/auth-forms";

export default function SignUpPage() {
  return <AuthShell title="Create your account" description="Enter your name, email and password. We’ll send a verification link to your inbox.">
    <SignUpForm />
  </AuthShell>;
}
