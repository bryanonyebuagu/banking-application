# Project status

Updated: 2026-10-06.

## Current milestone

All planned product and administration build work through Milestone E is implemented. Milestone F verification is in progress; TypeScript validation and the production build pass after the Chaze Bank rebrand.

Current blocker: production banking rails require selection and onboarding of an approved provider. No implementation blocker is known for the existing application.

## Milestone tracking

| Milestone | Completed | In progress | Remaining | Blocked | Deferred polish |
| --- | --- | --- | --- | --- | --- |
| A — Core Banking | Financial foundation, accounts, transaction history, transfers, Bill Pay, cards, check deposits and statements | — | — | None | Final reference tuning and all-width pass |
| B — Customer Products | Public site, onboarding, loans, mortgages, investments, analytics and notifications | — | — | None | Final reference tuning |
| C — Profile, Security & Support | Profile/settings, private synthetic documents, authenticator MFA, device/session management, security history and secure support tickets | — | — | None | Final reference tuning |
| D — Staff/Admin | MFA-gated staff shell, capability matrix, customer/product lookup, restrictions, verification review, assigned support, audit history and staff provisioning | — | — | None | Final reference tuning |
| E — Complete Journey | Complete customer/staff routes, hosted persistence, expanded route guard and deterministic demo-data builder | — | Optional execution of the demo-data builder after local credentials are configured | None | — |
| F — Final Quality | Security headers, responsive primitives, accessibility foundations, operational runbooks, Chaze Bank rebrand, TypeScript validation and production build | Final integrated verification and all-width review | Browser, accessibility, financial reconciliation and security regression suites | Approved provider onboarding blocks live rails | Exact private-screen fidelity remains provisional without approved designs |

## Completed features

