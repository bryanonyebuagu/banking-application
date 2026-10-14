-- Provider-backed payment collections. External settlement records remain
-- separate from customer deposit balances until a sponsor-bank program is approved.
insert into private.supported_currencies(code, minor_units)
values ('NGN',2),('GHS',2),('ZAR',2),('KES',2)
on conflict(code) do nothing;

create table public.payment_collections (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  provider text not null default 'paystack' check (provider = 'paystack'),
  provider_reference text not null unique,
  provider_transaction_id bigint unique,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null references private.supported_currencies(code),
  channel text not null check (channel in ('card','bank','bank_transfer','ussd','qr','mobile_money','apple_pay')),
  status text not null default 'initializing' check (status in ('initializing','pending','succeeded','failed','refunded')),
  authorization_url text,
  paid_at timestamptz,
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payment_collections_customer_created_idx on public.payment_collections(customer_id,created_at desc);
alter table public.payment_collections enable row level security;
create policy payment_collections_owner_select on public.payment_collections for select to authenticated
using (exists (select 1 from public.customers c where c.id=customer_id and c.auth_user_id=auth.uid()));
revoke all on public.payment_collections from public,anon,authenticated;
grant select on public.payment_collections to authenticated;

create table private.payment_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_key text not null,
  event_type text not null,
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  processing_status text not null check (processing_status in ('processed','ignored','failed')),
  error_code text,
  created_at timestamptz not null default now(),
  unique(provider,event_key)
);
revoke all on private.payment_provider_events from public,anon,authenticated;

create or replace function public.create_current_payment_collection(
  p_reference text,p_amount_minor bigint,p_currency text,p_channel text
) returns uuid language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid();v_customer public.customers%rowtype;v_id uuid;
begin
  if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501'; end if;
  if p_reference !~ '^chaze_[a-zA-Z0-9_-]{16,80}$' then raise exception 'Invalid provider reference' using errcode='22023'; end if;
  if p_amount_minor not between 100 and 100000000 then raise exception 'Amount outside provider limit' using errcode='22023'; end if;
  if p_channel not in ('card','bank','bank_transfer','ussd','qr','mobile_money','apple_pay') then raise exception 'Unsupported payment channel' using errcode='22023'; end if;
  select * into v_customer from public.customers where auth_user_id=v_user;
  if not found or v_customer.verification_status<>'verified' or v_customer.account_status<>'active' then raise exception 'Customer unavailable' using errcode='42501'; end if;
  if not exists(select 1 from private.supported_currencies where code=upper(p_currency)) then raise exception 'Unsupported currency' using errcode='22023'; end if;
  insert into public.payment_collections(customer_id,provider_reference,amount_minor,currency,channel)
  values(v_customer.id,p_reference,p_amount_minor,upper(p_currency),p_channel) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.configure_paystack_collection(
  p_collection_id uuid,p_authorization_url text
) returns void language plpgsql security definer set search_path=''
as $$
begin
  if auth.role()<>'service_role' then raise exception 'Service role required' using errcode='42501'; end if;
  if p_authorization_url !~ '^https://checkout\.paystack\.com/' then raise exception 'Invalid authorization URL' using errcode='22023'; end if;
  update public.payment_collections set authorization_url=p_authorization_url,status='pending',updated_at=now()
  where id=p_collection_id and status='initializing';
  if not found then raise exception 'Payment collection unavailable' using errcode='P0002'; end if;
end;
$$;

create or replace function public.fail_paystack_collection(p_collection_id uuid,p_failure_code text)
returns void language plpgsql security definer set search_path=''
as $$ begin
  if auth.role()<>'service_role' then raise exception 'Service role required' using errcode='42501'; end if;
  update public.payment_collections set status='failed',failure_code=left(p_failure_code,80),updated_at=now()
  where id=p_collection_id and status in ('initializing','pending');
end $$;

create or replace function public.process_paystack_event(
  p_event_key text,p_event_type text,p_payload_hash text,p_reference text,
  p_provider_transaction_id bigint,p_amount_minor bigint,p_currency text,p_paid_at timestamptz
) returns text language plpgsql security definer set search_path=''
as $$
declare v_collection public.payment_collections%rowtype;
begin
  if auth.role()<>'service_role' then raise exception 'Service role required' using errcode='42501'; end if;
  insert into private.payment_provider_events(provider,event_key,event_type,payload_hash,processing_status)
  values('paystack',p_event_key,p_event_type,p_payload_hash,'processed') on conflict(provider,event_key) do nothing;
  if not found then return 'duplicate'; end if;
  select * into v_collection from public.payment_collections where provider_reference=p_reference for update;
  if not found then
    update private.payment_provider_events set processing_status='ignored',error_code='REFERENCE_NOT_FOUND' where provider='paystack' and event_key=p_event_key;
    return 'ignored';
  end if;
  if v_collection.amount_minor<>p_amount_minor or v_collection.currency<>upper(p_currency) then
    update private.payment_provider_events set processing_status='failed',error_code='AMOUNT_OR_CURRENCY_MISMATCH' where provider='paystack' and event_key=p_event_key;
    update public.payment_collections set status='failed',failure_code='PROVIDER_MISMATCH',updated_at=now() where id=v_collection.id;
    return 'mismatch';
  end if;
  if p_event_type='charge.success' then
    update public.payment_collections set status='succeeded',provider_transaction_id=p_provider_transaction_id,paid_at=p_paid_at,updated_at=now() where id=v_collection.id and status<>'refunded';
  elsif p_event_type='refund.processed' then
    update public.payment_collections set status='refunded',updated_at=now() where id=v_collection.id and status='succeeded';
  else
    update private.payment_provider_events set processing_status='ignored',error_code='EVENT_NOT_ACTIONABLE' where provider='paystack' and event_key=p_event_key;
    return 'ignored';
  end if;
  return 'processed';
end;
$$;

revoke all on function public.create_current_payment_collection(text,bigint,text,text) from public,anon;
grant execute on function public.create_current_payment_collection(text,bigint,text,text) to authenticated;
revoke all on function public.configure_paystack_collection(uuid,text), public.fail_paystack_collection(uuid,text), public.process_paystack_event(text,text,text,text,bigint,bigint,text,timestamptz) from public,anon,authenticated;
grant execute on function public.configure_paystack_collection(uuid,text), public.fail_paystack_collection(uuid,text), public.process_paystack_event(text,text,text,text,bigint,bigint,text,timestamptz) to service_role;
