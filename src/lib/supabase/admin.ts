import "server-only";
import { createClient } from "@supabase/supabase-js";
import { environment } from "@/config/server";
import type { Database } from "@/types/database.generated";

export function createAdminSupabaseClient() {
  if (!environment.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) throw new Error("PAYMENT_DATABASE_CONFIGURATION_MISSING");
  return createClient<Database>(environment.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
