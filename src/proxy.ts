import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.generated";

const protectedPaths = ["/accounts", "/analytics", "/bill-pay", "/cards", "/check-deposit", "/dashboard", "/investments", "/loans", "/mortgages", "/notifications", "/register", "/reset-password", "/security-center", "/settings", "/staff", "/statements", "/support", "/transactions", "/transfers"];
const anonymousPaths = ["/login", "/sign-up", "/forgot-password"];

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.next({ request });
  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });
  const claims = await supabase.auth.getClaims();
  if (claims.error) console.error(JSON.stringify({ event: "AUTH_PROXY_CLAIMS_ERROR", code: claims.error.code ?? null }));
  const signedIn = Boolean(claims.data?.claims?.sub);
  const isProtected = protectedPaths.some((path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`));
  if (isProtected && signedIn) {
    const synced = await supabase.rpc("sync_current_session");
    if (synced.error) {
      console.error(JSON.stringify({ event: "AUTH_PROXY_SESSION_REJECTED", code: synced.error.code ?? null }));
      const destination = request.nextUrl.clone();
      destination.pathname = "/login";
      destination.search = "?message=session-required";
      return NextResponse.redirect(destination);
    }
  }
  if (isProtected && !signedIn) {
    console.error(JSON.stringify({ event: "AUTH_PROXY_SESSION_MISSING", path: request.nextUrl.pathname }));
    const destination = request.nextUrl.clone();
    destination.pathname = "/login";
    destination.search = "?message=session-required";
    return NextResponse.redirect(destination);
  }
  const rejectedSession = request.nextUrl.pathname === "/login" && request.nextUrl.searchParams.get("message") === "session-required";
  if (signedIn && anonymousPaths.includes(request.nextUrl.pathname) && !rejectedSession) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/dashboard";
    destination.search = "";
    return NextResponse.redirect(destination);
  }
  return response;
}

export const config = { matcher: ["/accounts/:path*", "/analytics/:path*", "/bill-pay/:path*", "/cards/:path*", "/check-deposit/:path*", "/dashboard/:path*", "/investments/:path*", "/loans/:path*", "/mortgages/:path*", "/notifications/:path*", "/register/:path*", "/reset-password", "/security-center/:path*", "/settings/:path*", "/staff/:path*", "/statements/:path*", "/support/:path*", "/transactions/:path*", "/transfers/:path*", "/login", "/sign-up", "/forgot-password"] };
