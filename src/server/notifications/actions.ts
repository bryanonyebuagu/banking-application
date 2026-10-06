"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireVerifiedIdentity } from "@/server/auth/identity";
import { requireSameOrigin } from "@/server/security/request";
function value(data: FormData, key: string) { const item = data.get(key); return typeof item === "string" ? item : ""; }
async function client() { await requireSameOrigin(); await requireVerifiedIdentity(); return createServerSupabaseClient(); }
export async function markNotificationReadAction(data: FormData) { const id = z.uuid().safeParse(value(data, "notificationId")); if (!id.success) redirect("/notifications"); const supabase = await client(); await supabase.rpc("mark_current_notification_read", { p_notification_id: id.data, p_read: true }); revalidatePath("/notifications"); redirect("/notifications"); }
export async function markAllNotificationsReadAction() { const supabase = await client(); await supabase.rpc("mark_all_current_notifications_read"); revalidatePath("/notifications"); redirect("/notifications?message=read"); }
export async function updateNotificationPreferenceAction(data: FormData) { const parsed = z.object({ type: z.string().trim().min(1).max(100), enabled: z.enum(["true", "false"]) }).safeParse({ type: value(data, "type"), enabled: value(data, "enabled") }); if (!parsed.success) redirect("/notifications"); const supabase = await client(); await supabase.rpc("set_current_notification_preference", { p_type: parsed.data.type, p_enabled: parsed.data.enabled === "true" }); revalidatePath("/notifications"); redirect("/notifications?message=preference"); }
