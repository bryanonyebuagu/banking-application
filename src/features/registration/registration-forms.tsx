"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/fields";
import {
  saveAddressAction,
  saveEmploymentAction,
  savePersonalAction,
  type RegistrationActionState,
} from "@/server/registration/actions";

export type RegistrationDraft = {
  first_name: string | null; middle_name: string | null; last_name: string | null; date_of_birth: string | null; phone: string | null;
  line1: string | null; line2: string | null; city: string | null; state: string | null; postal_code: string | null; country: string | null;
  employment: string | null; income_range: string | null;
};

const initialState: RegistrationActionState = { status: "idle" };

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <Button type="submit" pending={pending}>{children}</Button>;
}

function ErrorMessage({ state }: { state: RegistrationActionState }) {
  return state.message ? <Alert title="Unable to save" tone="error">{state.message}</Alert> : null;
}

export function PersonalForm({ draft }: { draft: RegistrationDraft | null }) {
  const [state, action] = useActionState(savePersonalAction, initialState);
  return <form action={action} className="space-y-5" noValidate>
    <ErrorMessage state={state} />
    <div className="grid gap-5 sm:grid-cols-2">
      <Input name="firstName" label="First name" required defaultValue={draft?.first_name ?? ""} error={state.fieldErrors?.firstName?.[0]} autoComplete="given-name" />
      <Input name="middleName" label="Middle name" defaultValue={draft?.middle_name ?? ""} error={state.fieldErrors?.middleName?.[0]} autoComplete="additional-name" />
    </div>
    <Input name="lastName" label="Last name" required defaultValue={draft?.last_name ?? ""} error={state.fieldErrors?.lastName?.[0]} autoComplete="family-name" />
    <div className="grid gap-5 sm:grid-cols-2">
      <Input name="dateOfBirth" label="Date of birth" type="date" required defaultValue={draft?.date_of_birth ?? ""} error={state.fieldErrors?.dateOfBirth?.[0]} autoComplete="bday" />
      <Input name="phone" label="Phone" type="tel" required defaultValue={draft?.phone ?? ""} error={state.fieldErrors?.phone?.[0]} autoComplete="tel" />
    </div>
    <div className="flex justify-end"><Submit>Save and continue</Submit></div>
  </form>;
}

export function AddressForm({ draft }: { draft: RegistrationDraft }) {
  const [state, action] = useActionState(saveAddressAction, initialState);
  return <form action={action} className="space-y-5" noValidate>
    <ErrorMessage state={state} />
    <Input name="line1" label="Street address" required defaultValue={draft.line1 ?? ""} error={state.fieldErrors?.line1?.[0]} autoComplete="address-line1" />
    <Input name="line2" label="Apartment, suite or unit" defaultValue={draft.line2 ?? ""} error={state.fieldErrors?.line2?.[0]} autoComplete="address-line2" />
    <div className="grid gap-5 sm:grid-cols-2">
      <Input name="city" label="City" required defaultValue={draft.city ?? ""} error={state.fieldErrors?.city?.[0]} autoComplete="address-level2" />
      <Input name="state" label="State or region" required defaultValue={draft.state ?? ""} error={state.fieldErrors?.state?.[0]} autoComplete="address-level1" />
      <Input name="postalCode" label="Postal code" required defaultValue={draft.postal_code ?? ""} error={state.fieldErrors?.postalCode?.[0]} autoComplete="postal-code" />
      <Input name="country" label="Country code" required hint="Use a two-letter code, such as US or NG." defaultValue={draft.country ?? ""} error={state.fieldErrors?.country?.[0]} autoComplete="country" />
    </div>
    <div className="flex flex-wrap justify-between gap-3"><Link className="inline-flex min-h-11 items-center px-2 font-semibold text-action underline" href="/register?step=personal">Back</Link><Submit>Save and continue</Submit></div>
  </form>;
}

export function EmploymentForm({ draft }: { draft: RegistrationDraft }) {
  const [state, action] = useActionState(saveEmploymentAction, initialState);
  return <form action={action} className="space-y-5" noValidate>
    <ErrorMessage state={state} />
    <Input name="employment" label="Employment information" required hint="Enter your employer and role." defaultValue={draft.employment ?? ""} error={state.fieldErrors?.employment?.[0]} autoComplete="organization-title" />
    <Select name="incomeRange" label="Annual income range" required defaultValue={draft.income_range ?? ""} error={state.fieldErrors?.incomeRange?.[0]}>
      <option value="" disabled>Select a range</option>
      <option value="under_25000">Under $25,000</option><option value="25000_49999">$25,000–$49,999</option>
      <option value="50000_74999">$50,000–$74,999</option><option value="75000_99999">$75,000–$99,999</option>
      <option value="100000_149999">$100,000–$149,999</option><option value="150000_plus">$150,000 or more</option>
    </Select>
    <div className="flex flex-wrap justify-between gap-3"><Link className="inline-flex min-h-11 items-center px-2 font-semibold text-action underline" href="/register?step=address">Back</Link><Submit>Save and review</Submit></div>
  </form>;
}
