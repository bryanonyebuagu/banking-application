-- Milestone A scheduled and recurring transfers with a service-only worker.
alter table private.recurring_schedules add column requested_day smallint check(requested_day between 1 and 31);

create or replace function private.next_transfer_run(p_current timestamptz,p_frequency text,p_timezone text,p_local_time time,p_requested_day smallint)
returns timestamptz language plpgsql stable set search_path='' as $$
declare v_local timestamp:=p_current at time zone p_timezone;v_first date;v_last date;v_target date;
begin
 if p_frequency='weekly' then return ((v_local::date+7)+p_local_time) at time zone p_timezone;end if;
 v_first:=(date_trunc('month',v_local)+interval '1 month')::date;v_last:=(v_first+interval '1 month-1 day')::date;v_target:=v_first+(least(p_requested_day,extract(day from v_last)::int)-1);return (v_target+p_local_time) at time zone p_timezone;
end;$$;

create or replace function public.schedule_current_transfer(
 p_source_account_id uuid,p_destination_account_id uuid default null,p_recipient_id uuid default null,
 p_amount_minor bigint default null,p_memo text default null,p_scheduled_at timestamptz default null,
 p_frequency text default null,p_local_time time default null,p_timezone text default null,p_end_at timestamptz default null,p_idempotency_key text default null
) returns uuid language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid();v_customer public.customers%rowtype;v_source public.accounts%rowtype;v_recipient public.transfer_recipients%rowtype;v_hash text;v_request private.idempotency_requests%rowtype;v_schedule uuid;v_transfer uuid;v_memo text:=nullif(btrim(p_memo),'');
begin
 if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
 if num_nonnulls(p_destination_account_id,p_recipient_id)<>1 or p_amount_minor not between 1 and 100000000 or p_scheduled_at<=now() or char_length(coalesce(v_memo,''))>500 then raise exception 'Invalid transfer schedule' using errcode='22023';end if;
 if p_frequency is not null and (p_frequency not in('weekly','monthly') or p_local_time is null or p_timezone is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_timezone) or p_end_at is not null and p_end_at<p_scheduled_at) then raise exception 'Invalid recurrence' using errcode='22023';end if;
 select * into v_customer from public.customers where auth_user_id=v_user and verification_status='verified' and account_status='active';if not found then raise exception 'Customer unavailable' using errcode='42501';end if;
 select * into v_source from public.accounts where id=p_source_account_id and customer_id=v_customer.id and status='active';if not found then raise exception 'Source unavailable' using errcode='42501';end if;
 if p_destination_account_id is not null then if not exists(select 1 from public.accounts where id=p_destination_account_id and customer_id=v_customer.id and status='active' and id<>v_source.id) then raise exception 'Destination unavailable' using errcode='42501';end if;
 else select * into v_recipient from public.transfer_recipients where id=p_recipient_id and customer_id=v_customer.id and status='active';if not found then raise exception 'Recipient unavailable' using errcode='42501';end if;end if;
 v_hash:=encode(extensions.digest(concat_ws('|',v_source.id,coalesce(p_destination_account_id,p_recipient_id),p_amount_minor,coalesce(v_memo,''),p_scheduled_at,coalesce(p_frequency,''),coalesce(p_timezone,''),coalesce(p_end_at::text,'')),'sha256'),'hex');
 insert into private.idempotency_requests(actor_id,operation,key,payload_hash,state) values(v_user,'schedule_transfer',p_idempotency_key,v_hash,'processing') on conflict(actor_id,operation,key) do nothing;
 select * into v_request from private.idempotency_requests where actor_id=v_user and operation='schedule_transfer' and key=p_idempotency_key for update;if v_request.payload_hash<>v_hash then raise exception 'Idempotency payload mismatch' using errcode='23505';end if;if v_request.state='succeeded' then return v_request.result_id;end if;
 if p_frequency is not null then
  insert into private.recurring_schedules(customer_id,kind,source_account_id,destination_account_id,recipient_id,amount_minor,currency,frequency,local_time,timezone,next_run_at,end_at,status,requested_day)
  values(v_customer.id,'transfer',v_source.id,p_destination_account_id,p_recipient_id,p_amount_minor,v_source.currency,p_frequency,p_local_time,p_timezone,p_scheduled_at,p_end_at,'active',extract(day from p_scheduled_at at time zone p_timezone)::smallint) returning id into v_schedule;
 end if;
 insert into public.transfers(customer_id,source_account_id,destination_account_id,recipient_id,amount_minor,currency,memo,scheduled_at,status,schedule_id)
 values(v_customer.id,v_source.id,p_destination_account_id,p_recipient_id,p_amount_minor,v_source.currency,v_memo,p_scheduled_at,'scheduled',v_schedule) returning id into v_transfer;
 update private.idempotency_requests set state='succeeded',result_type='transfer',result_id=v_transfer where id=v_request.id;
 insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(v_user,'customer','transfer.scheduled','transfer',v_transfer,gen_random_uuid());return v_transfer;
end;$$;

