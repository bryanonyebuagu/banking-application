"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.generated";

export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase browser configuration is unavailable.");
  return createBrowserClient<Database>(url, key);
}
