import { NextResponse } from "next/server";

export function safeAuthDestination(value: string | null | undefined, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || [...value].some((character) => character.charCodeAt(0) <= 32)) return fallback;
  return value;
}

// Redirects must carry refreshes and deletions, including on failure paths.
export function authRedirect(url: URL, source?: NextResponse) {
  const response = NextResponse.redirect(url);
  for (const cookie of source?.cookies.getAll() ?? []) response.cookies.set(cookie);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
