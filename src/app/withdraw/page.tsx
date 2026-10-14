import Link from "next/link";
import { Alert,Card } from "@/components/ui/surfaces";
import { environment } from "@/config/server";
import { WithdrawalForm } from "@/features/payments/withdrawal-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listCurrentAccounts } from "@/server/accounts/queries";
import { requireVerifiedIdentity } from "@/server/auth/identity";

export default async function WithdrawPage(){
  const[identity,accounts,supabase]=await Promise.all([requireVerifiedIdentity(),listCurrentAccounts(),createServerSupabaseClient()]);const balances=await supabase.rpc("get_current_account_balances");
  const options=accounts.filter((account)=>account.status==="active"&&account.currency===environment.PAYSTACK_CURRENCY).map((account)=>({id:account.id,nickname:account.nickname,maskedAccountNumber:account.masked_account_number,availableBalanceMinor:balances.data?.find((item)=>item.account_id===account.id)?.available_balance_minor??0}));
  return <main id="main-content" className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6"><Link className="font-semibold text-action underline" href="/dashboard">Back to dashboard</Link><p className="mt-8 text-sm font-semibold uppercase tracking-widest text-action">Money movement</p><h1 className="mt-2 text-3xl font-semibold">Withdraw money</h1><p className="mt-3 text-muted">Send money from an eligible Chaze Bank account to a verified bank account through Paystack.</p><Card className="mt-7">{environment.PAYSTACK_MODE==="disabled"||!environment.PAYSTACK_TRANSFERS_ENABLED||environment.PAYSTACK_CURRENCY!=="NGN"?<Alert title="Withdrawals are not configured">Live NGN Paystack credentials and Transfers approval are required.</Alert>:identity.currentAssuranceLevel!=="aal2"?<Alert title="MFA verification required">Withdrawals require a current AAL2 session. <Link className="font-semibold text-action underline" href="/security-center">Open Security Center</Link>.</Alert>:options.length===0?<Alert title={`No eligible ${environment.PAYSTACK_CURRENCY} account`}>Open and fund an account in the provider currency before withdrawing.</Alert>:<WithdrawalForm currency={environment.PAYSTACK_CURRENCY} accounts={options}/>}</Card></main>;
}
