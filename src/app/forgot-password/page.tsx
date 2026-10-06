import { AuthShell } from "@/features/auth/auth-shell";
import { ForgotPasswordForm } from "@/features/auth/auth-forms";

export default function ForgotPasswordPage() {
  return <AuthShell title="Reset your password" description="Enter your account email. We’ll send instructions without confirming whether an account exists.">
    <ForgotPasswordForm />
  </AuthShell>;
}
