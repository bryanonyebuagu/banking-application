# Phase 7 accounts verification

Phase 7 completed on 2026-09-29. Verified active customers can open synthetic checking and savings accounts and rename their owned accounts. Account creation is one database transaction that creates the public account, its private credit-normal liability ledger account, a zero-valued balance projection and an immutable audit entry. No journal or invented funds are created.

The narrow commands recheck the active provider-backed app session, customer ownership, verified identity and customer status inside PostgreSQL. Direct table writes remain denied. Cross-customer reads return no rows and cross-customer rename attempts fail. Closed accounts remain readable but cannot be renamed; non-active states clearly identify that money movement is unavailable and that protected staff status management is scheduled for Phase 23.

The protected UI provides account opening, detail and nickname forms with validation and persisted outcomes. Dashboard account cards link to detail and show the guaranteed zero starting balance. Future funding, posting and transaction history are explicitly labelled for Phases 8 and 9.

The migration was rehearsed transactionally and rolled back, then applied test-first and to development. Hosted API tests passed anonymous/direct-write denial, owner isolation, account creation, zero projection, nickname update and closed-status denial. The provider-backed browser journey passed account open and rename in addition to the existing authentication and registration coverage. Typecheck, lint, 6/6 unit tests, production build, 13/13 public/foundation browser tests and dependency audit all passed. Both hosted targets match at 52 tables, 514 columns, 37 policies and three private buckets; cleanup is clean across 14 resource groups.
