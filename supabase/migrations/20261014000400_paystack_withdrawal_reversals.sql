create or replace function public.process_paystack_transfer_event(p_event_key text,p_event_type text,p_payload_hash text,p_reference text,p_provider_transfer_id bigint,p_amount_minor bigint,p_currency text)
returns text language plpgsql security definer set search_path=''
as $$
declare v_withdrawal public.payout_withdrawals%rowtype;v_customer public.customers%rowtype;v_customer_ledger uuid;v_settlement_ledger uuid;v_hash text;v_journal uuid;v_transaction uuid;v_original_transaction uuid;
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
  select * into v_customer from public.customers where id=v_withdrawal.customer_id;
  select id into v_customer_ledger from private.ledger_accounts where account_id=v_withdrawal.account_id;
  select id into v_settlement_ledger from private.ledger_accounts where system_code='PAYSTACK_SETTLEMENT_'||v_withdrawal.currency;
  if p_event_type='transfer.reversed' and v_withdrawal.status='succeeded' then
    v_hash:=encode(extensions.digest(concat_ws('|',v_withdrawal.id,'reversed',v_withdrawal.amount_minor,v_withdrawal.currency),'sha256'),'hex');
    v_journal:=private.post_ledger_operation(v_customer.auth_user_id,'paystack_withdrawal_reversal',v_withdrawal.provider_reference||':reversed',v_hash,v_settlement_ledger,v_customer_ledger,v_withdrawal.amount_minor,now(),v_withdrawal.id);
    select id into v_original_transaction from public.transactions where journal_id=v_withdrawal.journal_id and account_id=v_withdrawal.account_id;
    insert into public.transactions(customer_id,account_id,operation_id,journal_id,type,direction,amount_minor,currency,description,category,status,posted_at,original_transaction_id)
    values(v_withdrawal.customer_id,v_withdrawal.account_id,gen_random_uuid(),v_journal,'reversal','credit',v_withdrawal.amount_minor,v_withdrawal.currency,'Reversed withdrawal to '||v_withdrawal.bank_name||' '||v_withdrawal.masked_destination,'Withdrawals','posted',now(),v_original_transaction);
    update public.payout_withdrawals set status='reversed',completed_at=now(),updated_at=now() where id=v_withdrawal.id;
    insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(v_customer.auth_user_id,'customer','withdrawal.provider_reversed','payout_withdrawal',v_withdrawal.id,v_withdrawal.id);
    return 'processed';
  end if;
  if p_event_type<>'transfer.success' then update private.payment_provider_events set processing_status='ignored',error_code='EVENT_NOT_ACTIONABLE' where provider='paystack' and event_key=p_event_key;return 'ignored';end if;
  if v_withdrawal.status='succeeded' then return 'duplicate';end if;
  update private.balance_holds set status='captured',updated_at=now() where id=v_withdrawal.hold_id and status='active';if not found then raise exception 'Withdrawal hold unavailable' using errcode='23514';end if;
  v_hash:=encode(extensions.digest(concat_ws('|',v_withdrawal.id,v_withdrawal.account_id,v_withdrawal.amount_minor,v_withdrawal.currency),'sha256'),'hex');
  v_journal:=private.post_customer_debit_operation(v_customer.auth_user_id,'paystack_withdrawal',v_withdrawal.provider_reference,v_hash,v_customer_ledger,v_settlement_ledger,v_withdrawal.amount_minor,v_withdrawal.id);
  insert into public.transactions(customer_id,account_id,operation_id,journal_id,type,direction,amount_minor,currency,description,category,status,posted_at)
  values(v_withdrawal.customer_id,v_withdrawal.account_id,gen_random_uuid(),v_journal,'withdrawal','debit',v_withdrawal.amount_minor,v_withdrawal.currency,'Withdrawal to '||v_withdrawal.bank_name||' '||v_withdrawal.masked_destination,'Withdrawals','posted',now()) returning id into v_transaction;
  update public.payout_withdrawals set status='succeeded',provider_transfer_id=coalesce(provider_transfer_id,p_provider_transfer_id),journal_id=v_journal,completed_at=now(),updated_at=now() where id=v_withdrawal.id;
  insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(v_customer.auth_user_id,'customer','withdrawal.provider_posted','payout_withdrawal',v_withdrawal.id,v_withdrawal.id);
  insert into private.outbox_events(event_type,aggregate_type,aggregate_id,payload_version,dedupe_key) values('withdrawal.posted','payout_withdrawal',v_withdrawal.id,1,'withdrawal.posted:'||v_withdrawal.id);
  return 'processed';
end;
$$;
