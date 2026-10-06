# Milestone A — Credit cards verification

Verified 2026-09-30 against the separate hosted Supabase test project.

## Delivered behavior

- Simulator-only credit accounts and masked cards with current balance, pending holds, available credit, credit limit, statement/minimum fields and due date.
- Pending purchase authorization, hold release, settlement, partial/full capped refunds and deposit-funded card payments.
- Lock, unlock, lost/stolen reporting, replacement, per-purchase limit and purchase-alert preferences.
- Customer card list/detail screens with artwork, activity and working controls.

## Evidence

- Transactional rehearsal passed issuance, concurrent limit protection, hold settlement/release, exact replay, refund caps, card payment, controls, replacement and reconciliation.
- A live-token authorization test exposed and drove a forward fix for a foreign-card status command that previously returned false success. The corrected command explicitly denies unknown and cross-owner cards.
- Live provider-token tests then passed isolation, concurrency, replay, refunds, payments, controls, replacement and zero ledger drift.
- The connected browser journey passed card opening, purchase authorization/posting, refund, payment, lock/unlock, limits/alerts, replacement and card-list persistence.
- TypeScript and focused lint passed. Both targets have 19 migrations and zero pending.
- Hosted parity matches 53 tables, 525 columns, 38 policies and three private buckets. Cleanup is clean across 29 resource groups.
