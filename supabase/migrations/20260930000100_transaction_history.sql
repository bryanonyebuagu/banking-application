-- Milestone A: owner-scoped transaction history with stable tuple cursors.
create or replace function public.search_current_transactions(
  p_query text default null,p_status text default null,p_category text default null,
  p_date_from date default null,p_date_to date default null,
  p_amount_min bigint default null,p_amount_max bigint default null,
  p_cursor_created_at timestamptz default null,p_cursor_id uuid default null,p_page_size integer default 20
) returns table(
  id uuid,account_id uuid,account_nickname text,masked_account_number text,
  type text,direction text,amount_minor bigint,currency text,merchant text,
  description text,category text,status text,posted_at timestamptz,created_at timestamptz
)
language plpgsql stable security definer set search_path=''
as $$
begin
  if auth.uid() is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
  if p_page_size not between 1 and 50 then raise exception 'Invalid page size' using errcode='22023';end if;
  if p_status is not null and p_status not in('pending','posted','failed','reversed') then raise exception 'Invalid status' using errcode='22023';end if;
  if p_amount_min is not null and p_amount_min<0 or p_amount_max is not null and p_amount_max<0 or p_amount_min>p_amount_max then raise exception 'Invalid amount range' using errcode='22023';end if;
  if (p_cursor_created_at is null)<>(p_cursor_id is null) then raise exception 'Incomplete cursor' using errcode='22023';end if;
  return query select t.id,t.account_id,a.nickname,a.masked_account_number,t.type,t.direction,t.amount_minor,t.currency,t.merchant,t.description,t.category,t.status,t.posted_at,t.created_at
  from public.transactions t join public.accounts a on a.id=t.account_id join public.customers c on c.id=t.customer_id
  where c.auth_user_id=auth.uid()
    and (p_query is null or btrim(p_query)='' or t.description ilike '%'||btrim(p_query)||'%' or coalesce(t.merchant,'') ilike '%'||btrim(p_query)||'%')
    and (p_status is null or t.status=p_status) and (p_category is null or t.category=p_category)
    and (p_date_from is null or t.created_at>=p_date_from::timestamptz)
    and (p_date_to is null or t.created_at<(p_date_to+1)::timestamptz)
    and (p_amount_min is null or t.amount_minor>=p_amount_min) and (p_amount_max is null or t.amount_minor<=p_amount_max)
    and (p_cursor_created_at is null or (t.created_at,t.id)<(p_cursor_created_at,p_cursor_id))
  order by t.created_at desc,t.id desc limit p_page_size;
end;
$$;
revoke all on function public.search_current_transactions(text,text,text,date,date,bigint,bigint,timestamptz,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.search_current_transactions(text,text,text,date,date,bigint,bigint,timestamptz,uuid,integer) to authenticated;
