-- Milestone A Bill Pay: synthetic payees, immediate and recurring payments.
insert into private.ledger_accounts(id,class,normal_side,currency,system_code)
values(gen_random_uuid(),'liability','credit','USD','SIMULATED_BILLER_CLEARING_USD') on conflict(system_code) do nothing;
insert into private.account_balances(ledger_account_id)
select id from private.ledger_accounts where system_code='SIMULATED_BILLER_CLEARING_USD' on conflict do nothing;

create or replace function public.create_current_payee(p_name text,p_synthetic_reference text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid();v_customer uuid;v_id uuid;v_name text:=btrim(p_name);v_reference text:=upper(btrim(p_synthetic_reference));
begin
 if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
 if char_length(v_name) not between 1 and 120 or v_reference!~'^SIM-[A-Z0-9-]{8,40}$' then raise exception 'Invalid payee' using errcode='22023';end if;
 select id into v_customer from public.customers where auth_user_id=v_user and verification_status='verified' and account_status='active';if v_customer is null then raise exception 'Customer unavailable' using errcode='42501';end if;
 insert into public.payees(customer_id,name,synthetic_reference) values(v_customer,v_name,v_reference) returning id into v_id;
 insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(v_user,'customer','payee.created','payee',v_id,gen_random_uuid());
 return v_id;
end;$$;

create or replace function public.archive_current_payee(p_payee_id uuid)
returns void language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid();v_changed uuid;
begin
 if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
 update public.payees p set archived_at=now() from public.customers c where p.id=p_payee_id and p.customer_id=c.id and c.auth_user_id=v_user and p.archived_at is null returning p.id into v_changed;
 if v_changed is null then raise exception 'Payee unavailable' using errcode='42501';end if;
 insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(v_user,'customer','payee.archived','payee',v_changed,gen_random_uuid());
end;$$;

create or replace function public.execute_current_payment(p_account_id uuid,p_payee_id uuid,p_amount_minor bigint,p_idempotency_key text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid();v_customer public.customers%rowtype;v_account public.accounts%rowtype;v_payee public.payees%rowtype;v_source_ledger uuid;v_clearing_ledger uuid;v_hash text;v_journal uuid;v_payment uuid;
begin
 if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
 if p_amount_minor not between 1 and 100000000 then raise exception 'Invalid payment' using errcode='22023';end if;
 select * into v_customer from public.customers where auth_user_id=v_user and verification_status='verified' and account_status='active';if not found then raise exception 'Customer unavailable' using errcode='42501';end if;
 select * into v_account from public.accounts where id=p_account_id and customer_id=v_customer.id and status='active';if not found then raise exception 'Account unavailable' using errcode='42501';end if;
 select * into v_payee from public.payees where id=p_payee_id and customer_id=v_customer.id and archived_at is null;if not found then raise exception 'Payee unavailable' using errcode='42501';end if;
 select id into v_source_ledger from private.ledger_accounts where account_id=v_account.id;select id into v_clearing_ledger from private.ledger_accounts where system_code='SIMULATED_BILLER_CLEARING_USD';
 v_hash:=encode(extensions.digest(concat_ws('|',v_account.id,v_payee.id,p_amount_minor,v_account.currency),'sha256'),'hex');
 v_journal:=private.post_customer_debit_operation(v_user,'bill_payment',p_idempotency_key,v_hash,v_source_ledger,v_clearing_ledger,p_amount_minor,gen_random_uuid());
 select id into v_payment from public.payments where journal_id=v_journal;
 if v_payment is null then
  insert into public.payments(customer_id,account_id,payee_id,amount_minor,currency,status,journal_id) values(v_customer.id,v_account.id,v_payee.id,p_amount_minor,v_account.currency,'completed',v_journal) returning id into v_payment;
  insert into public.transactions(customer_id,account_id,operation_id,journal_id,type,direction,amount_minor,currency,description,category,status,posted_at) values(v_customer.id,v_account.id,gen_random_uuid(),v_journal,'bill_payment','debit',p_amount_minor,v_account.currency,'Bill payment to '||v_payee.name,'Bills','posted',now());
  insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(v_user,'customer','payment.completed','payment',v_payment,gen_random_uuid());
  insert into private.outbox_events(event_type,aggregate_type,aggregate_id,payload_version,dedupe_key) values('payment.completed','payment',v_payment,1,'payment.completed:'||v_payment);
 end if;
 return v_payment;
end;$$;

create or replace function public.schedule_current_payment(p_account_id uuid,p_payee_id uuid,p_amount_minor bigint,p_scheduled_at timestamptz,p_frequency text default null,p_local_time time default null,p_timezone text default null,p_end_at timestamptz default null,p_idempotency_key text default null)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid();v_customer public.customers%rowtype;v_account public.accounts%rowtype;v_hash text;v_request private.idempotency_requests%rowtype;v_schedule uuid;v_payment uuid;
begin
 if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
 if p_amount_minor not between 1 and 100000000 or p_scheduled_at<=now() then raise exception 'Invalid payment schedule' using errcode='22023';end if;
 if p_frequency is not null and (p_frequency not in('weekly','monthly') or p_local_time is null or p_timezone is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_timezone) or p_end_at is not null and p_end_at<p_scheduled_at) then raise exception 'Invalid recurrence' using errcode='22023';end if;
 select * into v_customer from public.customers where auth_user_id=v_user and verification_status='verified' and account_status='active';if not found then raise exception 'Customer unavailable' using errcode='42501';end if;
 select * into v_account from public.accounts where id=p_account_id and customer_id=v_customer.id and status='active';if not found then raise exception 'Account unavailable' using errcode='42501';end if;
 if not exists(select 1 from public.payees where id=p_payee_id and customer_id=v_customer.id and archived_at is null) then raise exception 'Payee unavailable' using errcode='42501';end if;
 v_hash:=encode(extensions.digest(concat_ws('|',v_account.id,p_payee_id,p_amount_minor,p_scheduled_at,coalesce(p_frequency,''),coalesce(p_timezone,''),coalesce(p_end_at::text,'')),'sha256'),'hex');
 insert into private.idempotency_requests(actor_id,operation,key,payload_hash,state) values(v_user,'schedule_payment',p_idempotency_key,v_hash,'processing') on conflict(actor_id,operation,key) do nothing;
 select * into v_request from private.idempotency_requests where actor_id=v_user and operation='schedule_payment' and key=p_idempotency_key for update;
 if v_request.payload_hash<>v_hash then raise exception 'Idempotency payload mismatch' using errcode='23505';end if;if v_request.state='succeeded' then return v_request.result_id;end if;
 if p_frequency is not null then
  insert into private.recurring_schedules(customer_id,kind,source_account_id,payee_id,amount_minor,currency,frequency,local_time,timezone,next_run_at,end_at,status,requested_day)
  values(v_customer.id,'payment',v_account.id,p_payee_id,p_amount_minor,v_account.currency,p_frequency,p_local_time,p_timezone,p_scheduled_at,p_end_at,'active',extract(day from p_scheduled_at at time zone p_timezone)::smallint) returning id into v_schedule;
 end if;
 insert into public.payments(customer_id,account_id,payee_id,amount_minor,currency,scheduled_at,status,schedule_id) values(v_customer.id,v_account.id,p_payee_id,p_amount_minor,v_account.currency,p_scheduled_at,'scheduled',v_schedule) returning id into v_payment;
 update private.idempotency_requests set state='succeeded',result_type='payment',result_id=v_payment where id=v_request.id;
 insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(v_user,'customer','payment.scheduled','payment',v_payment,gen_random_uuid());
 return v_payment;
end;$$;

create or replace function private.process_due_payments(p_limit integer default 25)
returns table(payment_id uuid,result_status text) language plpgsql security definer set search_path='' as $$
declare v_payment public.payments%rowtype;v_customer public.customers%rowtype;v_account public.accounts%rowtype;v_payee public.payees%rowtype;v_source_ledger uuid;v_clearing_ledger uuid;v_hash text;v_journal uuid;v_next timestamptz;v_schedule private.recurring_schedules%rowtype;
begin
 if p_limit not between 1 and 100 then raise exception 'Invalid worker limit' using errcode='22023';end if;
 for v_payment in select * from public.payments where status='scheduled' and scheduled_at<=now() order by scheduled_at,id for update skip locked limit p_limit loop
  begin
   select * into v_customer from public.customers where id=v_payment.customer_id and verification_status='verified' and account_status='active';
   select * into v_account from public.accounts where id=v_payment.account_id and customer_id=v_payment.customer_id and status='active';
   select * into v_payee from public.payees where id=v_payment.payee_id and customer_id=v_payment.customer_id and archived_at is null;
   if v_customer.id is null or v_account.id is null or v_payee.id is null then raise exception 'mandate_unavailable';end if;
   select id into v_source_ledger from private.ledger_accounts where account_id=v_account.id;select id into v_clearing_ledger from private.ledger_accounts where system_code='SIMULATED_BILLER_CLEARING_USD';
   v_hash:=encode(extensions.digest(concat_ws('|',v_payment.id,v_payment.amount_minor,v_payment.currency),'sha256'),'hex');
   v_journal:=private.post_customer_debit_operation(v_customer.auth_user_id,'scheduled_bill_payment','scheduled:'||v_payment.id,v_hash,v_source_ledger,v_clearing_ledger,v_payment.amount_minor,gen_random_uuid());
   insert into public.transactions(customer_id,account_id,operation_id,journal_id,type,direction,amount_minor,currency,description,category,status,posted_at) values(v_customer.id,v_account.id,gen_random_uuid(),v_journal,'bill_payment','debit',v_payment.amount_minor,v_payment.currency,'Scheduled bill payment to '||v_payee.name,'Bills','posted',now());
   update public.payments set status='completed',journal_id=v_journal where id=v_payment.id;
   insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(v_customer.auth_user_id,'scheduler','payment.completed','payment',v_payment.id,gen_random_uuid());
   insert into private.outbox_events(event_type,aggregate_type,aggregate_id,payload_version,dedupe_key) values('payment.completed','payment',v_payment.id,1,'payment.completed:'||v_payment.id) on conflict(dedupe_key) do nothing;
   if v_payment.schedule_id is not null then
    select * into v_schedule from private.recurring_schedules where id=v_payment.schedule_id for update;
    v_next:=private.next_transfer_run(v_schedule.next_run_at,v_schedule.frequency,v_schedule.timezone,v_schedule.local_time,v_schedule.requested_day);
    if v_schedule.end_at is not null and v_next>v_schedule.end_at then update private.recurring_schedules set status='completed',next_run_at=v_next where id=v_schedule.id;
    else update private.recurring_schedules set next_run_at=v_next where id=v_schedule.id;insert into public.payments(customer_id,account_id,payee_id,amount_minor,currency,scheduled_at,status,schedule_id) values(v_payment.customer_id,v_payment.account_id,v_payment.payee_id,v_payment.amount_minor,v_payment.currency,v_next,'scheduled',v_schedule.id);end if;
   end if;
   payment_id:=v_payment.id;result_status:='completed';return next;
  exception when others then update public.payments set status='failed' where id=v_payment.id;payment_id:=v_payment.id;result_status:='failed';return next;end;
 end loop;
end;$$;

create or replace function public.cancel_current_scheduled_payment(p_payment_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_changed uuid;v_schedule uuid;
begin
 if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
 update public.payments p set status='cancelled' from public.customers c where p.id=p_payment_id and p.customer_id=c.id and c.auth_user_id=v_user and p.status='scheduled' returning p.id,p.schedule_id into v_changed,v_schedule;
 if v_changed is null then raise exception 'Payment unavailable' using errcode='42501';end if;
 if v_schedule is not null then update private.recurring_schedules set status='cancelled' where id=v_schedule and customer_id in(select id from public.customers where auth_user_id=v_user);update public.payments set status='cancelled' where schedule_id=v_schedule and status='scheduled';end if;
 insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(v_user,'customer','payment.cancelled','payment',v_changed,gen_random_uuid());
end;$$;

create or replace function public.process_due_payment_jobs(p_limit integer default 25)
returns table(payment_id uuid,result_status text) language plpgsql security definer set search_path='' as $$
begin if auth.role()<>'service_role' then raise exception 'Worker role required' using errcode='42501';end if;return query select * from private.process_due_payments(p_limit);end;$$;

revoke all on function private.process_due_payments(integer) from public,anon,authenticated,service_role;
grant execute on function private.process_due_payments(integer) to service_role;
revoke all on function public.create_current_payee(text,text),public.archive_current_payee(uuid),public.execute_current_payment(uuid,uuid,bigint,text),public.schedule_current_payment(uuid,uuid,bigint,timestamptz,text,time,text,timestamptz,text),public.cancel_current_scheduled_payment(uuid),public.process_due_payment_jobs(integer) from public,anon,authenticated,service_role;
grant execute on function public.create_current_payee(text,text),public.archive_current_payee(uuid),public.execute_current_payment(uuid,uuid,bigint,text),public.schedule_current_payment(uuid,uuid,bigint,timestamptz,text,time,text,timestamptz,text),public.cancel_current_scheduled_payment(uuid) to authenticated;
grant execute on function public.process_due_payment_jobs(integer) to service_role;
