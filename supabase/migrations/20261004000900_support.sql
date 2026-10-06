-- Milestone C owner-scoped secure support tickets and customer-visible messages.
create or replace function public.create_current_support_ticket(p_subject text,p_body text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_customer_id uuid;v_ticket uuid:=gen_random_uuid();
begin
  if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
  if char_length(btrim(p_subject)) not between 3 and 200 or char_length(btrim(p_body)) not between 1 and 10000 then raise exception 'Invalid support request' using errcode='22023';end if;
  select id into v_customer_id from public.customers where auth_user_id=v_user and account_status<>'closed';
  if v_customer_id is null then raise exception 'Customer unavailable' using errcode='42501';end if;
  insert into public.support_tickets(id,customer_id,subject,status) values(v_ticket,v_customer_id,btrim(p_subject),'open');
  insert into public.support_messages(customer_id,ticket_id,author_id,body,visibility) values(v_customer_id,v_ticket,v_user,btrim(p_body),'customer');
  insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(v_user,'customer','support.ticket_created','support_ticket',v_ticket,gen_random_uuid());
  insert into private.outbox_events(event_type,aggregate_type,aggregate_id,payload_version,dedupe_key) values('support.ticket_created','support_ticket',v_ticket,1,'support.ticket_created:'||v_ticket);
  return v_ticket;
end;$$;

create or replace function public.reply_current_support_ticket(p_ticket_id uuid,p_body text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_ticket public.support_tickets%rowtype;v_message uuid;
begin
  if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
  if char_length(btrim(p_body)) not between 1 and 10000 then raise exception 'Invalid message' using errcode='22023';end if;
  select t.* into v_ticket from public.support_tickets t join public.customers c on c.id=t.customer_id where t.id=p_ticket_id and c.auth_user_id=v_user for update of t;
  if not found or v_ticket.status in('resolved','closed') then raise exception 'Ticket unavailable' using errcode='42501';end if;
  insert into public.support_messages(customer_id,ticket_id,author_id,body,visibility) values(v_ticket.customer_id,v_ticket.id,v_user,btrim(p_body),'customer') returning id into v_message;
  if v_ticket.status='waiting_for_customer' then update public.support_tickets set status='in_progress' where id=v_ticket.id;end if;
  insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(v_user,'customer','support.customer_replied','support_ticket',v_ticket.id,gen_random_uuid());
  return v_message;
end;$$;

create or replace function public.close_current_support_ticket(p_ticket_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_changed uuid;
begin
  if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
  update public.support_tickets t set status='closed' from public.customers c where t.id=p_ticket_id and t.customer_id=c.id and c.auth_user_id=v_user and t.status<>'closed' returning t.id into v_changed;
  if v_changed is null then raise exception 'Ticket unavailable' using errcode='42501';end if;
  insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(v_user,'customer','support.ticket_closed','support_ticket',p_ticket_id,gen_random_uuid());
end;$$;

revoke all on function public.create_current_support_ticket(text,text),public.reply_current_support_ticket(uuid,text),public.close_current_support_ticket(uuid) from public,anon,authenticated,service_role;
grant execute on function public.create_current_support_ticket(text,text),public.reply_current_support_ticket(uuid,text),public.close_current_support_ticket(uuid) to authenticated;
