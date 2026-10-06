import { z } from "zod";

const optionalValue = z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).optional());
const schema = z.object({
  APP_ENV: z.enum(["local", "test", "demo", "production"]).default("local"),
  APP_ORIGIN: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: optionalValue,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalValue,
  AUTH_EMAIL_DELIVERY: z.enum(["supabase-default", "custom-smtp"]).default("supabase-default"),
  PAYMENTS_PROVIDER_MODE: z.enum(["disabled", "jpmorgan-mock", "jpmorgan-production"]).default("disabled"),
  JPMORGAN_PAYMENTS_BASE_URL: optionalValue,
  JPMORGAN_OAUTH_TOKEN_URL: optionalValue,
  JPMORGAN_CLIENT_ID: optionalValue,
  JPMORGAN_CLIENT_SECRET: optionalValue,
  JPMORGAN_ACCOUNT_ID: optionalValue,
  JPMORGAN_ENABLED_RAILS: optionalValue,
}).superRefine((value, context) => {
  if (Boolean(value.NEXT_PUBLIC_SUPABASE_URL) !== Boolean(value.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) {
    context.addIssue({ code: "custom", message: "Supabase URL and publishable key must be configured together." });
  }
  if (value.NEXT_PUBLIC_SUPABASE_URL && !z.url().safeParse(value.NEXT_PUBLIC_SUPABASE_URL).success) {
    context.addIssue({ code: "custom", path: ["NEXT_PUBLIC_SUPABASE_URL"], message: "Expected an absolute URL." });
  }
  for (const key of ["JPMORGAN_PAYMENTS_BASE_URL", "JPMORGAN_OAUTH_TOKEN_URL"] as const) {
    if (value[key] && !z.url().safeParse(value[key]).success) context.addIssue({ code: "custom", path: [key], message: "Expected an absolute URL." });
  }
  if (["demo", "production"].includes(value.APP_ENV) && (!value.NEXT_PUBLIC_SUPABASE_URL || !value.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) {
    context.addIssue({ code: "custom", message: "Hosted environments require Supabase configuration." });
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
  if (value.PAYMENTS_PROVIDER_MODE !== "disabled") {
    const required = ["JPMORGAN_PAYMENTS_BASE_URL", "JPMORGAN_OAUTH_TOKEN_URL", "JPMORGAN_CLIENT_ID", "JPMORGAN_CLIENT_SECRET", "JPMORGAN_ACCOUNT_ID"] as const;
    for (const key of required) if (!value[key]) context.addIssue({ code: "custom", path: [key], message: `Required when ${value.PAYMENTS_PROVIDER_MODE} is enabled.` });
  }
  if (value.PAYMENTS_PROVIDER_MODE === "jpmorgan-production" && value.APP_ENV !== "production") {
    context.addIssue({ code: "custom", path: ["PAYMENTS_PROVIDER_MODE"], message: "Production payment rails require APP_ENV=production." });
  }
});

export function parseEnvironment(input: Record<string, string | undefined>) {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new Error(`Invalid configuration: ${result.error.issues.map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`).join("; ")}`);
  }
  return result.data;
}