- Master PRD and architecture, database, design and security contracts preserved.
- Full 28-phase implementation roadmap and focused repository skills recorded.
- Phase 1 foundation complete: Next.js 16.3.6, React 19.3.0, TypeScript 6.0.3 and Tailwind 4.3.3; accessible shared components, responsive shell, validation, CI and environment checks.
- Hosted Supabase development connection verified with certificate and hostname validation. Secrets remain in ignored local files.
- Six immutable migration batches applied with tracked SHA-256 checksums: identity/access, ledger schema, products, customer services, processing and private storage.
- 51 application tables have RLS enabled. Direct client writes remain denied until narrow feature commands are added in their scheduled phases.
- Three private storage buckets use owner-safe read policies. Check images and synthetic documents now have validated, bounded upload and quarantine/finalization workflows; statements remain server-generated.
- Provider-created synthetic Auth fixtures verify two-customer isolation, revoked-session denial and cleanup without inserting credentials into SQL.
- Ledger constraints verify balanced journals, single currency, positive entries, creation in one transaction and immutable posted history. No financial balances or product records were seeded.
- Public-schema TypeScript types are generated from the live development schema at `src/types/database.generated.ts` through the pinned generator.
- A separate healthy test project is provisioned for clean replay. Development and test targets use distinct ignored password files and explicit commands; hosted reset is unsupported.
- Clean replay on the separate test project passed. Test and development match across 51 tables, 496 columns, 36 policies and three private buckets.
- Test-project Data API and private Storage API authorization checks passed and all synthetic fixtures were removed.
- Phase 3 authentication is complete: request-scoped SSR clients, verified server claims, same-origin mutations, safe redirects, provider signup verification, login/logout and password recovery/reset.
- Protected routes enforce provider identity plus app-session state. App sessions use a 12-hour absolute lifetime, 30-minute idle lifetime and deny both expired and revoked provider session IDs.
- Login and security events are written through narrow authenticated commands. Password reset revokes all app sessions and requests provider-wide sign-out.
- Verified AAL claims, authenticator enrollment and AAL2 route/action guards provide the MFA boundary for sensitive customer and all staff actions.
- Phase 4 registration is complete: personal, address, employment and review steps persist server-side and resume after reload without creating partial customer records.
- Final registration atomically creates the owner-bound profile, customer, primary address and preferences through a narrow command; direct table writes remain denied.
- The `IdentityVerificationProvider` abstraction uses explicit synthetic fixtures. Pending, verified, failed and manual-review states persist, with failed/manual-review retry support and no real identity identifier collection.
- Phase 5 public website is complete: homepage, checking, savings, credit cards, mortgage, auto financing, investing, education, business banking, commercial, wealth management, security, help center, FAQ and contact routes.
- The shared public shell provides audience navigation, personal-product navigation, mobile drawer, sign-in/register entry points and a complete grouped footer. Product availability text now reflects the completed build.
- Phase 6 dashboard is complete: request-scoped owner reads populate the customer greeting, products, activity, upcoming payments, alerts and session security state without inventing data.
- Dashboard empty states and disabled quick actions identify future availability. Existing accounts deliberately omit balances until Phase 8 provides ledger-backed projections.
- Phase 7 accounts is complete: verified active customers can open synthetic checking or savings accounts, view details and rename owned non-closed accounts.
- Every new account atomically creates its private ledger mapping and a zero balance projection. Direct writes and cross-customer access remain denied.
- Phase 8 ledger is complete: one private posting primitive creates balanced immutable journals, updates locked projections and safely replays matching idempotency keys.
- Synthetic funding, active holds, equal-and-opposite reversals and reconciliation are working. Account screens show real ledger and available balances.
- Milestone A is complete: transaction search/detail, immediate and scheduled transfers, Bill Pay, simulated credit cards, private check deposits and immutable PDF statements all use persisted owner-scoped data.
- Statement balances and rows use the same ledger effective-time cutoff; generated PDFs are private, versioned and available through short-lived signed links.
- Milestone B is implemented: personal/auto loans, mortgage application and servicing, synthetic investments, spending analytics and persisted notifications all use owner-scoped hosted data.
- Profile and Settings protects legal identity fields while allowing validated display name, phone, address, locale, timezone, privacy and marketing preferences. Private synthetic documents use content signatures, size/type bounds, quarantine records and short-lived signed downloads.
- The Security Center manages Supabase authenticator MFA, AAL2 step-up, recognized-device metadata, active application sessions and combined security/sign-in history.
- Secure support provides persisted customer tickets and messages. Staff replies distinguish customer-visible messages from internal notes and enforce assigned-ticket scope.
- The separate `/staff` workspace requires AAL2 and explicit database capabilities. It supports customer/product lookup, reason-coded account restrictions, verification review, support operations, immutable audit review and administrator-controlled role grants.
- All customer and staff routes are covered by the request proxy and live application-session sync. Public security/help/contact content reflects implemented capabilities.
- `npm run seed:demo` provides an opt-in, hosted-development-only deterministic journey with two synthetic customers and a first administrator. It never stores or prints passwords and leaves staff MFA enrollment interactive.
- Backup/restore, secret rotation, incident triage and retention procedures are documented under `docs/operations`.

## Features in progress

- None. Product implementation is complete; integrated verification is intentionally paused.

## Remaining features

- No planned product feature remains unimplemented. Run the final integrated quality gates only when the user re-authorizes testing.

## Database migrations completed

Applied to hosted development, in order:

1. `20260928000100_identity_access.sql`
2. `20260928000200_ledger_schema.sql`
3. `20260928000300_products.sql`
4. `20260928000400_customer_services.sql`
5. `20260928000500_processing.sql`
6. `20260928000600_private_storage.sql`
7. `20260929000100_auth_session_commands.sql`
8. `20260929000200_session_expiration_enforcement.sql`
9. `20260929000300_registration_verification_commands.sql`
10. `20260929000400_account_commands.sql`
11. `20260929000500_ledger_posting.sql`
12. `20260929000600_ledger_trigger_execution.sql`
13. `20260930000100_transaction_history.sql`
14. `20260930000200_transfer_commands.sql`
15. `20260930000300_transfer_replay_order.sql`
16. `20260930000400_transfer_scheduling.sql`
17. `20260930000500_bill_pay.sql`
18. `20260930000600_credit_cards.sql`
19. `20260930000700_credit_card_security_audit.sql`
20. `20260930000800_check_deposits.sql`
21. `20260930000900_statements.sql`
22. `20260930001000_statement_activity.sql`
23. `20261004000100_loans.sql`
24. `20261004000200_loan_payment_replay.sql`
25. `20261004000300_mortgages.sql`
26. `20261004000400_mortgage_payment_replay.sql`
27. `20261004000500_investments.sql`
28. `20261004000600_notifications.sql`
29. `20261004000700_profile_settings.sql`
30. `20261004000800_security_center.sql`
31. `20261004000900_support.sql`
32. `20261004001000_staff_administration.sql`

