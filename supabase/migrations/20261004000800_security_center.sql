-- Milestone C Security Center commands for owned device and session management.
create or replace function public.record_current_security_event(p_event_type text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user_id uuid:=auth.uid();v_id uuid;
begin
  if v_user_id is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode='28000';end if;
  if p_event_type not in('password_changed','recovery_completed','mfa_enrolled','mfa_verified','mfa_unenrolled','session_revoked') then raise exception 'INVALID_SECURITY_EVENT' using errcode='22023';end if;
  insert into public.security_events(auth_user_id,event_type,outcome,correlation_id,occurred_at) values(v_user_id,p_event_type,'success',gen_random_uuid(),now()) returning id into v_id;
  return v_id;
end;$$;

create or replace function public.get_current_app_session_id()
returns uuid language sql stable security definer set search_path='' as $$
  select s.id from public.app_sessions s
  where s.auth_user_id=auth.uid()
    and s.provider_session_id::text=(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'session_id')
    and s.revoked_at is null and s.expires_at>now() and s.idle_expires_at>now()
$$;

create or replace function public.register_current_device(p_device_id uuid,p_device_token_hash text,p_label text,p_trust_days integer)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_claims jsonb:=nullif(current_setting('request.jwt.claims',true),'')::jsonb;v_session uuid;v_existing public.devices%rowtype;
begin
  if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
  if p_device_token_hash!~'^[0-9a-f]{64}$' or char_length(btrim(p_label)) not between 1 and 120 or p_trust_days not between 1 and 30 then raise exception 'Invalid device' using errcode='22023';end if;
  select * into v_existing from public.devices where device_token_hash=p_device_token_hash for update;
  if v_existing.id is not null and v_existing.auth_user_id<>v_user then raise exception 'Device unavailable' using errcode='42501';end if;
  if v_existing.id is null then
    insert into public.devices(id,auth_user_id,device_token_hash,label,trusted_until) values(p_device_id,v_user,p_device_token_hash,btrim(p_label),now()+make_interval(days=>p_trust_days)) returning id into p_device_id;
  else
    update public.devices set label=btrim(p_label),trusted_until=now()+make_interval(days=>p_trust_days),revoked_at=null where id=v_existing.id returning id into p_device_id;
  end if;
  update public.app_sessions set device_id=p_device_id where auth_user_id=v_user and provider_session_id::text=(v_claims->>'session_id') and revoked_at is null returning id into v_session;
  if v_session is null then raise exception 'Session unavailable' using errcode='42501';end if;
  insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(v_user,'customer','security.device_registered','device',p_device_id,gen_random_uuid());
  return p_device_id;
end;$$;

create or replace function public.revoke_current_user_session(p_app_session_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_aal text:=nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'aal';
begin
  if v_user is null or not private.session_is_active() or v_aal<>'aal2' then raise exception 'MFA step-up required' using errcode='42501';end if;
  update public.app_sessions set revoked_at=coalesce(revoked_at,now()) where id=p_app_session_id and auth_user_id=v_user and revoked_at is null;
  if not found then raise exception 'Session unavailable' using errcode='42501';end if;
  insert into public.security_events(auth_user_id,event_type,outcome,correlation_id,occurred_at) values(v_user,'session_revoked','success',gen_random_uuid(),now());
  insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(v_user,'customer','security.session_revoked','app_session',p_app_session_id,gen_random_uuid());
end;$$;

create or replace function public.revoke_current_device(p_device_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_aal text:=nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'aal';
begin
  if v_user is null or not private.session_is_active() or v_aal<>'aal2' then raise exception 'MFA step-up required' using errcode='42501';end if;
  update public.devices set revoked_at=coalesce(revoked_at,now()),trusted_until=null where id=p_device_id and auth_user_id=v_user and revoked_at is null;
  if not found then raise exception 'Device unavailable' using errcode='42501';end if;
  update public.app_sessions set revoked_at=coalesce(revoked_at,now()) where auth_user_id=v_user and device_id=p_device_id and revoked_at is null;
  insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(v_user,'customer','security.device_revoked','device',p_device_id,gen_random_uuid());
end;$$;

revoke all on function public.record_current_security_event(text),public.get_current_app_session_id(),public.register_current_device(uuid,text,text,integer),public.revoke_current_user_session(uuid),public.revoke_current_device(uuid) from public,anon,authenticated,service_role;
grant execute on function public.record_current_security_event(text),public.get_current_app_session_id(),public.register_current_device(uuid,text,text,integer),public.revoke_current_user_session(uuid),public.revoke_current_device(uuid) to authenticated;
