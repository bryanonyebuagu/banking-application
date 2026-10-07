# Connecting Chaze Bank to real payment rails

The application ledger is complete, but a ledger entry is not the same thing as money settling through a bank network. ACH, wire, RTP and card settlement must come from an approved provider and be reconciled against that provider’s records.

Supabase currently handles email authentication, recovery, sessions and MFA. It is application infrastructure. Chaze Bank remains the name customers see in the product and authentication emails.

## Integration boundary

All external money movement follows one path:

`customer → Chaze Bank application → Chaze Bank backend → provider adapter → approved provider`

Provider-specific code belongs behind the adapter. Route handlers and UI components must never call a provider directly, and provider credentials must remain server-only.

| Rail | What Chaze Bank still needs |
| --- | --- |
| ACH and direct deposit | Approved account product, production API access, assigned receiving instructions, reports and webhooks |
| Domestic wire | Wire entitlement, beneficiary instructions, production authentication and status reporting |
| International wire | Cross-border approval, supported currencies, FX/compliance rules and production credentials |
| RTP | An eligible provider account and explicit real-time-payment entitlement |
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
