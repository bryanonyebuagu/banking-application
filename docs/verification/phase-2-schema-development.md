# Phase 2 development-schema verification

Date: 2026-09-29. Target: dedicated hosted development project `hqormbkdnbdvcxfusozf` in West EU (Ireland).

All six repository migrations were first rehearsed transactionally and then applied in order with SHA-256 checksums. A subsequent migration plan reports six applied and zero pending. The resulting application schema contains 51 RLS-enabled public/private tables and three private storage buckets. No financial balances or product records were seeded.

Provider-created synthetic Auth users exercised two-customer identity isolation, owned reads, cross-owner denial, expired/revoked session denial and cleanup. Ledger rehearsals exercised balanced and invalid journals, positive/single-currency entries, same-transaction creation and immutable history. Product, customer-service and processing rehearsals exercised ownership constraints, representative owner reads, cross-owner foreign-key rejection and required journal links. Direct client writes remain denied until narrow commands are added in later phases.

Public-schema TypeScript types were generated from the live database with the pinned `@supabase/postgrest-typegen` package over a certificate-verified connection. The application gate then passed type checking, lint, 6 unit tests, production build and 12 browser tests across all nine required widths.

The final Phase 2 gate used the separate `banking-platform-test` project `icdaoukkzpiwspirqver`. All six migrations replayed from zero and persisted after reconnect. A second plan reported six applied and zero pending. Catalog comparison matched development across 51 tables, 496 columns, 36 policies and three private buckets.

Provider-backed test-project Data API checks passed anonymous denial, A/B ownership, protected-write denial, private schema/RPC denial and revoked-token reuse. Private Storage API checks passed anonymous/cross-owner download denial, owner download and customer-upload denial. Cleanup removed the synthetic object, identity rows and provider users; a separate residue check returned zero across all seven checked resource groups. Phase 2 is complete. Development was never reset.
