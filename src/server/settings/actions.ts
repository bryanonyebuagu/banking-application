"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireVerifiedIdentity } from "@/server/auth/identity";
import { requireSameOrigin } from "@/server/security/request";

function value(data: FormData, key: string) { const item = data.get(key); return typeof item === "string" ? item : ""; }
async function client() { await requireSameOrigin(); await requireVerifiedIdentity(); return createServerSupabaseClient(); }
function finish(message: string): never { revalidatePath("/settings"); redirect(`/settings?message=${message}`); }

export async function updateContactAction(data: FormData) {
  const parsed = z.object({ displayName: z.string().trim().min(1).max(120), phone: z.string().trim().min(7).max(32).regex(/^\+?[0-9 ()-]+$/) }).safeParse({ displayName: value(data, "displayName"), phone: value(data, "phone") });
  if (!parsed.success) redirect("/settings?message=invalid-contact");
  const supabase = await client(); const result = await supabase.rpc("update_current_contact", { p_display_name: parsed.data.displayName, p_phone: parsed.data.phone });
  finish(result.error ? "failed" : "contact-saved");
}

export async function updateAddressAction(data: FormData) {
  const parsed = z.object({ line1: z.string().trim().min(1).max(200), line2: z.string().trim().max(200), city: z.string().trim().min(1).max(100), state: z.string().trim().max(100), postalCode: z.string().trim().min(1).max(20), country: z.string().trim().length(2).transform((item) => item.toUpperCase()) }).safeParse({ line1: value(data, "line1"), line2: value(data, "line2"), city: value(data, "city"), state: value(data, "state"), postalCode: value(data, "postalCode"), country: value(data, "country") });
  if (!parsed.success) redirect("/settings?message=invalid-address");
  const supabase = await client(); const result = await supabase.rpc("update_current_primary_address", { p_line1: parsed.data.line1, p_line2: parsed.data.line2, p_city: parsed.data.city, p_state: parsed.data.state, p_postal_code: parsed.data.postalCode, p_country: parsed.data.country });
  finish(result.error ? "failed" : "address-saved");
}

export async function updatePreferencesAction(data: FormData) {
  const parsed = z.object({ locale: z.enum(["en-US", "en-GB"]), timezone: z.enum(["UTC", "Africa/Lagos", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Europe/London"]) }).safeParse({ locale: value(data, "locale"), timezone: value(data, "timezone") });
  if (!parsed.success) redirect("/settings?message=invalid-preferences");
  const supabase = await client(); const result = await supabase.rpc("update_current_preferences", { p_locale: parsed.data.locale, p_timezone: parsed.data.timezone, p_marketing_opt_in: data.get("marketingOptIn") === "on", p_hide_balances: data.get("hideBalances") === "on" });
  finish(result.error ? "failed" : "preferences-saved");
}

function validSignature(bytes: Uint8Array, type: string) {
  if (type === "application/pdf") return bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  if (type === "image/png") return bytes.length >= 8 && [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((item, index) => bytes[index] === item);
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

export async function uploadSyntheticDocumentAction(data: FormData) {
  const kind = z.enum(["synthetic_identity", "correspondence"]).safeParse(value(data, "kind")); const file = data.get("document");
  if (!kind.success || !(file instanceof File) || file.size < 5 || file.size > 5242880 || !["application/pdf", "image/png", "image/jpeg"].includes(file.type)) redirect("/settings?message=invalid-document");
  const bytes = new Uint8Array(await file.arrayBuffer()); if (!validSignature(bytes, file.type)) redirect("/settings?message=invalid-document");
  const supabase = await client(); const customer = await supabase.from("customers").select("id").single(); if (customer.error) redirect("/settings?message=failed");
  const id = randomUUID(); const extension = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg"; const objectKey = `${customer.data.id}/${id}.${extension}`;
  const begun = await supabase.rpc("begin_current_document_upload", { p_document_id: id, p_kind: kind.data, p_object_key: objectKey, p_mime_type: file.type, p_size_bytes: file.size });
  if (begun.error) redirect("/settings?message=failed");
  const upload = await supabase.storage.from("bank-documents").upload(objectKey, bytes, { contentType: file.type, upsert: false });
  if (upload.error) { await supabase.rpc("delete_current_document", { p_document_id: id }); redirect("/settings?message=upload-failed"); }
  const finalized = await supabase.rpc("finalize_current_document_upload", { p_document_id: id });
  if (finalized.error) { await supabase.storage.from("bank-documents").remove([objectKey]); await supabase.rpc("delete_current_document", { p_document_id: id }); redirect("/settings?message=failed"); }
  finish("document-uploaded");
}

export async function deleteDocumentAction(data: FormData) {
  const id = z.uuid().safeParse(value(data, "documentId")); if (!id.success) redirect("/settings?message=failed");
  const supabase = await client(); const document = await supabase.from("customer_documents").select("object_key").eq("id", id.data).maybeSingle(); if (document.error || !document.data) redirect("/settings?message=failed");
  const removed = await supabase.storage.from("bank-documents").remove([document.data.object_key]); if (removed.error) redirect("/settings?message=failed");
  const deleted = await supabase.rpc("delete_current_document", { p_document_id: id.data }); finish(deleted.error ? "failed" : "document-deleted");
}