Both hosted targets report 32 applied and zero pending through `20261004001000_staff_administration.sql`. Applied migration files are immutable; corrections require a new forward migration.

## Tests completed

Latest application gate on 2026-09-29:

- `npm run typecheck`: passed, including generated database types.
- `npm run lint`: passed with zero warnings.
- `npm test`: 6/6 passed.
- `npm run build`: passed.
- `PLAYWRIGHT_CHANNEL=msedge npm run test:e2e`: 12/12 passed across 320, 375, 390, 430, 768, 1024, 1280, 1440 and 1920px, including accessibility, overflow, console, route, header and interaction checks.
- `npm audit`: zero vulnerabilities after adding PostgreSQL and type-generation tooling.
- Development and test migration plans: nine applied, zero pending.
- Identity, ledger and remaining product/service/processing/storage migration rehearsals: passed transactionally before application and rolled back cleanly.
- Hosted identity Data API test: passed with synthetic provider users and owned-record cleanup.

The clean test-project replay, Data API test and direct Storage API test now pass. Test cleanup reports zero residual profiles, customers, addresses, sessions, documents, bank storage objects or synthetic Auth users.

Latest Phase 3 evidence on 2026-09-29:

- Session-expiration forward migration rehearsed transactionally, applied test-first and then development; hosted schema parity still matches 51 tables, 496 columns, 36 policies and three buckets.
- Auth command API tests passed anonymous/direct-write denial, session sync, audit, revocation and revoked-session denial.
- Provider-backed Edge journey passed signup validation, signup-token verification, non-enumerating login/recovery responses, persistent login, idle expiration, explicit revocation, password recovery/reset and logout.
- All generated fixtures and provider users were removed; the seven-resource cleanup check is clean.
- Universal gate passed: typecheck, lint with zero warnings, 6/6 unit tests, production build, and 12/12 responsive/accessibility browser tests across nine widths.
- `npm audit --audit-level=high`: zero vulnerabilities.

Latest Phase 4 evidence on 2026-09-29:

- Registration migration rehearsed transactionally, applied test-first and then development; generated public types were refreshed.
- Hosted API tests passed anonymous/direct-write denial, persisted draft resume, two-user isolation, atomic completion, durable pending and manual-review states, verified/failed outcomes and retry behavior.
- Microsoft Edge journey passed personal/address/employment/review, reload resume, failed verification, successful retry and persisted dashboard result. The registration screen passed overflow checks at 320, 375, 390, 430, 768, 1024, 1280, 1440 and 1920px.
- Universal gate passed: typecheck, lint with zero warnings, 6/6 unit tests, production build, 12/12 foundation responsive/accessibility tests, and the combined authentication/registration browser journey.
- Both hosted targets report nine migrations with zero pending. Parity matches 52 tables, 514 columns, 37 policies and three private buckets. Cleanup is clean across 11 resource groups; dependency audit reports zero vulnerabilities.

Latest Phase 5 evidence on 2026-09-29:

- Common public banking patterns were reviewed for structural evidence only: audience and product navigation, large promotional composition, product cards, resource sections and deep footer grouping.
- Fourteen required public routes use one typed content model and shared page composition. Copy, Chaze Bank branding, original icons and generated imagery are owned by this project; no external bank logo or proprietary branding asset is used.
- Desktop audience/product navigation, mobile drawer, grouped footer and every public route are reachable. Checking, savings, cards, lending and investing pages identify their future implementation phase rather than exposing dead application actions.
- Universal gate passed: typecheck, lint with zero warnings, 6/6 unit tests, production build, 13/13 public/foundation browser tests, accessibility scans and overflow checks at all nine required widths, plus the full hosted authentication/registration regression.
- Test cleanup is clean across 11 resource groups, hosted parity remains 52 tables, 514 columns, 37 policies and three private buckets, and the dependency audit reports zero vulnerabilities.

Latest Phase 6 evidence on 2026-09-29:

