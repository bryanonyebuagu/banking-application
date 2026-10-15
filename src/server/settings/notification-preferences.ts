import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getCurrentDeliveryPreferences() {
  const supabase = await createServerSupabaseClient();
  const result = await supabase.from("notification_preferences").select("type,channel,enabled").in("channel", ["email","sms"]);
  if (result.error) throw new Error("NOTIFICATION_PREFERENCES_FAILED");
  return result.data;
}
