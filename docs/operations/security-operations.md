# Security operations

These procedures apply to the private hosted Supabase development and test projects. They are operational guidance for a simulator, not a compliance claim.

## Backup and restore

Keep Supabase-managed backups enabled when the project plan supports them. Before a migration release, capture a provider backup or logical export of the development database and record the migration version. Storage objects in `bank-statements`, `bank-documents` and `bank-test-checks` require a separate private object inventory because database rows alone do not restore file contents.

Restore only into an isolated recovery project first. Apply the repository migrations to the recorded version, restore data and private objects, then compare migration history, row counts, ledger reconciliation and object-key ownership. Never restore over the active development project until the isolated recovery is accepted. Ledger journals and audit rows remain immutable; recovery corrections use new forward migrations or explicit audited operations.

## Secret rotation

Rotate one credential class at a time: database password, Supabase secret key, publishable key if provider policy requires it, and job-runner secret. Update ignored local files and deployment secrets, restart the affected service, then revoke the previous credential. A Supabase secret-key rotation requires reviewing privileged scripts and scheduled workers. A suspected browser session leak also requires provider-wide sign-out plus application-session revocation.

Never place secrets in source, screenshots, support tickets, audit reason codes or chat. `.env.example` contains names only.

## Incident triage

For suspected unauthorized access, preserve timestamps and correlation IDs, revoke affected provider and application sessions, restrict affected simulator accounts, rotate implicated secrets and stop scheduled workers if their authority is in doubt. Review `security_events`, `login_events`, immutable `audit_logs`, outbox records and provider Auth logs. Do not edit evidence rows. Record remediation through reason-coded staff commands.

For suspected financial inconsistency, pause the affected simulator workflow, run the ledger reconciliation procedure in an isolated administrative session and compare journals, entries and projections. Never repair a balance by directly editing a projection. Post an approved compensating operation or ship a forward migration.

## Retention and deletion

This project accepts synthetic banking and identity data only. Remove abandoned registration drafts and quarantined uploads on a short scheduled window. Expired sessions and revoked devices may be retained for security history, then deleted under an explicit development retention window. Customer-facing documents and support messages follow the owning synthetic profile. Ledger journals, financial events and audit history stay immutable while the simulator dataset exists.

Deleting a demo identity requires ordered cleanup of storage objects, messages, product rows, ledger dependencies, sessions, profile records and finally the provider user. Use the repository cleanup implementation as the ordering reference. Never cascade-delete ledger or audit history in an active dataset.
