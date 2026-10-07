import { Alert } from "@/components/ui/surfaces";
import { AuthShell } from "@/features/auth/auth-shell";
import { LoginForm } from "@/features/auth/auth-forms";

const messages: Record<string, string> = {
  "password-updated": "Your password was updated. Sign in again on this device.",
  "signed-out": "You have signed out.",
  "session-required": "Sign in to continue.",
  "link-invalid": "That authentication link is invalid or expired. Request a new one.",
  "verification-failed": "We couldn’t verify that email link. Request a new one and try again.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ message?: string; reference?: string; verified?: string }> }) {
  const params = await searchParams;
  const message = params.verified === "true" ? "Email verified. Sign in with the email and password you used to create your account." : messages[params.message ?? ""];
  const isError = params.message === "link-invalid" || params.message === "verification-failed";
  return <AuthShell title="Sign in" description="Access your Chaze Bank accounts securely.">
    {message && <div className="mb-5"><Alert title={message} tone={isError ? "error" : "success"}>{isError && params.reference ? <>Support reference: <code>{params.reference}</code></> : null}</Alert></div>}
    <LoginForm />
  </AuthShell>;
}
