-- Reject unknown/foreign cards explicitly and complete card-operation event evidence.
create or replace function public.update_current_card_status(p_card_id uuid,p_action text) returns void language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_old text;v_new text;
begin
 if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
 select ca.status into v_old from public.cards ca join public.customers c on c.id=ca.customer_id where ca.id=p_card_id and c.auth_user_id=v_user for update of ca;
 if not found then raise exception 'Card unavailable' using errcode='42501';end if;
 v_new:=case p_action when 'lock' then 'locked' when 'unlock' then 'active' when 'lost' then 'lost' when 'stolen' then 'stolen' else null end;
 if v_new is null or (p_action='unlock' and v_old<>'locked') or (p_action<>'unlock' and v_old not in('active','locked')) then raise exception 'Card status transition denied' using errcode='23514';end if;
 update public.cards set status=v_new where id=p_card_id;
 insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(v_user,'customer','card.'||p_action,'card',p_card_id,gen_random_uuid());
end;$$;

create or replace function private.record_card_transaction_event() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='posted' and (tg_op='INSERT' or old.status is distinct from new.status) then
  insert into private.outbox_events(event_type,aggregate_type,aggregate_id,payload_version,dedupe_key) values('card_transaction.posted','card_transaction',new.id,1,'card_transaction.posted:'||new.id) on conflict(dedupe_key) do nothing;
  if new.kind='refund' then insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(auth.uid(),'customer','card.refund_posted','card_transaction',new.id,gen_random_uuid());end if;
 end if;return new;
end;$$;
create trigger record_card_transaction_event after insert or update of status on public.card_transactions for each row execute function private.record_card_transaction_event();

create or replace function private.record_card_payment_event() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.type='card_payment' and new.status='posted' then
  insert into private.outbox_events(event_type,aggregate_type,aggregate_id,payload_version,dedupe_key) values('card_payment.posted','transaction',new.id,1,'card_payment.posted:'||new.id) on conflict(dedupe_key) do nothing;
  insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(auth.uid(),'customer','card.payment_posted','transaction',new.id,gen_random_uuid());
 end if;return new;
end;$$;
create trigger record_card_payment_event after insert on public.transactions for each row execute function private.record_card_payment_event();

revoke all on function private.record_card_transaction_event(),private.record_card_payment_event() from public,anon,authenticated,service_role;
