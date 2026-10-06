-- Milestone A immediate own-account and simulated-recipient transfers.
insert into private.ledger_accounts(id,class,normal_side,currency,system_code)
values(gen_random_uuid(),'liability','credit','USD','SIMULATED_EXTERNAL_CLEARING_USD') on conflict(system_code) do nothing;
insert into private.account_balances(ledger_account_id) select id from private.ledger_accounts where system_code='SIMULATED_EXTERNAL_CLEARING_USD' on conflict do nothing;

create or replace function private.post_customer_debit_operation(
  p_actor_id uuid,p_operation text,p_idempotency_key text,p_payload_hash text,
  p_source_ledger_id uuid,p_destination_ledger_id uuid,p_amount_minor bigint,p_correlation_id uuid
) returns uuid language plpgsql security definer set search_path=''
as $$
declare v_balance bigint;v_held bigint;
begin
  perform 1 from private.account_balances where ledger_account_id in(p_source_ledger_id,p_destination_ledger_id) order by ledger_account_id for update;
  select -net_debit_minor into v_balance from private.account_balances where ledger_account_id=p_source_ledger_id;
  select coalesce(sum(amount_minor),0) into v_held from private.balance_holds where ledger_account_id=p_source_ledger_id and status='active' and expires_at>now();
  if v_balance-v_held<p_amount_minor then raise exception 'Insufficient available balance' using errcode='P0001';end if;
  return private.post_ledger_operation(p_actor_id,p_operation,p_idempotency_key,p_payload_hash,p_source_ledger_id,p_destination_ledger_id,p_amount_minor,now(),p_correlation_id);
end;
$$;

