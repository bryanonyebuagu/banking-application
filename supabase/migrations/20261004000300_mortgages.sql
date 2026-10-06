-- Milestone B synthetic mortgage applications, balances and amortized payments.
alter table public.mortgage_applications add column requested_term_months integer check(requested_term_months in(180,360));
alter table public.mortgage_applications add column mortgage_id uuid unique references public.mortgages(id);
alter table public.mortgages add column origination_journal_id uuid unique;
alter table public.mortgages add column escrow_monthly_minor bigint not null default 0 check(escrow_monthly_minor>=0);
alter table public.mortgages add foreign key(origination_journal_id,currency) references private.ledger_journals(id,currency);

create or replace function public.submit_current_mortgage_application(p_property_id text,p_employment_id text,p_amount_minor bigint,p_term_months integer)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_customer uuid;v_id uuid;
begin
 if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
 select id into v_customer from public.customers where auth_user_id=v_user and verification_status='verified' and account_status='active';
 if v_customer is null then raise exception 'Application unavailable' using errcode='42501';end if;
 if p_property_id !~ '^SIM-[A-Z0-9-]{3,60}$' or p_employment_id !~ '^SIM-[A-Z0-9-]{3,60}$' or p_amount_minor not between 5000000 and 150000000 or p_term_months not in(180,360) then raise exception 'Invalid mortgage application' using errcode='22023';end if;
 insert into public.mortgage_applications(customer_id,synthetic_property_id,synthetic_employment_id,requested_amount_minor,currency,status,requested_term_months)
 values(v_customer,p_property_id,p_employment_id,p_amount_minor,'USD','submitted',p_term_months) returning id into v_id;
 insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(v_user,'customer','mortgage.application_submitted','mortgage_application',v_id,gen_random_uuid());
 return v_id;
end;$$;

