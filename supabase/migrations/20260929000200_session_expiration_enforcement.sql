-- Expired application sessions must not be revived by a still-valid provider token.
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
      and public.app_sessions.expires_at > now()
      and public.app_sessions.idle_expires_at > now()
  returning public.app_sessions.id into v_id;

  if v_id is null then raise exception 'SESSION_EXPIRED_OR_REVOKED' using errcode = '42501'; end if;
  return v_id;
end
$$;

revoke all on function public.sync_current_session() from public, anon, service_role;
grant execute on function public.sync_current_session() to authenticated;
