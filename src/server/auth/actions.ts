"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { environment } from "@/config/server";
import { passwordSchema } from "@/lib/auth/password-policy";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireSameOrigin } from "@/server/security/request";

export type AuthActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const initialState: AuthActionState = { status: "idle" };
const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.").max(254);
const nameSchema = (label: string) => z.string().trim().min(1, `Enter your ${label}.`).max(100, `${label.charAt(0).toUpperCase()}${label.slice(1)} must be 100 characters or fewer.`);

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function validationFailure(error: z.ZodError): AuthActionState {
  return { status: "error", message: "Check the highlighted information.", fieldErrors: error.flatten().fieldErrors };
}

export async function loginAction(_state: AuthActionState = initialState, formData: FormData): Promise<AuthActionState> {
  void _state;
  await requireSameOrigin();
  const parsed = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password.").max(128) }).safeParse({
    email: formValue(formData, "email"),
    password: formValue(formData, "password"),
  });
  if (!parsed.success) return validationFailure(parsed.error);
  const supabase = await createServerSupabaseClient();
  const signedIn = await supabase.auth.signInWithPassword(parsed.data);
  const synced = signedIn.error ? null : await supabase.rpc("sync_current_session");
  const audited = !signedIn.error && synced && !synced.error
    ? await supabase.rpc("record_current_login_event", { p_event_type: "login" })
    : null;
  if (signedIn.error || synced?.error || audited?.error) {
    console.error(JSON.stringify({
      event: "AUTH_LOGIN_FAILED",
      providerCode: signedIn.error?.code ?? null,
      sessionCode: synced?.error?.code ?? null,
      auditCode: audited?.error?.code ?? null,
    }));
    await supabase.auth.signOut({ scope: "local" });
    return { status: "error", message: "We couldn’t sign you in. Check your details or try again shortly." };
  }
  redirect("/dashboard");
}

export async function signUpAction(_state: AuthActionState = initialState, formData: FormData): Promise<AuthActionState> {
  void _state;
  await requireSameOrigin();
  const parsed = z.object({
    firstName: nameSchema("first name"),
    lastName: nameSchema("last name"),
    email: emailSchema,
    password: passwordSchema,
  }).safeParse({
    firstName: formValue(formData, "firstName"),
    lastName: formValue(formData, "lastName"),
    email: formValue(formData, "email"),
    password: formValue(formData, "password"),
  });
  if (!parsed.success) return validationFailure(parsed.error);
  const supabase = await createServerSupabaseClient();
  const signedUp = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${environment.APP_ORIGIN}/auth/confirm`,
      data: {
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName,
        full_name: `${parsed.data.firstName} ${parsed.data.lastName}`,
      },
    },
  });
  if (signedUp.error) {
    console.error(JSON.stringify({
      event: "AUTH_SIGNUP_FAILED",
      providerCode: signedUp.error.code ?? null,
      providerStatus: signedUp.error.status ?? null,
    }));
    return {
      status: "error",
      message: "We couldn’t complete your signup request. Try again shortly or contact support.",
    };
  }
  return {
    status: "success",
    message: "If this address can be registered, we sent a verification link. Open your inbox and follow the link to continue.",
  };
}

export async function resetPasswordAction(_state: AuthActionState = initialState, formData: FormData): Promise<AuthActionState> {
  void _state;
  await requireSameOrigin();
  const parsed = z.object({ password: passwordSchema, confirmPassword: z.string() }).superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords must match." });
    }
  }).safeParse({
    password: formValue(formData, "password"),
    confirmPassword: formValue(formData, "confirmPassword"),
  });
  if (!parsed.success) return validationFailure(parsed.error);
  const supabase = await createServerSupabaseClient();
  const claims = await supabase.auth.getClaims();
  if (!claims.data?.claims?.sub) return { status: "error", message: "This reset session has expired. Request a new link." };
  const updated = await supabase.auth.updateUser({ password: parsed.data.password });
  if (updated.error || !updated.data.user) {
    console.error(JSON.stringify({ event: "AUTH_PASSWORD_UPDATE_FAILED", providerCode: updated.error?.code ?? null }));
    return { status: "error", message: "We couldn’t update the password. Request a new link and try again." };
  }
  const audited = await supabase.rpc("record_current_security_event", { p_event_type: "recovery_completed" });
  const revoked = await supabase.rpc("revoke_all_current_user_sessions");
  const signedOut = await supabase.auth.signOut({ scope: "global" });
  if (audited.error || revoked.error || signedOut.error) {
    console.error(JSON.stringify({
      event: "AUTH_PASSWORD_UPDATE_CLEANUP_FAILED",
      auditCode: audited.error?.code ?? null,
      sessionCode: revoked.error?.code ?? null,
      providerCode: signedOut.error?.code ?? null,
    }));
  }
  return { status: "success", message: "Your password has been updated successfully." };
}

export async function logoutAction() {
  await requireSameOrigin();
  const supabase = await createServerSupabaseClient();
  await supabase.rpc("record_current_login_event", { p_event_type: "logout" });
  await supabase.rpc("revoke_current_session");
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?message=signed-out");
}