create or replace function public.review_current_simulated_mortgage_application(p_application_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_app public.mortgage_applications%rowtype;v_mortgage uuid:=gen_random_uuid();v_receivable uuid:=gen_random_uuid();v_escrow uuid:=gen_random_uuid();v_cash uuid;v_rate numeric(12,8):=0.06500000;v_monthly numeric;v_factor numeric;v_principal_payment bigint;v_escrow_payment bigint;v_hash text;v_journal uuid;
begin
 if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
 select ma.* into v_app from public.mortgage_applications ma join public.customers c on c.id=ma.customer_id where ma.id=p_application_id and c.auth_user_id=v_user for update of ma;
 if not found then raise exception 'Application unavailable' using errcode='42501';end if;
 if v_app.status='approved' then return v_app.mortgage_id;end if;
 if v_app.status<>'submitted' then raise exception 'Application cannot be reviewed' using errcode='23514';end if;
 v_monthly:=v_rate/12;v_factor:=power(1+v_monthly,v_app.requested_term_months);v_principal_payment:=round(v_app.requested_amount_minor*v_monthly*v_factor/(v_factor-1));v_escrow_payment:=round(v_app.requested_amount_minor*0.012/12);
 insert into private.ledger_accounts(id,class,normal_side,currency) values(v_receivable,'asset','debit','USD'),(v_escrow,'liability','credit','USD');
 insert into private.account_balances(ledger_account_id) values(v_receivable),(v_escrow);
 insert into public.mortgages(id,customer_id,ledger_account_id,escrow_ledger_account_id,currency,principal_minor,rate,term_months,monthly_payment_minor,escrow_monthly_minor,next_due_date,status)
 values(v_mortgage,v_app.customer_id,v_receivable,v_escrow,'USD',v_app.requested_amount_minor,v_rate,v_app.requested_term_months,v_principal_payment+v_escrow_payment,v_escrow_payment,current_date+interval '1 month','active');
 select id into v_cash from private.ledger_accounts where system_code='SIMULATOR_CASH_USD';
 v_hash:=encode(extensions.digest(concat_ws('|',v_app.id,v_app.requested_amount_minor,v_app.requested_term_months,v_rate),'sha256'),'hex');
 v_journal:=private.post_ledger_operation(v_user,'mortgage_origination',v_app.id::text,v_hash,v_receivable,v_cash,v_app.requested_amount_minor,now(),gen_random_uuid());
 update public.mortgages set origination_journal_id=v_journal where id=v_mortgage;
 update public.mortgage_applications set status='approved',mortgage_id=v_mortgage where id=v_app.id;
 insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(v_user,'customer','mortgage.application_approved','mortgage_application',v_app.id,gen_random_uuid());
 insert into private.outbox_events(event_type,aggregate_type,aggregate_id,payload_version,dedupe_key) values('mortgage.approved','mortgage',v_mortgage,1,'mortgage.approved:'||v_mortgage);
 return v_mortgage;
end;$$;

create or replace function private.post_mortgage_payment_operation(
 p_actor uuid,p_key text,p_hash text,p_source uuid,p_mortgage uuid,p_interest uuid,p_escrow uuid,
 p_principal bigint,p_interest_amount bigint,p_escrow_amount bigint,p_correlation uuid
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_request private.idempotency_requests%rowtype;v_currency text;v_journal uuid:=gen_random_uuid();v_total bigint:=p_principal+p_interest_amount+p_escrow_amount;v_available bigint;v_held bigint;
begin
 if p_actor is null or p_principal<=0 or p_interest_amount<0 or p_escrow_amount<0 then raise exception 'Invalid mortgage payment' using errcode='22023';end if;
 insert into private.idempotency_requests(actor_id,operation,key,payload_hash,state) values(p_actor,'mortgage_payment',p_key,p_hash,'processing') on conflict(actor_id,operation,key) do nothing;
 select * into v_request from private.idempotency_requests where actor_id=p_actor and operation='mortgage_payment' and key=p_key for update;
 if v_request.payload_hash<>p_hash then raise exception 'Idempotency payload mismatch' using errcode='23505';end if;if v_request.state='succeeded' then return v_request.result_id;end if;
 perform 1 from private.account_balances where ledger_account_id in(p_source,p_mortgage,p_interest,p_escrow) order by ledger_account_id for update;
 select s.currency into v_currency from private.ledger_accounts s join private.ledger_accounts m on m.id=p_mortgage and m.currency=s.currency join private.ledger_accounts i on i.id=p_interest and i.currency=s.currency join private.ledger_accounts e on e.id=p_escrow and e.currency=s.currency where s.id=p_source;
 if v_currency is null then raise exception 'Ledger currency mismatch' using errcode='23514';end if;
 select -net_debit_minor into v_available from private.account_balances where ledger_account_id=p_source;select coalesce(sum(amount_minor),0) into v_held from private.balance_holds where ledger_account_id=p_source and status='active' and expires_at>now();
 if v_available-v_held<v_total then raise exception 'Insufficient available balance' using errcode='23514';end if;
 insert into private.ledger_journals(id,operation_id,currency,effective_at,actor_id,correlation_id) values(v_journal,gen_random_uuid(),v_currency,now(),p_actor,p_correlation);
 insert into private.ledger_entries(journal_id,ledger_account_id,side,amount_minor,currency) values(v_journal,p_source,'debit',v_total,v_currency),(v_journal,p_mortgage,'credit',p_principal,v_currency);
 if p_interest_amount>0 then insert into private.ledger_entries(journal_id,ledger_account_id,side,amount_minor,currency) values(v_journal,p_interest,'credit',p_interest_amount,v_currency);end if;
 if p_escrow_amount>0 then insert into private.ledger_entries(journal_id,ledger_account_id,side,amount_minor,currency) values(v_journal,p_escrow,'credit',p_escrow_amount,v_currency);end if;
 update private.account_balances set net_debit_minor=net_debit_minor+case when ledger_account_id=p_source then v_total when ledger_account_id=p_mortgage then -p_principal when ledger_account_id=p_interest then -p_interest_amount else -p_escrow_amount end,version=version+1,updated_at=now() where ledger_account_id in(p_source,p_mortgage,p_interest,p_escrow);
 update private.idempotency_requests set state='succeeded',result_type='ledger_journal',result_id=v_journal where id=v_request.id;return v_journal;
end;$$;

create or replace function public.pay_current_mortgage(p_mortgage_id uuid,p_funding_account_id uuid,p_idempotency_key text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_customer uuid;v_mortgage public.mortgages%rowtype;v_account public.accounts%rowtype;v_request private.idempotency_requests%rowtype;v_hash text;v_source uuid;v_income uuid;v_outstanding bigint;v_interest bigint;v_escrow bigint;v_principal bigint;v_journal uuid;v_payment uuid;
begin
 if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
 v_hash:=encode(extensions.digest(concat_ws('|',p_mortgage_id,p_funding_account_id,'USD'),'sha256'),'hex');
 select * into v_request from private.idempotency_requests where actor_id=v_user and operation='mortgage_payment' and key=p_idempotency_key;
 if found then if v_request.payload_hash<>v_hash then raise exception 'Idempotency payload mismatch' using errcode='23505';end if;if v_request.state='succeeded' then select id into v_payment from public.mortgage_payments where journal_id=v_request.result_id;return v_payment;end if;end if;
 select id into v_customer from public.customers where auth_user_id=v_user and account_status='active';
 select * into v_mortgage from public.mortgages where id=p_mortgage_id and customer_id=v_customer and status='active' for update;
 select * into v_account from public.accounts where id=p_funding_account_id and customer_id=v_customer and status='active' and currency=v_mortgage.currency;
 if v_mortgage.id is null or v_account.id is null then raise exception 'Mortgage payment unavailable' using errcode='42501';end if;
 select greatest(net_debit_minor,0) into v_outstanding from private.account_balances where ledger_account_id=v_mortgage.ledger_account_id for update;
 v_interest:=round(v_outstanding*v_mortgage.rate/12);v_escrow:=v_mortgage.escrow_monthly_minor;v_principal:=least(v_outstanding,v_mortgage.monthly_payment_minor-v_escrow-v_interest);
 if v_principal<=0 then raise exception 'Invalid amortization result' using errcode='23514';end if;
 select id into v_source from private.ledger_accounts where account_id=v_account.id;select id into v_income from private.ledger_accounts where system_code='SIMULATED_LOAN_INTEREST_INCOME_USD';
 v_journal:=private.post_mortgage_payment_operation(v_user,p_idempotency_key,v_hash,v_source,v_mortgage.ledger_account_id,v_income,v_mortgage.escrow_ledger_account_id,v_principal,v_interest,v_escrow,gen_random_uuid());
 insert into public.mortgage_payments(customer_id,mortgage_id,funding_account_id,currency,principal_minor,interest_minor,escrow_minor,journal_id,status,paid_at) values(v_customer,p_mortgage_id,p_funding_account_id,v_mortgage.currency,v_principal,v_interest,v_escrow,v_journal,'posted',now()) returning id into v_payment;
 insert into public.transactions(customer_id,account_id,operation_id,journal_id,type,direction,amount_minor,currency,description,category,status,posted_at) values(v_customer,p_funding_account_id,gen_random_uuid(),v_journal,'mortgage_payment','debit',v_principal+v_interest+v_escrow,v_mortgage.currency,'Mortgage payment','Mortgage','posted',now());
 if v_principal>=v_outstanding then update public.mortgages set status='paid_off',next_due_date=null where id=p_mortgage_id;else update public.mortgages set next_due_date=(next_due_date+interval '1 month')::date where id=p_mortgage_id;end if;
 return v_payment;
end;$$;

create or replace function public.get_current_mortgage_balances()
returns table(mortgage_id uuid,outstanding_minor bigint,escrow_balance_minor bigint,accrued_interest_minor bigint,currency text)
language sql stable security definer set search_path='' as $$
 select m.id,greatest(b.net_debit_minor,0),greatest(-eb.net_debit_minor,0),round(greatest(b.net_debit_minor,0)*m.rate/12)::bigint,m.currency
 from public.mortgages m join public.customers c on c.id=m.customer_id join private.account_balances b on b.ledger_account_id=m.ledger_account_id join private.account_balances eb on eb.ledger_account_id=m.escrow_ledger_account_id
 where c.auth_user_id=auth.uid() and private.session_is_active()
$$;

revoke all on function private.post_mortgage_payment_operation(uuid,text,text,uuid,uuid,uuid,uuid,bigint,bigint,bigint,uuid) from public,anon,authenticated,service_role;
revoke all on function public.submit_current_mortgage_application(text,text,bigint,integer),public.review_current_simulated_mortgage_application(uuid),public.pay_current_mortgage(uuid,uuid,text),public.get_current_mortgage_balances() from public,anon,authenticated,service_role;
grant execute on function public.submit_current_mortgage_application(text,text,bigint,integer),public.review_current_simulated_mortgage_application(uuid),public.pay_current_mortgage(uuid,uuid,text),public.get_current_mortgage_balances() to authenticated;
