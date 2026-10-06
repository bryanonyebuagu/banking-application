---
name: banking-backend-ledger
description: Implement or review this repository's banking services, money movement, holds, ledger posting, reversals and scheduled financial operations.
---

# Banking backend and ledger

Read ../../../AGENTS.md, ../../../ARCHITECTURE.md and ../../../DATABASE.md from this skill directory, then the relevant PRD sections and existing service/command/tests. Respect the current phase boundary.

Trace every balance-changing path to the single ledger posting command. Model the journal legs from the bank simulator perspective and specify normal sides before writing code. Use integer minor units and explicit currency; no JS number arithmetic for money. Keep pending holds distinct from settled entries.

For each operation identify actor/ownership, allowed source state, account restrictions, lock set/order, funds/limit checks, idempotency scope, immutable receipt, audit/outbox and reversal behavior. All financial writes commit together. A timeout is an unknown outcome, not proof of failure; reuse the original key. Worker execution must reauthorize the persisted mandate and current account state.

Verify balanced journals, exact replay, changed-payload conflicts, concurrent insufficient funds, hold capture/release, rollback, reversal limits and projection reconciliation. Test direct command invocation and cross-customer identifiers. No separate balance-changing implementation in cards, payments, admin or seed code.