- The protected dashboard reads the current customer's profile, owned accounts and product counts, recent transactions, scheduled payments and notifications through RLS-scoped request clients.
- Provider-backed browser coverage verifies the pre-registration empty state and the post-registration customer greeting, verification state and disabled future actions across all nine required widths.
- Universal gate passed: typecheck, lint with zero warnings, 6/6 unit tests, production build, 13/13 public/foundation browser tests and the complete hosted authentication/registration regression.

Latest Phase 7 evidence on 2026-09-29:

- The account migration was rehearsed transactionally, applied test-first and then development. Generated types were refreshed; both hosted targets report ten applied migrations and zero pending.
- Hosted API tests passed anonymous/direct-write denial, verified-active eligibility, two-user isolation, atomic account/ledger/projection creation at zero, nickname updates and closed-account denial.
- The provider-backed browser journey opened a checking account, confirmed its $0.00 starting balance, renamed it and confirmed the persisted dashboard result.
- Universal gate passed: typecheck, lint with zero warnings, 6/6 unit tests, production build, 13/13 public/foundation browser tests and dependency audit with zero vulnerabilities. Hosted parity remains 52 tables, 514 columns, 37 policies and three buckets; cleanup is clean across 14 resource groups.

Latest Phase 8 evidence on 2026-09-29:

- The ledger posting migration and its trigger-permission correction were applied test-first and then development. Both targets report twelve applied and zero pending migrations.
- Transactional rehearsal passed balanced posting, exact replay, payload-mismatch denial, holds, reversal and reconciliation.
- Real-token API tests passed six concurrent duplicate requests with one result, two competing 75% holds with one success, cross-owner reversal denial, owner reversal and zero projection drift.
- The browser journey posted $125.50 in synthetic funds through the ledger, displayed the derived balance, reversed the transaction and returned to $0.00.
- Universal gate passed: typecheck, lint with zero warnings, 6/6 unit tests, production build, 13/13 public/foundation browser tests, dependency audit with zero vulnerabilities and cleanup across 19 resource groups. Hosted parity remains 52 tables, 514 columns, 37 policies and three buckets.

Latest Milestone A transaction-history evidence on 2026-09-30:

- The owner-scoped history function supports search, status/category/date/amount filters and stable timestamp/UUID cursor pagination with bounded page size.
- Transactional rehearsal passed a three-record two-page traversal and filter boundaries; live provider-token tests passed cross-customer isolation.
- The connected browser journey filtered a real reversed ledger transaction, opened its detail and returned to the dashboard.
- Targeted gate passed: TypeScript, focused lint, hosted parity at 52 tables/514 columns/37 policies/three buckets, and clean fixture state across 19 resource groups.

Latest Milestone A transfer evidence on 2026-09-30:

- Immediate owned-account and simulated-recipient transfers use the single locked ledger posting primitive and persist reviewable receipts.
- One-time, weekly and monthly scheduling persists mandates and next occurrences; the isolated worker reauthorizes current ownership, account state, destination and available funds.
- Transactional rehearsals and live provider-token tests passed exact replay, changed-balance concurrency, anonymous worker denial, service-role execution, cancellation and projection reconciliation.
- The connected browser journey passed immediate transfer, scheduling, receipt/history, cancellation and fixture removal.
- TypeScript and focused lint passed. Hosted parity matches 52 tables/515 columns/37 policies/three buckets; cleanup is clean across 23 resource groups.

Latest Milestone A Bill Pay evidence on 2026-09-30:

- Synthetic payees and immediate, one-time, weekly and monthly payments persist with receipts/history and dashboard visibility.
- Completed payments use the single locked posting primitive; due processing rechecks the mandate, owner/account/payee state and available funds.
- Rehearsal and live-token tests passed isolation, direct-write/worker denial, concurrent funds, replay, payload mismatch, service execution, cancellation races and reconciliation.
- The connected browser journey passed payee creation, immediate payment, scheduling and cancellation.
- Both targets have 17 applied and zero pending migrations. TypeScript/focused lint passed, parity matches 52 tables/515 columns/37 policies/three buckets, and cleanup is clean across 25 resource groups.

Latest Milestone A credit-card evidence on 2026-09-30:

