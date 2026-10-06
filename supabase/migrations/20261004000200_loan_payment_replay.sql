-- Resolve loan-payment replay before recalculating against a changed balance.
create or replace function public.pay_current_loan(p_loan_id uuid,p_funding_account_id uuid,p_idempotency_key text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_customer uuid;v_loan public.loans%rowtype;v_account public.accounts%rowtype;v_source uuid;v_income uuid;v_outstanding bigint;v_interest bigint;v_total bigint;v_principal bigint;v_hash text;v_request private.idempotency_requests%rowtype;v_journal uuid;v_payment uuid;
begin
 if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
 v_hash:=encode(extensions.digest(concat_ws('|',p_loan_id,p_funding_account_id,'USD'),'sha256'),'hex');
 select * into v_request from private.idempotency_requests where actor_id=v_user and operation='loan_payment' and key=p_idempotency_key;
 if found then
  if v_request.payload_hash<>v_hash then raise exception 'Idempotency payload mismatch' using errcode='23505';end if;
  if v_request.state='succeeded' then select id into v_payment from public.loan_payments where journal_id=v_request.result_id and loan_id=p_loan_id and funding_account_id=p_funding_account_id;return v_payment;end if;
 end if;
 select id into v_customer from public.customers where auth_user_id=v_user and verification_status='verified' and account_status='active';
 select * into v_loan from public.loans where id=p_loan_id and customer_id=v_customer and status='active' for update;
 select * into v_account from public.accounts where id=p_funding_account_id and customer_id=v_customer and status='active' and currency=v_loan.currency;
 if v_customer is null or v_loan.id is null or v_account.id is null then raise exception 'Loan payment unavailable' using errcode='42501';end if;
 select greatest(net_debit_minor,0) into v_outstanding from private.account_balances where ledger_account_id=v_loan.ledger_account_id for update;
 if v_outstanding<=0 then raise exception 'Loan already paid' using errcode='23514';end if;
 v_interest:=round(v_outstanding*v_loan.rate/12);v_total:=least(v_loan.monthly_payment_minor,v_outstanding+v_interest);v_principal:=least(v_outstanding,v_total-v_interest);
 if v_principal<=0 then raise exception 'Invalid amortization result' using errcode='23514';end if;
 select id into v_source from private.ledger_accounts where account_id=v_account.id;
 select id into v_income from private.ledger_accounts where system_code='SIMULATED_LOAN_INTEREST_INCOME_USD';
 v_journal:=private.post_loan_payment_operation(v_user,p_idempotency_key,v_hash,v_source,v_loan.ledger_account_id,v_income,v_principal,v_interest,gen_random_uuid());
 select id into v_payment from public.loan_payments where journal_id=v_journal;
 if v_payment is null then
  insert into public.loan_payments(customer_id,loan_id,funding_account_id,currency,principal_minor,interest_minor,fee_minor,journal_id,status,paid_at)
  values(v_customer,p_loan_id,p_funding_account_id,v_loan.currency,v_principal,v_interest,0,v_journal,'posted',now()) returning id into v_payment;
  insert into public.transactions(customer_id,account_id,operation_id,journal_id,type,direction,amount_minor,currency,description,category,status,posted_at)
  values(v_customer,p_funding_account_id,gen_random_uuid(),v_journal,'loan_payment','debit',v_total,v_loan.currency,'Payment to '||v_loan.kind||' loan','Loan payment','posted',now());
  if v_principal>=v_outstanding then update public.loans set status='paid_off',next_due_date=null where id=p_loan_id;else update public.loans set next_due_date=(coalesce(next_due_date,current_date)+interval '1 month')::date where id=p_loan_id;end if;
  insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(v_user,'customer','loan.payment_posted','loan_payment',v_payment,gen_random_uuid());
  insert into private.outbox_events(event_type,aggregate_type,aggregate_id,payload_version,dedupe_key) values('loan.payment_posted','loan_payment',v_payment,1,'loan.payment_posted:'||v_payment);
 end if;
 return v_payment;
end;$$;

revoke all on function public.pay_current_loan(uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.pay_current_loan(uuid,uuid,text) to authenticated;
