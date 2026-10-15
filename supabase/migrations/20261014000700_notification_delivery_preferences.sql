-- Owner-scoped email and SMS delivery preferences. Delivery remains provider-confirmed.
alter table public.notification_preferences drop constraint if exists notification_preferences_channel_check;
alter table public.notification_preferences add constraint notification_preferences_channel_check check(channel in ('in_app','email','sms'));

create or replace function public.set_current_notification_delivery_preference(p_type text,p_channel text,p_enabled boolean)
returns void language plpgsql security definer set search_path='' as $$
declare v_customer uuid;v_type text:=trim(p_type);v_channel text:=trim(p_channel);
begin
 if auth.uid() is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
 if v_type not in('incoming_transfers','outgoing_transfers','account_activity','security_alerts','login_notifications','banking_updates') or v_channel not in('email','sms') then raise exception 'Invalid preference' using errcode='22023';end if;
 if v_type in('security_alerts','login_notifications') and v_channel='email' and not p_enabled then raise exception 'Mandatory security email' using errcode='22023';end if;
 select id into v_customer from public.customers where auth_user_id=auth.uid() and account_status<>'closed';
 if v_customer is null then raise exception 'Customer unavailable' using errcode='42501';end if;
 insert into public.notification_preferences(customer_id,type,channel,enabled) values(v_customer,v_type,v_channel,p_enabled)
 on conflict(customer_id,type,channel) do update set enabled=excluded.enabled;
end;$$;

revoke all on function public.set_current_notification_delivery_preference(text,text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.set_current_notification_delivery_preference(text,text,boolean) to authenticated;
