---
name: supabase-postgres-development
description: Develop or review this repository's Supabase schema, SQL migrations, constraints, RLS policies, database functions and synthetic seed data.
---

# Supabase and PostgreSQL development

Read ../../../AGENTS.md, ../../../DATABASE.md and ../../../SECURITY.md, then inspect existing migrations, generated types, repositories and database tests. Respect the current phase boundary; this scaffold authorizes no remote mutation.

For each new object define its owning domain, keys, deletion behavior, indexes, exposed/private schema, privileges and ownership path. Add migration-controlled constraints and RLS before granting access. Prevent cross-owner references and protected-column edits; row ownership alone does not authorize every write.

Prefer invoker functions. For necessary definer commands pin safe search_path, qualify objects, restrict ownership/EXECUTE grants and recheck actor/session/permission internally. Test direct RPC and Data API access, not only application wrappers. Privileged clients stay out of ordinary customer flows.

Verify clean migration replay and upgrades, unauthenticated denial, Customer A versus B for all supported CRUD, staff capability boundaries, unsafe views and storage object ownership. Generate database types from the migrated schema. Seed only isolated local/test environments; use provider-created Auth users and the single posting command for financial fixtures. Never use dashboard edits as undocumented migrations or direct balances as seed shortcuts.
