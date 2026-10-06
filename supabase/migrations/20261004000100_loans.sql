-- Milestone B simulated personal/auto loans and amortized payments.
alter table public.loans add column origination_journal_id uuid unique;
alter table public.loans add foreign key(origination_journal_id,currency) references private.ledger_journals(id,currency);

insert into private.ledger_accounts(id,class,normal_side,currency,system_code)
values(gen_random_uuid(),'income','credit','USD','SIMULATED_LOAN_INTEREST_INCOME_USD')
on conflict(system_code) do nothing;
insert into private.account_balances(ledger_account_id)
select id from private.ledger_accounts where system_code='SIMULATED_LOAN_INTEREST_INCOME_USD'
on conflict do nothing;

create or replace function private.post_loan_payment_operation(
 p_actor_id uuid,p_idempotency_key text,p_payload_hash text,p_source_ledger uuid,p_loan_ledger uuid,
 p_interest_ledger uuid,p_principal_minor bigint,p_interest_minor bigint,p_correlation_id uuid
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_request private.idempotency_requests%rowtype;v_currency text;v_journal uuid:=gen_random_uuid();v_total bigint:=p_principal_minor+p_interest_minor;v_available bigint;v_held bigint;
begin
 if p_actor_id is null or p_principal_minor<=0 or p_interest_minor<0 or v_total<=0 then raise exception 'Invalid loan payment' using errcode='22023';end if;
 insert into private.idempotency_requests(actor_id,operation,key,payload_hash,state) values(p_actor_id,'loan_payment',p_idempotency_key,p_payload_hash,'processing') on conflict(actor_id,operation,key) do nothing;
 select * into v_request from private.idempotency_requests where actor_id=p_actor_id and operation='loan_payment' and key=p_idempotency_key for update;
 if v_request.payload_hash<>p_payload_hash then raise exception 'Idempotency payload mismatch' using errcode='23505';end if;
 if v_request.state='succeeded' then return v_request.result_id;end if;
 perform 1 from private.account_balances where ledger_account_id in(p_source_ledger,p_loan_ledger,p_interest_ledger) order by ledger_account_id for update;
 if (select count(*) from private.account_balances where ledger_account_id in(p_source_ledger,p_loan_ledger,p_interest_ledger))<>3 then raise exception 'Ledger projection missing' using errcode='23503';end if;
 select s.currency into v_currency from private.ledger_accounts s join private.ledger_accounts l on l.id=p_loan_ledger and l.currency=s.currency join private.ledger_accounts i on i.id=p_interest_ledger and i.currency=s.currency where s.id=p_source_ledger;
 if v_currency is null then raise exception 'Ledger currency mismatch' using errcode='23514';end if;
 select -net_debit_minor into v_available from private.account_balances where ledger_account_id=p_source_ledger;
 select coalesce(sum(amount_minor),0) into v_held from private.balance_holds where ledger_account_id=p_source_ledger and status='active' and expires_at>now();
 if v_available-v_held<v_total then raise exception 'Insufficient available balance' using errcode='23514';end if;
 insert into private.ledger_journals(id,operation_id,currency,effective_at,actor_id,correlation_id) values(v_journal,gen_random_uuid(),v_currency,now(),p_actor_id,p_correlation_id);
 insert into private.ledger_entries(journal_id,ledger_account_id,side,amount_minor,currency) values
 (v_journal,p_source_ledger,'debit',v_total,v_currency),(v_journal,p_loan_ledger,'credit',p_principal_minor,v_currency);
 if p_interest_minor>0 then insert into private.ledger_entries(journal_id,ledger_account_id,side,amount_minor,currency) values(v_journal,p_interest_ledger,'credit',p_interest_minor,v_currency);end if;
 update private.account_balances set net_debit_minor=net_debit_minor+case when ledger_account_id=p_source_ledger then v_total when ledger_account_id=p_loan_ledger then -p_principal_minor else -p_interest_minor end,version=version+1,updated_at=now() where ledger_account_id in(p_source_ledger,p_loan_ledger,p_interest_ledger);
 update private.idempotency_requests set state='succeeded',result_type='ledger_journal',result_id=v_journal,error_code=null where id=v_request.id;
 return v_journal;
end;$$;

create or replace function public.open_current_simulated_loan(
 p_loan_id uuid,p_kind text,p_principal_minor bigint,p_term_months integer,p_funding_account_id uuid,p_idempotency_key text
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_customer public.customers%rowtype;v_account public.accounts%rowtype;v_deposit_ledger uuid;v_loan_ledger uuid:=gen_random_uuid();v_rate numeric(12,8);v_monthly numeric;v_factor numeric;v_payment bigint;v_hash text;v_request private.idempotency_requests%rowtype;v_journal uuid;v_existing uuid;
begin
 if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
 if p_kind not in('personal','auto') or p_term_months not in(12,24,36,48,60) or (p_kind='personal' and p_principal_minor not between 50000 and 5000000) or (p_kind='auto' and p_principal_minor not between 100000 and 10000000) then raise exception 'Invalid simulated loan' using errcode='22023';end if;
 select * into v_customer from public.customers where auth_user_id=v_user and verification_status='verified' and account_status='active';
 select * into v_account from public.accounts where id=p_funding_account_id and customer_id=v_customer.id and status='active' and currency='USD' for update;
 if v_customer.id is null or v_account.id is null then raise exception 'Loan unavailable' using errcode='42501';end if;
 v_rate:=case p_kind when 'personal' then 0.12000000 else 0.07500000 end;
 v_hash:=encode(extensions.digest(concat_ws('|',p_kind,p_principal_minor,p_term_months,p_funding_account_id,v_rate),'sha256'),'hex');
 select * into v_request from private.idempotency_requests where actor_id=v_user and operation='loan_origination' and key=p_idempotency_key;
 if found then
  if v_request.payload_hash<>v_hash then raise exception 'Idempotency payload mismatch' using errcode='23505';end if;
  if v_request.state='succeeded' then select id into v_existing from public.loans where origination_journal_id=v_request.result_id;return v_existing;end if;
 end if;
 v_monthly:=v_rate/12;v_factor:=power(1+v_monthly,p_term_months);v_payment:=round(p_principal_minor*v_monthly*v_factor/(v_factor-1));
 insert into private.ledger_accounts(id,class,normal_side,currency) values(v_loan_ledger,'asset','debit','USD');
 insert into private.account_balances(ledger_account_id) values(v_loan_ledger);
 insert into public.loans(id,customer_id,ledger_account_id,currency,kind,principal_minor,rate,term_months,monthly_payment_minor,next_due_date,status)
 values(p_loan_id,v_customer.id,v_loan_ledger,'USD',p_kind,p_principal_minor,v_rate,p_term_months,v_payment,current_date+interval '1 month','active');
 select id into v_deposit_ledger from private.ledger_accounts where account_id=v_account.id;
 v_journal:=private.post_ledger_operation(v_user,'loan_origination',p_idempotency_key,v_hash,v_loan_ledger,v_deposit_ledger,p_principal_minor,now(),gen_random_uuid());
 update public.loans set origination_journal_id=v_journal where id=p_loan_id;
 insert into public.transactions(customer_id,account_id,operation_id,journal_id,type,direction,amount_minor,currency,description,category,status,posted_at)
 values(v_customer.id,v_account.id,gen_random_uuid(),v_journal,'loan_disbursement','credit',p_principal_minor,'USD',initcap(p_kind)||' loan proceeds','Loan','posted',now());
 insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(v_user,'customer','loan.opened','loan',p_loan_id,gen_random_uuid());
 insert into private.outbox_events(event_type,aggregate_type,aggregate_id,payload_version,dedupe_key) values('loan.opened','loan',p_loan_id,1,'loan.opened:'||p_loan_id);
 return p_loan_id;
end;$$;

create or replace function public.pay_current_loan(p_loan_id uuid,p_funding_account_id uuid,p_idempotency_key text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_customer uuid;v_loan public.loans%rowtype;v_account public.accounts%rowtype;v_source uuid;v_income uuid;v_outstanding bigint;v_interest bigint;v_total bigint;v_principal bigint;v_hash text;v_journal uuid;v_payment uuid;
begin
 if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
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
 v_hash:=encode(extensions.digest(concat_ws('|',p_loan_id,p_funding_account_id,v_principal,v_interest,v_loan.currency),'sha256'),'hex');
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

create or replace function public.get_current_loan_balances()
returns table(loan_id uuid,outstanding_minor bigint,accrued_interest_minor bigint,payoff_minor bigint,currency text)
language sql stable security definer set search_path='' as $$
 select l.id,greatest(b.net_debit_minor,0),round(greatest(b.net_debit_minor,0)*l.rate/12)::bigint,
 greatest(b.net_debit_minor,0)+round(greatest(b.net_debit_minor,0)*l.rate/12)::bigint,l.currency
 from public.loans l join public.customers c on c.id=l.customer_id join private.account_balances b on b.ledger_account_id=l.ledger_account_id
 where c.auth_user_id=auth.uid() and private.session_is_active()
$$;

revoke all on function private.post_loan_payment_operation(uuid,text,text,uuid,uuid,uuid,bigint,bigint,uuid) from public,anon,authenticated,service_role;
revoke all on function public.open_current_simulated_loan(uuid,text,bigint,integer,uuid,text),public.pay_current_loan(uuid,uuid,text),public.get_current_loan_balances() from public,anon,authenticated,service_role;
grant execute on function public.open_current_simulated_loan(uuid,text,bigint,integer,uuid,text),public.pay_current_loan(uuid,uuid,text),public.get_current_loan_balances() to authenticated;
