# Chaze Bank

Chaze Bank is a full-stack online banking application built with Next.js, TypeScript, Supabase and PostgreSQL.

**Live site:** [bryobankerz.vercel.app](https://bryobankerz.vercel.app)

The application includes email-verified signup, customer onboarding, checking and savings accounts, an immutable double-entry ledger, transfers, Bill Pay, cards, check deposits, statements, loans, mortgages, investments, notifications, security controls, support and a separate staff workspace.

## What works today

- Supabase email authentication, password recovery, secure server sessions and authenticator MFA
- Customer registration with persisted progress and identity-review states
- Account opening with ledger-backed available and posted balances
- Transaction history, transfers, scheduled payments and Bill Pay
- Card controls, private check deposits and generated PDF statements
- Loan, mortgage and investment account views
- Profile settings, security history, support tickets and staff administration
- Responsive public and authenticated interfaces

External banking rails are intentionally disabled until Chaze Bank is onboarded by an approved provider. The application already has a provider-neutral boundary for ACH, wires and real-time payments. It will not invent routing details or report an external payment as settled without provider confirmation. See [PRODUCTION_BANKING_INTEGRATION.md](PRODUCTION_BANKING_INTEGRATION.md).

## Run it locally

Use Node 24 and npm:

```sh
npm ci
npm run dev
```

Then open [http://127.0.0.1:3000](http://127.0.0.1:3000).

Copy `.env.example` to `.env.local` and add the Supabase URL and publishable key for authenticated features. Secrets stay server-side and must never use a `NEXT_PUBLIC_` name.

Useful checks:

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

The project uses hosted Supabase for day-to-day development. Podman is the supported local container alternative; Docker Desktop is not required.

## Project guides

- [PROJECT_STATUS.md](PROJECT_STATUS.md) — completed work, current blockers and verification history
- [PRD.md](PRD.md) — product requirements
- [ARCHITECTURE.md](ARCHITECTURE.md) — application boundaries and service design
- [DATABASE.md](DATABASE.md) — data model and ledger rules
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) — interface tokens and component conventions
- [SECURITY.md](SECURITY.md) — authentication, authorization and data-protection rules
- [IMPLEMENTATION_PHASES.md](IMPLEMENTATION_PHASES.md) — implementation sequence

Chaze Bank is an independent product and is not affiliated with JPMorgan Chase. Supabase is infrastructure and does not replace the Chaze Bank customer identity.
