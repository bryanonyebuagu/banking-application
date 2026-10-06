# Phase 3 authentication verification

Phase 3 completed on 2026-09-29 against the separate hosted Supabase test project before the same forward migrations were applied to development.

The application uses request-scoped Supabase SSR clients and verified provider claims. Cookie-authenticated server actions validate the request origin. Protected routes require both a valid provider identity and a live `app_sessions` record. Session synchronization enforces a 30-minute idle lifetime, a 12-hour absolute lifetime and provider expiry; expired or revoked provider session IDs cannot be revived. AAL claims and the AAL2 guard establish the step-up boundary for later MFA enrollment and Security Center work.

Provider-backed browser coverage passed sign-up validation, signup-token verification, uniform unknown-account recovery and invalid-login responses, login persistence, idle expiration, explicit database revocation, logout, password recovery/reset and global session revocation. Login and security audit commands were exercised. Tokens, passwords and cookie values were redacted from output. Synthetic database rows and Auth users were removed after every run.

The final gate passed type checking, lint with zero warnings, 6/6 unit tests, production build, 12/12 responsive/accessibility browser tests and the full authentication browser journey in Microsoft Edge. The authentication API test passed anonymous and direct-write denial, sync, audit, revocation and revoked-session denial. Both hosted targets report eight migrations applied with zero pending; parity matches 51 tables, 496 columns, 36 policies and three private buckets. The test cleanup check is clean and the dependency audit reports zero vulnerabilities.
