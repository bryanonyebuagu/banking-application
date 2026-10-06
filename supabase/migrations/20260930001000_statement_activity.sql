-- Exact owner-scoped ledger movements for an immutable statement snapshot.
create or replace function public.get_current_statement_activity(p_statement_id uuid)
returns table(id uuid,activity_at timestamptz,description text,direction text,amount_minor bigint)
language plpgsql stable security definer set search_path='' as $$
declare v_user uuid:=auth.uid();
begin
 if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
 return query
 select j.id,j.effective_at,coalesce(t.description,'Ledger activity'),case e.side when 'credit' then 'credit' else 'debit' end,e.amount_minor
 from public.statements s
 join public.customers c on c.id=s.customer_id
 join private.ledger_accounts la on la.account_id=s.account_id
 join private.ledger_entries e on e.ledger_account_id=la.id
 join private.ledger_journals j on j.id=e.journal_id
 left join public.transactions t on t.journal_id=j.id and t.account_id=s.account_id
 where s.id=p_statement_id and c.auth_user_id=v_user and s.status in('pending','ready')
   and j.effective_at>=s.period_start::timestamptz
   and j.effective_at<(s.period_end+1)::timestamptz
   and j.posted_at<=s.ledger_cutoff
 order by j.effective_at,j.id;
end;$$;

revoke all on function public.get_current_statement_activity(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_current_statement_activity(uuid) to authenticated;
