-- Milestone D separate MFA-gated staff administration and explicit capability matrix.
alter table private.staff_assignments add column bootstrap_grant boolean not null default false;
alter table private.staff_assignments drop constraint if exists staff_assignments_check;
alter table private.staff_assignments add constraint staff_assignments_grantor_check check(auth_user_id<>granted_by or bootstrap_grant);

insert into private.staff_permissions(role_id,action,resource_type,scope)
select r.id,p.action,p.resource_type,p.scope from private.staff_roles r join (values
 ('support_agent','read','support_ticket','assigned'),('support_agent','claim','support_ticket','all'),('support_agent','reply','support_ticket','assigned'),('support_agent','status','support_ticket','assigned'),
 ('fraud_analyst','read','customer','all'),('fraud_analyst','read','security_event','all'),('fraud_analyst','review','verification','all'),('fraud_analyst','restrict','account','all'),
 ('operations','read','customer','all'),('operations','read','account','all'),('operations','read','transaction','all'),('operations','read','transfer','all'),
 ('administrator','read','customer','all'),('administrator','read','account','all'),('administrator','read','transaction','all'),('administrator','read','transfer','all'),('administrator','read','support_ticket','all'),('administrator','claim','support_ticket','all'),('administrator','reply','support_ticket','all'),('administrator','status','support_ticket','all'),('administrator','read','security_event','all'),('administrator','review','verification','all'),('administrator','restrict','account','all'),('administrator','read','audit_log','all'),('administrator','provision','staff','all')
) p(role_name,action,resource_type,scope) on p.role_name=r.name on conflict do nothing;

create or replace function private.staff_has_permission(p_action text,p_resource text,p_scope text default null)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.staff_assignments a join private.staff_roles r on r.id=a.role_id join private.staff_permissions p on p.role_id=r.id where a.auth_user_id=auth.uid() and a.revoked_at is null and p.action=p_action and p.resource_type=p_resource and (p_scope is null or p.scope=p_scope))
$$;
revoke all on function private.staff_has_permission(text,text,text) from public,anon,authenticated,service_role;

create or replace function private.require_staff_permission(p_action text,p_resource text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'aal','')<>'aal2' or not private.staff_has_permission(p_action,p_resource,null) then raise exception 'Staff permission denied' using errcode='42501';end if;
end;$$;
revoke all on function private.require_staff_permission(text,text) from public,anon,authenticated,service_role;

create or replace function private.bootstrap_first_administrator(p_auth_user_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_role uuid;v_id uuid;
begin
 if exists(select 1 from private.staff_assignments where revoked_at is null) or not exists(select 1 from auth.users where id=p_auth_user_id) then raise exception 'Bootstrap unavailable' using errcode='42501';end if;
 select id into v_role from private.staff_roles where name='administrator';
 insert into private.staff_assignments(auth_user_id,role_id,granted_by,bootstrap_grant) values(p_auth_user_id,v_role,p_auth_user_id,true) returning id into v_id;
 insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,reason_code,correlation_id) values(p_auth_user_id,'bootstrap','staff.initial_administrator','staff_assignment',v_id,'INITIAL_BOOTSTRAP',gen_random_uuid());
 return v_id;
end;$$;
revoke all on function private.bootstrap_first_administrator(uuid) from public,anon,authenticated,service_role;

create or replace function public.staff_get_context() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_roles jsonb;
begin
 if auth.uid() is null or coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'aal','')<>'aal2' then raise exception 'Staff MFA required' using errcode='42501';end if;
 select jsonb_agg(r.name order by r.name) into v_roles from private.staff_assignments a join private.staff_roles r on r.id=a.role_id where a.auth_user_id=auth.uid() and a.revoked_at is null;
 if v_roles is null then raise exception 'Staff access denied' using errcode='42501';end if;
 return jsonb_build_object('roles',v_roles,'auth_user_id',auth.uid());
end;$$;

