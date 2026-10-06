-- Milestone B owner-scoped outbox notification projection and preferences.
create or replace function public.sync_current_notifications() returns integer language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_customer uuid;v_event private.outbox_events%rowtype;v_owned boolean;v_title text;v_count integer:=0;
begin
 if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
 select id into v_customer from public.customers where auth_user_id=v_user;if v_customer is null then return 0;end if;
 for v_event in select * from private.outbox_events order by created_at desc limit 500 loop
  v_owned:=case v_event.aggregate_type
   when 'transaction' then exists(select 1 from public.transactions where id=v_event.aggregate_id and customer_id=v_customer)
   when 'transfer' then exists(select 1 from public.transfers where id=v_event.aggregate_id and customer_id=v_customer)
   when 'payment' then exists(select 1 from public.payments where id=v_event.aggregate_id and customer_id=v_customer)
   when 'card_transaction' then exists(select 1 from public.card_transactions where id=v_event.aggregate_id and customer_id=v_customer)
   when 'check_deposit' then exists(select 1 from public.check_deposits where id=v_event.aggregate_id and customer_id=v_customer)
   when 'statement' then exists(select 1 from public.statements where id=v_event.aggregate_id and customer_id=v_customer)
   when 'loan' then exists(select 1 from public.loans where id=v_event.aggregate_id and customer_id=v_customer)
   when 'loan_payment' then exists(select 1 from public.loan_payments where id=v_event.aggregate_id and customer_id=v_customer)
   when 'mortgage' then exists(select 1 from public.mortgages where id=v_event.aggregate_id and customer_id=v_customer)
   else false end;
  if v_owned and coalesce((select enabled from public.notification_preferences where customer_id=v_customer and type=v_event.event_type and channel='in_app'),true) then
   v_title:=initcap(replace(replace(v_event.event_type,'.',' '),'_',' '));
   insert into public.notifications(customer_id,event_id,type,title,body,resource_type,resource_id)
   values(v_customer,v_event.id,v_event.event_type,v_title,'Your simulated banking activity was updated.',v_event.aggregate_type,v_event.aggregate_id)
   on conflict(customer_id,event_id,type) do nothing;
   if found then v_count:=v_count+1;end if;
  end if;
 end loop;return v_count;
end;$$;

create or replace function public.mark_current_notification_read(p_notification_id uuid,p_read boolean default true)
returns void language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_changed uuid;begin
 if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
 update public.notifications n set read_at=case when p_read then now() else null end from public.customers c where n.id=p_notification_id and n.customer_id=c.id and c.auth_user_id=v_user returning n.id into v_changed;
 if v_changed is null then raise exception 'Notification unavailable' using errcode='42501';end if;
end;$$;

create or replace function public.mark_all_current_notifications_read() returns integer language plpgsql security definer set search_path='' as $$
declare v_count integer;begin
 if auth.uid() is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
 update public.notifications n set read_at=now() from public.customers c where n.customer_id=c.id and c.auth_user_id=auth.uid() and n.read_at is null;get diagnostics v_count=row_count;return v_count;
end;$$;

create or replace function public.set_current_notification_preference(p_type text,p_enabled boolean)
returns void language plpgsql security definer set search_path='' as $$
declare v_customer uuid;begin
 if auth.uid() is null or not private.session_is_active() or char_length(trim(p_type)) not between 1 and 100 then raise exception 'Invalid preference' using errcode='22023';end if;
 select id into v_customer from public.customers where auth_user_id=auth.uid();if v_customer is null then raise exception 'Customer unavailable' using errcode='42501';end if;
 insert into public.notification_preferences(customer_id,type,channel,enabled) values(v_customer,trim(p_type),'in_app',p_enabled) on conflict(customer_id,type,channel) do update set enabled=excluded.enabled;
end;$$;

revoke all on function public.sync_current_notifications(),public.mark_current_notification_read(uuid,boolean),public.mark_all_current_notifications_read(),public.set_current_notification_preference(text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.sync_current_notifications(),public.mark_current_notification_read(uuid,boolean),public.mark_all_current_notifications_read(),public.set_current_notification_preference(text,boolean) to authenticated;
