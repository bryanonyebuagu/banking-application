import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
export async function getNotificationCenter() {
  const supabase = await createServerSupabaseClient();
  await supabase.rpc("sync_current_notifications");
  const [notifications, preferences] = await Promise.all([
    supabase.from("notifications").select("id,type,title,body,resource_type,resource_id,read_at,created_at").order("created_at", { ascending: false }).limit(200),
    supabase.from("notification_preferences").select("id,type,channel,enabled").eq("channel", "in_app").order("type"),
  ]);
  if (notifications.error || preferences.error) throw new Error("NOTIFICATION_CENTER_FAILED");
  const types = [...new Set(notifications.data.map((item) => item.type))].sort();
  return { notifications: notifications.data, preferences: preferences.data, types, unread: notifications.data.filter((item) => !item.read_at).length };
}
