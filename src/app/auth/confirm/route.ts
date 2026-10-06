import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { environment } from "@/config/server";
import type { Database } from "@/types/database.generated";

const otpTypes = new Set<EmailOtpType>(["email", "email_change", "invite", "magiclink", "recovery", "signup"]);

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/dashboard";
}

function confirmationFailure(reference: string) {
  const url = new URL("/login", environment.APP_ORIGIN);
  url.searchParams.set("message", "verification-failed");
  url.searchParams.set("reference", reference);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const reference = randomUUID();
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const rawType = request.nextUrl.searchParams.get("type");
  const type = rawType && otpTypes.has(rawType as EmailOtpType) ? rawType as EmailOtpType : null;
  const code = request.nextUrl.searchParams.get("code");
  const isSignupConfirmation = Boolean(code) || type === "signup";
  const destination = safeNext(request.nextUrl.searchParams.get("next"));
  const redirectUrl = isSignupConfirmation
    ? new URL("/login?verified=true", environment.APP_ORIGIN)
    : new URL(`/auth/continue?next=${encodeURIComponent(destination)}`, environment.APP_ORIGIN);
  const response = NextResponse.redirect(redirectUrl);
  const cookieJar = new Map(request.cookies.getAll().map(({ name, value }) => [name, value]));
  const supabase = createServerClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL!,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: { path: "/", sameSite: "lax", secure: new URL(environment.APP_ORIGIN).protocol === "https:" },
      cookies: {
        getAll: () => Array.from(cookieJar, ([name, value]) => ({ name, value })),
        setAll: (cookiesToSet) => {
          for (const { name, value, options } of cookiesToSet) {
            cookieJar.set(name, value);
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );
  try {
    const confirmed = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : tokenHash && type
        ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
        : null;
    if (!confirmed || confirmed.error || !confirmed.data.session) {
      console.error(JSON.stringify({
        event: "AUTH_EMAIL_CONFIRMATION_FAILED",
        reference,
        stage: confirmed ? "provider_confirmation" : "invalid_callback_parameters",
        providerCode: confirmed?.error?.code ?? null,
        flow: code ? "pkce" : tokenHash ? "token_hash" : "missing",
      }));
      return confirmationFailure(reference);
    }
    if (isSignupConfirmation) {
      const signedOut = await supabase.auth.signOut({ scope: "local" });
      if (signedOut.error) {
        console.error(JSON.stringify({
          event: "AUTH_EMAIL_CONFIRMATION_FAILED",
          reference,
          stage: "session_clear",
          providerCode: signedOut.error.code ?? null,
        }));
        return confirmationFailure(reference);
      }
      console.info(JSON.stringify({
        event: "AUTH_EMAIL_CONFIRMED",
        reference,
        flow: code ? "pkce" : "token_hash",
      }));
      return response;
    }
    const synced = await supabase.rpc("sync_current_session");
    if (synced.error) {
      console.error(JSON.stringify({
        event: "AUTH_EMAIL_CONFIRMATION_FAILED",
        reference,
        stage: "session_sync",
        sessionCode: synced.error.code ?? null,
      }));
      await supabase.auth.signOut({ scope: "local" });
      return confirmationFailure(reference);
    }
    const audited = await supabase.rpc("record_current_login_event", { p_event_type: "login" });
    if (audited.error) {
      console.error(JSON.stringify({ event: "AUTH_EMAIL_CONFIRMATION_AUDIT_FAILED", reference, auditCode: audited.error.code ?? null }));
    }
    return response;
  } catch (error) {
    console.error(JSON.stringify({
      event: "AUTH_EMAIL_CONFIRMATION_FAILED",
      reference,
      stage: "unexpected",
      errorType: error instanceof Error ? error.name : "UnknownError",
    }));
    return confirmationFailure(reference);
  }
}
