import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { environment } from "@/config/server";
import type { Database } from "@/types/database.generated";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/dashboard";
}

function callbackFailure(reference: string) {
  const url = new URL("/login", environment.APP_ORIGIN);
  url.searchParams.set("message", "link-invalid");
  url.searchParams.set("reference", reference);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const reference = randomUUID();
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    console.error(JSON.stringify({ event: "AUTH_CALLBACK_FAILED", reference, stage: "missing_code" }));
    return callbackFailure(reference);
  }
  const destination = safeNext(request.nextUrl.searchParams.get("next"));
  const continuation = new URL("/auth/continue", environment.APP_ORIGIN);
  continuation.searchParams.set("next", destination);
  const response = NextResponse.redirect(continuation);
  const supabase = createServerClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL!,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: { path: "/", sameSite: "lax", secure: new URL(environment.APP_ORIGIN).protocol === "https:" },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        },
      },
    },
  );
  try {
    const exchanged = await supabase.auth.exchangeCodeForSession(code);
    if (exchanged.error || !exchanged.data.session) {
      console.error(JSON.stringify({ event: "AUTH_CALLBACK_FAILED", reference, stage: "code_exchange", providerCode: exchanged.error?.code ?? null }));
      return callbackFailure(reference);
    }
    const synced = await supabase.rpc("sync_current_session");
    if (synced.error) {
      console.error(JSON.stringify({ event: "AUTH_CALLBACK_FAILED", reference, stage: "session_sync", sessionCode: synced.error.code ?? null }));
      await supabase.auth.signOut({ scope: "local" });
      return callbackFailure(reference);
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
    return callbackFailure(reference);
  }
}
