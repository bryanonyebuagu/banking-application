# Production banking integration

## Current state

Email/password authentication is provider-backed by Supabase Auth. Signup confirmation, password recovery, PKCE callbacks, refresh sessions and authenticator MFA use provider-issued credentials rather than an application password table. Production delivery requires a verified sender domain and custom SMTP provider configured in the Supabase dashboard. Set `AUTH_EMAIL_DELIVERY=custom-smtp` only after that configuration is active.

The existing ledger, account identifiers and money-movement commands are internal application records. They are not connected to a deposit account or payment network and must never be presented as externally settled funds.

## Production rails

| Rail | Required external relationship | Application state |
| --- | --- | --- |
| ACH and direct deposit | Approved J.P. Morgan account/product, production API or reporting entitlement, issued account/routing instructions | Provider boundary and fail-closed capability state added |
| Domestic wire | Approved wire product, production credentials, beneficiary instructions and webhook/reporting source | Provider boundary and fail-closed capability state added |
| International wire | Approved cross-border product, supported currencies, FX/compliance setup and production credentials | Provider boundary and fail-closed capability state added |
| Real-Time Payments | J.P. Morgan RTP entitlement and eligible account | Provider boundary and fail-closed capability state added |
| Zelle® | BANK must be accepted as a Zelle Network financial-institution partner and receive its implementation package | Institutional approval required; no public consumer API is substituted |

## Activation sequence

1. Establish the regulated entity and operating/compliance program needed to offer accounts and money transmission in each served jurisdiction.
2. Complete J.P. Morgan client onboarding and select the approved account, ACH, wire, RTP, reporting and webhook products.
3. Complete the separate Zelle Network financial-institution partnership process.
4. Configure a production domain, HTTPS, Supabase production project, custom SMTP sender and production redirect allowlist.
5. Store provider credentials in the deployment secret manager. Never place them in `NEXT_PUBLIC_*`, source control or customer-visible responses.
6. Implement the exact API operations and authentication mechanism assigned during onboarding, including mTLS or signing requirements where applicable.
7. Add signed webhook ingestion, replay protection, idempotency, provider-status polling, returns/reversals, cutoff calendars and reconciliation.
8. Replace internally created balances with provider-confirmed settlement events. A submitted request remains pending until confirmed by the provider.
9. Complete provider certification, security review, disaster recovery, operations runbooks and production activation before enabling a rail.

## Runtime gates

`PAYMENTS_PROVIDER_MODE` defaults to `disabled`. Production mode requires HTTPS, Supabase configuration and custom SMTP. J.P. Morgan modes require server-only endpoint, OAuth and account configuration. `JPMORGAN_ENABLED_RAILS` records only entitlements confirmed by the provider. The application still rejects money movement until the approved API operation is implemented; the presence of credentials alone never creates a successful transaction.

The protected `/receive-money` screen shows ACH/direct deposit, domestic wire, international wire, RTP and Zelle capability states without inventing account numbers or receiving instructions.
