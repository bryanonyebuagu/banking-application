# Connecting Chaze Bank to real payment rails

The application ledger is complete, but a ledger entry is not the same thing as money settling through a bank network. ACH, wire, RTP and card settlement must come from an approved provider and be reconciled against that provider’s records.

Supabase currently handles email authentication, recovery, sessions and MFA. It is application infrastructure. Chaze Bank remains the name customers see in the product and authentication emails.

## Integration boundary

All external money movement follows one path:

`customer → Chaze Bank application → Chaze Bank backend → provider adapter → approved provider`

Provider-specific code belongs behind the adapter. Route handlers and UI components must never call a provider directly, and provider credentials must remain server-only.

## Paystack merchant collections

Paystack hosted checkout is implemented for card, bank, bank-transfer, USSD, QR, mobile-money and Apple Pay channels that Paystack enables for the merchant account and country. The customer selects an active account in the provider currency. The application initializes checkout on the server, verifies `x-paystack-signature` on the raw webhook payload, records each event once, compares the provider amount and currency with the original collection, and posts the balanced deposit only after `charge.success`.

NGN withdrawals use Paystack Transfers. They require AAL2, resolve the destination through Paystack, place an available-balance hold before the transfer request, and never persist the full destination account number. Signed `transfer.success`, `transfer.failed` and `transfer.reversed` events capture, release or reverse the ledger movement. If an API call has an uncertain outcome after transfer initiation, the hold remains in place for webhook reconciliation.

Set these server-side deployment variables only after the Paystack business has been activated:

- `PAYSTACK_MODE=live`
- `PAYSTACK_SECRET_KEY` with the Paystack live secret key
- `PAYSTACK_CURRENCY` for the activated market
- `PAYSTACK_ALLOWED_CHANNELS` containing only dashboard-enabled channels
- `PAYSTACK_TRANSFERS_ENABLED=true` only after Paystack approves and activates Transfers
- `SUPABASE_SECRET_KEY` for signed webhook persistence

Register `https://bryobankerz.vercel.app/api/payments/paystack/webhook` as the live Paystack webhook URL. Hosted checkout returns to `https://bryobankerz.vercel.app/payments/paystack/callback`.

Provider receipts are intentionally separate from deposit-account balances. Crediting a Chaze Bank customer account requires a sponsor-approved settlement account, customer-level allocation rules, returns handling and reconciliation. A successful merchant charge alone does not authorize a deposit-ledger credit.

The Paystack business must have Transfers enabled and enough transfer balance. If transfer confirmation by OTP remains enabled in Paystack, the transfer stays pending until it is approved through Paystack. Refund adapters remain server-only until an audited staff approval workflow and refund limits are defined.

| Rail | What Chaze Bank still needs |
| --- | --- |
| ACH and direct deposit | Approved account product, production API access, assigned receiving instructions, reports and webhooks |
| Domestic wire | Wire entitlement, beneficiary instructions, production authentication and status reporting |
| International wire | Cross-border approval, supported currencies, FX/compliance rules and production credentials |
| RTP | An eligible provider account and explicit real-time-payment entitlement |
| Debit-card issuing | A regulated issuing processor/sponsor, card-program approval, tokenized PAN handling and processor webhooks |
| Zelle® | Acceptance as a participating financial institution and the implementation package supplied through that partnership |

## Before a rail can be enabled

1. Complete the legal, regulatory and compliance work for every jurisdiction served.
2. Choose a banking or payment provider and finish its institutional onboarding.
3. Receive production credentials and a written list of enabled products.
4. Implement the provider’s required authentication, signing or mTLS flow inside the adapter.
5. Verify webhook signatures and protect against retries and replay attacks.
6. Map submitted, pending, settled, returned and reversed provider states to internal records.
7. Reconcile provider reports against the immutable ledger every day.
8. Complete provider certification and operational review before exposing the rail to customers.

## Runtime protection

`BANKING_PROVIDER_MODE` defaults to `disabled`. Sandbox and production modes require the server-only endpoint, OAuth and provider-account variables documented in `.env.example`. `BANKING_PROVIDER_ENABLED_RAILS` may list only entitlements confirmed by the provider.

Configuration alone does not activate a rail. The backend continues to reject live use until the approved provider operation and settlement handling are implemented. The `/receive-money` page therefore shows availability without creating account numbers, beneficiary instructions or successful settlements.