create or replace function public.staff_search_customers(p_query text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare v_result jsonb;
begin
 perform private.require_staff_permission('read','customer');
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_result from (select c.id,c.first_name,c.last_name,c.contact_email,c.verification_status,c.account_status,c.customer_since,c.created_at from public.customers c where btrim(coalesce(p_query,''))='' or c.contact_email ilike '%'||btrim(p_query)||'%' or c.first_name ilike '%'||btrim(p_query)||'%' or c.last_name ilike '%'||btrim(p_query)||'%' order by c.created_at desc limit 100) x;
 return v_result;
end;$$;

create or replace function public.staff_get_customer_snapshot(p_customer_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_customer jsonb;v_accounts jsonb;v_transactions jsonb;v_transfers jsonb;v_verifications jsonb;v_security jsonb;
begin
 perform private.require_staff_permission('read','customer');
 select to_jsonb(c) - 'auth_user_id' into v_customer from public.customers c where c.id=p_customer_id;
 if v_customer is null then raise exception 'Customer unavailable' using errcode='22023';end if;
 select coalesce(jsonb_agg(to_jsonb(a) order by a.opened_at desc),'[]'::jsonb) into v_accounts from public.accounts a where a.customer_id=p_customer_id;
 select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc),'[]'::jsonb) into v_transactions from (select id,account_id,type,direction,amount_minor,currency,description,category,status,posted_at,created_at from public.transactions where customer_id=p_customer_id order by created_at desc limit 100) t;
 select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc),'[]'::jsonb) into v_transfers from (select id,source_account_id,destination_account_id,recipient_id,amount_minor,currency,memo,scheduled_at,status,created_at from public.transfers where customer_id=p_customer_id order by created_at desc limit 100) t;
 select coalesce(jsonb_agg(to_jsonb(v) order by v.created_at desc),'[]'::jsonb) into v_verifications from (select id,provider,synthetic_fixture_id,status,reason_code,created_at,updated_at from public.verification_records where customer_id=p_customer_id order by created_at desc) v;
 if private.staff_has_permission('read','security_event',null) then select coalesce(jsonb_agg(to_jsonb(s) order by s.occurred_at desc),'[]'::jsonb) into v_security from (select id,event_type,outcome,reason_code,occurred_at from public.security_events where auth_user_id=(select auth_user_id from public.customers where id=p_customer_id) order by occurred_at desc limit 100) s;else v_security:='[]'::jsonb;end if;
 return jsonb_build_object('customer',v_customer,'accounts',v_accounts,'transactions',v_transactions,'transfers',v_transfers,'verifications',v_verifications,'security_events',v_security);
end;$$;

create or replace function public.staff_list_support_tickets() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_result jsonb;v_all boolean;
begin
 if not private.staff_has_permission('read','support_ticket',null) then raise exception 'Staff permission denied' using errcode='42501';end if;
 if coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'aal','')<>'aal2' then raise exception 'Staff MFA required' using errcode='42501';end if;
 v_all:=private.staff_has_permission('read','support_ticket','all');
 select coalesce(jsonb_agg(to_jsonb(x) order by x.updated_at desc),'[]'::jsonb) into v_result from (select t.id,t.customer_id,t.assigned_staff_id,t.subject,t.status,t.created_at,t.updated_at,c.first_name,c.last_name,c.contact_email from public.support_tickets t join public.customers c on c.id=t.customer_id where v_all or t.assigned_staff_id=auth.uid() or t.assigned_staff_id is null order by t.updated_at desc limit 200) x;
 return v_result;
end;$$;

create or replace function public.staff_get_support_ticket(p_ticket_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_ticket public.support_tickets%rowtype;v_all boolean;v_messages jsonb;
begin
 perform private.require_staff_permission('read','support_ticket');v_all:=private.staff_has_permission('read','support_ticket','all');select * into v_ticket from public.support_tickets where id=p_ticket_id;
 if not found or (not v_all and v_ticket.assigned_staff_id is distinct from auth.uid() and v_ticket.assigned_staff_id is not null) then raise exception 'Ticket unavailable' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at),'[]'::jsonb) into v_messages from (select id,author_id,body,visibility,created_at from public.support_messages where ticket_id=p_ticket_id order by created_at) m;
 return jsonb_build_object('ticket',to_jsonb(v_ticket),'messages',v_messages);
end;$$;

create or replace function public.staff_claim_support_ticket(p_ticket_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin perform private.require_staff_permission('claim','support_ticket');update public.support_tickets set assigned_staff_id=auth.uid(),status=case when status='open' then 'in_progress' else status end where id=p_ticket_id and assigned_staff_id is null;if not found then raise exception 'Ticket unavailable' using errcode='42501';end if;insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(auth.uid(),'staff','support.ticket_claimed','support_ticket',p_ticket_id,gen_random_uuid());end;$$;

create or replace function public.staff_reply_support_ticket(p_ticket_id uuid,p_body text,p_visibility text,p_status text) returns uuid language plpgsql security definer set search_path='' as $$
declare v_ticket public.support_tickets%rowtype;v_all boolean;v_id uuid;
begin
 perform private.require_staff_permission('reply','support_ticket');v_all:=private.staff_has_permission('reply','support_ticket','all');if char_length(btrim(p_body)) not between 1 and 10000 or p_visibility not in('customer','internal') or p_status not in('in_progress','waiting_for_customer','resolved') then raise exception 'Invalid reply' using errcode='22023';end if;
 select * into v_ticket from public.support_tickets where id=p_ticket_id for update;if not found or (not v_all and v_ticket.assigned_staff_id is distinct from auth.uid()) or v_ticket.status='closed' then raise exception 'Ticket unavailable' using errcode='42501';end if;
 insert into public.support_messages(customer_id,ticket_id,author_id,body,visibility) values(v_ticket.customer_id,p_ticket_id,auth.uid(),btrim(p_body),p_visibility) returning id into v_id;update public.support_tickets set status=p_status where id=p_ticket_id;
 insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,reason_code,correlation_id) values(auth.uid(),'staff','support.staff_replied','support_ticket',p_ticket_id,upper(p_visibility),gen_random_uuid());return v_id;
