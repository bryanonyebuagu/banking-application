# Synthetic demo data

The demo builder creates persistent simulator records in the hosted development project. It never targets the test project and does not use Docker. All balances originate through the same ledger commands used by the application.

## Configure in VS Code

Open `.env.local` and add development-only values for:

- `ALLOW_SYNTHETIC_SEED=true`
- `DEMO_CUSTOMER_EMAIL` and `DEMO_CUSTOMER_PASSWORD`
- `DEMO_SECONDARY_EMAIL` and `DEMO_SECONDARY_PASSWORD`
- `DEMO_STAFF_EMAIL` and `DEMO_STAFF_PASSWORD`

Use email addresses and passwords created only for this private simulator. Do not commit the file or paste passwords into chat. The ignored `.env.supabase-secret` and `.env.db-password` files must remain in place.

Run `npm run seed:demo` once. Re-running is safe for users already seeded by the script: it signs in to the configured identities and skips the product dataset when the primary accounts already exist.

The builder creates two verified customer profiles and one staff identity. The primary customer receives checking and savings accounts, ledger funding, a transfer, Bill Pay activity, a card purchase, a personal loan, a mortgage, an investment account, notifications and a secure support ticket. The secondary customer demonstrates ownership isolation. The first staff identity receives the administrator role through the database-owner-only bootstrap function.

The staff user must sign in, open `/security-center`, enroll an authenticator app and verify the current session before `/staff` will open. This is deliberate: the seed builder never weakens the MFA requirement or creates a recoverable MFA secret.
