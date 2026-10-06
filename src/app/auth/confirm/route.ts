import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { environment } from "@/config/server";
import type { Database } from "@/types/database.generated";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/dashboard";
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  if (!tokenHash || !type) return NextResponse.redirect(new URL("/login?message=link-invalid", request.url));
  const destination = safeNext(request.nextUrl.searchParams.get("next"));
  const response = NextResponse.redirect(new URL(`/auth/continue?next=${encodeURIComponent(destination)}`, request.url));
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
  const verified = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (verified.error || !verified.data.session) {
    return NextResponse.redirect(new URL("/login?message=link-invalid", request.url));
  }
  const stored = await supabase.auth.setSession({
    access_token: verified.data.session.access_token,
    refresh_token: verified.data.session.refresh_token,
  });
  if (stored.error || (await supabase.rpc("sync_current_session")).error) {
    return NextResponse.redirect(new URL("/login?message=link-invalid", request.url));
  }
  await supabase.rpc("record_current_login_event", { p_event_type: "login" });
  return response;
}
