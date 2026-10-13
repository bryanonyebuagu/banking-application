import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { CookieOptions } from "@supabase/ssr";

const provider = vi.hoisted(() => ({
  exchange: vi.fn(), verify: vi.fn(), signOut: vi.fn(), rpc: vi.fn(), claims: vi.fn(),
  cookies: undefined as undefined | {
    getAll: () => { name: string; value: string }[];
    setAll: (cookies: { name: string; value: string; options: CookieOptions }[]) => void;
  },
}));
vi.mock("@/config/server", () => ({ environment: {
  APP_ORIGIN: "https://bryobankerz.vercel.app", NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-key",
} }));
vi.mock("@supabase/ssr", () => ({ createServerClient: (_url: string, _key: string, options: { cookies: typeof provider.cookies }) => {
  provider.cookies = options.cookies;
  return { auth: { exchangeCodeForSession: provider.exchange, verifyOtp: provider.verify, signOut: provider.signOut, getClaims: provider.claims }, rpc: provider.rpc };
} }));
import { GET as confirm } from "@/app/auth/confirm/route";
import { GET as callback } from "@/app/auth/callback/route";
import { proxy } from "@/proxy";
import { safeAuthDestination } from "@/lib/auth/redirect";

const setCookie = (value: string) => provider.cookies?.setAll([{ name: "auth-session", value, options: { path: "/", secure: true, sameSite: "lax", ...(value ? {} : { maxAge: 0 }) } }]);
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-key");
  const verified = async () => { setCookie("session"); return { data: { session: {} }, error: null }; };
  provider.exchange.mockImplementation(verified);
  provider.verify.mockImplementation(verified);
  provider.signOut.mockImplementation(async () => { setCookie(""); return { error: null }; });
  provider.rpc.mockResolvedValue({ data: "session-id", error: null });
  provider.claims.mockImplementation(async () => { setCookie("refreshed"); return { data: { claims: { sub: "user" } }, error: null }; });
});

describe("confirmation and recovery cookies", () => {
  it("supports a hashed recovery link requested by an older open form", async () => {
    const response = await callback(new NextRequest("https://bryobankerz.vercel.app/auth/callback?next=/reset-password&token_hash=fixture"));
    const target = new URL(response.headers.get("location")!);
    expect(target.pathname).toBe("/auth/confirm");
    expect(target.searchParams.get("type")).toBe("recovery");
    expect(target.searchParams.get("token_hash")).toBe("fixture");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });
  it("retains PKCE recovery support on the new confirmation URL", async () => {
    const response = await confirm(new NextRequest("https://bryobankerz.vercel.app/auth/confirm?type=recovery&code=fixture"));
    expect(new URL(response.headers.get("location")!).searchParams.get("next")).toBe("/reset-password");
    expect(provider.exchange).toHaveBeenCalledWith("fixture");
    expect(provider.signOut).not.toHaveBeenCalled();
  });
  it.each(["type=email&token_hash=fixture", "type=signup&token_hash=fixture", "code=fixture"])("confirms %s without retaining a signed-in session", async (query) => {
    const response = await confirm(new NextRequest(`https://bryobankerz.vercel.app/auth/confirm?${query}`));
    expect(response.headers.get("location")).toBe("https://bryobankerz.vercel.app/login?verified=true");
    expect(provider.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(response.cookies.get("auth-session")?.value).toBe("");
    expect(provider.rpc).not.toHaveBeenCalled();
  });
  it("routes a recovery token to the new-password page without a next parameter", async () => {
    const response = await confirm(new NextRequest("https://bryobankerz.vercel.app/auth/confirm?type=recovery&token_hash=fixture"));
    expect(new URL(response.headers.get("location")!).searchParams.get("next")).toBe("/reset-password");
    expect(response.cookies.get("auth-session")?.value).toBe("session");
    expect(provider.signOut).not.toHaveBeenCalled();
  });
  it("exposes exchanged cookies to subsequent PKCE session checks", async () => {
    provider.rpc.mockImplementation(async () => {
      expect(provider.cookies?.getAll()).toContainEqual({ name: "auth-session", value: "session" });
      return { data: "session-id", error: null };
    });
    const response = await callback(new NextRequest("https://bryobankerz.vercel.app/auth/callback?code=fixture&next=/reset-password"));
    expect(new URL(response.headers.get("location")!).searchParams.get("next")).toBe("/reset-password");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("sends cookie deletion on a rejected recovery session", async () => {
    provider.rpc.mockResolvedValue({ error: { code: "42501" } });
    const response = await callback(new NextRequest("https://bryobankerz.vercel.app/auth/callback?code=fixture"));
    expect(new URL(response.headers.get("location")!).pathname).toBe("/login");
    expect(response.cookies.get("auth-session")?.maxAge).toBe(0);
  });
  it("preserves refreshed cookies when redirecting signed-in visitors", async () => {
    const response = await proxy(new NextRequest("https://bryobankerz.vercel.app/login"));
    expect(response.headers.get("location")).toBe("https://bryobankerz.vercel.app/dashboard");
    expect(response.cookies.get("auth-session")?.value).toBe("refreshed");
  });
  it("refreshes the session cookie while a signed-in user visits a public page", async () => {
    const response = await proxy(new NextRequest("https://bryobankerz.vercel.app/checking"));
    expect(response.headers.get("location")).toBeNull();
    expect(response.cookies.get("auth-session")?.value).toBe("refreshed");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("clears a rejected app session instead of looping to the dashboard", async () => {
    provider.rpc.mockResolvedValue({ error: { code: "42501" } });
    const response = await proxy(new NextRequest("https://bryobankerz.vercel.app/dashboard"));
    expect(response.headers.get("location")).toContain("/login?message=session-required");
    expect(response.cookies.get("auth-session")?.maxAge).toBe(0);
  });
  it.each(["//evil.example", "/\\evil.example", "/\tevil.example", "https://evil.example"])("rejects unsafe redirect %s", (value) => {
    expect(safeAuthDestination(value)).toBe("/dashboard");
  });
});
