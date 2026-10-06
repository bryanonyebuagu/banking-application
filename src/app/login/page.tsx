import { Alert } from "@/components/ui/surfaces";
import { AuthShell } from "@/features/auth/auth-shell";
import { LoginForm } from "@/features/auth/auth-forms";

const messages: Record<string, string> = {
  "password-updated": "Your password was updated. Sign in again on this device.",
  "signed-out": "You have signed out.",
  "session-required": "Sign in to continue.",
  "link-invalid": "That authentication link is invalid or expired. Request a new one.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const message = messages[(await searchParams).message ?? ""];
  return <AuthShell title="Sign in" description="Access your BANK accounts securely.">
    {message && <div className="mb-5"><Alert title={message} tone="success" /></div>}
    <LoginForm />
  </AuthShell>;
}
