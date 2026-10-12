# Authentication repair verification

Production: https://bryobankerz.vercel.app

Use Supabase Authentication → URL Configuration with that origin as Site URL. Keep `https://bryobankerz.vercel.app/**` and the localhost development allowlist. Production must never use a localhost fallback.

In Authentication → Emails, apply `supabase/templates/confirmation.html` to Confirm sign up and `supabase/templates/recovery.html` to Reset password. These files are not uploaded by a Vercel deployment. Deploy the corresponding application change before applying the recovery template: it supplies `/auth/confirm?type=recovery` as RedirectTo. Existing PKCE `/auth/callback?next=/reset-password` links continue to work in the requesting browser. Newly generated hashed-token links can be opened in a different browser.

Required application variables are `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (public client configuration), and `APP_ORIGIN` (server configuration). For production validation also set `APP_ENV=production` and `AUTH_EMAIL_DELIVERY=custom-smtp`. The latter declares the expected delivery configuration; it does not configure SMTP or prove delivery. Brevo credentials belong in Supabase SMTP settings, never public variables. Neither a service-role key nor a database password is required for customer authentication.

Verify using a dedicated mailbox:

1. Submit first name, last name, email and a valid password. Confirm a pending-verification state and an unconfirmed Supabase Auth user with name metadata.
2. Confirm a delivered message in the inbox and Brevo transactional logs. A successful signup/recovery API response alone does not prove delivery; existing-account responses are deliberately generic.
3. Open the email link. Verify `/login?verified=true`, no retained signed-in session, then sign in using the original credentials.
4. Verify dashboard data, refresh, logout, and sign in again. Empty onboarding state must remain usable without granting customer permissions or inventing account data.
5. Request recovery. Verify no document reload, a temporary success message, provider request success, and actual inbox delivery.
6. Open the new link in another browser; verify the Create New Password form. Complete the password change, confirm sign-in redirect, reject the old password, and accept the new password.
7. Repeat session persistence and form checks on desktop and an actual Safari/iPhone environment. Narrow Chrome viewport tests alone do not prove Safari compatibility.

Logs intentionally contain operation stages and provider error codes, not emails, credentials, tokens, cookies, or request bodies. Inspect `AUTH_LOGIN_FAILED`, `AUTH_EMAIL_CONFIRMATION_FAILED`, `AUTH_CALLBACK_FAILED`, `AUTH_PROXY_SESSION_REJECTED`, `AUTH_RECOVERY_REQUEST_FAILED`, and `DASHBOARD_QUERY_FAILED`. Browser-side recovery errors appear in the browser console and Supabase logs; they are not Vercel server requests.

The October 10 audit confirmed configured Brevo SMTP and matching Vercel/Supabase project URLs. No Auth requests appeared in the selected preceding 24-hour window. That observation does not establish the cause of older delivery failures. Brevo's previous account-review restriction was reported lifted by its support team; fresh delivery must still be verified.

## Changes in this repair

- `src/app/auth/confirm/route.ts`: email verification ends at sign-in; recovery opens reset; cookie changes survive failures.
- `src/app/auth/callback/route.ts`: PKCE cookie writes stay synchronized; older recovery forms can use hashed links; failures preserve cookie deletion.
- `src/app/auth/continue/page.tsx`: shared same-origin destination validation.
- `src/features/auth/auth-continue.tsx`: visible continuation link if automatic navigation does not run.
- `src/features/auth/auth-forms.tsx`: recovery destination, persistent error notification, enumeration-safe confirmation, accurate password-update heading.
- `src/lib/auth/redirect.ts`: validated destinations, cookie-preserving redirects, no-store and no-referrer headers.
- `src/proxy.ts`: preserve refreshed cookies, clear rejected sessions, include receive-money in session guards, prevent caching of private responses.
- `src/server/auth/actions.ts`: distinguish invalid credentials and unconfirmed email from temporary service failure.
- `src/server/dashboard/overview.ts`: safe per-query diagnostics without exposing customer data.
- `supabase/templates/confirmation.html`: correct the missing query-start delimiter.
- `supabase/templates/recovery.html`: cross-browser hashed-token recovery template, preserving the requesting origin.
- `tests/unit/auth-callbacks.test.ts`: callback, recovery, redirect and cookie regression coverage.
- `PROJECT_STATUS.md` and this document: evidence, limitations and hosted configuration steps.

No database migrations, ledger operations, payment integrations, passwords, SMTP credentials or service-role credentials were changed. A successful compiler/build or mocked test is not proof that a real user can receive an email and reach the dashboard.

## October 12 live evidence

Commit `b91b2e0` was pushed to main. The Vercel commit status reported “Deployment has completed”; `/auth/confirm` returned the newly added private/no-store and no-referrer headers. TypeScript, lint, 20 focused regression tests and the production build passed.

Both hosted templates were saved in the Supabase dashboard. On the deployed signup form, a short password produced the expected validation error. A valid submission displayed the pending-verification state. Gmail received the new confirmation message, and a read-only database query confirmed both name fields persisted in Auth metadata.

The test account was confirmed at 07:19:30 UTC, thirty seconds after signup, before the agent clicked the verification link. This is an observation, not proof of a particular email scanner or a confirmed callback defect. A user may have followed the link independently. The browser connection subsequently disappeared. Login, dashboard persistence, recovery delivery and final password update have not been verified end-to-end; no completion claim is justified yet.
