import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/surfaces";
import { SubmitButton } from "@/components/ui/submit-button";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireVerifiedIdentity } from "@/server/auth/identity";
import { completeRegistrationAction } from "@/server/registration/actions";
import { AddressForm, EmploymentForm, PersonalForm, type RegistrationDraft } from "@/features/registration/registration-forms";
import { RegistrationShell } from "@/features/registration/registration-shell";

const steps = ["personal","address","employment","review"] as const;
type Step = typeof steps[number];
const incomeLabels: Record<string,string> = { under_25000:"Under $25,000", "25000_49999":"$25,000–$49,999", "50000_74999":"$50,000–$74,999", "75000_99999":"$75,000–$99,999", "100000_149999":"$100,000–$149,999", "150000_plus":"$150,000 or more" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ step?: string; message?: string; result?: string }> }) {
  const identity = await requireVerifiedIdentity();
  const supabase = await createServerSupabaseClient();
  const [customerResult, draftResult, params] = await Promise.all([
    supabase.from("customers").select("id,first_name,middle_name,last_name,contact_email,phone,date_of_birth,employment,income_range,verification_status").maybeSingle(),
    supabase.from("registration_drafts").select("first_name,middle_name,last_name,date_of_birth,phone,line1,line2,city,state,postal_code,country,employment,income_range,current_step").maybeSingle(),
    searchParams,
  ]);
  if (customerResult.error || draftResult.error) {
    console.error(JSON.stringify({
      event: "REGISTRATION_STATE_LOAD_FAILED",
      customerCode: customerResult.error?.code ?? null,
      draftCode: draftResult.error?.code ?? null,
    }));
    throw new Error("REGISTRATION_STATE_LOAD_FAILED");
  }
  const customer = customerResult.data;
  const draft = draftResult.data;
  const requested = steps.includes(params.step as Step) ? params.step as Step : null;
  if (customer) redirect("/dashboard");
  const available = steps.includes(draft?.current_step as Step) ? draft?.current_step as Step : "personal";
  const requestedIndex = requested ? steps.indexOf(requested) : -1;
  const step = requested && requestedIndex <= steps.indexOf(available) ? requested : available;
  const active = steps.indexOf(step);
  const savedDraft = draft as RegistrationDraft | null;
  const personalDraft = savedDraft ?? (identity.firstName || identity.lastName ? {
    first_name: identity.firstName,
    middle_name: null,
    last_name: identity.lastName,
    date_of_birth: null,
    phone: null,
    line1: null,
    line2: null,
    city: null,
    state: null,
    postal_code: null,
    country: null,
    employment: null,
    income_range: null,
  } satisfies RegistrationDraft : null);

  if (step === "personal") return <RegistrationShell active={active} title="Tell us about yourself" description="Your name is ready. Add the remaining details needed to complete your profile."><PersonalForm draft={personalDraft} /></RegistrationShell>;
  if (!savedDraft && !customer) redirect("/register?step=personal");
  if (step === "address") return <RegistrationShell active={active} title="Add your home address" description="We use this address to complete your customer profile."><AddressForm draft={savedDraft!} /></RegistrationShell>;
  if (step === "employment") return <RegistrationShell active={active} title="Employment and income" description="Add your current employment and income range."><EmploymentForm draft={savedDraft!} /></RegistrationShell>;
  if (step === "review") return <RegistrationShell active={active} title="Review your registration" description="Confirm the persisted details below before creating the customer profile.">
    {params.message === "save-failed" && <div className="mb-5"><Alert title="Unable to complete registration" tone="error">Review each step and try again.</Alert></div>}
    <dl className="grid gap-5 sm:grid-cols-2">
      <div><dt className="text-sm text-muted">Name</dt><dd className="font-semibold">{[savedDraft!.first_name,savedDraft!.middle_name,savedDraft!.last_name].filter(Boolean).join(" ")}</dd></div>
      <div><dt className="text-sm text-muted">Date of birth</dt><dd className="font-semibold">{savedDraft!.date_of_birth}</dd></div>
      <div><dt className="text-sm text-muted">Phone</dt><dd className="font-semibold">{savedDraft!.phone}</dd></div>
      <div><dt className="text-sm text-muted">Address</dt><dd className="font-semibold">{[savedDraft!.line1,savedDraft!.line2,savedDraft!.city,savedDraft!.state,savedDraft!.postal_code,savedDraft!.country].filter(Boolean).join(", ")}</dd></div>
      <div><dt className="text-sm text-muted">Employment</dt><dd className="font-semibold">{savedDraft!.employment}</dd></div>
      <div><dt className="text-sm text-muted">Income range</dt><dd className="font-semibold">{incomeLabels[savedDraft!.income_range ?? ""] ?? savedDraft!.income_range}</dd></div>
    </dl>
    <div className="mt-7 flex flex-wrap justify-between gap-3"><Link className="inline-flex min-h-11 items-center px-2 font-semibold text-action underline" href="/register?step=employment">Back</Link><form action={completeRegistrationAction}><SubmitButton>Create customer profile</SubmitButton></form></div>
  </RegistrationShell>;

  redirect("/register?step=personal");
}