create or replace function private.process_due_transfers(p_limit integer default 25)
returns table(transfer_id uuid,result_status text) language plpgsql security definer set search_path='' as $$
declare v_transfer public.transfers%rowtype;v_customer public.customers%rowtype;v_source public.accounts%rowtype;v_destination public.accounts%rowtype;v_recipient public.transfer_recipients%rowtype;v_source_ledger uuid;v_destination_ledger uuid;v_hash text;v_journal uuid;v_next timestamptz;v_schedule private.recurring_schedules%rowtype;
begin
 if p_limit not between 1 and 100 then raise exception 'Invalid worker limit' using errcode='22023';end if;
 for v_transfer in select * from public.transfers where status='scheduled' and scheduled_at<=now() order by scheduled_at,id for update skip locked limit p_limit loop
  begin
   select * into v_customer from public.customers where id=v_transfer.customer_id and verification_status='verified' and account_status='active';select * into v_source from public.accounts where id=v_transfer.source_account_id and customer_id=v_transfer.customer_id and status='active';
   if v_customer.id is null or v_source.id is null then raise exception 'owner_unavailable';end if;
   if v_transfer.destination_account_id is not null then select * into v_destination from public.accounts where id=v_transfer.destination_account_id and status='active';else select * into v_recipient from public.transfer_recipients where id=v_transfer.recipient_id and status='active';select * into v_destination from public.accounts where synthetic_identifier=v_recipient.destination_token and status='active';end if;
   select id into v_source_ledger from private.ledger_accounts where account_id=v_source.id;if v_destination.id is not null then select id into v_destination_ledger from private.ledger_accounts where account_id=v_destination.id;else select id into v_destination_ledger from private.ledger_accounts where system_code='SIMULATED_EXTERNAL_CLEARING_USD';end if;
   v_hash:=encode(extensions.digest(concat_ws('|',v_transfer.id,v_transfer.amount_minor,v_transfer.currency),'sha256'),'hex');v_journal:=private.post_customer_debit_operation(v_customer.auth_user_id,'scheduled_transfer','scheduled:'||v_transfer.id,v_hash,v_source_ledger,v_destination_ledger,v_transfer.amount_minor,gen_random_uuid());
   insert into public.transactions(customer_id,account_id,operation_id,journal_id,type,direction,amount_minor,currency,description,category,status,posted_at) values(v_customer.id,v_source.id,gen_random_uuid(),v_journal,'transfer','debit',v_transfer.amount_minor,v_transfer.currency,'Scheduled transfer to '||coalesce(v_destination.nickname,v_recipient.label),'Transfers','posted',now());
   if v_destination.id is not null then insert into public.transactions(customer_id,account_id,operation_id,journal_id,type,direction,amount_minor,currency,description,category,status,posted_at) values(v_destination.customer_id,v_destination.id,gen_random_uuid(),v_journal,'transfer','credit',v_transfer.amount_minor,v_transfer.currency,'Scheduled transfer from '||v_source.nickname,'Transfers','posted',now());end if;
   update public.transfers set status='completed',journal_id=v_journal where id=v_transfer.id;insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(v_customer.auth_user_id,'scheduler','transfer.completed','transfer',v_transfer.id,gen_random_uuid());insert into private.outbox_events(event_type,aggregate_type,aggregate_id,payload_version,dedupe_key) values('transfer.completed','transfer',v_transfer.id,1,'transfer.completed:'||v_transfer.id) on conflict(dedupe_key) do nothing;
   if v_transfer.schedule_id is not null then select * into v_schedule from private.recurring_schedules where id=v_transfer.schedule_id for update;v_next:=private.next_transfer_run(v_schedule.next_run_at,v_schedule.frequency,v_schedule.timezone,v_schedule.local_time,v_schedule.requested_day);if v_schedule.end_at is not null and v_next>v_schedule.end_at then update private.recurring_schedules set status='completed',next_run_at=v_next where id=v_schedule.id;else update private.recurring_schedules set next_run_at=v_next where id=v_schedule.id;insert into public.transfers(customer_id,source_account_id,destination_account_id,recipient_id,amount_minor,currency,memo,scheduled_at,status,schedule_id) values(v_transfer.customer_id,v_transfer.source_account_id,v_transfer.destination_account_id,v_transfer.recipient_id,v_transfer.amount_minor,v_transfer.currency,v_transfer.memo,v_next,'scheduled',v_schedule.id);end if;end if;
   transfer_id:=v_transfer.id;result_status:='completed';return next;
  exception when others then update public.transfers set status='failed' where id=v_transfer.id;transfer_id:=v_transfer.id;result_status:='failed';return next;end;
 end loop;
end;$$;

create or replace function public.cancel_current_scheduled_transfer(p_transfer_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_changed uuid;v_schedule uuid;
begin if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;update public.transfers t set status='cancelled' from public.customers c where t.id=p_transfer_id and t.customer_id=c.id and c.auth_user_id=v_user and t.status='scheduled' returning t.id,t.schedule_id into v_changed,v_schedule;if v_changed is null then raise exception 'Transfer unavailable' using errcode='42501';end if;if v_schedule is not null then update private.recurring_schedules set status='cancelled' where id=v_schedule and customer_id in(select id from public.customers where auth_user_id=v_user);update public.transfers set status='cancelled' where schedule_id=v_schedule and status='scheduled';end if;end;$$;

create or replace function public.process_due_transfer_jobs(p_limit integer default 25)
returns table(transfer_id uuid,result_status text) language plpgsql security definer set search_path='' as $$
begin if auth.role()<>'service_role' then raise exception 'Worker role required' using errcode='42501';end if;return query select * from private.process_due_transfers(p_limit);end;$$;

revoke all on function private.next_transfer_run(timestamptz,text,text,time,smallint),private.process_due_transfers(integer) from public,anon,authenticated,service_role;
grant execute on function private.process_due_transfers(integer) to service_role;
revoke all on function public.schedule_current_transfer(uuid,uuid,uuid,bigint,text,timestamptz,text,time,text,timestamptz,text),public.cancel_current_scheduled_transfer(uuid),public.process_due_transfer_jobs(integer) from public,anon,authenticated,service_role;
grant execute on function public.schedule_current_transfer(uuid,uuid,uuid,bigint,text,timestamptz,text,time,text,timestamptz,text),public.cancel_current_scheduled_transfer(uuid) to authenticated;
grant execute on function public.process_due_transfer_jobs(integer) to service_role;
