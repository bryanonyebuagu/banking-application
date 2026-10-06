# Phase 4 registration and verification

Phase 4 completed on 2026-09-29. Its forward migration was rehearsed transactionally, applied to the separate hosted test project, exercised through the Data API and then applied to development. Generated public database types were refreshed afterward.

Registration persists personal, address and employment steps in an owner-scoped draft and resumes at the saved step after reload. Final submission creates the profile, customer, primary address and preferences atomically through a narrow authenticated command, then removes the draft. Anonymous access, cross-owner reads and direct table writes are denied.

`IdentityVerificationProvider` separates the UI from the current simulator. The simulator accepts only the named `SIM-*` fixtures and never asks for a real SSN, BVN or government identifier. Verification attempts persist pending, verified, failed and manual-review states. Failed and manual-review customers can retry; verified customers cannot create another attempt. Audit records contain resource IDs and reason codes without identity payloads.

Hosted API tests passed persisted resume, ownership isolation, atomic completion, all verification states and fixture cleanup. The Microsoft Edge journey passed registration, reload resume, failed verification and successful retry. The registration screen had no horizontal overflow at all nine required widths. Type checking, lint, 6/6 unit tests, production build, 12/12 foundation browser tests and the combined auth/registration browser journey passed. Both hosted targets report nine migrations with zero pending and match across 52 tables, 514 columns, 37 policies and three private buckets. Cleanup is clean across 11 resource groups and the dependency audit reports zero vulnerabilities.
