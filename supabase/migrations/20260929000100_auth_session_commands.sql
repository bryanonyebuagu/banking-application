-- Narrow authenticated commands for Phase 3. Provider JWT claims are verified by
-- the Supabase gateway; user metadata is never consulted for authority.
create or replace function public.sync_current_session()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  v_user_id uuid := auth.uid();
  v_session_id uuid;
  v_provider_expires timestamptz;
  v_id uuid;
begin
  if v_user_id is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode = '28000'; end if;
  v_session_id := nullif(v_claims ->> 'session_id', '')::uuid;
  v_provider_expires := to_timestamp((v_claims ->> 'exp')::bigint);
  if v_session_id is null or v_provider_expires <= now() then
    raise exception 'INVALID_PROVIDER_SESSION' using errcode = '28000';
  end if;

  insert into public.app_sessions(
    auth_user_id, provider_session_id, last_seen_at, expires_at, idle_expires_at
  ) values (
    v_user_id, v_session_id, now(),
    least(v_provider_expires, now() + interval '12 hours'),
    least(v_provider_expires, now() + interval '30 minutes')
  )
  on conflict (provider_session_id) do update
    set last_seen_at = now(),
        expires_at = least(v_provider_expires, public.app_sessions.created_at + interval '12 hours'),
        idle_expires_at = least(v_provider_expires, public.app_sessions.created_at + interval '12 hours', now() + interval '30 minutes'),
        updated_at = now()
    where public.app_sessions.auth_user_id = v_user_id
      and public.app_sessions.revoked_at is null
  returning public.app_sessions.id into v_id;

  if v_id is null then raise exception 'SESSION_REVOKED' using errcode = '42501'; end if;
  return v_id;
end
$$;

create or replace function public.revoke_current_session()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  v_user_id uuid := auth.uid();
  v_session_id uuid;
begin
  if v_user_id is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode = '28000'; end if;
  v_session_id := nullif(v_claims ->> 'session_id', '')::uuid;
  if v_session_id is null then raise exception 'INVALID_PROVIDER_SESSION' using errcode = '28000'; end if;
  update public.app_sessions
    set revoked_at = coalesce(revoked_at, now()), updated_at = now()
    where auth_user_id = v_user_id and provider_session_id = v_session_id;
  return found;
end
$$;

create or replace function public.revoke_all_current_user_sessions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer;
begin
  if v_user_id is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode = '28000'; end if;
  update public.app_sessions
    set revoked_at = coalesce(revoked_at, now()), updated_at = now()
    where auth_user_id = v_user_id and revoked_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end
$$;

create or replace function public.record_current_login_event(p_event_type text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
begin
  if v_user_id is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode = '28000'; end if;
  if p_event_type not in ('login','logout','refresh','revoked') then
    raise exception 'INVALID_LOGIN_EVENT' using errcode = '22023';
  end if;
  insert into public.login_events(auth_user_id,event_type,outcome,occurred_at)
    values(v_user_id,p_event_type,'success',now())
    returning id into v_id;
  return v_id;
end
$$;

create or replace function public.record_current_security_event(p_event_type text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
begin
  if v_user_id is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode = '28000'; end if;
  if p_event_type not in ('password_changed','recovery_completed','mfa_enrolled','mfa_unenrolled','session_revoked') then
    raise exception 'INVALID_SECURITY_EVENT' using errcode = '22023';
  end if;
  insert into public.security_events(auth_user_id,event_type,outcome,correlation_id,occurred_at)
    values(v_user_id,p_event_type,'success',gen_random_uuid(),now())
    returning id into v_id;
  return v_id;
end
$$;

revoke all on function public.sync_current_session() from public, anon, service_role;
revoke all on function public.revoke_current_session() from public, anon, service_role;
revoke all on function public.revoke_all_current_user_sessions() from public, anon, service_role;
revoke all on function public.record_current_login_event(text) from public, anon, service_role;
revoke all on function public.record_current_security_event(text) from public, anon, service_role;
grant execute on function public.sync_current_session() to authenticated;
grant execute on function public.revoke_current_session() to authenticated;
grant execute on function public.revoke_all_current_user_sessions() to authenticated;
grant execute on function public.record_current_login_event(text) to authenticated;
grant execute on function public.record_current_security_event(text) to authenticated;
