import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { environment } from "@/config/server";
import type { Database } from "@/types/database.generated";
import { authRedirect, safeAuthDestination } from "@/lib/auth/redirect";

function callbackFailure(reference: string, source?: NextResponse) {
  const url = new URL("/login", environment.APP_ORIGIN);
  url.searchParams.set("message", "link-invalid");
  url.searchParams.set("reference", reference);
  return authRedirect(url, source);
}

export async function GET(request: NextRequest) {
  const reference = randomUUID();
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  if (!code && tokenHash) {
    // Older open recovery forms still supply this callback as RedirectTo.
    const confirmation = new URL("/auth/confirm", environment.APP_ORIGIN);
    confirmation.searchParams.set("type", "recovery");
    confirmation.searchParams.set("token_hash", tokenHash);
    return authRedirect(confirmation);
  }
  if (!code) {
    console.error(JSON.stringify({ event: "AUTH_CALLBACK_FAILED", reference, stage: "missing_code" }));
    return callbackFailure(reference);
  }
  const destination = safeAuthDestination(request.nextUrl.searchParams.get("next"));
  const continuation = new URL("/auth/continue", environment.APP_ORIGIN);
  continuation.searchParams.set("next", destination);
  const response = authRedirect(continuation);
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
    const exchanged = await supabase.auth.exchangeCodeForSession(code);
    if (exchanged.error || !exchanged.data.session) {
      console.error(JSON.stringify({ event: "AUTH_CALLBACK_FAILED", reference, stage: "code_exchange", providerCode: exchanged.error?.code ?? null }));
      return callbackFailure(reference, response);
    }
    const synced = await supabase.rpc("sync_current_session");
    if (synced.error) {
      console.error(JSON.stringify({ event: "AUTH_CALLBACK_FAILED", reference, stage: "session_sync", sessionCode: synced.error.code ?? null }));
      await supabase.auth.signOut({ scope: "local" });
      return callbackFailure(reference, response);
    }
    const audited = await supabase.rpc("record_current_login_event", { p_event_type: "login" });
    if (audited.error) console.error(JSON.stringify({ event: "AUTH_CALLBACK_AUDIT_FAILED", reference, auditCode: audited.error.code ?? null }));
    return response;
  } catch (error) {
    console.error(JSON.stringify({
      event: "AUTH_CALLBACK_FAILED",
      reference,
      stage: "unexpected",
      errorType: error instanceof Error ? error.name : "UnknownError",
    }));
    return callbackFailure(reference, response);
  }
}
