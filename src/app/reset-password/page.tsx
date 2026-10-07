import { AuthShell } from "@/features/auth/auth-shell";
import { ResetPasswordForm } from "@/features/auth/auth-forms";
import { requireVerifiedIdentity } from "@/server/auth/identity";

export default async function ResetPasswordPage() {
  await requireVerifiedIdentity();
  return <AuthShell title="Create New Password" description="Updating your password signs out every active Chaze Bank session.">
    <ResetPasswordForm />
  </AuthShell>;
}
