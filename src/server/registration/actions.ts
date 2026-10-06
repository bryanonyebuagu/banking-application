"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireVerifiedIdentity } from "@/server/auth/identity";
import { requireSameOrigin } from "@/server/security/request";
import { identityVerificationProvider } from "@/server/verification/provider";

export type RegistrationActionState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const initialState: RegistrationActionState = { status: "idle" };
const requiredText = (label: string, max: number) => z.string().trim().min(1, `Enter ${label}.`).max(max);
const optionalText = (max: number) => z.string().trim().max(max).transform((value) => value || null);
const phone = z.string().trim().min(7, "Enter a valid phone number.").max(32);
const dateOfBirth = z.iso.date().refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  const today = new Date();
  const oldest = new Date(Date.UTC(today.getUTCFullYear() - 120, today.getUTCMonth(), today.getUTCDate()));
  const youngest = new Date(Date.UTC(today.getUTCFullYear() - 18, today.getUTCMonth(), today.getUTCDate()));
  return date >= oldest && date <= youngest;
}, "You must be between 18 and 120 years old.");
const incomeRange = z.enum(["under_25000","25000_49999","50000_74999","75000_99999","100000_149999","150000_plus"]);

function value(formData: FormData, key: string) {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry : "";
}

function invalid(error: z.ZodError): RegistrationActionState {
  return { status: "error", message: "Check the highlighted information.", fieldErrors: error.flatten().fieldErrors };
}

async function authorize() {
  await requireSameOrigin();
  await requireVerifiedIdentity();
  return createServerSupabaseClient();
}

export async function savePersonalAction(_state: RegistrationActionState = initialState, formData: FormData): Promise<RegistrationActionState> {
  void _state;
  const parsed = z.object({
    firstName: requiredText("your first name", 100),
    middleName: optionalText(100),
    lastName: requiredText("your last name", 100),
    dateOfBirth,
    phone,
  }).safeParse({
    firstName: value(formData,"firstName"), middleName: value(formData,"middleName"), lastName: value(formData,"lastName"),
    dateOfBirth: value(formData,"dateOfBirth"), phone: value(formData,"phone"),
  });
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await authorize();
  const result = await supabase.rpc("save_current_registration_personal", {
    p_first_name: parsed.data.firstName, p_middle_name: parsed.data.middleName ?? "", p_last_name: parsed.data.lastName,
    p_date_of_birth: parsed.data.dateOfBirth, p_phone: parsed.data.phone,
  });
  if (result.error) return { status: "error", message: "We couldn’t save this step. Try again." };
  redirect("/register?step=address");
}

export async function saveAddressAction(_state: RegistrationActionState = initialState, formData: FormData): Promise<RegistrationActionState> {
  void _state;
  const parsed = z.object({
    line1: requiredText("your street address",200), line2: optionalText(200), city: requiredText("your city",100),
    state: requiredText("your state or region",100), postalCode: requiredText("your postal code",20),
    country: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Use a two-letter country code."),
  }).safeParse({ line1:value(formData,"line1"),line2:value(formData,"line2"),city:value(formData,"city"),state:value(formData,"state"),postalCode:value(formData,"postalCode"),country:value(formData,"country") });
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await authorize();
  const result = await supabase.rpc("save_current_registration_address", {
    p_line1:parsed.data.line1,p_line2:parsed.data.line2 ?? "",p_city:parsed.data.city,p_state:parsed.data.state,p_postal_code:parsed.data.postalCode,p_country:parsed.data.country,
  });
  if (result.error) return { status:"error",message:"We couldn’t save this step. Complete the personal step and try again." };
  redirect("/register?step=employment");
}

export async function saveEmploymentAction(_state: RegistrationActionState = initialState, formData: FormData): Promise<RegistrationActionState> {
  void _state;
  const parsed = z.object({ employment:requiredText("your employment information",200),incomeRange }).safeParse({ employment:value(formData,"employment"),incomeRange:value(formData,"incomeRange") });
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await authorize();
  const result = await supabase.rpc("save_current_registration_employment", { p_employment:parsed.data.employment,p_income_range:parsed.data.incomeRange });
  if (result.error) return { status:"error",message:"We couldn’t save this step. Complete the address step and try again." };
  redirect("/register?step=review");
}

export async function completeRegistrationAction() {
  const supabase = await authorize();
  const result = await supabase.rpc("complete_current_registration");
  if (result.error) redirect("/register?step=review&message=save-failed");
  redirect("/register?step=verification");
}

export async function verifyIdentityAction(formData: FormData) {
  const parsed = z.enum(["verified","failed","manual_review"]).safeParse(value(formData,"scenario"));
  if (!parsed.success) redirect("/register?step=verification&message=scenario-required");
  const supabase = await authorize();
  const request = await identityVerificationProvider.createSyntheticRequest(parsed.data);
  const pending = await supabase.rpc("begin_current_synthetic_verification", { p_fixture_id:request.fixtureId });
  if (pending.error || !pending.data) redirect("/register?step=verification&message=verification-failed");
  const completed = await supabase.rpc("complete_current_synthetic_verification", { p_record_id:pending.data,p_test_answer:request.testAnswer });
  if (completed.error) redirect("/register?step=verification&message=verification-failed");
  redirect(`/register?step=verification&result=${completed.data}`);
}
