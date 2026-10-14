-- Link provider collections to a customer account and post only after a
-- signed, amount-matched Paystack success event.
alter table public.payment_collections add column account_id uuid;
alter table public.payment_collections add column journal_id uuid unique;
alter table public.payment_collections add constraint payment_collections_account_fkey
  foreign key(account_id,customer_id,currency) references public.accounts(id,customer_id,currency) on delete restrict;
alter table public.payment_collections add constraint payment_collections_journal_fkey
  foreign key(journal_id,currency) references private.ledger_journals(id,currency) on delete restrict;

insert into private.ledger_accounts(id,class,normal_side,currency,system_code)
select gen_random_uuid(),'asset','debit',code,'PAYSTACK_SETTLEMENT_'||code
from private.supported_currencies
where code in ('USD','NGN','GHS','ZAR','KES')
on conflict(system_code) do nothing;
insert into private.account_balances(ledger_account_id)
select id from private.ledger_accounts where system_code like 'PAYSTACK_SETTLEMENT_%'
on conflict do nothing;

revoke all on function public.open_current_account(text,text) from public,anon,authenticated,service_role;
drop function public.open_current_account(text,text);
create function public.open_current_account(p_account_type text,p_nickname text,p_currency text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_user_id uuid:=auth.uid();v_customer public.customers%rowtype;v_account_id uuid:=gen_random_uuid();v_ledger_account_id uuid:=gen_random_uuid();v_nickname text:=btrim(p_nickname);v_currency text:=upper(p_currency);
begin
  if v_user_id is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501'; end if;
  if p_account_type not in ('checking','savings') or v_currency not in ('USD','NGN') then raise exception 'Unsupported account configuration' using errcode='22023'; end if;
  if v_nickname is null or char_length(v_nickname) not between 1 and 80 then raise exception 'Invalid nickname' using errcode='22023'; end if;
  select * into v_customer from public.customers where auth_user_id=v_user_id for update;
  if not found or v_customer.verification_status<>'verified' or v_customer.account_status<>'active' then raise exception 'Customer is not eligible' using errcode='42501'; end if;
  if (select count(*) from public.accounts where customer_id=v_customer.id and status<>'closed')>=10 then raise exception 'Open account limit reached' using errcode='23514'; end if;
  insert into public.accounts(id,customer_id,account_type,nickname,synthetic_identifier,masked_account_number,currency)
  values(v_account_id,v_customer.id,p_account_type,v_nickname,'SIM-'||upper(substr(replace(v_account_id::text,'-',''),1,16)),'****'||lpad((mod(abs(hashtextextended(v_account_id::text,0)),10000))::text,4,'0'),v_currency);
  insert into private.ledger_accounts(id,account_id,class,normal_side,currency) values(v_ledger_account_id,v_account_id,'liability','credit',v_currency);
  insert into private.account_balances(ledger_account_id,net_debit_minor,version) values(v_ledger_account_id,0,0);
  insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(v_user_id,'customer','account.opened','account',v_account_id,gen_random_uuid());
  return v_account_id;
end;
$$;
revoke all on function public.open_current_account(text,text,text) from public,anon,authenticated,service_role;
grant execute on function public.open_current_account(text,text,text) to authenticated;

revoke all on function public.create_current_payment_collection(text,bigint,text,text) from public,anon,authenticated,service_role;
drop function public.create_current_payment_collection(text,bigint,text,text);
create function public.create_current_payment_collection(
  p_account_id uuid,p_reference text,p_amount_minor bigint,p_currency text,p_channel text
) returns uuid language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid();v_customer public.customers%rowtype;v_account public.accounts%rowtype;v_id uuid;
begin
  if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501'; end if;
  if p_reference !~ '^chaze_[a-zA-Z0-9_-]{16,80}$' or p_amount_minor not between 100 and 100000000 then raise exception 'Invalid collection' using errcode='22023'; end if;
  if p_channel not in ('card','bank','bank_transfer','ussd','qr','mobile_money','apple_pay') then raise exception 'Unsupported payment channel' using errcode='22023'; end if;
  select * into v_customer from public.customers where auth_user_id=v_user and verification_status='verified' and account_status='active';
  if not found then raise exception 'Customer unavailable' using errcode='42501'; end if;
  select * into v_account from public.accounts where id=p_account_id and customer_id=v_customer.id and status='active' and currency=upper(p_currency);
  if not found then raise exception 'Deposit account unavailable' using errcode='42501'; end if;
  insert into public.payment_collections(customer_id,account_id,provider_reference,amount_minor,currency,channel)
  values(v_customer.id,v_account.id,p_reference,p_amount_minor,upper(p_currency),p_channel) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.create_current_payment_collection(uuid,text,bigint,text,text) from public,anon,authenticated,service_role;
grant execute on function public.create_current_payment_collection(uuid,text,bigint,text,text) to authenticated;

create or replace function public.process_paystack_event(
  p_event_key text,p_event_type text,p_payload_hash text,p_reference text,
  p_provider_transaction_id bigint,p_amount_minor bigint,p_currency text,p_paid_at timestamptz
) returns text language plpgsql security definer set search_path=''
as $$
declare v_collection public.payment_collections%rowtype;v_customer public.customers%rowtype;v_customer_ledger uuid;v_settlement_ledger uuid;v_post_hash text;v_journal uuid;v_transaction uuid;
begin
  if auth.role()<>'service_role' then raise exception 'Service role required' using errcode='42501'; end if;
  insert into private.payment_provider_events(provider,event_key,event_type,payload_hash,processing_status)
  values('paystack',p_event_key,p_event_type,p_payload_hash,'processed') on conflict(provider,event_key) do nothing;
  if not found then return 'duplicate'; end if;
  select * into v_collection from public.payment_collections where provider_reference=p_reference for update;
  if not found then
    update private.payment_provider_events set processing_status='ignored',error_code='REFERENCE_NOT_FOUND' where provider='paystack' and event_key=p_event_key;return 'ignored';
  end if;
  if v_collection.amount_minor<>p_amount_minor or v_collection.currency<>upper(p_currency) then
    update private.payment_provider_events set processing_status='failed',error_code='AMOUNT_OR_CURRENCY_MISMATCH' where provider='paystack' and event_key=p_event_key;
    update public.payment_collections set status='failed',failure_code='PROVIDER_MISMATCH',updated_at=now() where id=v_collection.id;return 'mismatch';
  end if;
  if p_event_type<>'charge.success' then
    update private.payment_provider_events set processing_status='ignored',error_code='EVENT_NOT_ACTIONABLE' where provider='paystack' and event_key=p_event_key;return 'ignored';
  end if;
  if v_collection.account_id is null then
    update private.payment_provider_events set processing_status='failed',error_code='DEPOSIT_ACCOUNT_MISSING' where provider='paystack' and event_key=p_event_key;return 'failed';
  end if;
  select * into v_customer from public.customers where id=v_collection.customer_id;
  select id into v_customer_ledger from private.ledger_accounts where account_id=v_collection.account_id;
  select id into v_settlement_ledger from private.ledger_accounts where system_code='PAYSTACK_SETTLEMENT_'||v_collection.currency;
  v_post_hash:=encode(extensions.digest(concat_ws('|',v_collection.id,v_collection.account_id,v_collection.amount_minor,v_collection.currency),'sha256'),'hex');
  v_journal:=private.post_ledger_operation(v_customer.auth_user_id,'paystack_deposit',v_collection.provider_reference,v_post_hash,v_settlement_ledger,v_customer_ledger,v_collection.amount_minor,coalesce(p_paid_at,now()),v_collection.id);
  select id into v_transaction from public.transactions where account_id=v_collection.account_id and journal_id=v_journal;
  if v_transaction is null then
    insert into public.transactions(customer_id,account_id,operation_id,journal_id,type,direction,amount_minor,currency,description,category,status,posted_at)
    values(v_collection.customer_id,v_collection.account_id,gen_random_uuid(),v_journal,'deposit','credit',v_collection.amount_minor,v_collection.currency,'Paystack deposit','Deposits','posted',coalesce(p_paid_at,now())) returning id into v_transaction;
    insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(v_customer.auth_user_id,'customer','deposit.provider_posted','transaction',v_transaction,v_collection.id);
    insert into private.outbox_events(event_type,aggregate_type,aggregate_id,payload_version,dedupe_key) values('deposit.posted','transaction',v_transaction,1,'deposit.posted:'||v_collection.id);
  end if;
  update public.payment_collections set status='succeeded',provider_transaction_id=p_provider_transaction_id,paid_at=p_paid_at,journal_id=v_journal,updated_at=now() where id=v_collection.id;
  return 'processed';
end;
$$;