create or replace function public.create_current_transfer_recipient(p_label text,p_destination_token text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid();v_customer uuid;v_id uuid;v_label text:=btrim(p_label);v_token text:=upper(btrim(p_destination_token));
begin
  if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
  if char_length(v_label) not between 1 and 100 or v_token!~'^SIM-[A-Z0-9-]{8,40}$' then raise exception 'Invalid recipient' using errcode='22023';end if;
  select id into v_customer from public.customers where auth_user_id=v_user and verification_status='verified' and account_status='active';if v_customer is null then raise exception 'Customer unavailable' using errcode='42501';end if;
  insert into public.transfer_recipients(customer_id,label,destination_token,masked_identifier) values(v_customer,v_label,v_token,'••••'||right(v_token,4)) returning id into v_id;
  insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(v_user,'customer','transfer_recipient.created','transfer_recipient',v_id,gen_random_uuid());return v_id;
end;
$$;

create or replace function public.archive_current_transfer_recipient(p_recipient_id uuid)
returns void language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid();v_changed uuid;
begin
 if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
 update public.transfer_recipients r set status='archived' from public.customers c where r.id=p_recipient_id and r.customer_id=c.id and c.auth_user_id=v_user and r.status='active' returning r.id into v_changed;
 if v_changed is null then raise exception 'Recipient unavailable' using errcode='42501';end if;
end;
$$;

create or replace function public.execute_current_transfer(
 p_source_account_id uuid,p_destination_account_id uuid default null,p_recipient_id uuid default null,
 p_amount_minor bigint default null,p_memo text default null,p_idempotency_key text default null
) returns uuid language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid();v_customer public.customers%rowtype;v_source public.accounts%rowtype;v_destination public.accounts%rowtype;v_recipient public.transfer_recipients%rowtype;v_source_ledger uuid;v_destination_ledger uuid;v_hash text;v_journal uuid;v_transfer uuid;v_source_tx uuid;v_destination_tx uuid;v_memo text:=nullif(btrim(p_memo),'');
begin
 if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
 if num_nonnulls(p_destination_account_id,p_recipient_id)<>1 or p_amount_minor not between 1 and 100000000 or char_length(coalesce(v_memo,''))>500 then raise exception 'Invalid transfer' using errcode='22023';end if;
 select * into v_customer from public.customers where auth_user_id=v_user and verification_status='verified' and account_status='active';if not found then raise exception 'Customer unavailable' using errcode='42501';end if;
 select * into v_source from public.accounts where id=p_source_account_id and customer_id=v_customer.id and status='active';if not found then raise exception 'Source unavailable' using errcode='42501';end if;
 if p_destination_account_id is not null then
   select * into v_destination from public.accounts where id=p_destination_account_id and customer_id=v_customer.id and status='active';if not found then raise exception 'Destination unavailable' using errcode='42501';end if;
 else
   select * into v_recipient from public.transfer_recipients where id=p_recipient_id and customer_id=v_customer.id and status='active';if not found then raise exception 'Recipient unavailable' using errcode='42501';end if;
   select * into v_destination from public.accounts where synthetic_identifier=v_recipient.destination_token and status='active';
 end if;
 if v_destination.id=v_source.id then raise exception 'Accounts must differ' using errcode='22023';end if;
 select id into v_source_ledger from private.ledger_accounts where account_id=v_source.id;
 if v_destination.id is not null then select id into v_destination_ledger from private.ledger_accounts where account_id=v_destination.id;else select id into v_destination_ledger from private.ledger_accounts where system_code='SIMULATED_EXTERNAL_CLEARING_USD';end if;
 v_hash:=encode(extensions.digest(concat_ws('|',v_source.id,coalesce(p_destination_account_id,p_recipient_id),p_amount_minor,coalesce(v_memo,''),v_source.currency),'sha256'),'hex');
 v_journal:=private.post_customer_debit_operation(v_user,'transfer',p_idempotency_key,v_hash,v_source_ledger,v_destination_ledger,p_amount_minor,gen_random_uuid());
 select id into v_transfer from public.transfers where journal_id=v_journal;
 if v_transfer is null then
   insert into public.transfers(customer_id,source_account_id,destination_account_id,recipient_id,amount_minor,currency,memo,status,journal_id)
   values(v_customer.id,v_source.id,case when p_recipient_id is null then v_destination.id else null end,p_recipient_id,p_amount_minor,v_source.currency,v_memo,'completed',v_journal) returning id into v_transfer;
   insert into public.transactions(customer_id,account_id,operation_id,journal_id,type,direction,amount_minor,currency,description,category,status,posted_at)
   values(v_customer.id,v_source.id,gen_random_uuid(),v_journal,'transfer','debit',p_amount_minor,v_source.currency,'Transfer to '||coalesce(v_destination.nickname,v_recipient.label), 'Transfers','posted',now()) returning id into v_source_tx;
   if v_destination.id is not null then
    insert into public.transactions(customer_id,account_id,operation_id,journal_id,type,direction,amount_minor,currency,description,category,status,posted_at)
    values(v_destination.customer_id,v_destination.id,gen_random_uuid(),v_journal,'transfer','credit',p_amount_minor,v_destination.currency,'Transfer from '||v_source.nickname,'Transfers','posted',now()) returning id into v_destination_tx;
   end if;
   insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(v_user,'customer','transfer.completed','transfer',v_transfer,gen_random_uuid());
   insert into private.outbox_events(event_type,aggregate_type,aggregate_id,payload_version,dedupe_key) values('transfer.completed','transfer',v_transfer,1,'transfer.completed:'||v_transfer);
 end if;return v_transfer;
end;
$$;

revoke all on function private.post_customer_debit_operation(uuid,text,text,text,uuid,uuid,bigint,uuid) from public,anon,authenticated,service_role;
revoke all on function public.create_current_transfer_recipient(text,text),public.archive_current_transfer_recipient(uuid),public.execute_current_transfer(uuid,uuid,uuid,bigint,text,text) from public,anon,authenticated,service_role;
grant execute on function public.create_current_transfer_recipient(text,text),public.archive_current_transfer_recipient(uuid),public.execute_current_transfer(uuid,uuid,uuid,bigint,text,text) to authenticated;
