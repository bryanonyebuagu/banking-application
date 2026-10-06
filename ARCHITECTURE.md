# Application and system architecture

Current development environment: hosted Supabase (docs/decisions/0004-hosted-development.md) supersedes local container setup as a prerequisite. The application and data architecture remain unchanged.

Container runtime: Podman for local Supabase and future database CI, per docs/decisions/0003-podman-runtime.md. Docker Desktop is not required. Hosted deployment remains Next.js plus managed Supabase.

Status: Phase 1 application foundation implemented and verified; Phase 2 setup blocked. See PROJECT_STATUS.md. Product authority: PRD.md. Domain/data contracts remain requirements until their phases pass.

## System shape

Use a modular monolith: Next.js App Router, React, strict TypeScript and Tailwind; Supabase Auth, PostgreSQL and private Storage. React Hook Form plus Zod owns interactive form validation. TanStack Query is reserved for interactive server-state caching where useful; Server Components handle initial read rendering. Do not duplicate the same fetch through both paths unnecessarily.

Browser → Next.js routes/actions → authorization and domain services → user-scoped repositories or narrow database commands → PostgreSQL. Auth is provided by Supabase; financial posting is a single PostgreSQL transaction. A scheduled worker invokes the same domain commands for due jobs. Storage holds protected uploads and generated statements behind authorization. External payment networks remain behind fail-closed provider adapters until institutional onboarding, production credentials, certified API operations, webhooks and reconciliation are complete; internal ledger entries are never treated as external settlement confirmation.

## Directory ownership

| Path | Responsibility |
| --- | --- |
| src/app | Future public, auth, banking and staff route groups; layouts and thin entrypoints |
| src/components/ui | Accessible presentation primitives |
| src/components/banking | Compositions such as AccountCard and TransactionTable |
| src/features | Feature forms, local presentation, hooks and view models |
| src/server/services | Domain orchestration, state transitions and use cases |
| src/server/repositories | Typed persistence and narrow RPC invocation |
| src/server/auth, authorization | Verified identity, session policy and capability checks |
| src/server/jobs, providers | Durable worker orchestration and simulator adapters |
| src/lib/supabase | Separated browser, request-scoped server and privileged job clients |
| src/schemas, types | Input contracts and generated database types |
| src/hooks, utils, config, styles | Shared client hooks, pure helpers, validated config and tokens |
| supabase/migrations, seeds, tests | Versioned SQL, synthetic fixtures and database tests |
| tests/unit, integration, e2e, visual | Domain, service, journey and visual verification |
| docs/references, decisions | Visual evidence and architectural decision records |

Route groups planned: (public), (auth), (banking), (staff). Staff lives at /admin with its own layout and authorization boundary; grouping itself provides no security. Customer routes cover dashboard, accounts, transactions, transfers, payments, cards, deposits, statements, loans, mortgages, investments, analytics, notifications, settings, security and support. Public routes cover every PRD navigation category; commercial/wealth destinations need explicit informational or unavailable behavior until specified, never misleading links.

## Module boundaries

Services: authentication, customers, accounts, ledger, transactions, transfers, cards, payments, statements, loans, mortgages, investments, notifications, security, support, administration. A module imports another module's public use cases, not its internal repositories. Ledger is the sole owner of posting. Transactions is a customer-facing read model, not a second monetary authority. Admin invokes the same domain commands with explicit staff capabilities and auditing.

Money values cross JSON boundaries as integer-minor-unit strings plus currency; quantities/rates use explicit decimal strings. Domain failures have stable codes (validation, unauthenticated, forbidden, not_found, insufficient_funds, conflict, rate_limited, temporarily_unavailable), safe messages and correlation IDs. Do not disclose another customer's record existence.

Mutations: parse input → verify session → load current capabilities → validate ownership/state → execute atomic command → return persisted receipt → invalidate affected user-scoped caches. Commands accept idempotency keys; the database binds each key to actor, operation and canonical payload. Server actions and API routes call the same service, not each other. Server-only code must be protected against browser imports.

## Background operations and integrations

Use PostgreSQL-backed jobs and an outbox. The eventual scheduler/hosting provider is selected in Phase 1, with a protected server worker endpoint and bounded execution. Claim jobs with leases and SKIP LOCKED; retry transient failures with bounded backoff; surface exhausted jobs for operations. Unique occurrence keys prevent duplicate recurring execution. Worker identity is separate from the initiating customer; recheck current owner, restrictions, mandate and funds at execution. Do not reuse expired user JWTs.

Write outbox events in the transaction that changes state. Notification/statement consumers deduplicate by event ID. Database commit is authoritative; email or PDF failures must not undo money movement. External adapters: IdentityVerificationProvider, SimulatedTransferProvider, SimulatedCheckDepositProvider and SimulatedInvestmentProvider. Contract tests permit replacement without coupling the UI to providers.

## Read consistency and statements

Use user-scoped queries, pagination with stable time/ID cursors, and indexed filters. Never globally cache private responses. Dashboard aggregates are authorized read models. Statements use immutable posted entries and a consistent period snapshot; reruns are versioned and closing balance must reconcile to opening plus period movements. Pending holds are displayed separately. Analytics excludes pending/failed items and avoids counting internal transfers as income/spend.

## Delivery and operation

Separate local, test and hosted-demo environments and Supabase projects. Phase 1 pins compatible stable runtime/package versions in the manifest and lockfile, sets up lint/typecheck/test/build scripts and CI. Phase 2 makes migrations replayable into a clean database; subsequent phases add migrations as required. Keep previews isolated from shared demo data. Define backup/restore and migration rollback-by-forward-fix procedures before hosting. Track request errors, posting failures, queue age and reconciliation differences without logging sensitive data.

## Assumptions requiring later validation

- Initial money movement is USD, single-owner checking/savings with no overdraft or FX. Currency remains explicit; expanding ownership/currency requires a documented change.
- Credit/loan/mortgage balances are obligations linked to ledger receivables, not deposit balances.
- Public banking patterns informed the initial structure; Chaze Bank requirements and the shared design system now govern product identity and implementation.
- Dependencies are pinned in package.json/package-lock.json; runtime is Node 24. Deployment design is Vercel plus Supabase, with Supabase Cron invoking a protected worker endpoint in Phase 10. No hosted resources exist. Email/session/MFA configuration is resolved during Phase 3; see docs/decisions/0002-phase-one.md.

See DATABASE.md for posting, SECURITY.md for trust boundaries and IMPLEMENTATION_PHASES.md for sequencing.
