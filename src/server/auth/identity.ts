import "server-only";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type VerifiedIdentity = {
  userId: string;
  email: string | null;
  currentAssuranceLevel: "aal1" | "aal2" | null;
  nextAssuranceLevel: "aal1" | "aal2" | null;
};

function assuranceLevel(value: unknown): "aal1" | "aal2" | null {
  return value === "aal1" || value === "aal2" ? value : null;
}

export async function getVerifiedIdentity(): Promise<VerifiedIdentity | null> {
  const supabase = await createServerSupabaseClient();
  const claimsResult = await supabase.auth.getClaims();
  const claims = claimsResult.data?.claims;
  const subject = claims?.sub;
  if (!subject) return null;
  return {
    userId: subject,
    email: typeof claims.email === "string" ? claims.email : null,
    currentAssuranceLevel: assuranceLevel(claims.aal),
    nextAssuranceLevel: null,
  };
}

export async function requireVerifiedIdentity() {
  const identity = await getVerifiedIdentity();
  if (!identity) redirect("/login?message=session-required");
  return identity;
}

export async function requireAal2() {
  const identity = await requireVerifiedIdentity();
  if (identity.currentAssuranceLevel !== "aal2") redirect("/dashboard?message=step-up-required");
  return identity;
}
