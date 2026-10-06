# Implementation milestones and historical phase analysis

Current status: Phases 1–8 passed. Milestone A — Complete Core Banking Experience is active, beginning with transaction history. The historical phase table remains below for traceability; remaining work is executed and gated through Milestones A–F.

## Active milestone roadmap

| Milestone | Included original phases and PRD scope | Boundary evidence |
| --- | --- | --- |
| A — Complete Core Banking Experience | Phases 9–14; PRD §§14–20: transaction history/detail/search/filter/pagination, transfers/recipients/schedules/receipts, bill pay/payees/schedules, cards and card controls, simulated check deposit, ledger-derived statement snapshots/PDFs | Everyday banking journey works from real ledger records; owner/RLS, funds, concurrency, idempotency, schedules, storage and statement arithmetic pass connected tests |
| B — Complete Customer Product Experience | Finish public/onboarding gaps from Phases 4–7 plus Phases 15–19; PRD §§1–2, 7–12, 21–25: loans, mortgages, investments, analytics and persistent notifications/preferences | All customer products use persisted simulator data; calculations reconcile; analytics excludes internal/reversed activity; notification replay deduplicates |
| C — Profile, Security & Support | Phases 20–22; PRD §§26–28: profile/contact/address/preferences/documents, MFA/devices/sessions/events, articles/search/tickets/messages | Validated edits, protected-field rules, session/MFA enforcement and customer/support visibility pass owner-isolation tests |
| D — Bank Staff / Administration | Phase 23; PRD §§29–30: distinct staff shell, role/capability matrix, customer/account/transaction/transfer/payment/card/security/support/verification operations and audit review | Every staff capability and denial is tested; URL/body/cookie/API manipulation cannot grant staff access; privileged changes are audited |
| E — Complete Customer Journey | Phase 26 and PRD §§37–38, 49–50: deterministic synthetic dataset and connected customer/staff end-to-end journeys with refresh/new-session persistence | The complete visitor-to-active-customer journey and staff support journey pass as one product with durable state |
| F — Final Chaze Bank Quality Pass | Phases 24–25, 27–28; PRD §§1–2, 6, 8, 26, 29–36, 38, 40–41, 47–50: all-width responsive, accessibility, reference fidelity, security, financial integrity and final engineering gate | Nine-width, keyboard/screen-reader/contrast, visual comparison, adversarial security, complete financial reconciliation, full tests and production build pass |

No scope is removed by consolidation. Cross-cutting PRD §§3–6 and 30–36 remain mandatory in every milestone; §§39–45 remain the engineering/tooling contract; §47 governs milestone gates; §48 is completed in F; §49 applies to all persisted workflows.

## Requirement preservation map

| Original phase | New owner | Status |
| --- | --- | --- |
| 1–8 | Historical completed work | Complete; verification evidence retained in `docs/verification` |
| 9–14 | Milestone A | In progress, starting with transaction history |
| 15–19 | Milestone B | Remaining |
| 20–22 | Milestone C | Remaining |
| 23 | Milestone D | Remaining |
| 24–25 | Milestone F | Remaining; representative responsive/accessibility checks continue during A–E |
| 26 | Milestone E, with final suite in F | Remaining |
| 27–28 | Milestone F | Remaining |

## Product analysis

The PRD defines a real authenticated, persistent simulator across public marketing, customer banking and protected staff operations. Financial networks, identity verification, checks and investments are simulated; authentication, authorization, storage, state transitions and accounting are real application behavior. A static screen collection does not meet acceptance.

Core dependencies are identity → customer ownership → accounts → ledger → financial products. Security, accessibility, persistence and tests are cross-cutting acceptance conditions from the first affected phase. Later dedicated review phases do not excuse postponing them.

The requested sequence puts dashboard/accounts before working ledger posting. Phases 6–7 may display honest empty/zero states and supported non-financial actions, with future actions explicitly unavailable. Do not seed arbitrary balances to make them look complete. Phase 2 establishes the ledger schema; Phase 8 implements posting behavior and journal-backed financial fixtures. Earlier auth/security events and audit/outbox infrastructure must exist with their producing workflows; Phase 19 adds the complete notifications experience and Phase 21 the complete security-center UI.

## Phase deliverables and exit evidence

Every phase includes the universal gate below. The final column adds phase-specific acceptance evidence.

