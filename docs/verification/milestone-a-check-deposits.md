# Milestone A — Check deposit verification

Verified 2026-09-30 against the separate hosted Supabase test project.

## Delivered behavior

- Simulator-only PNG/JPEG check upload into private owner-scoped storage, with signature, MIME type and size validation.
- Durable submitted/reviewing/accepted/rejected workflow with owner-only image access.
- Accepted checks post exactly once through the shared double-entry ledger; rejected checks never create a journal or credit.
- Customer list/detail screens and a working dashboard entry point with explicit synthetic-data guidance.

## Evidence

- Transactional rehearsal passed acceptance replay, rejection without credit, expected balances and reconciliation.
- Live provider-token tests passed anonymous and cross-owner upload/read denial, review isolation and rejection without a journal.
- The connected browser journey uploaded a real PNG payload, finalized it, read it through a signed URL, reviewed it and accepted it.
- TypeScript and focused lint passed. Both targets have 20 migrations through 20260930000800_check_deposits.sql.
- Hosted parity matched 53 tables, 528 columns, 38 public-schema policies and three private buckets. Cleanup was clean across 30 resource groups.
