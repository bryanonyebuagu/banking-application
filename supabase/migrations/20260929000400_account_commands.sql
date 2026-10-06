-- Phase 7 owner-scoped account creation and nickname management.
create or replace function public.open_current_account(p_account_type text, p_nickname text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_customer public.customers%rowtype;
  v_account_id uuid := gen_random_uuid();
  v_ledger_account_id uuid := gen_random_uuid();
  v_nickname text := btrim(p_nickname);
begin
  if v_user_id is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501'; end if;
  if p_account_type not in ('checking','savings') then raise exception 'Unsupported account type' using errcode='22023'; end if;
  if v_nickname is null or char_length(v_nickname) not between 1 and 80 then raise exception 'Invalid nickname' using errcode='22023'; end if;
  select * into v_customer from public.customers where auth_user_id=v_user_id for update;
  if not found then raise exception 'Registration required' using errcode='42501'; end if;
  if v_customer.verification_status <> 'verified' or v_customer.account_status <> 'active' then
    raise exception 'Customer is not eligible' using errcode='42501';
  end if;
  if (select count(*) from public.accounts where customer_id=v_customer.id and status <> 'closed') >= 10 then
    raise exception 'Open account limit reached' using errcode='23514';
  end if;
  insert into public.accounts(id,customer_id,account_type,nickname,synthetic_identifier,masked_account_number)
  values(v_account_id,v_customer.id,p_account_type,v_nickname,
    'SIM-'||upper(substr(replace(v_account_id::text,'-',''),1,16)),
    '****'||lpad((mod(abs(hashtextextended(v_account_id::text,0)),10000))::text,4,'0'));
  insert into private.ledger_accounts(id,account_id,class,normal_side,currency)
  values(v_ledger_account_id,v_account_id,'liability','credit','USD');
  insert into private.account_balances(ledger_account_id,net_debit_minor,version)
  values(v_ledger_account_id,0,0);
  insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id)
  values(v_user_id,'customer','account.opened','account',v_account_id,gen_random_uuid());
  return v_account_id;
end;
$$;

create or replace function public.rename_current_account(p_account_id uuid, p_nickname text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid := auth.uid(); v_nickname text := btrim(p_nickname); v_changed uuid;
begin
  if v_user_id is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501'; end if;
  if v_nickname is null or char_length(v_nickname) not between 1 and 80 then raise exception 'Invalid nickname' using errcode='22023'; end if;
  update public.accounts a set nickname=v_nickname
  from public.customers c
  where a.id=p_account_id and a.customer_id=c.id and c.auth_user_id=v_user_id and a.status <> 'closed'
    and c.account_status <> 'closed'
  returning a.id into v_changed;
  if v_changed is null then raise exception 'Account unavailable' using errcode='42501'; end if;
  insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id)
  values(v_user_id,'customer','account.renamed','account',v_changed,gen_random_uuid());
end;
$$;

revoke all on function public.open_current_account(text,text), public.rename_current_account(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.open_current_account(text,text), public.rename_current_account(uuid,text) to authenticated;
