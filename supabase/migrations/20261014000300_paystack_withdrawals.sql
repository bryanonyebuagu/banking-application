create table public.payout_withdrawals (
  id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id),account_id uuid not null,
  provider text not null default 'paystack' check(provider='paystack'),provider_reference text not null unique,provider_transfer_id bigint unique,provider_transfer_code text unique,
  amount_minor bigint not null check(amount_minor>0),currency text not null references private.supported_currencies(code),beneficiary_name text not null check(char_length(beneficiary_name) between 2 and 120),bank_name text not null check(char_length(bank_name) between 2 and 120),masked_destination text not null check(masked_destination ~ '^\*{6}[0-9]{4}$'),
  recipient_code text,status text not null default 'initializing' check(status in ('initializing','pending','succeeded','failed','reversed')),hold_id uuid not null unique references private.balance_holds(id),journal_id uuid unique,failure_code text,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now(),completed_at timestamptz,
  foreign key(account_id,customer_id,currency) references public.accounts(id,customer_id,currency),foreign key(journal_id,currency) references private.ledger_journals(id,currency)
);
create index payout_withdrawals_customer_created_idx on public.payout_withdrawals(customer_id,created_at desc);
alter table public.payout_withdrawals enable row level security;
create policy payout_withdrawals_owner_read on public.payout_withdrawals for select to authenticated using(private.owns_customer(customer_id));
revoke all on public.payout_withdrawals from public,anon,authenticated,service_role;
grant select on public.payout_withdrawals to authenticated;

create function public.create_current_paystack_withdrawal(p_account_id uuid,p_reference text,p_amount_minor bigint,p_currency text,p_beneficiary_name text,p_bank_name text,p_masked_destination text)
returns table(withdrawal_id uuid,hold_id uuid) language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid();v_customer public.customers%rowtype;v_account public.accounts%rowtype;v_hold uuid;v_withdrawal uuid;
begin
  if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
  if coalesce(auth.jwt()->>'aal','')<>'aal2' then raise exception 'MFA step-up required' using errcode='42501';end if;
  if p_reference!~'^chaze_[a-zA-Z0-9_-]{16,80}$' or p_amount_minor not between 100 and 100000000 or p_masked_destination!~'^\*{6}[0-9]{4}$' then raise exception 'Invalid withdrawal' using errcode='22023';end if;
  if char_length(btrim(p_beneficiary_name)) not between 2 and 120 or char_length(btrim(p_bank_name)) not between 2 and 120 then raise exception 'Invalid beneficiary' using errcode='22023';end if;
  select * into v_customer from public.customers where auth_user_id=v_user and verification_status='verified' and account_status='active';if not found then raise exception 'Customer unavailable' using errcode='42501';end if;
  select * into v_account from public.accounts where id=p_account_id and customer_id=v_customer.id and status='active' and currency=upper(p_currency);if not found then raise exception 'Account unavailable' using errcode='42501';end if;
  v_hold:=public.place_current_account_hold(v_account.id,p_amount_minor,now()+interval '30 minutes',p_reference);
  insert into public.payout_withdrawals(customer_id,account_id,provider_reference,amount_minor,currency,beneficiary_name,bank_name,masked_destination,hold_id)
  values(v_customer.id,v_account.id,p_reference,p_amount_minor,v_account.currency,btrim(p_beneficiary_name),btrim(p_bank_name),p_masked_destination,v_hold) returning id into v_withdrawal;
  return query select v_withdrawal,v_hold;
end;
$$;

create function public.configure_paystack_withdrawal(p_withdrawal_id uuid,p_recipient_code text,p_transfer_id bigint,p_transfer_code text)
returns void language plpgsql security definer set search_path=''
as $$ begin
  if auth.role()<>'service_role' then raise exception 'Service role required' using errcode='42501';end if;
  if p_recipient_code!~'^RCP_[A-Za-z0-9]+$' or p_transfer_code!~'^TRF_[A-Za-z0-9]+$' then raise exception 'Invalid provider identifiers' using errcode='22023';end if;
  update public.payout_withdrawals set recipient_code=p_recipient_code,provider_transfer_id=p_transfer_id,provider_transfer_code=p_transfer_code,status='pending',updated_at=now() where id=p_withdrawal_id and status='initializing';
  if not found then raise exception 'Withdrawal unavailable' using errcode='P0002';end if;
end $$;

create function public.fail_paystack_withdrawal(p_withdrawal_id uuid,p_failure_code text)
returns void language plpgsql security definer set search_path=''
as $$ declare v_hold uuid;begin
  if auth.role()<>'service_role' then raise exception 'Service role required' using errcode='42501';end if;
  update public.payout_withdrawals set status='failed',failure_code=left(p_failure_code,80),updated_at=now() where id=p_withdrawal_id and status in ('initializing','pending') returning hold_id into v_hold;
  if v_hold is not null then update private.balance_holds set status='released',updated_at=now() where id=v_hold and status='active';end if;
end $$;

