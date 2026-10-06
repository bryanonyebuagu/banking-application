# Milestone A — Transfers verification

Verified 2026-09-30 against the separate hosted Supabase test project.

## Delivered behavior

- Owner-scoped saved synthetic recipients with archive support.
- Immediate transfers between owned accounts and to simulated recipients.
- Review, durable receipt and transfer-history screens.
- One-time, weekly and monthly scheduling with optional end dates, UTC execution labels and cancellation.
- A service-role worker that rechecks the customer, source account, destination/payee state and available funds at execution time.
- All completed transfers post through the existing locked, idempotent double-entry ledger primitive.

## Evidence

- Transactional transfer rehearsal passed owned-account and recipient posting, exact replay, projection updates and reconciliation.
- Transactional scheduling rehearsal passed one-time and recurring execution, next-occurrence materialization, cancellation and reconciliation.
- Live provider-token API tests passed two-customer isolation, anonymous worker denial, service-role execution, concurrent insufficient-funds protection and idempotent replay.
- The connected browser journey passed immediate transfer review/receipt/history plus one-time scheduling and cancellation.
- TypeScript and focused lint passed.
- Hosted development/test parity matches 52 tables, 515 columns, 37 policies and three private buckets.
- Fixture cleanup is clean across 23 resource groups.

## Decisions

- The customer scheduling screen currently accepts and displays UTC. The persistence model stores an IANA timezone and local time, so profile-timezone support can replace the UI default without changing the schedule contract.
- External destinations are simulator-only `SIM-*` tokens. No real routing or account credentials are collected.
