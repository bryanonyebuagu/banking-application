# Migration implementation sequence

Phase 2 established six timestamped SQL migrations under `supabase/migrations`. Phase 3 added two authentication/session migrations and Phase 4 added one registration/verification migration. All nine are applied to both hosted projects with repository checksums recorded in `supabase_migrations.banking_checksums`.

1. Identity/access: private schema, catalogs, profiles/customers/addresses, session registry, staff capabilities and audit; revoked-session predicate, ownership helpers and deny-by-default grants.
2. Ledger: accounts, journals/entries, projections/holds, immutable history and deferred journal invariants. Customer posting commands begin in Phase 8.
3. Products: transactions, recipients/transfers, payees/payments, cards/credit, checks/statements, loans/mortgages and investments. Composite ownership/currency constraints and safe reads.
4. Customer services: notifications/preferences/documents, support tickets/messages, verification, devices/login/security events.
5. Processing: idempotency, outbox/jobs, schedules/occurrences, indexes and grants.
6. Storage: private buckets, owner-safe object policies and limits; no public statements/checks.
7. Authentication commands: provider-bound app-session sync/revocation plus narrow login and security audit commands.
8. Expiration enforcement: idle-expired or absolute-expired app sessions cannot be revived by a still-valid provider token.
9. Registration and verification: owner-scoped registration drafts, atomic customer creation and synthetic verification state commands.

Applied history is immutable. Never edit an applied file; add a later forward migration for corrections.

## Hosted targets

- `development`: project `hqormbkdnbdvcxfusozf`, password read from ignored `.env.db-password`.
- `test`: project `icdaoukkzpiwspirqver`, password read from ignored `.env.test-db-password`.

Both use the West EU session pooler with full TLS certificate and hostname validation. Commands select a target explicitly and do not support hosted reset:

```sh
npm run db:hosted:plan
npm run db:hosted:apply
npm run db:test:plan
npm run db:test:apply
npm run db:types:hosted
```

The test project is the clean-replay target. The six Phase 2 migrations replayed from zero and later forward migrations are applied test-first. Both targets report nine applied with zero pending and match at the catalog level. Data API, private Storage API, authentication and registration command checks pass, and cleanup reports no synthetic residue. Auth fixtures are created with the provider Admin API and removed after each run; never insert credentials directly into `auth.users`.

Financial fixtures wait for posting commands. No dashboard schema editing, hosted reset, plaintext password fixtures or real financial/KYC data is permitted.
