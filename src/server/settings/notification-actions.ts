"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { notificationOptions } from "@/features/settings/notification-options";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireVerifiedIdentity } from "@/server/auth/identity";
import { requireSameOrigin } from "@/server/security/request";

const typeSchema = z.enum(notificationOptions.map((item)=>item.type) as [typeof notificationOptions[number]["type"], ...typeof notificationOptions[number]["type"][]]);

export async function updateDeliveryPreferenceAction(data: FormData) {
  await requireSameOrigin();
  await requireVerifiedIdentity();
  const parsed = typeSchema.safeParse(data.get("type"));
  if (!parsed.success) redirect("/settings/notifications?message=failed");
  const option = notificationOptions.find((item)=>item.type === parsed.data);
  const email = option && "mandatoryEmail" in option && option.mandatoryEmail ? true : data.get("email") === "on";
  const sms = data.get("sms") === "on";
  const supabase = await createServerSupabaseClient();
  const [emailResult, smsResult] = await Promise.all([
    supabase.rpc("set_current_notification_delivery_preference", { p_type: parsed.data, p_channel: "email", p_enabled: email }),
    supabase.rpc("set_current_notification_delivery_preference", { p_type: parsed.data, p_channel: "sms", p_enabled: sms }),
  ]);
  if (emailResult.error || smsResult.error) {
    console.error(JSON.stringify({ event: "NOTIFICATION_PREFERENCE_UPDATE_FAILED", emailCode: emailResult.error?.code ?? null, smsCode: smsResult.error?.code ?? null }));
    redirect("/settings/notifications?message=failed");
  }
  revalidatePath("/settings/notifications");
  redirect("/settings/notifications?message=saved");
}
