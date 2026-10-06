-- Make concurrent mortgage-payment replay return the existing payment row.
create or replace function public.pay_current_mortgage(p_mortgage_id uuid,p_funding_account_id uuid,p_idempotency_key text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_customer uuid;v_mortgage public.mortgages%rowtype;v_account public.accounts%rowtype;v_request private.idempotency_requests%rowtype;v_hash text;v_source uuid;v_income uuid;v_outstanding bigint;v_interest bigint;v_escrow bigint;v_principal bigint;v_journal uuid;v_payment uuid;
begin
 if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
 v_hash:=encode(extensions.digest(concat_ws('|',p_mortgage_id,p_funding_account_id,'USD'),'sha256'),'hex');
 select * into v_request from private.idempotency_requests where actor_id=v_user and operation='mortgage_payment' and key=p_idempotency_key;
 if found then if v_request.payload_hash<>v_hash then raise exception 'Idempotency payload mismatch' using errcode='23505';end if;if v_request.state='succeeded' then select id into v_payment from public.mortgage_payments where journal_id=v_request.result_id and mortgage_id=p_mortgage_id and funding_account_id=p_funding_account_id;return v_payment;end if;end if;
 select id into v_customer from public.customers where auth_user_id=v_user and account_status='active';
 select * into v_mortgage from public.mortgages where id=p_mortgage_id and customer_id=v_customer and status='active' for update;
 select * into v_account from public.accounts where id=p_funding_account_id and customer_id=v_customer and status='active' and currency=v_mortgage.currency;
 if v_mortgage.id is null or v_account.id is null then raise exception 'Mortgage payment unavailable' using errcode='42501';end if;
 select greatest(net_debit_minor,0) into v_outstanding from private.account_balances where ledger_account_id=v_mortgage.ledger_account_id for update;
 v_interest:=round(v_outstanding*v_mortgage.rate/12);v_escrow:=v_mortgage.escrow_monthly_minor;v_principal:=least(v_outstanding,v_mortgage.monthly_payment_minor-v_escrow-v_interest);
 if v_principal<=0 then raise exception 'Invalid amortization result' using errcode='23514';end if;
 select id into v_source from private.ledger_accounts where account_id=v_account.id;select id into v_income from private.ledger_accounts where system_code='SIMULATED_LOAN_INTEREST_INCOME_USD';
 v_journal:=private.post_mortgage_payment_operation(v_user,p_idempotency_key,v_hash,v_source,v_mortgage.ledger_account_id,v_income,v_mortgage.escrow_ledger_account_id,v_principal,v_interest,v_escrow,gen_random_uuid());
 select id into v_payment from public.mortgage_payments where journal_id=v_journal;
 if v_payment is null then
  insert into public.mortgage_payments(customer_id,mortgage_id,funding_account_id,currency,principal_minor,interest_minor,escrow_minor,journal_id,status,paid_at) values(v_customer,p_mortgage_id,p_funding_account_id,v_mortgage.currency,v_principal,v_interest,v_escrow,v_journal,'posted',now()) returning id into v_payment;
  insert into public.transactions(customer_id,account_id,operation_id,journal_id,type,direction,amount_minor,currency,description,category,status,posted_at) values(v_customer,p_funding_account_id,gen_random_uuid(),v_journal,'mortgage_payment','debit',v_principal+v_interest+v_escrow,v_mortgage.currency,'Mortgage payment','Mortgage','posted',now());
  if v_principal>=v_outstanding then update public.mortgages set status='paid_off',next_due_date=null where id=p_mortgage_id;else update public.mortgages set next_due_date=(next_due_date+interval '1 month')::date where id=p_mortgage_id;end if;
 end if;
 return v_payment;
end;$$;
revoke all on function public.pay_current_mortgage(uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.pay_current_mortgage(uuid,uuid,text) to authenticated;