create function public.process_paystack_transfer_event(p_event_key text,p_event_type text,p_payload_hash text,p_reference text,p_provider_transfer_id bigint,p_amount_minor bigint,p_currency text)
returns text language plpgsql security definer set search_path=''
as $$
declare v_withdrawal public.payout_withdrawals%rowtype;v_customer public.customers%rowtype;v_customer_ledger uuid;v_settlement_ledger uuid;v_hash text;v_journal uuid;v_transaction uuid;
begin
  if auth.role()<>'service_role' then raise exception 'Service role required' using errcode='42501';end if;
  insert into private.payment_provider_events(provider,event_key,event_type,payload_hash,processing_status) values('paystack',p_event_key,p_event_type,p_payload_hash,'processed') on conflict(provider,event_key) do nothing;
  if not found then return 'duplicate';end if;
  select * into v_withdrawal from public.payout_withdrawals where provider_reference=p_reference for update;
  if not found then update private.payment_provider_events set processing_status='ignored',error_code='REFERENCE_NOT_FOUND' where provider='paystack' and event_key=p_event_key;return 'ignored';end if;
  if v_withdrawal.amount_minor<>p_amount_minor or v_withdrawal.currency<>upper(p_currency) then update private.payment_provider_events set processing_status='failed',error_code='AMOUNT_OR_CURRENCY_MISMATCH' where provider='paystack' and event_key=p_event_key;return 'mismatch';end if;
  if p_event_type in ('transfer.failed','transfer.reversed') and v_withdrawal.status in ('initializing','pending') then
    update private.balance_holds set status='released',updated_at=now() where id=v_withdrawal.hold_id and status='active';
    update public.payout_withdrawals set status='failed',failure_code=upper(replace(p_event_type,'.','_')),updated_at=now() where id=v_withdrawal.id;return 'processed';
  end if;
  if p_event_type<>'transfer.success' then update private.payment_provider_events set processing_status='ignored',error_code='EVENT_NOT_ACTIONABLE' where provider='paystack' and event_key=p_event_key;return 'ignored';end if;
  if v_withdrawal.status='succeeded' then return 'duplicate';end if;
  select * into v_customer from public.customers where id=v_withdrawal.customer_id;
  select id into v_customer_ledger from private.ledger_accounts where account_id=v_withdrawal.account_id;
  select id into v_settlement_ledger from private.ledger_accounts where system_code='PAYSTACK_SETTLEMENT_'||v_withdrawal.currency;
  update private.balance_holds set status='captured',updated_at=now() where id=v_withdrawal.hold_id and status='active';if not found then raise exception 'Withdrawal hold unavailable' using errcode='23514';end if;
  v_hash:=encode(extensions.digest(concat_ws('|',v_withdrawal.id,v_withdrawal.account_id,v_withdrawal.amount_minor,v_withdrawal.currency),'sha256'),'hex');
  v_journal:=private.post_customer_debit_operation(v_customer.auth_user_id,'paystack_withdrawal',v_withdrawal.provider_reference,v_hash,v_customer_ledger,v_settlement_ledger,v_withdrawal.amount_minor,v_withdrawal.id);
  insert into public.transactions(customer_id,account_id,operation_id,journal_id,type,direction,amount_minor,currency,description,category,status,posted_at)
  values(v_withdrawal.customer_id,v_withdrawal.account_id,gen_random_uuid(),v_journal,'withdrawal','debit',v_withdrawal.amount_minor,v_withdrawal.currency,'Withdrawal to '||v_withdrawal.bank_name||' '||v_withdrawal.masked_destination,'Withdrawals','posted',now())
  on conflict(account_id,operation_id,direction) do nothing returning id into v_transaction;
  update public.payout_withdrawals set status='succeeded',provider_transfer_id=coalesce(provider_transfer_id,p_provider_transfer_id),journal_id=v_journal,completed_at=now(),updated_at=now() where id=v_withdrawal.id;
  insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(v_customer.auth_user_id,'customer','withdrawal.provider_posted','payout_withdrawal',v_withdrawal.id,v_withdrawal.id);
  insert into private.outbox_events(event_type,aggregate_type,aggregate_id,payload_version,dedupe_key) values('withdrawal.posted','payout_withdrawal',v_withdrawal.id,1,'withdrawal.posted:'||v_withdrawal.id);
  return 'processed';
end;
$$;

revoke all on function public.create_current_paystack_withdrawal(uuid,text,bigint,text,text,text,text) from public,anon,service_role;
grant execute on function public.create_current_paystack_withdrawal(uuid,text,bigint,text,text,text,text) to authenticated;
revoke all on function public.configure_paystack_withdrawal(uuid,text,bigint,text),public.fail_paystack_withdrawal(uuid,text),public.process_paystack_transfer_event(text,text,text,text,bigint,bigint,text) from public,anon,authenticated;
grant execute on function public.configure_paystack_withdrawal(uuid,text,bigint,text),public.fail_paystack_withdrawal(uuid,text),public.process_paystack_transfer_event(text,text,text,text,bigint,bigint,text) to service_role;