- Simulated credit accounts/cards expose real projection-backed balances, pending holds, available credit, limits, statement/minimum fields and due dates.
- Purchase authorization/settlement/release, capped refunds and deposit-funded card payments use locked projections and the single posting primitive.
- Lock/unlock, lost/stolen, replacement, limits and alert preferences persist through owner-scoped commands.
- A live-token cross-owner false-success defect was corrected with an immutable forward migration; the attack now fails explicitly.
- Rehearsal, live-token API and connected browser journeys passed. Both targets have 19 migrations and zero pending; parity is 53 tables/525 columns/38 policies/three buckets, and cleanup is clean across 29 resource groups.

Latest Milestone A check-deposit and statement evidence on 2026-09-30:

- Private check-image upload, owner-only signed reads, review, rejection without credit and exactly-once acceptance posting passed connected database, API and browser coverage.
- Immutable statement snapshots use one ledger cutoff for balances and activity. Opening plus movements equals closing, and reruns create deterministic versions.
- A two-page generated PDF passed structural parsing and visual inspection. The connected browser journey generated, finalized and downloaded a hosted private PDF.
- Both targets reached 22 migrations with zero pending. Parity matched 53 tables/528 columns/38 public-schema policies/three buckets, and cleanup was clean across 31 resource groups.

## Known issues and decisions

Latest public-experience refinement on 2026-10-06:

- Rebuilt the homepage around a full-width lifestyle hero, a prominent six-product icon row and original home-lending and small-business campaign photography.
- Added a public Travel route and connected Checking, Savings, Credit Cards, Home Loans, Travel and Business directly from the homepage.
- Standardized the interface on the Open Sans stack, #101820 body text and a clear blue-led Chaze Bank visual system.
- Gave the shared Chaze Bank wordmark an original bold geometric treatment and removed the developer-preview strip from the customer header.
- Removed customer-facing simulator, simulated, synthetic, demo and test wording throughout registration, accounts, transfers, Bill Pay, cards, check deposits, loans, mortgages, investments, settings and support. Internal database/API identifiers remain unchanged for migration compatibility.
- Chaze Bank rebranding passed TypeScript validation and the production build on 2026-10-06. No deployment was performed.

Latest production-banking integration work on 2026-10-06:

- Confirmed that email/password authentication already uses Supabase Auth for provider-issued verification, recovery and sessions. Production configuration now fails unless HTTPS, Supabase and custom SMTP delivery are declared.
- Added fail-closed, provider-neutral banking configuration for sandbox and production environments, with server-only credentials and explicit rail entitlements.
- Added a protected Receive Money screen for ACH/direct deposit, domestic wire, international wire, RTP and Zelle capability states. It never invents account numbers, beneficiary instructions or successful settlements.
- Added the payment-provider boundary and activation plan in `PRODUCTION_BANKING_INTEGRATION.md`.
- Current external blocker: selection and onboarding of an approved banking or payment provider with production credentials, plus separate Zelle Network financial-institution approval. Approved API operations, webhooks and reconciliation cannot be completed before those materials are issued.
- No tests, lint, type checking, production build or browser review were run, following the user's instruction to keep building without tests.

- The repository was initialized with all project files untracked; no files have been staged, committed, reset or removed.
- No remote CI run is recorded.
- Final Chaze Bank visual measurements remain provisional without approved design specifications.
- `@supabase/postgrest-typegen` is pinned at 0.3.1; generated output is reproducible and passes type checking and linting.
- Hosted Supabase supersedes the unavailable local engine. Podman remains the only optional local container runtime; there is no Docker fallback and no reboot dependency.
- Database-owner access remains a hosting trust boundary. Application controls protect normal anon/authenticated/service paths, not the hosted database owner.
- A 2026-09-18 high-severity advisory affects the development-only ESLint glob chain through `braces` 3.0.3. No patched release exists as of 2026-10-04; production dependencies are unaffected, and npm's proposed fix is an incompatible Next.js lint downgrade.
- The user explicitly paused all tests, lint, type-check, build, audit and browser runs after Milestone B work began. Features added afterward are implemented and migrated but have no recorded verification result.
- The deterministic demo dataset has not been executed because its three private login/password pairs have not been configured in ignored `.env.local`.

## Next exact action

When the user authorizes testing again, run the final integrated quality gates and all-width visual/accessibility review. Demo seeding is optional and requires local ignored credentials.
