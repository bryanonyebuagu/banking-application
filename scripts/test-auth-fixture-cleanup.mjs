import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { connectHostedDatabase, reportDatabaseError } from "./hosted-db.mjs";

const projectUrl = "https://icdaoukkzpiwspirqver.supabase.co";

export async function cleanupTestAuthFixtures() {
  const secret = (await readFile(new URL("../.env.test-supabase-secret", import.meta.url), "utf8")).trim();
  assert.ok(secret.startsWith("sb_secret_"), "SUPABASE_SECRET_NOT_CONFIGURED");
  const admin = createClient(projectUrl, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(20000) }) },
  });
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listed.error) throw new Error("AUTH_FIXTURE_LIST_FAILED");
  const users = listed.data.users.filter((user) => typeof user.app_metadata?.synthetic_test_run === "string");
  if (users.length === 0) return 0;
  const ids = users.map((user) => user.id);
  const database = await connectHostedDatabase("test");
  let checkObjectKeys = [];
  let statementObjectKeys = [];
  let documentObjectKeys = [];
  try {
    checkObjectKeys = (await database.query("select object_key from public.check_deposits where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids])).rows.map((row) => row.object_key);
    statementObjectKeys = (await database.query("select object_key from public.statements where object_key is not null and customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids])).rows.map((row) => row.object_key);
    documentObjectKeys = (await database.query("select object_key from public.customer_documents where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids])).rows.map((row) => row.object_key);
    await database.query("begin");
    // Test-target owner cleanup only. Production immutability remains enforced.
    await database.query("set local session_replication_role = replica");
    await database.query("create temporary table cleanup_loan_ledgers on commit drop as select ledger_account_id from public.loans where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("create temporary table cleanup_mortgage_ledgers on commit drop as select ledger_account_id from public.mortgages where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[])) union select escrow_ledger_account_id from public.mortgages where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("create temporary table cleanup_investment_ledgers on commit drop as select cash_ledger_account_id as ledger_account_id from public.investment_accounts where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from private.audit_logs where actor_id = any($1::uuid[]) or resource_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from private.outbox_events where aggregate_id in (select t.id from public.transactions t join public.customers c on c.id=t.customer_id where c.auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from private.outbox_events where aggregate_id in (select t.id from public.transfers t join public.customers c on c.id=t.customer_id where c.auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from private.outbox_events where aggregate_id in (select p.id from public.payments p join public.customers c on c.id=p.customer_id where c.auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from private.outbox_events where aggregate_id in (select ct.id from public.card_transactions ct join public.customers c on c.id=ct.customer_id where c.auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from private.outbox_events where aggregate_id in (select d.id from public.check_deposits d join public.customers c on c.id=d.customer_id where c.auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from private.outbox_events where aggregate_id in (select s.id from public.statements s join public.customers c on c.id=s.customer_id where c.auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from private.outbox_events where aggregate_id in (select l.id from public.loans l join public.customers c on c.id=l.customer_id where c.auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from private.outbox_events where aggregate_id in (select lp.id from public.loan_payments lp join public.customers c on c.id=lp.customer_id where c.auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from private.outbox_events where aggregate_id in (select m.id from public.mortgages m join public.customers c on c.id=m.customer_id where c.auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from private.outbox_events where aggregate_id in (select t.id from public.support_tickets t join public.customers c on c.id=t.customer_id where c.auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from private.idempotency_requests where actor_id = any($1::uuid[])", [ids]);
    await database.query("delete from private.balance_holds where ledger_account_id in (select la.id from private.ledger_accounts la join public.accounts a on a.id=la.account_id join public.customers c on c.id=a.customer_id where c.auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from public.transfers where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from public.payments where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from private.schedule_occurrences where schedule_id in (select id from private.recurring_schedules where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[])))", [ids]);
    await database.query("delete from private.recurring_schedules where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from public.transfer_recipients where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from public.payees where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from public.check_deposits where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from public.statements where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from public.loan_payments where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from public.loans where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from public.mortgage_payments where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from public.mortgage_applications where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from public.mortgages where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from public.investment_transactions where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from public.investment_holdings where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from public.investment_accounts where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from public.notifications where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from public.notification_preferences where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from public.support_messages where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from public.support_tickets where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from public.card_transactions where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from private.balance_holds where ledger_account_id in (select ledger_account_id from public.credit_accounts where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[])))", [ids]);
    await database.query("delete from public.card_alert_preferences where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from public.cards where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from public.transactions where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from private.ledger_entries where journal_id in (select id from private.ledger_journals where actor_id = any($1::uuid[]))", [ids]);
    await database.query("delete from private.ledger_journals where actor_id = any($1::uuid[])", [ids]);
    await database.query("update private.account_balances b set net_debit_minor=coalesce((select sum(case e.side when 'debit' then e.amount_minor else -e.amount_minor end) from private.ledger_entries e where e.ledger_account_id=b.ledger_account_id),0),version=version+1,updated_at=now() where b.ledger_account_id in (select id from private.ledger_accounts where account_id is null)");
    await database.query("create temporary table cleanup_credit_ledgers on commit drop as select ledger_account_id from public.credit_accounts where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from private.account_balances where ledger_account_id in (select ledger_account_id from cleanup_credit_ledgers)");
    await database.query("delete from public.credit_accounts where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from private.ledger_accounts where id in (select ledger_account_id from cleanup_credit_ledgers)");
    await database.query("delete from private.account_balances where ledger_account_id in (select ledger_account_id from cleanup_loan_ledgers)");
    await database.query("delete from private.ledger_accounts where id in (select ledger_account_id from cleanup_loan_ledgers)");
    await database.query("delete from private.account_balances where ledger_account_id in (select ledger_account_id from cleanup_mortgage_ledgers)");
    await database.query("delete from private.ledger_accounts where id in (select ledger_account_id from cleanup_mortgage_ledgers)");
    await database.query("delete from private.account_balances where ledger_account_id in (select ledger_account_id from cleanup_investment_ledgers)");
    await database.query("delete from private.ledger_accounts where id in (select ledger_account_id from cleanup_investment_ledgers)");
    await database.query("delete from private.account_balances where ledger_account_id in (select la.id from private.ledger_accounts la join public.accounts a on a.id=la.account_id join public.customers c on c.id=a.customer_id where c.auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from private.ledger_accounts where account_id in (select a.id from public.accounts a join public.customers c on c.id=a.customer_id where c.auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from public.accounts where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from public.verification_records where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from public.customer_preferences where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from public.addresses where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from public.customer_documents where customer_id in (select id from public.customers where auth_user_id = any($1::uuid[]))", [ids]);
    await database.query("delete from public.login_events where auth_user_id = any($1::uuid[])", [ids]);
    await database.query("delete from public.security_events where auth_user_id = any($1::uuid[])", [ids]);
    await database.query("delete from public.app_sessions where auth_user_id = any($1::uuid[])", [ids]);
    await database.query("delete from public.devices where auth_user_id = any($1::uuid[])", [ids]);
    await database.query("delete from private.staff_assignments where auth_user_id = any($1::uuid[]) or granted_by = any($1::uuid[])", [ids]);
    await database.query("delete from public.customers where auth_user_id = any($1::uuid[])", [ids]);
    await database.query("delete from public.profiles where auth_user_id = any($1::uuid[])", [ids]);
    await database.query("delete from public.registration_drafts where auth_user_id = any($1::uuid[])", [ids]);
    await database.query("commit");
  } catch (error) {
    await database.query("rollback").catch(() => {});
    throw error;
  } finally {
    await database.end();
  }
  if (checkObjectKeys.length > 0) {
    const removedObjects = await admin.storage.from("bank-test-checks").remove(checkObjectKeys);
    if (removedObjects.error) throw new Error("CHECK_STORAGE_CLEANUP_FAILED");
  }
  if (statementObjectKeys.length > 0) {
    const removedStatements = await admin.storage.from("bank-statements").remove(statementObjectKeys);
    if (removedStatements.error) throw new Error("STATEMENT_STORAGE_CLEANUP_FAILED");
  }
  if (documentObjectKeys.length > 0) {
    const removedDocuments = await admin.storage.from("bank-documents").remove(documentObjectKeys);
    if (removedDocuments.error) throw new Error("DOCUMENT_STORAGE_CLEANUP_FAILED");
  }
  for (const user of users) {
    const removed = await admin.auth.admin.deleteUser(user.id);
    if (removed.error) throw new Error("AUTH_FIXTURE_CLEANUP_FAILED");
  }
  return users.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const removed = await cleanupTestAuthFixtures();
    console.log(JSON.stringify({ cleaned: true, providerUsersRemoved: removed }));
  } catch (error) {
    reportDatabaseError(error);
  }
}
