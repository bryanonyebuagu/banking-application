-- Preserve existing USD callers while the UI can explicitly open NGN accounts.
create function public.open_current_account(p_account_type text,p_nickname text)
returns uuid language sql security invoker set search_path=''
as $$ select public.open_current_account(p_account_type,p_nickname,'USD') $$;
revoke all on function public.open_current_account(text,text) from public,anon,service_role;
grant execute on function public.open_current_account(text,text) to authenticated;
