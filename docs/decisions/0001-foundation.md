# ADR 0001: banking simulator foundation

Status: selected architecture for pre-implementation review, 2026-09-24.

Context: the PRD requires a persistent, authenticated simulator spanning customer and staff workflows. The initial workspace contained no application, repository or references to preserve.

Decision: use a Next.js modular monolith with Supabase, domain services and a single database posting boundary. Use double-entry journals and rebuildable balance projections, RLS plus explicit command authorization, private storage, durable jobs/outbox and reusable semantic UI tokens. Keep all specified product areas in the roadmap; simulation adapters replace real financial/KYC networks.

Consequences: stronger transactional invariants without microservice distributed transactions; PostgreSQL commands require targeted concurrency and privilege tests. Later worker hosting remains replaceable. Repository defaults are USD, single-owner accounts and no overdraft/FX; expansions require schema/policy review. Provisional UI measurements cannot be called Chase matches until verified.

Boundary: documentation and structure only. All executable application and database implementation begins after user authorization for Phase 1.
