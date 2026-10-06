# ADR 0002: Phase 1 tooling and components

Status: implemented and verified, 2026-09-24. See ../verification/phase-1.md.

The user authorized sequential development and nine viewport checks. Preserve the repository and original PRD. Use npm exact versions/lockfile, Node 24, Next.js App Router, Tailwind 4 tokens, Vitest and Playwright/axe. TypeScript 7 compiled but failed the lint parser; select TypeScript 6 and verify the full toolchain. ESLint 9 is retained for compatibility with the current React lint plugin's declared peer support; npm audit reports zero vulnerabilities. Revisit that version together with the Next.js lint stack.

Wrap native dialogs once for Modal/Drawer, retaining focus containment and Escape behavior. A local/test-only /foundation route exercises controls without fake persistence. The home route is an availability shell until the public-site phase. BankLogo owns the wordmark.

Hosting design: deployable Node Next.js server; eventual hosted demo on Vercel plus Supabase Auth/PostgreSQL/Storage. Supabase Cron will trigger a protected bounded worker endpoint when Phase 10 scheduling is implemented. No hosted resources are created by this design decision. Email/session/MFA configuration is resolved and tested in Phase 3.

Phase 1 makes no database or auth-security completion claim. Supabase configuration is optional only for local/test shell mode, required for hosted demo and later auth integration. No database calls may use dummy credentials.
