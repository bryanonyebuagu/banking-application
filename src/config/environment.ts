import { z } from "zod";

const optionalValue = z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).optional());

function normalizedOrigin(value: string | undefined) {
  if (!value) return null;
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  const parsed = z.url().safeParse(candidate);
  if (!parsed.success) return null;
  return new URL(parsed.data).origin;
}

function isLoopback(origin: string) {
  const hostname = new URL(origin).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function resolveApplicationOrigin(input: Record<string, string | undefined>) {
  const explicitValue = input.APP_ORIGIN;
  const explicit = explicitValue && /^https?:\/\//i.test(explicitValue) ? normalizedOrigin(explicitValue) : null;
  const isVercel = input.VERCEL === "1" || Boolean(input.VERCEL_ENV);

  if (explicitValue && !explicit) throw new Error("Invalid configuration: APP_ORIGIN must be an absolute HTTP or HTTPS URL.");

  if (explicit && (!isVercel || !isLoopback(explicit))) return explicit;

  if (isVercel) {
    const vercelOrigin = input.VERCEL_ENV === "production"
      ? normalizedOrigin(input.VERCEL_PROJECT_PRODUCTION_URL) ?? normalizedOrigin(input.VERCEL_URL)
      : normalizedOrigin(input.VERCEL_URL) ?? normalizedOrigin(input.VERCEL_PROJECT_PRODUCTION_URL);
    if (vercelOrigin && !isLoopback(vercelOrigin)) return vercelOrigin;
    throw new Error("Invalid configuration: APP_ORIGIN must be a hosted URL on Vercel.");
  }

  return explicit ?? "http://localhost:3000";
}

const schema = z.object({
  APP_ENV: z.enum(["local", "test", "demo", "production"]).default("local"),
  APP_ORIGIN: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: optionalValue,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalValue,
  AUTH_EMAIL_DELIVERY: z.enum(["supabase-default", "custom-smtp"]).default("supabase-default"),
  BANKING_PROVIDER_MODE: z.enum(["disabled", "sandbox", "production"]).default("disabled"),
  BANKING_PROVIDER_BASE_URL: optionalValue,
  BANKING_PROVIDER_OAUTH_TOKEN_URL: optionalValue,
  BANKING_PROVIDER_CLIENT_ID: optionalValue,
  BANKING_PROVIDER_CLIENT_SECRET: optionalValue,
  BANKING_PROVIDER_ACCOUNT_ID: optionalValue,
  BANKING_PROVIDER_ENABLED_RAILS: optionalValue,
  PAYSTACK_MODE: z.enum(["disabled", "test", "live"]).default("disabled"),
  PAYSTACK_SECRET_KEY: optionalValue,
  PAYSTACK_CURRENCY: z.enum(["NGN", "USD", "GHS", "ZAR", "KES"]).default("NGN"),
  PAYSTACK_ALLOWED_CHANNELS: z.string().default("card,bank,bank_transfer,ussd"),
  PAYSTACK_TRANSFERS_ENABLED: z.enum(["true","false"]).default("false").transform((value)=>value==="true"),
}).superRefine((value, context) => {
  if (Boolean(value.NEXT_PUBLIC_SUPABASE_URL) !== Boolean(value.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) {
    context.addIssue({ code: "custom", message: "Supabase URL and publishable key must be configured together." });
  }
  if (value.NEXT_PUBLIC_SUPABASE_URL && !z.url().safeParse(value.NEXT_PUBLIC_SUPABASE_URL).success) {
    context.addIssue({ code: "custom", path: ["NEXT_PUBLIC_SUPABASE_URL"], message: "Expected an absolute URL." });
  }
  for (const key of ["BANKING_PROVIDER_BASE_URL", "BANKING_PROVIDER_OAUTH_TOKEN_URL"] as const) {
    if (value[key] && !z.url().safeParse(value[key]).success) context.addIssue({ code: "custom", path: [key], message: "Expected an absolute URL." });
  }
  if (["demo", "production"].includes(value.APP_ENV) && (!value.NEXT_PUBLIC_SUPABASE_URL || !value.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) {
    context.addIssue({ code: "custom", message: "A hosted environment requires Supabase configuration." });
  }
  if (value.APP_ENV === "demo" && new URL(value.APP_ORIGIN).protocol !== "https:") {
    context.addIssue({ code: "custom", path: ["APP_ORIGIN"], message: "Hosted demo requires HTTPS." });
  }
  if (value.APP_ENV === "production" && new URL(value.APP_ORIGIN).protocol !== "https:") {
    context.addIssue({ code: "custom", path: ["APP_ORIGIN"], message: "Production requires HTTPS." });
  }
  if (value.APP_ENV === "production" && value.AUTH_EMAIL_DELIVERY !== "custom-smtp") {
    context.addIssue({ code: "custom", path: ["AUTH_EMAIL_DELIVERY"], message: "Production email authentication requires custom SMTP delivery." });
  }
  if (value.BANKING_PROVIDER_MODE !== "disabled") {
    const required = ["BANKING_PROVIDER_BASE_URL", "BANKING_PROVIDER_OAUTH_TOKEN_URL", "BANKING_PROVIDER_CLIENT_ID", "BANKING_PROVIDER_CLIENT_SECRET", "BANKING_PROVIDER_ACCOUNT_ID"] as const;
    for (const key of required) if (!value[key]) context.addIssue({ code: "custom", path: [key], message: `Required when ${value.BANKING_PROVIDER_MODE} is enabled.` });
  }
  if (value.BANKING_PROVIDER_MODE === "production" && value.APP_ENV !== "production") {
    context.addIssue({ code: "custom", path: ["BANKING_PROVIDER_MODE"], message: "Production payment rails require APP_ENV=production." });
  }
  if (value.PAYSTACK_MODE !== "disabled") {
    if (!value.PAYSTACK_SECRET_KEY) context.addIssue({ code: "custom", path: ["PAYSTACK_SECRET_KEY"], message: `Required when Paystack ${value.PAYSTACK_MODE} mode is enabled.` });
    const expectedPrefix = value.PAYSTACK_MODE === "live" ? "sk_live_" : "sk_test_";
    if (value.PAYSTACK_SECRET_KEY && !value.PAYSTACK_SECRET_KEY.startsWith(expectedPrefix)) context.addIssue({ code: "custom", path: ["PAYSTACK_SECRET_KEY"], message: `Expected a ${expectedPrefix} key.` });
    const allowed = new Set(["card","bank","bank_transfer","ussd","qr","mobile_money","apple_pay"]);
    for (const channel of value.PAYSTACK_ALLOWED_CHANNELS.split(",").map((item) => item.trim()).filter(Boolean)) {
      if (!allowed.has(channel)) context.addIssue({ code: "custom", path: ["PAYSTACK_ALLOWED_CHANNELS"], message: `Unsupported Paystack channel: ${channel}.` });
    }
  }
  if (value.PAYSTACK_MODE === "live" && value.APP_ENV !== "production") {
    context.addIssue({ code: "custom", path: ["PAYSTACK_MODE"], message: "Live Paystack requires APP_ENV=production." });
  }
  if (value.PAYSTACK_TRANSFERS_ENABLED && value.PAYSTACK_MODE === "disabled") {
    context.addIssue({ code: "custom", path: ["PAYSTACK_TRANSFERS_ENABLED"], message: "Paystack Transfers requires Paystack to be enabled." });
  }
});

export function parseEnvironment(input: Record<string, string | undefined>) {
  const result = schema.safeParse({ ...input, APP_ORIGIN: resolveApplicationOrigin(input) });
  if (!result.success) {
    throw new Error(`Invalid configuration: ${result.error.issues.map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`).join("; ")}`);
  }
  return result.data;
}
