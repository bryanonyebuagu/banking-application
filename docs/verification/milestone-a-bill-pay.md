# Milestone A — Bill Pay verification

Verified 2026-09-30 against the separate hosted Supabase test project.

## Delivered behavior

- Owner-scoped synthetic payees with archive support and no real account identifiers.
- Immediate, one-time scheduled, weekly and monthly payments with durable receipts and history.
- Recurring cancellation and an isolated service-role worker that rechecks the customer, source account, payee and available funds.
- Every completed payment posts through the shared locked, idempotent double-entry ledger primitive.
- Dashboard Bill Pay entry points and upcoming scheduled-payment display.

## Evidence

- Transactional rehearsal passed immediate replay, one-time and recurring execution, next occurrence, cancellation, expected balance and reconciliation.
- Live provider-token tests passed owner isolation, direct-write and anonymous-worker denial, concurrent insufficient-funds protection, exact replay, payload mismatch denial, service execution, cancellation/execution locking and archived-payee denial.
- The connected browser journey passed payee creation, immediate review/receipt/history, scheduling and cancellation.
- TypeScript and focused lint passed.
- Both hosted targets have 17 applied migrations and zero pending. Parity matches 52 tables, 515 columns, 37 policies and three private buckets.
- Cleanup is clean across 25 resource groups.
