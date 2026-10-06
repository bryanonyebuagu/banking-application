# PostgreSQL / Supabase data architecture

Design contract only; Phase 2 creates executable migrations, grants and tests. All PRD tables are included below. Supabase Dashboard must expose inspectable records to the developer, while customer API access stays restricted.

## Conventions

Use UUID primary keys named id (mapped to PRD resource_id names in DTOs), explicit foreign keys, timestamptz UTC event times, date for birthdays/due dates, created_at and updated_at on mutable records. Append-only records have created_at only. Use NOT NULL unless absence has domain meaning; checked text statuses; indexes on ownership/FK/filter paths. Restrict deletion of financial history; close/archive domain records. Auth deletion must not cascade into ledgers. Minimize retained profile data separately.

Amounts: bigint minor units, positive on entry rows with debit/credit direction; signed derived net amounts only. API uses strings to avoid JS precision loss. Currency references a supported-currency catalog with minor-unit precision; start USD. Rates numeric(12,8), holding quantities numeric(28,10); explicit rounding at monetary posting, never binary floating point. Interest policy and rounding examples must be specified and tested when those features begin.

Use public for RLS-protected customer-visible records and narrow API commands; private for ledger internals, permission tables, jobs, idempotency and outbox. Expose neither private schema nor privileged helper functions in the Data API. RLS plus column privileges/commands is required: row ownership alone must not let customers change roles, balances or verification status.

## Logical model and relationships

Every row listed has an id unless a composite/unique key is stated. Fields below supplement common timestamps.

