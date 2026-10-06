# Hosted Supabase development

2026-09-28: The user chose hosted Supabase because restarting this laptop for firmware virtualization is impractical. This supersedes the requirement to run Podman locally; preserve the optional Podman scripts and all existing work.

Verified through the signed-in dashboard: project Banking Development in Bryan's Org, Free organization, healthy, West EU (Ireland), project reference hqormbkdnbdvcxfusozf. The dashboard reports no migrations. This is the dedicated development project created during this setup, regardless of Supabase's default main/PRODUCTION branch label.

Project URL: https://hqormbkdnbdvcxfusozf.supabase.co

IPv4-compatible session pooler: aws-1-eu-west-1.pooler.supabase.com:5432; database postgres; user postgres.hqormbkdnbdvcxfusozf. Require TLS for database connections. Public application configuration is in ignored .env.local. The ignored .env.db-password file is reserved for a raw database password supplied locally by the user; never print, commit or copy it into documentation. Database authentication has now been verified. The separate ignored .env.supabase-secret file awaits the server-only API key for Auth test fixtures.

Next: establish authenticated database tooling without containers, preserve migrations as versioned SQL, and implement the existing batch plan. Do not manually create domain tables in the dashboard. Clean replay and upgrade verification still require isolated test targets; do not reset the hosted development database by default. Generate types from the verified hosted schema through supported remote tooling. Auth/Data API/storage checks must use real Supabase services. No Phase 2 gate is passed by project provisioning alone.

Hosted tooling now authenticates with the database through verified TLS. Batch 1 rehearsal passes and rolls back; no migration is permanently applied. Provider-backed tests and remaining tooling are still pending. Docker, Podman, BIOS changes and a laptop restart are not prerequisites for this workflow.