| Phase | Scope and PRD traceability | Required exit evidence |
| --- | --- | --- |
| 1 — Foundation | §3–5, 39–44: pinned stack/tooling, route shells, server/client boundaries, tokens/primitives, env validation, CI scripts | Reproducible install, clean shell build, working lint/typecheck/test commands; no secret in client output |
| 2 — Database and migrations | §10–11, 30–33: complete logical schema, constraints, indexes, grants, RLS, private storage, generated types, local seed harness | Clean replay and upgrade tested; owner/other-user/anon policies fail closed; no financial balances seeded outside journals |
| 3 — Authentication | §6, 26, 33: signup/session basics, verification, login/logout, recovery/reset, session records, MFA plumbing and audit events | Real provider persistence, expiration/revocation and protected-route tests; verified identity on server and DB paths |
| 4 — Registration and simulated verification | §7–8, 10: multi-step profile, addresses/employment, simulator adapter and all verification states | Reload resumes persisted state; synthetic-only input; failed/manual-review and retry paths verified |
| 5 — Public banking website | §1–2, 9: all public pages, audience/product navigation and Chaze Bank branding | Desktop/mobile navigation works; public reference comparison recorded; absent product actions explicitly unavailable |
| 6 — Online banking dashboard | §12: owner-scoped overview, greeting, alerts and quick-action availability | Correct empty/current data; no fake balances or dead buttons; cross-user isolation |
| 7 — Accounts | §11: checking/savings creation, detail, nicknames and status behavior | Persisted account lifecycle and ownership; new accounts start zero; unavailable money movement labelled |
| 8 — Ledger | §13, 30: single atomic posting command, projections, holds, idempotency, reversals, reconciliation, journal-backed seeds | Balanced journals, concurrent spending/rollback/replay tests, projection reconciliation and audit integrity |
| 9 — Transaction history | §14: search, filters, stable pagination and detail | Actual ledger-derived data; boundary filters/pagination and isolation tests |
| 10 — Transfers | §15: own/internal/external simulator, recipients, review/step-up, receipt, scheduled/recurring execution | Funds/ownership/race/idempotency checks; worker retry, occurrence uniqueness and cancellation tests |
| 11 — Bill Pay | §16: payees and one-time/scheduled/recurring payments | All statuses persist; duplicate prevention and schedule cancellation/processing races verified |
| 12 — Credit Cards | §17–18: card accounts, purchases/holds, refunds, payments, locks/replacement/alerts | Credit-limit concurrency, settlement, refund caps and lock behavior; no real card secrets |
| 13 — Check Deposit Simulation | §19: test image upload, review and accept/reject | Private upload isolation; acceptance posts exactly once; rejected checks never credit balances |
| 14 — Statements | §20: ledger-based periods, immutable statement snapshots and private PDFs | Opening + movements = closing; reproducible totals, owner-only viewing/download |
| 15 — Loans | §21: personal/auto overview and payments | Principal/interest/payment arithmetic and ledger reconciliation; complete history |
| 16 — Mortgages | §22: application, balance, escrow, amortization and payments | Persisted application states; payment splits and schedules reconcile |
| 17 — Investments | §23: simulated accounts/holdings/prices/history/performance | Holdings/cash reconciled to simulator events; explicit simulated provenance; no actual trades |
| 18 — Spending Analytics | §24: categories, income/spend/cash flow and trends | Real posted data; transfer/reversal treatment correct; accessible chart summaries |
| 19 — Notifications | §25: persistent history/read state/preferences and outbox consumers | Event replay deduplicates; notifications survive refresh; preference enforcement |
| 20 — Profile and Settings | §27: contact/address/privacy/documents/account preferences | Validated persisted edits; protected fields immutable; secure contact-change workflow |
| 21 — Security Center | §26: MFA management, devices/sessions, history and security events | Step-up/recovery paths; session revocation enforced even with prior access token; owner isolation |
| 22 — Support | §28: articles/search, secure tickets/messages and lifecycle | Customer/staff message visibility, assignment permissions and all ticket states |
| 23 — Administration | §29–30: separate staff shell, lookup/review/restrictions/management | Entire capability matrix tested including denials; immutable audit for privileged changes |
| 24 — Responsive Fidelity | §1–2, 34, 48: full viewport/reference pass | Screens compared at matched sizes; no clipping/overflow or inaccessible mobile navigation |
| 25 — Accessibility | §35–36: integrated keyboard/screen-reader/contrast/zoom review | Automated results plus manual critical-journey evidence and resolved blockers |
| 26 — Automated Testing | §37–38, 49–50: expand regression suite and complete synthetic demo dataset | Auth, RLS, financial, staff and end-to-end suites pass; complete deterministic scenario and refresh persistence |
| 27 — Security Review | §6, 8, 26, 29–33: adversarial integrated review, secrets/headers/uploads/session/permission review | No unresolved access-control or financial-integrity failures; restore/rotation/retention procedures documented |
| 28 — Final UI Fidelity Review | §1–2, 40–41, 48, 50: final reference comparison and complete demo walkthrough | Visual differences corrected/documented; every definition-of-done journey works and persists |

## Milestone verification strategy

During implementation, run targeted type/lint checks, domain/database tests and the changed browser journey at 390, 768 and 1440px. Financial, authorization, RLS, session and staff-permission changes receive immediate thorough testing. At milestone boundaries run connected integration tests and production build. Milestone F runs the complete suite and all nine widths. Record actual outcomes; no milestone advances with a known security, financial-integrity or functional failure. PRD §47 remains authoritative.

Tests grow with each feature: unit/domain; PostgreSQL integration/RLS/concurrency; authenticated API; end-to-end; targeted visual/manual accessibility. Phase 26 is expansion and integrated regression, not the first test phase. Full feature seed data arrives incrementally as its commands become available; fixture balances always originate in journals.

## Coverage and unresolved decisions

PRD §39–45 is addressed by this pre-implementation documentation scaffold, with executable tooling in Phase 1 and database implementation in Phase 2. §46 is this exact sequence; §47 the universal gate; §49 persistence applies to every domain; §50 is the final acceptance scenario. All other numbered sections appear in the phase mapping above.

Before implementation chooses dependent details: confirm compatible package/runtime versions and hosted worker mechanism in Phase 1; provider MFA/session/revocation integration in Phase 3; visual token measurements as reference screenshots become available; recurrence cutoff/timezone/DST rules in Phase 10; financial rate/accrual/rounding policies before loans and mortgages. These are implementation decisions, not permission to invent real-world banking integrations or change the PRD.

Default recurring policy to implement/test: store local time and IANA timezone; choose the next valid local time for DST gaps and the first occurrence for ambiguous times; monthly missing dates clamp to month end; cancellation affects unclaimed occurrences only and executes under row lock. Show the next execution date on review. No business-day promises without a defined simulator calendar.
