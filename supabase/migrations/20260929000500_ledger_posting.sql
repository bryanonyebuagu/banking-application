-- Phase 8: the sole balanced posting primitive, customer simulator funding,
-- reversals, holds and owner-safe balance projections.
insert into private.ledger_accounts(id,class,normal_side,currency,system_code)
values(gen_random_uuid(),'asset','debit','USD','SIMULATOR_CASH_USD')
on conflict(system_code) do nothing;
insert into private.account_balances(ledger_account_id)
select id from private.ledger_accounts where system_code='SIMULATOR_CASH_USD'
on conflict do nothing;

create or replace function private.post_ledger_operation(
  p_actor_id uuid,p_operation text,p_idempotency_key text,p_payload_hash text,
  p_debit_ledger_id uuid,p_credit_ledger_id uuid,p_amount_minor bigint,
  p_effective_at timestamptz,p_correlation_id uuid
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare v_request private.idempotency_requests%rowtype; v_currency text; v_journal_id uuid:=gen_random_uuid();
begin
  if p_actor_id is null or p_amount_minor<=0 or p_debit_ledger_id=p_credit_ledger_id then raise exception 'Invalid posting request' using errcode='22023'; end if;
  if char_length(p_idempotency_key) not between 8 and 200 or p_payload_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid idempotency data' using errcode='22023'; end if;
  insert into private.idempotency_requests(actor_id,operation,key,payload_hash,state)
  values(p_actor_id,p_operation,p_idempotency_key,p_payload_hash,'processing') on conflict(actor_id,operation,key) do nothing;
  select * into v_request from private.idempotency_requests where actor_id=p_actor_id and operation=p_operation and key=p_idempotency_key for update;
  if v_request.payload_hash<>p_payload_hash then raise exception 'Idempotency payload mismatch' using errcode='23505'; end if;
  if v_request.state='succeeded' then return v_request.result_id; end if;
  perform 1 from private.account_balances where ledger_account_id in(p_debit_ledger_id,p_credit_ledger_id) order by ledger_account_id for update;
  if (select count(*) from private.account_balances where ledger_account_id in(p_debit_ledger_id,p_credit_ledger_id))<>2 then raise exception 'Ledger projection missing' using errcode='23503'; end if;
  select d.currency into v_currency from private.ledger_accounts d join private.ledger_accounts c on c.id=p_credit_ledger_id and c.currency=d.currency where d.id=p_debit_ledger_id;
  if v_currency is null then raise exception 'Ledger currency mismatch' using errcode='23514'; end if;
  insert into private.ledger_journals(id,operation_id,currency,effective_at,actor_id,correlation_id)
  values(v_journal_id,gen_random_uuid(),v_currency,coalesce(p_effective_at,now()),p_actor_id,p_correlation_id);
  insert into private.ledger_entries(journal_id,ledger_account_id,side,amount_minor,currency) values
    (v_journal_id,p_debit_ledger_id,'debit',p_amount_minor,v_currency),(v_journal_id,p_credit_ledger_id,'credit',p_amount_minor,v_currency);
  update private.account_balances set net_debit_minor=net_debit_minor+case when ledger_account_id=p_debit_ledger_id then p_amount_minor else -p_amount_minor end,version=version+1,updated_at=now()
  where ledger_account_id in(p_debit_ledger_id,p_credit_ledger_id);
  update private.idempotency_requests set state='succeeded',result_type='ledger_journal',result_id=v_journal_id,error_code=null where id=v_request.id;
  return v_journal_id;
end;
$$;

create or replace function public.fund_current_account_synthetic(p_account_id uuid,p_amount_minor bigint,p_idempotency_key text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid();v_account public.accounts%rowtype;v_customer public.customers%rowtype;v_customer_ledger uuid;v_cash_ledger uuid;v_hash text;v_journal uuid;v_transaction uuid;
begin
  if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501'; end if;
  if p_amount_minor not between 1 and 100000000 then raise exception 'Amount outside simulator limit' using errcode='22023'; end if;
  select a.* into v_account from public.accounts a join public.customers c on c.id=a.customer_id where a.id=p_account_id and c.auth_user_id=v_user for update of a;
  if not found or v_account.status<>'active' then raise exception 'Account unavailable' using errcode='42501'; end if;
  select * into v_customer from public.customers where id=v_account.customer_id;
  if v_customer.verification_status<>'verified' or v_customer.account_status<>'active' then raise exception 'Customer unavailable' using errcode='42501'; end if;
  select id into v_customer_ledger from private.ledger_accounts where account_id=v_account.id;
  select id into v_cash_ledger from private.ledger_accounts where system_code='SIMULATOR_CASH_USD';
  v_hash:=encode(extensions.digest(concat_ws('|',p_account_id,p_amount_minor,v_account.currency),'sha256'),'hex');
  v_journal:=private.post_ledger_operation(v_user,'synthetic_funding',p_idempotency_key,v_hash,v_cash_ledger,v_customer_ledger,p_amount_minor,now(),gen_random_uuid());
  select id into v_transaction from public.transactions where account_id=p_account_id and journal_id=v_journal;
  if v_transaction is null then
    insert into public.transactions(customer_id,account_id,operation_id,journal_id,type,direction,amount_minor,currency,description,category,status,posted_at)
    values(v_account.customer_id,p_account_id,gen_random_uuid(),v_journal,'deposit','credit',p_amount_minor,v_account.currency,'Synthetic simulator funding','Income','posted',now()) returning id into v_transaction;
    insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(v_user,'customer','ledger.synthetic_funding','transaction',v_transaction,gen_random_uuid());
    insert into private.outbox_events(event_type,aggregate_type,aggregate_id,payload_version,dedupe_key) values('transaction.posted','transaction',v_transaction,1,'transaction.posted:'||v_transaction);
  end if;
  return v_transaction;
end;
$$;

create or replace function public.reverse_current_transaction(p_transaction_id uuid,p_idempotency_key text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid();v_original public.transactions%rowtype;v_customer_ledger uuid;v_cash_ledger uuid;v_hash text;v_journal uuid;v_transaction uuid;
begin
  if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501'; end if;
  select t.* into v_original from public.transactions t join public.customers c on c.id=t.customer_id where t.id=p_transaction_id and c.auth_user_id=v_user for update of t;
  if not found or v_original.status<>'posted' or v_original.type<>'deposit' then raise exception 'Transaction cannot be reversed' using errcode='42501'; end if;
  select id into v_customer_ledger from private.ledger_accounts where account_id=v_original.account_id;select id into v_cash_ledger from private.ledger_accounts where system_code='SIMULATOR_CASH_USD';
  v_hash:=encode(extensions.digest(concat_ws('|',p_transaction_id,v_original.amount_minor,v_original.currency),'sha256'),'hex');
  v_journal:=private.post_ledger_operation(v_user,'transaction_reversal',p_idempotency_key,v_hash,v_customer_ledger,v_cash_ledger,v_original.amount_minor,now(),gen_random_uuid());
  select id into v_transaction from public.transactions where account_id=v_original.account_id and journal_id=v_journal;
  if v_transaction is null then
    insert into public.transactions(customer_id,account_id,operation_id,journal_id,type,direction,amount_minor,currency,description,category,status,posted_at,original_transaction_id)
    values(v_original.customer_id,v_original.account_id,gen_random_uuid(),v_journal,'reversal','debit',v_original.amount_minor,v_original.currency,'Reversal: '||v_original.description,v_original.category,'posted',now(),v_original.id) returning id into v_transaction;
    update public.transactions set status='reversed' where id=v_original.id;
    insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(v_user,'customer','ledger.transaction_reversed','transaction',v_transaction,gen_random_uuid());
  end if;return v_transaction;
end;
$$;

create or replace function public.place_current_account_hold(p_account_id uuid,p_amount_minor bigint,p_expires_at timestamptz,p_idempotency_key text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid();v_ledger uuid;v_balance bigint;v_held bigint;v_hold uuid;v_hash text;v_request private.idempotency_requests%rowtype;
begin
  if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
  if p_amount_minor<=0 or p_expires_at<=now() then raise exception 'Invalid hold' using errcode='22023';end if;
  select la.id into v_ledger from private.ledger_accounts la join public.accounts a on a.id=la.account_id join public.customers c on c.id=a.customer_id where a.id=p_account_id and a.status='active' and c.auth_user_id=v_user and c.account_status='active';
  if v_ledger is null then raise exception 'Account unavailable' using errcode='42501';end if;
  v_hash:=encode(extensions.digest(concat_ws('|',p_account_id,p_amount_minor,p_expires_at),'sha256'),'hex');
  insert into private.idempotency_requests(actor_id,operation,key,payload_hash,state) values(v_user,'balance_hold',p_idempotency_key,v_hash,'processing') on conflict(actor_id,operation,key) do nothing;
  select * into v_request from private.idempotency_requests where actor_id=v_user and operation='balance_hold' and key=p_idempotency_key for update;
  if v_request.payload_hash<>v_hash then raise exception 'Idempotency payload mismatch' using errcode='23505';end if;if v_request.state='succeeded' then return v_request.result_id;end if;
  select -net_debit_minor into v_balance from private.account_balances where ledger_account_id=v_ledger for update;
  select coalesce(sum(amount_minor),0) into v_held from private.balance_holds where ledger_account_id=v_ledger and status='active' and expires_at>now();
  if v_balance-v_held<p_amount_minor then raise exception 'Insufficient available balance' using errcode='23514';end if;
  insert into private.balance_holds(ledger_account_id,operation_id,amount_minor,status,expires_at) values(v_ledger,gen_random_uuid(),p_amount_minor,'active',p_expires_at) returning id into v_hold;
  update private.idempotency_requests set state='succeeded',result_type='balance_hold',result_id=v_hold where id=v_request.id;return v_hold;
end;
$$;

create or replace function public.release_current_account_hold(p_hold_id uuid)
returns void language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid();v_changed uuid;
begin
  if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
  update private.balance_holds h set status='released',updated_at=now() from private.ledger_accounts la,public.accounts a,public.customers c
  where h.id=p_hold_id and h.ledger_account_id=la.id and la.account_id=a.id and a.customer_id=c.id and c.auth_user_id=v_user and h.status='active' returning h.id into v_changed;
  if v_changed is null then raise exception 'Hold unavailable' using errcode='42501';end if;
end;
$$;

create or replace function public.get_current_account_balances()
returns table(account_id uuid,ledger_balance_minor bigint,available_balance_minor bigint,currency text)
language sql stable security definer set search_path=''
as $$
 select a.id,-b.net_debit_minor,-b.net_debit_minor-coalesce((select sum(h.amount_minor) from private.balance_holds h where h.ledger_account_id=la.id and h.status='active' and h.expires_at>now()),0),a.currency
 from public.accounts a join public.customers c on c.id=a.customer_id join private.ledger_accounts la on la.account_id=a.id join private.account_balances b on b.ledger_account_id=la.id
 where c.auth_user_id=auth.uid() and private.session_is_active()
$$;

create or replace function private.reconcile_account_balances()
returns table(ledger_account_id uuid,projected bigint,calculated bigint)
language sql security definer set search_path=''
as $$
 select b.ledger_account_id,b.net_debit_minor,coalesce(sum(case e.side when 'debit' then e.amount_minor else -e.amount_minor end),0)::bigint
 from private.account_balances b left join private.ledger_entries e on e.ledger_account_id=b.ledger_account_id group by b.ledger_account_id,b.net_debit_minor
 having b.net_debit_minor<>coalesce(sum(case e.side when 'debit' then e.amount_minor else -e.amount_minor end),0)::bigint
$$;

revoke all on function private.post_ledger_operation(uuid,text,text,text,uuid,uuid,bigint,timestamptz,uuid),private.reconcile_account_balances() from public,anon,authenticated,service_role;
revoke all on function public.fund_current_account_synthetic(uuid,bigint,text),public.reverse_current_transaction(uuid,text),public.place_current_account_hold(uuid,bigint,timestamptz,text),public.release_current_account_hold(uuid),public.get_current_account_balances() from public,anon,authenticated,service_role;
grant execute on function public.fund_current_account_synthetic(uuid,bigint,text),public.reverse_current_transaction(uuid,text),public.place_current_account_hold(uuid,bigint,timestamptz,text),public.release_current_account_hold(uuid),public.get_current_account_balances() to authenticated;
