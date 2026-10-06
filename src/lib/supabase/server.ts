import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { environment } from "@/config/server";
import type { Database } from "@/types/database.generated";

export async function createServerSupabaseClient() {
  if (!environment.NEXT_PUBLIC_SUPABASE_URL || !environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Supabase server configuration is unavailable.");
  }
  const cookieStore = await cookies();
  return createServerClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: {
        path: "/",
        sameSite: "lax",
        secure: new URL(environment.APP_ORIGIN).protocol === "https:",
      },
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
          } catch {
            // Server Components cannot write cookies. The request proxy performs refresh writes.
          }
        },
      },
    },
  );
}
