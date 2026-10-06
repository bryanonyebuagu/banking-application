import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/surfaces";
import { SubmitButton } from "@/components/ui/submit-button";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireVerifiedIdentity } from "@/server/auth/identity";
import { completeRegistrationAction, verifyIdentityAction } from "@/server/registration/actions";
import { AddressForm, EmploymentForm, PersonalForm, type RegistrationDraft } from "@/features/registration/registration-forms";
import { RegistrationShell } from "@/features/registration/registration-shell";

const steps = ["personal","address","employment","review","verification"] as const;
type Step = typeof steps[number];
const incomeLabels: Record<string,string> = { under_25000:"Under $25,000", "25000_49999":"$25,000–$49,999", "50000_74999":"$50,000–$74,999", "75000_99999":"$75,000–$99,999", "100000_149999":"$100,000–$149,999", "150000_plus":"$150,000 or more" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ step?: string; message?: string; result?: string }> }) {
  await requireVerifiedIdentity();
  const supabase = await createServerSupabaseClient();
  const [{ data: customer }, { data: draft }, params] = await Promise.all([
    supabase.from("customers").select("id,first_name,middle_name,last_name,contact_email,phone,date_of_birth,employment,income_range,verification_status").maybeSingle(),
    supabase.from("registration_drafts").select("first_name,middle_name,last_name,date_of_birth,phone,line1,line2,city,state,postal_code,country,employment,income_range,current_step").maybeSingle(),
    searchParams,
  ]);
  const requested = steps.includes(params.step as Step) ? params.step as Step : null;
  if (customer?.verification_status === "verified" && requested !== "verification") redirect("/dashboard");
  let step: Step;
  if (customer) step = "verification";
  else {
    const available = (draft?.current_step ?? "personal") as Step;
    const requestedIndex = requested ? steps.indexOf(requested) : -1;
    step = requested && requestedIndex <= steps.indexOf(available) ? requested : available;
  }
  const active = steps.indexOf(step);
  const savedDraft = draft as RegistrationDraft | null;

  if (step === "personal") return <RegistrationShell active={active} title="Tell us about yourself" description="Your email and password are secured. Add the details needed to complete your profile."><PersonalForm draft={savedDraft} /></RegistrationShell>;
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

  const status = (params.result ?? customer?.verification_status ?? "not_started").replaceAll("_"," ");
  return <RegistrationShell active={active} title="Identity verification" description="Complete the identity check to activate your profile.">
    <Alert title={`Current status: ${status}`} tone={status === "verified" ? "success" : status === "failed" ? "error" : "info"}>
      {status === "verified" ? "Verification completed. Your profile is ready." : status === "manual review" ? "Your information is waiting for review." : status === "failed" ? "We could not complete verification. You can try again." : "Select a verification path to begin."}
    </Alert>
    {params.message && <div className="mt-5"><Alert title="Unable to verify" tone="error">Select a scenario and try again.</Alert></div>}
    {status !== "verified" && <form action={verifyIdentityAction} className="mt-6 space-y-5">
      <label className="block font-semibold" htmlFor="scenario">Verification path</label>
      <select id="scenario" name="scenario" required className="min-h-11 w-full rounded-control border border-muted bg-surface px-3 py-2">
        <option value="">Select an outcome</option><option value="verified">Successful verification</option><option value="failed">Failed verification</option><option value="manual_review">Manual review</option>
      </select>
      <p className="text-sm text-muted">Choose the path that applies to this registration.</p>
      <SubmitButton>Complete verification</SubmitButton>
    </form>}
    {status === "verified" && <div className="mt-6"><Link className="inline-flex min-h-11 items-center rounded-control bg-action px-4 py-2 font-semibold text-white" href="/dashboard">Continue to dashboard</Link></div>}
  </RegistrationShell>;
}