| Tables | Key fields and relationships |
| --- | --- |
| profiles | auth_user_id unique FK auth.users; display_name, locale, timezone; never passwords or authority flags |
| customers | auth_user_id unique FK auth.users, profile_id unique FK profiles; first/middle/last name, contact email/phone, DOB, customer_since, verification_status, account_status, employment, income_range |
| addresses | customer_id FK customers; address lines, city, state, postal_code, country, type, is_primary; at most one primary per customer/type |
| verification_records | customer_id, provider, synthetic_fixture_id, status, provider_reference unique, reviewed_by, reason_code; no raw SSN or real ID image |
| accounts | customer_id, account_type checking/savings, nickname, unique synthetic_identifier, masked_account_number, synthetic routing_identifier, currency, status, opened_at, closed_at; balance fields supplied by authorized projection |
| ledger_accounts (private) | optional unique account_id; optional linked product ledger mapping; class asset/liability/equity/income/expense, normal_side, currency, system_code for clearing/fees/interest |
| ledger_journals (private) | operation reference, currency, posted_at, effective_at, reversal_of FK journals, actor_id, correlation_id; unique operation key |
| ledger_entries (private) | journal_id, ledger_account_id, side debit/credit, amount_minor > 0, currency; immutable; at least two entries and balanced per journal |
| account_balances (private) | unique ledger_account_id, net_debit_minor, version; transactionally maintained rebuildable projection |
| balance_holds (private) | ledger_account_id, operation_id, amount_minor, active/captured/released/expired, expires_at; unique source operation |
| transactions | account_id, journal_id nullable until posted, type, direction, amount_minor, currency, merchant, description, category, status, posted_at, original_transaction_id; unique account/operation leg |
| transfers | customer_id, source_account_id, destination_account_id nullable for external simulator, recipient_id, amount_minor, currency, memo, scheduled_at, status, journal_id, schedule_id |
| transfer_recipients | customer_id, label, simulator destination token, masked_identifier, status; no real bank credentials |
| payees | customer_id, name, synthetic reference, archived_at; archive referenced payees rather than deleting history |
| payments | customer_id, account_id, payee_id, amount_minor, currency, scheduled_at, status, journal_id, schedule_id |
| recurring_schedules (private) | customer_id, kind, source and destination/payee references, amount/currency, frequency, local time, IANA timezone, next_run_at, end_at, status; immutable execution payload per occurrence |
| schedule_occurrences (private) | schedule_id, due_at, command_id, status; unique(schedule_id,due_at) |
| credit_accounts | customer_id, ledger_account_id unique, currency, credit_limit_minor, cycle_day, due_day; derived current/available balance |
| cards | customer_id, credit_account_id, synthetic token unique, last_four, cardholder, status, limits, replaced_card_id; no CVV or real PAN |
| card_transactions | card_id, transaction reference, journal_id, hold_id, merchant, amount_minor, currency, category, location, status, original_id |
| check_deposits | customer_id, account_id, amount_minor, currency, private object key, status, reviewed_at, journal_id unique |
| statements | customer_id, account_id or credit_account_id exactly one, period_start/end, version, immutable opening/closing totals, ledger cutoff, private object key, status; unique account/period/version |
| loans / loan_payments | loans: customer_id, ledger_account_id, kind personal/auto, principal_minor, rate, term, monthly_payment_minor, next_due_date, status; payments: loan_id, funding_account_id, principal/interest/fee amounts, journal_id, status, paid_at |
| mortgages / mortgage_payments | mortgages: customer_id, ledger_account_id, principal, rate, term, escrow ledger mapping, monthly payment, next_due_date, status; payments: mortgage_id, funding account, principal/interest/escrow splits, journal_id, status |
| mortgage_applications | customer_id, synthetic property/employment inputs, requested amount, status, review history reference |
| investment_accounts | customer_id, cash_ledger_account_id, currency, status |
| investment_holdings | investment_account_id, instrument_id, quantity, cost_basis; unique account/instrument; rebuildable from investment transactions |
| investment_transactions | investment_account_id, instrument_id, kind, quantity, price, cash_amount, journal_id, occurred_at; simulated only |
| investment_instruments / investment_prices | synthetic symbol/name; instrument_id, price, currency, observed_at; unique instrument/time, explicit simulated provenance |
| notifications / notification_preferences | notifications: customer_id, event_id, type, safe payload, read_at; unique recipient/event/type; preferences: customer_id/type/channel unique, enabled |
| customer_preferences / account_preferences | customer_id unique for locale/privacy/display choices; account_id unique for account settings; security fields cannot be edited here |
| customer_documents | customer_id, kind, private object key, generated/uploaded metadata; owner-only retrieval |
| support_tickets / support_messages | tickets: customer_id, assigned_staff_id, subject, status; messages: ticket_id, author_id, body, visibility customer/internal; internal messages never customer-visible |
| devices / app_sessions | devices: auth_user_id, opaque device token hash, label, trusted_until, revoked_at; sessions: auth_user_id, provider session_id unique, device_id, last_seen_at, revoked_at; not an independent auth provider |
| login_events / security_events | subject auth_user_id, event type, outcome, redacted context, occurred_at; append-only, subject-safe read projection |
| audit_logs (private) | actor_id, actor_role snapshot, action, resource_type/id, timestamp, redacted metadata, correlation_id; append-only |
| staff_roles / staff_permissions / staff_assignments (private) | auth_user_id and role/capability/scope associations; trusted provisioning only; changes audited |
| idempotency_requests (private) | actor, operation, key unique together; payload_hash, result reference, state; no sensitive request bodies |
| outbox_events / jobs (private) | event type, aggregate reference, payload version, dedupe key unique, attempt count, next_attempt_at, lease_until, status |

Customer contact email is a profile value; Supabase Auth owns sign-in email and verification. Synchronization is explicit after provider-confirmed email changes, never inferred from profile edits. Addresses are normalized; API composes the PRD customer address fields. Account ledger_balance/available_balance and credit balances are read-model fields, never freely writable columns.

## Ledger invariants and posting contract

