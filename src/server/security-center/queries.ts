import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getSecurityCenter() {
  const supabase = await createServerSupabaseClient();
  const [sessions, devices, securityEvents, loginEvents, currentSession, factors, assurance] = await Promise.all([
    supabase.from("app_sessions").select("id,device_id,last_seen_at,expires_at,idle_expires_at,revoked_at,created_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("devices").select("id,label,trusted_until,revoked_at,created_at,updated_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("security_events").select("id,event_type,outcome,reason_code,occurred_at").order("occurred_at", { ascending: false }).limit(50),
    supabase.from("login_events").select("id,event_type,outcome,reason_code,occurred_at").order("occurred_at", { ascending: false }).limit(50),
    supabase.rpc("get_current_app_session_id"),
    supabase.auth.mfa.listFactors(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  if (sessions.error || devices.error || securityEvents.error || loginEvents.error || currentSession.error || factors.error || assurance.error) throw new Error("SECURITY_CENTER_FAILED");
  return {
    sessions: sessions.data,
    devices: devices.data,
    events: [...securityEvents.data.map((event) => ({ ...event, category: "Security" })), ...loginEvents.data.map((event) => ({ ...event, category: "Sign-in" }))].sort((a,b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at)).slice(0, 50),
    currentSessionId: currentSession.data,
    factors: factors.data.totp.map((factor) => ({ id: factor.id, friendlyName: factor.friendly_name ?? "Authenticator app", status: factor.status })),
    currentLevel: assurance.data.currentLevel,
    nextLevel: assurance.data.nextLevel,
  };
}
