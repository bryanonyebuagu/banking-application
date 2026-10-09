import { AuthShell } from "@/features/auth/auth-shell";
import { SignUpForm } from "@/features/auth/auth-forms";

export default function SignUpPage() {
  return <AuthShell title="Create a demo account" description="Enter your name, email and an application-specific password. We’ll send a verification link to your inbox.">
    <SignUpForm />
  </AuthShell>;
}
