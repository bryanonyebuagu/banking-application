import { describe, expect, it } from "vitest";
import { parseEnvironment } from "@/config/environment";

describe("environment boundary", () => {
  it("allows a local foundation without credentials", () => {
    expect(parseEnvironment({}).APP_ENV).toBe("local");
  });
  it("rejects partial Supabase configuration", () => {
    expect(() => parseEnvironment({ NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co" })).toThrow("configured together");
  });
  it("requires credentials and HTTPS for a hosted demo", () => {
    expect(() => parseEnvironment({ APP_ENV: "demo" })).toThrow("requires Supabase");
    expect(() => parseEnvironment({ APP_ENV: "demo", APP_ORIGIN: "http://example.com", NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key" })).toThrow("requires HTTPS");
  });
  it("accepts a complete HTTPS demo configuration", () => {
    expect(parseEnvironment({ APP_ENV: "demo", APP_ORIGIN: "https://demo.example.com", NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key" }).APP_ENV).toBe("demo");
  });
  it("does not include secret values in validation failures", () => {
    expect(() => parseEnvironment({ APP_ENV: "private-secret-value" })).toThrow();
    try { parseEnvironment({ APP_ENV: "private-secret-value" }); } catch (error) { expect(String(error)).not.toContain("private-secret-value"); }
  });
  it("strips unrelated variables and rejects malformed URLs", () => {
    expect(parseEnvironment({ SUPABASE_SECRET_KEY: "must-not-leak" })).not.toHaveProperty("SUPABASE_SECRET_KEY");
    expect(() => parseEnvironment({ APP_ORIGIN: "not-a-url" })).toThrow("APP_ORIGIN");
  });
  it("keeps Paystack disabled unless an appropriate secret key is configured", () => {
    expect(parseEnvironment({}).PAYSTACK_MODE).toBe("disabled");
    expect(() => parseEnvironment({ PAYSTACK_MODE: "test" })).toThrow("PAYSTACK_SECRET_KEY");
    expect(() => parseEnvironment({ PAYSTACK_MODE: "test", PAYSTACK_SECRET_KEY: "sk_live_wrong" })).toThrow("sk_test_");
    expect(parseEnvironment({ PAYSTACK_MODE: "test", PAYSTACK_SECRET_KEY: "sk_test_example" }).PAYSTACK_MODE).toBe("test");
  });
  it("permits live Paystack only in a fully configured production environment", () => {
    const production = { APP_ENV:"production", APP_ORIGIN:"https://bryobankerz.vercel.app", AUTH_EMAIL_DELIVERY:"custom-smtp", NEXT_PUBLIC_SUPABASE_URL:"https://example.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:"publishable", PAYSTACK_MODE:"live", PAYSTACK_SECRET_KEY:"sk_live_example" };
    expect(parseEnvironment(production).PAYSTACK_MODE).toBe("live");
    expect(() => parseEnvironment({ ...production, APP_ENV:"demo" })).toThrow("Live Paystack requires APP_ENV=production");
  });
});
