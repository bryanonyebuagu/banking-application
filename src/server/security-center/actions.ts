"use server";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { environment } from "@/config/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireVerifiedIdentity } from "@/server/auth/identity";
import { requireSameOrigin } from "@/server/security/request";

function value(data: FormData, key: string) { const item = data.get(key); return typeof item === "string" ? item : ""; }
async function authorized(requireAal2 = false) { await requireSameOrigin(); const identity = await requireVerifiedIdentity(); if (requireAal2 && identity.currentAssuranceLevel !== "aal2") redirect("/security-center?message=step-up-required"); return createServerSupabaseClient(); }
function finish(message: string): never { revalidatePath("/security-center"); redirect(`/security-center?message=${message}`); }

export async function registerDeviceAction(data: FormData) {
  const parsed = z.object({ label: z.string().trim().min(1).max(120), trustDays: z.coerce.number().int().min(1).max(30) }).safeParse({ label: value(data, "label"), trustDays: value(data, "trustDays") });
  if (!parsed.success) redirect("/security-center?message=invalid-device");
  const supabase = await authorized(); const store = await cookies(); let secret = store.get("bank_device")?.value;
  if (!secret || !/^[A-Za-z0-9_-]{40,100}$/.test(secret)) { secret = randomBytes(32).toString("base64url"); store.set("bank_device", secret, { httpOnly: true, sameSite: "lax", secure: new URL(environment.APP_ORIGIN).protocol === "https:", path: "/", maxAge: 60 * 60 * 24 * 30 }); }
  const result = await supabase.rpc("register_current_device", { p_device_id: randomUUID(), p_device_token_hash: createHash("sha256").update(secret).digest("hex"), p_label: parsed.data.label, p_trust_days: parsed.data.trustDays });
  finish(result.error ? "failed" : "device-saved");
}

export async function revokeSessionAction(data: FormData) {
  const id = z.uuid().safeParse(value(data, "sessionId")); if (!id.success) redirect("/security-center?message=failed"); const supabase = await authorized(true);
  const result = await supabase.rpc("revoke_current_user_session", { p_app_session_id: id.data }); finish(result.error ? "failed" : "session-revoked");
}

export async function revokeDeviceAction(data: FormData) {
  const id = z.uuid().safeParse(value(data, "deviceId")); if (!id.success) redirect("/security-center?message=failed"); const supabase = await authorized(true);
  const result = await supabase.rpc("revoke_current_device", { p_device_id: id.data }); finish(result.error ? "failed" : "device-revoked");
}
