import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getCurrentSettings() {
  const supabase = await createServerSupabaseClient();
  const [customer, profile, address, preferences, documents, auth] = await Promise.all([
    supabase.from("customers").select("id,profile_id,first_name,middle_name,last_name,contact_email,phone,date_of_birth,customer_since,verification_status,account_status").single(),
    supabase.from("profiles").select("display_name,locale,timezone").single(),
    supabase.from("addresses").select("id,line1,line2,city,state,postal_code,country").eq("type", "home").eq("is_primary", true).maybeSingle(),
    supabase.from("customer_preferences").select("locale,timezone,marketing_opt_in,hide_balances").maybeSingle(),
    supabase.from("customer_documents").select("id,kind,object_key,mime_type,size_bytes,status,created_at").order("created_at", { ascending: false }),
    supabase.auth.getUser(),
  ]);
  if (customer.error || profile.error || address.error || preferences.error || documents.error || auth.error) throw new Error("SETTINGS_FAILED");
  const withUrls = await Promise.all(documents.data.map(async (document) => {
    if (document.status !== "ready") return { ...document, downloadUrl: null };
    const signed = await supabase.storage.from("bank-documents").createSignedUrl(document.object_key, 300);
    return { ...document, downloadUrl: signed.data?.signedUrl ?? null };
  }));
  return { customer: customer.data, profile: profile.data, address: address.data, preferences: preferences.data, documents: withUrls, authEmail: auth.data.user.email ?? customer.data.contact_email };
}
