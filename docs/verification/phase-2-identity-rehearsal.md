# Phase 2: identity/access migration rehearsal (historical pre-application evidence)

Current consolidated status is recorded in `phase-2-schema-development.md`. The identity migration and all five later batches have since been applied to the development project.

2026-09-28. Dedicated hosted development target: hqormbkdnbdvcxfusozf.

Authenticated PostgreSQL 17.6 connection succeeds using the session pooler, a password read from an ignored local file and full TLS certificate/hostname verification. The public schema is empty.

Authored migration: 20260928000100_identity_access.sql. Not permanently applied. It contains profiles, customers, addresses, devices, app_sessions, private currency/role/permission/assignment catalogs and immutable audit records. All ten tables have RLS; client/service-role writes remain denied until narrow workflow commands are implemented. No financial data or balances are seeded.

Executed scripts/verify-identity-migration.mjs against the empty target inside a transaction. It passed table/RLS checks, direct-write privilege denials, restricted non-login/non-bypass helper ownership, anonymous denial, unknown-session/forged-metadata denial and audit TRUNCATE denial. It rolled back all DDL and verified that public/private tables remained absent. No hosted reset was used.

The first rehearsal exposed that Supabase's managed auth schema does not grant usage to a new helper role through the postgres connection. The helper now reads the gateway-verified request.jwt.claims settings directly, using only subject and session_id; user metadata confers no permission. Ordinary authenticated policies use auth.uid(). The helper role has SELECT only on customers and app_sessions and no login or schema CREATE privilege.

Remaining before batch 1 application: provider-created synthetic customer A/B fixtures, owner versus other-user reads, expired/revoked sessions, cross-owner foreign-key violations and direct Data API tests. A server-only Supabase secret key is needed for provider Admin API fixture creation; do not insert credentials directly into auth tables. Then add migration application/history and upgrade checks. The remaining five migration batches, generated types and full phase gate are still pending.
