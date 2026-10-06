# BANK — full-stack banking simulator

Next.js and TypeScript full-stack banking simulator built from the supplied master PRD. Customer banking, lending, investments, profile, security, support and the separate staff administration workspace are implemented. See [PROJECT_STATUS.md](PROJECT_STATUS.md) for exact status and verification limits.

## Start here

- [PRD.md](PRD.md): unchanged master product requirements, all 50 sections.
- [AGENTS.md](AGENTS.md): permanent repository-wide engineering behavior and stop boundary.
- [ARCHITECTURE.md](ARCHITECTURE.md): application boundaries, services and operation model.
- [DATABASE.md](DATABASE.md): logical schema, ledger and data integrity contracts.
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md): provisional tokens, components and reference-review workflow.
- [SECURITY.md](SECURITY.md): auth, permissions, RLS and application-security requirements.
- [IMPLEMENTATION_PHASES.md](IMPLEMENTATION_PHASES.md): exact 28-phase sequence and acceptance gates.
- [docs/references/README.md](docs/references/README.md): visual reference inventory.

## Local setup and verification

Use Node 24 (tested runtime 24.18.0, pinned in .nvmrc) and npm. From this repository run:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. The home route is an availability shell; /foundation is a local/test component preview. Neither creates financial records. The shell runs without credentials using local defaults. Copy .env.example to .env.local before configuring services. Supabase URL and publishable key must be supplied together; hosted demo requires those values and an HTTPS APP_ORIGIN.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser tests start the production server; test ports must be free. On Windows with Microsoft Edge installed, set `$env:PLAYWRIGHT_CHANNEL = 'msedge'` in PowerShell before running browser tests to avoid a Chromium download. Tests cover all nine requested widths, overflow, accessibility, console errors, links, validation and focus behavior. Reports are in ignored test-results and playwright-report directories. CI configuration exists, but no remote workflow has run.

The build also provides `npm run seed:demo`. Follow [synthetic demo data](docs/operations/demo-data.md) before running it; passwords remain in ignored `.env.local` and are never printed. Staff access requires authenticator MFA enrollment after seeding.

## Database setup boundary

Current workflow: [hosted Supabase development](docs/decisions/0004-hosted-development.md). Banking Development and the separate banking-platform-test project are healthy in West EU. No local engine or laptop restart is required. Development migration history is preserved; clean replay uses only the empty test project.

Podman replaces Docker throughout the build. Follow [Podman setup](docs/decisions/0003-podman-runtime.md). All database npm scripts explicitly target Podman.

Supabase CLI is pinned locally. See [supabase/MIGRATIONS.md](supabase/MIGRATIONS.md) for the explicit hosted development/test commands and applied sequence. Local Podman commands remain available as npm run db:start, npm run db:stop, npm run db:reset, npm run test:db and npm run db:types when a compatible engine exists. Reset is local-only; hosted tooling intentionally has no reset operation. Do not construct tables manually through the dashboard.

Git is initialized locally; no remote, commit or hosted resources have been created. Local skills live in .agents/skills and are explicitly routed by AGENTS.md. Read the relevant skill and existing implementation before feature work.

Environment values are described inline in .env.example. Browser-visible values are limited to Supabase URL/publishable key. Server keys are optional until their isolated job/setup use exists, then required only in those environments. All financial and KYC data are synthetic; authentication is real for this simulator.

Operational procedures are recorded in [security operations](docs/operations/security-operations.md), covering backup/restore, secret rotation, incident triage and retention.