end;$$;

create or replace function public.staff_set_account_restriction(p_account_id uuid,p_status text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare v_customer uuid;
begin perform private.require_staff_permission('restrict','account');if p_status not in('active','frozen','restricted') or char_length(btrim(p_reason)) not between 3 and 80 then raise exception 'Invalid restriction' using errcode='22023';end if;update public.accounts set status=p_status where id=p_account_id and status<>'closed' returning customer_id into v_customer;if v_customer is null then raise exception 'Account unavailable' using errcode='22023';end if;insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,reason_code,correlation_id) values(auth.uid(),'staff','account.status_changed','account',p_account_id,upper(replace(btrim(p_reason),' ','_')),gen_random_uuid());end;$$;

create or replace function public.staff_review_verification(p_record_id uuid,p_status text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare v_customer uuid;
begin perform private.require_staff_permission('review','verification');if p_status not in('verified','failed','manual_review') or char_length(btrim(p_reason)) not between 3 and 80 then raise exception 'Invalid review' using errcode='22023';end if;update public.verification_records set status=p_status,reviewed_by=auth.uid(),reason_code=upper(replace(btrim(p_reason),' ','_')) where id=p_record_id returning customer_id into v_customer;if v_customer is null then raise exception 'Verification unavailable' using errcode='22023';end if;update public.customers set verification_status=p_status where id=v_customer;insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,reason_code,correlation_id) values(auth.uid(),'staff','verification.reviewed','verification_record',p_record_id,upper(replace(btrim(p_reason),' ','_')),gen_random_uuid());end;$$;

create or replace function public.staff_list_audit_logs() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_result jsonb;begin perform private.require_staff_permission('read','audit_log');select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc),'[]'::jsonb) into v_result from (select id,actor_id,actor_role,action,resource_type,resource_id,reason_code,correlation_id,created_at from private.audit_logs order by created_at desc limit 500) a;return v_result;end;$$;

create or replace function public.staff_provision_role(p_auth_user_id uuid,p_role text,p_reason text) returns uuid language plpgsql security definer set search_path='' as $$
declare v_role uuid;v_id uuid;
begin perform private.require_staff_permission('provision','staff');if p_auth_user_id=auth.uid() or p_role not in('support_agent','fraud_analyst','operations','administrator') or char_length(btrim(p_reason)) not between 3 and 80 or not exists(select 1 from auth.users where id=p_auth_user_id) then raise exception 'Invalid staff assignment' using errcode='22023';end if;select id into v_role from private.staff_roles where name=p_role;insert into private.staff_assignments(auth_user_id,role_id,granted_by) values(p_auth_user_id,v_role,auth.uid()) returning id into v_id;insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,reason_code,correlation_id) values(auth.uid(),'administrator','staff.role_granted','staff_assignment',v_id,upper(replace(btrim(p_reason),' ','_')),gen_random_uuid());return v_id;end;$$;

revoke all on function public.staff_get_context(),public.staff_search_customers(text),public.staff_get_customer_snapshot(uuid),public.staff_list_support_tickets(),public.staff_get_support_ticket(uuid),public.staff_claim_support_ticket(uuid),public.staff_reply_support_ticket(uuid,text,text,text),public.staff_set_account_restriction(uuid,text,text),public.staff_review_verification(uuid,text,text),public.staff_list_audit_logs(),public.staff_provision_role(uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.staff_get_context(),public.staff_search_customers(text),public.staff_get_customer_snapshot(uuid),public.staff_list_support_tickets(),public.staff_get_support_ticket(uuid),public.staff_claim_support_ticket(uuid),public.staff_reply_support_ticket(uuid,text,text,text),public.staff_set_account_restriction(uuid,text,text),public.staff_review_verification(uuid,text,text),public.staff_list_audit_logs(),public.staff_provision_role(uuid,text,text) to authenticated;