Use double-entry accounting from the bank simulator's perspective. Each posted journal balances debits and credits in one currency; no zero, negative or mixed-currency entries. Enforce cross-row balance with deferred constraint triggers plus the posting command, not a row CHECK. Journal and entries are immutable after commit; database grants and triggers reject updates/deletes. Corrections create linked reversing journals; full reversal unique per original, partial refunds cumulatively capped under lock.

Examples: deposit $100: debit simulator cash asset 10000, credit customer deposit liability 10000. Transfer $25 from checking to savings: debit checking liability 2500, credit savings liability 2500. Card purchase: debit customer card receivable asset, credit simulated merchant clearing. Paying card: debit checking liability, credit card receivable. Fees: debit deposit liability, credit fee income. Initial balances must also be posted journals.

Deposit ledger_balance = credits minus debits. Available = ledger_balance minus active debit holds; unposted credits are unavailable. Credit outstanding = debits minus credits; available credit = limit minus outstanding minus active purchase holds. Capture replaces the hold with a posting atomically, never subtracts both. Every posting/hold operation locks the same projection row(s).

One narrow command transaction must: validate verified actor and permission; bind idempotency key and payload; lock affected balance/product rows in stable UUID order; recheck account/card status and current funds/limit; create entries/journal and transaction records; update derived projections and operation status; consume holds if applicable; append audit/outbox; persist receipt; commit all or none. READ COMMITTED with explicit row locks is the default for this invariant, with bounded retries for deadlocks; predicate-wide constraints use unique constraints or SERIALIZABLE with whole-transaction retry. No network I/O inside a posting transaction.

Idempotency replay with same payload returns original receipt; changed payload conflicts. After an uncertain timeout, query/retry with the same key. No new key until result is known. Domain rejection persists a safe failure outcome separately if needed; never retains a partial journal. Reconcile projections against entries and fail visibly on drift; do not silently edit financial truth.

## State machines

- Accounts: active → frozen/restricted/closed; authorized unfreeze/release restores active. Closed is terminal; closing requires zero settled balance, no holds or queued obligations. Outbound spending only active; inbound posting allowed active/restricted under explicit policy, blocked frozen/closed.
- Transactions: pending → posted/failed; posted → reversed by a new journal. History is retained.
- Transfers: scheduled → processing → completed/failed; scheduled → cancelled. Immediate commands begin processing. Cancellation and execution contend on the same row lock.
- Payments: scheduled → processing → completed/failed; scheduled → cancelled. Retry uses the existing command identity.
- Card purchases: pending hold → posted or reversed/released; refunds are separately linked postings. Cards active/locked/lost/stolen/replaced; only active authorizes new purchases, settlements/refunds may finish existing obligations.
- Checks: submitted → reviewing → accepted/rejected; acceptance and one journal atomic.
- Verification: not_started → pending → verified/failed/manual_review; reviewer resolution or explicit retry audited.
- Support: open → in_progress → waiting_for_customer/resolved → closed; new customer reply can reopen a resolved ticket through a defined service action.

## Policy and migration requirements

Owner paths resolve auth.uid() → customers.auth_user_id → resource customer/account FK. Children inherit through their parent. Incoming recipients see only their own transaction leg, not the sender's profile/accounts. Staff access uses capabilities in SECURITY.md, never a blanket authenticated policy. Index policy joins; constrain cross-owner FKs through composite constraints or trusted command checks.

Phase 2 migration order: types/catalogs → identity/ownership → ledger core/projections → domain tables → indexes/constraints → grants/RLS → commands/triggers → storage policies. Verify empty-db replay and upgrade from prior version, generated types, two-user isolation, unauthenticated access, role escalation and direct RPC bypass. Seed Auth users with the provider admin API only in local/test environments, then create domain data and opening journals through approved commands. Never seed plaintext passwords into SQL tables.

See [PostgreSQL locking](https://www.postgresql.org/docs/current/explicit-locking.html) and [isolation](https://www.postgresql.org/docs/current/transaction-iso.html) for implementation semantics. The contracts above are project design decisions.
