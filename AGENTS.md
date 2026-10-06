# Repository engineering instructions

## Container runtime

Current development uses hosted Supabase per docs/decisions/0004-hosted-development.md, superseding the local-runtime requirement below. No restart or local container engine is required. Podman remains optional for environments that support it. Hosted operations must target only the verified dedicated development project; no automatic remote resets.

Use Podman throughout local development and future database CI. Docker Desktop is not a prerequisite. Use the database npm scripts, which explicitly bind Supabase to Podman; see docs/decisions/0003-podman-runtime.md. Preserve existing WSL distributions and project files. Do not fall back to Docker when Podman is unavailable.

## Authority and current boundary

PRD.md is the source of truth for product requirements. This file is the source of truth for repository-wide engineering behavior. ARCHITECTURE.md, DATABASE.md, DESIGN_SYSTEM.md and SECURITY.md define implementation contracts subordinate to those authorities. Record material changes in docs/decisions; do not silently change product scope. Resolve genuine contradictions with the user.

The user has authorized continuous implementation. Phases 1–8 are historical completed gates; remaining PRD scope is consolidated into Milestones A–F in IMPLEMENTATION_PHASES.md. Read PROJECT_STATUS.md for current progress and blockers. Do not stop for a new milestone approval; stop only at an actual dependency requiring user credentials, configuration or intervention. Never skip a failing financial, authorization or milestone gate.

## Before each feature

1. Inspect Git status, repository tree, existing code, tests and applicable nested instructions.
2. Read PRD.md and the relevant architecture, data, design and security sections; consult IMPLEMENTATION_PHASES.md for dependencies.
3. Search existing services, schemas, components, migrations and utilities before adding anything. Extend the existing owner of a capability; never create a parallel ledger, auth stack, design system or database client.
4. Read the relevant project skill in .agents/skills: banking-backend-ledger, banking-ui-consistency or supabase-postgres-development. These are local workflow aids, not alternative sources of requirements.
5. Identify acceptance criteria, authorization paths, failure states and required verification before editing.

## Engineering contracts

- Use the PRD stack and the boundaries in ARCHITECTURE.md. Keep banking logic out of presentation and route handlers; handlers validate and delegate.
- TypeScript strict mode; explicit domain types and errors; no unexplained any, suppressed errors or duplicate schemas. Validate untrusted input server-side with Zod. Generate database types from migrations.
- All money movement uses the single database posting boundary in DATABASE.md. Never use JavaScript floating point for monetary arithmetic, directly edit balances, mutate posted entries or split a financial operation across separate database requests.
- Every data access must enforce ownership/capability server-side and RLS where applicable. Client state, customer-supplied identifiers and user-editable metadata confer no authority.
- Use migrations for every database object, policy, function, grant and storage-policy change. Dashboard editing is for inspection, not normal schema management.
- Use synthetic financial and identity data exclusively. Auth credentials belong to this application and Supabase Auth; never collect real banking credentials or CVVs.
- Reuse tokens and accessible components. Inspect supplied visual references before implementing screens; mark unavailable phase-dependent actions explicitly. Never present fake success.
- Persist business state in PostgreSQL. Client caches are disposable and scoped to the authenticated user; clear them at logout and identity changes.
- No secrets, sensitive payloads or authentication tokens in source, logs, fixtures, URLs or screenshots. Follow SECURITY.md.
- Preserve unrelated user changes. Keep changes focused, document architectural decisions and update impacted contracts in the same change.

## Milestone and feature completion

Preserve the historical phase record and execute remaining work through Milestones A–F. Implement security, accessibility and tests alongside each capability. During a milestone use targeted type, lint, database and browser checks for the changed journey; immediately run thorough checks for financial posting, authorization, RLS, session or staff-permission changes. Run broader connected checks at milestone boundaries and the complete expensive suite in Milestone F. Fix failures before proceeding. Never call a feature complete with broken imports, failing builds, missing migrations, duplicate systems or dead controls.

During implementation check representative 390, 768 and 1440px layouts for changed screens. Run the full 320, 375, 390, 430, 768, 1024, 1280, 1440 and 1920px matrix in Milestone F. Check database persistence and authorization where applicable. Update PROJECT_STATUS.md after substantial steps with milestone status, completed/in-progress/remaining features, known issues, applied migrations, tests and architectural decisions. Never expose credentials in that file.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
