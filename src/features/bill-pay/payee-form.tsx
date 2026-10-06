"use client";
import { useActionState } from "react";
import { Input } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/surfaces";
import { createPayeeAction,type BillPayActionState } from "@/server/bill-pay/actions";
const initial:BillPayActionState={status:"idle"};
export function PayeeForm(){const[state,action]=useActionState(createPayeeAction,initial);return <form action={action} className="space-y-4" noValidate>{state.message&&<Alert title="Unable to save payee" tone="error">{state.message}</Alert>}<Input name="name" label="Payee name" required maxLength={120} error={state.fieldErrors?.name?.[0]}/><Input name="reference" label="Payee reference" required placeholder="SIM-UTILITY-0001" hint="Enter the payment reference supplied for this payee." error={state.fieldErrors?.reference?.[0]}/><SubmitButton>Save payee</SubmitButton></form>}
