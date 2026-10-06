import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { environment } from "@/config/server";
import type { Database } from "@/types/database.generated";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/dashboard";
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/login?message=link-invalid", request.url));
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
  const exchanged = await supabase.auth.exchangeCodeForSession(code);
  if (exchanged.error || (await supabase.rpc("sync_current_session")).error) {
    return NextResponse.redirect(new URL("/login?message=link-invalid", request.url));
  }
  await supabase.rpc("record_current_login_event", { p_event_type: "login" });
  return response;
}
