# Security architecture

This is a private development banking simulator, not a real financial institution. Product scope comes from PRD.md. Controls below are requirements to implement and test, not a certification or a claim of deployed protection.

The requested production-banking scope is tracked in `PRODUCTION_BANKING_INTEGRATION.md`. No payment rail may be described as live until the regulated entity, provider contract, production entitlement, approved API operation, webhook verification, reconciliation and operational controls are complete. Credentials or a successful local ledger write are insufficient evidence of settlement.

## Trust boundaries and authentication

Treat browser input, URL identifiers, uploads, provider callbacks and scheduled job payloads as untrusted. Supabase Auth owns passwords, email verification, password reset, refresh tokens and MFA factors. Never duplicate credentials in application tables. Signup accepts credentials for Chaze Bank only. Supabase remains authentication infrastructure and no public page may imply affiliation with an external bank or payment provider.

Use request-scoped Supabase SSR clients with validated provider identity; do not authorize from decoded but unverified tokens or a client session object. Refresh cookies through the supported server integration. The selected Supabase SSR integration uses SameSite=Lax, path-scoped auth cookies and enables Secure on HTTPS; its browser-managed auth cookie is not HttpOnly. No token logging or private response caching.

Require verified email and verified simulated KYC before spending. Require fresh step-up MFA for sensitive actions (new recipient plus transfer, security setting changes, recovery-sensitive updates, staff mutations). Define amount thresholds and freshness windows centrally before the affected phase; never hide policy in UI components. Staff requires MFA. Recovery and factor removal must have equivalent assurance, audit and notification; do not invent an insecure bypass.

Provider sessions remain the authentication authority. app_sessions adds app-level revocation: deny revoked session IDs on every protected API, command and RLS path so a still-valid access token cannot bypass logout/revocation. The Phase 3 policy is a 30-minute idle lifetime capped by a 12-hour absolute lifetime and the provider token expiry; expired or revoked session IDs cannot be revived. Session removal also uses provider-supported revocation where available. Device labels/trust are convenience metadata, not proof of identity or a substitute for MFA. Password changes and security actions create persistent redacted events through validated provider events or app workflows; reconcile provider-origin activity rather than claiming all activity passes through the frontend.

## Authorization and staff capabilities

Default deny. Enforce checks in server services and again in database commands/policies. Resolve current roles from trusted private tables; user-editable auth metadata cannot grant privileges. Route protection is only the first layer. Never accept actor_id, owner_id or role from a client as authoritative.

| Role | Allowed scope | Explicit limits |
| --- | --- | --- |
| Customer | Own eligible accounts, history, profile, settings and requests | Cannot change financial balances, verification result, roles or other customers |
| Support Agent | Assigned tickets, customer-safe context and secure replies | No ledger writes, role grants or unrestricted security/identity data |
| Fraud Analyst | Verification review, security cases and restrictions with reasons | No arbitrary fund movement or staff provisioning |
| Operations | Scheduled-work review, simulator settlements, approved correction commands | No raw ledger edits or role grants |
| Administrator | Staff provisioning, configuration and audited record-management commands | No audit erasure, credential access or direct balance edits |

Capabilities must name action, resource and scope; broad role membership alone is insufficient. Sensitive staff operations require reason, fresh MFA and immutable audit entry. Administrator does not automatically impersonate customers. Initial administrator provisioning is a controlled server-side setup procedure, never public signup. Staff cannot grant themselves broader privileges.

## RLS and database boundaries

Enable RLS on every exposed application table before granting access. Anonymous users receive public content only. Customer SELECT policies follow ownership through indexed foreign keys; INSERT/UPDATE policies require both USING and WITH CHECK as appropriate. Use column grants or narrow commands for permitted profile/preferences changes, preventing owner edits to protected fields. Test views for caller-level enforcement; ordinary privileged views can bypass intended policies.

Customer money movement uses only narrow commands; revoke direct DML on ledger, projections, audit, role tables and operation state. Private ledger tables expose only safe owner-scoped projections. Prefer SECURITY INVOKER; necessary SECURITY DEFINER commands must have fixed safe search_path, schema-qualified objects, restricted owner, explicit EXECUTE grants, and internal identity/ownership/session checks. Revoke default PUBLIC/anon function execution. A direct customer RPC call must be as secure as its server-service wrapper.

Service-role/secret credentials bypass normal protections; keep them in isolated server-only admin/job modules. Never use a privileged client for ordinary customer reads. Jobs operate through specific commands with persisted initiating customer/mandate and an audited worker actor. Their privileges must not enable user-supplied SQL or arbitrary resource mutation. Developer database ownership remains a trust boundary: append-only application controls cannot prevent a database owner from altering records. For hosted audit durability, plan restricted exports/backups and access monitoring.

## Application and upload controls

- Validate input with schemas and enforce database constraints. Parameterize queries; allowlist sorting/filter columns and redirect URLs.
- Protect cookie-authenticated mutations with validated origin and CSRF controls appropriate to the entrypoint. GET requests must never mutate state. Do not rely exclusively on SameSite.
- Escape rendered content; sanitize any permitted rich text; avoid raw HTML. Establish CSP and related response headers compatible with the selected framework build.
- Centralize distributed rate limits for login, reset, verification, signup, support and financial commands; combine provider throttling with app limits. Avoid account-enumerating responses.
- Require payload/body bounds, pagination limits and upload limits. Only synthetic fixture checks/identity data are accepted; make the simulator restriction explicit and enforce fixture formats server-side.
- Private storage buckets for statements, documents and test checks. Object keys use trusted owner/resource mappings. Authorize before creating short-lived signed links; reject path substitution and cross-owner keys. Validate type by content, size and extension, isolate/quarantine uploads, reject executable formats and strip unnecessary metadata before display.
- Mask identifiers, minimize PII, redact logs, and keep reset tokens and signed URLs out of analytics. Do not store real SSNs, BVNs, PANs, CVVs or banking passwords.
- Audit privileged changes and financial outcomes; log denied security actions separately with safe correlation IDs. Never include passwords, access tokens or full sensitive request bodies in metadata.

## Secrets and verification

.env.example contains names and blank placeholders only. Phase 1 validates server configuration at startup and provides a client-safe allowlist. Keep development, CI and hosted credentials separate; rotate exposed secrets and invalidate affected sessions. Dependencies and configuration are reviewed before release.

Required adversarial tests: Customer A requests B's resources through routes, RPC, storage and direct Data API; forged owner fields; forged staff metadata; revoked-session JWT reuse; expired/MFA-insufficient sessions; replayed and conflicting idempotency keys; concurrent spending; cancellation races; injected filters; CSRF; hostile support text; abusive uploads; private-cache leakage. Exercise every staff role's allowed and denied actions. Security tests start with each feature, then Phase 27 performs the integrated review.

Before hosted demo release, document backup restore drill, secret rotation, incident triage and retention/deletion windows. Preserve ledger/audit integrity while applying explicit synthetic/customer-profile retention rules; no unsupported compliance claims.

Implementation references: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [database functions](https://supabase.com/docs/guides/database/functions), [SSR auth](https://supabase.com/docs/guides/auth/server-side). Recheck relevant provider behavior when implementing.
