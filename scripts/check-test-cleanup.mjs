import assert from "node:assert/strict";
import { connectHostedDatabase, reportDatabaseError } from "./hosted-db.mjs";

let client;
try {
  client = await connectHostedDatabase("test");
  const result = await client.query(`
    select 'profiles' as resource, count(*)::int as count from public.profiles
    union all select 'customers', count(*)::int from public.customers
    union all select 'addresses', count(*)::int from public.addresses
    union all select 'registration_drafts', count(*)::int from public.registration_drafts
    union all select 'verification_records', count(*)::int from public.verification_records
    union all select 'customer_preferences', count(*)::int from public.customer_preferences
    union all select 'accounts', count(*)::int from public.accounts
    union all select 'customer_account_balances', count(*)::int from private.account_balances b join private.ledger_accounts la on la.id=b.ledger_account_id where la.account_id is not null
    union all select 'customer_ledger_accounts', count(*)::int from private.ledger_accounts where account_id is not null
    union all select 'transactions', count(*)::int from public.transactions
    union all select 'transfers', count(*)::int from public.transfers
    union all select 'transfer_recipients', count(*)::int from public.transfer_recipients
    union all select 'payments', count(*)::int from public.payments
    union all select 'payees', count(*)::int from public.payees
    union all select 'credit_accounts', count(*)::int from public.credit_accounts
    union all select 'cards', count(*)::int from public.cards
    union all select 'card_transactions', count(*)::int from public.card_transactions
    union all select 'card_alert_preferences', count(*)::int from public.card_alert_preferences
    union all select 'check_deposits', count(*)::int from public.check_deposits
    union all select 'statements', count(*)::int from public.statements
    union all select 'loans', count(*)::int from public.loans
    union all select 'loan_payments', count(*)::int from public.loan_payments
    union all select 'mortgages', count(*)::int from public.mortgages
    union all select 'mortgage_payments', count(*)::int from public.mortgage_payments
    union all select 'mortgage_applications', count(*)::int from public.mortgage_applications
    union all select 'investment_accounts', count(*)::int from public.investment_accounts
    union all select 'investment_holdings', count(*)::int from public.investment_holdings
    union all select 'investment_transactions', count(*)::int from public.investment_transactions
    union all select 'notifications', count(*)::int from public.notifications
    union all select 'notification_preferences', count(*)::int from public.notification_preferences
    union all select 'support_tickets', count(*)::int from public.support_tickets
    union all select 'support_messages', count(*)::int from public.support_messages
    union all select 'staff_assignments', count(*)::int from private.staff_assignments
    union all select 'recurring_schedules', count(*)::int from private.recurring_schedules
    union all select 'schedule_occurrences', count(*)::int from private.schedule_occurrences
    union all select 'customer_journals', count(*)::int from private.ledger_journals
    union all select 'customer_idempotency', count(*)::int from private.idempotency_requests
    union all select 'balance_holds', count(*)::int from private.balance_holds
    union all select 'outbox_events', count(*)::int from private.outbox_events
    union all select 'app_sessions', count(*)::int from public.app_sessions
    union all select 'audit_logs', count(*)::int from private.audit_logs where actor_id in (
      select id from auth.users where raw_app_meta_data ? 'synthetic_test_run'
    )
    union all select 'customer_documents', count(*)::int from public.customer_documents
    union all select 'bank_storage_objects', count(*)::int from storage.objects where bucket_id like 'bank-%'
    union all select 'synthetic_auth_users', count(*)::int from auth.users
      where raw_app_meta_data ? 'synthetic_test_run'
    order by resource
  `);
  for (const row of result.rows) assert.equal(row.count, 0, `${row.resource} fixture residue detected`);
  console.log(JSON.stringify({ clean: true, checkedResources: result.rows.length }));
} catch (error) {
  reportDatabaseError(error);
} finally {
  await client?.end();
}
