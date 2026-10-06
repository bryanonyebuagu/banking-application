-- Milestone A immutable ledger-derived statement snapshots and private PDFs.
create policy bank_statements_insert on storage.objects for insert to authenticated with check(
 bucket_id='bank-statements' and exists(select 1 from public.statements s where s.object_key=name and s.status='pending' and private.owns_customer(s.customer_id))
);
create policy bank_statements_delete_pending on storage.objects for delete to authenticated using(
 bucket_id='bank-statements' and exists(select 1 from public.statements s where s.object_key=name and s.status='pending' and private.owns_customer(s.customer_id))
);

create or replace function public.begin_current_account_statement(p_statement_id uuid,p_account_id uuid,p_period_start date,p_period_end date,p_object_key text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_customer public.customers%rowtype;v_account public.accounts%rowtype;v_ledger uuid;v_opening bigint;v_closing bigint;v_cutoff timestamptz:=now();v_version integer;
begin
 if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;if p_period_start is null or p_period_end is null or p_period_end<=p_period_start or p_period_end>current_date or p_period_end-p_period_start>366 then raise exception 'Invalid statement period' using errcode='22023';end if;
 select * into v_customer from public.customers where auth_user_id=v_user and account_status<>'closed';select * into v_account from public.accounts where id=p_account_id and customer_id=v_customer.id for update;if v_customer.id is null or v_account.id is null then raise exception 'Account unavailable' using errcode='42501';end if;if p_object_key<>v_customer.id||'/'||p_statement_id||'.pdf' then raise exception 'Invalid object key' using errcode='22023';end if;select id into v_ledger from private.ledger_accounts where account_id=v_account.id;
 select coalesce(sum(case e.side when 'credit' then e.amount_minor else -e.amount_minor end),0)::bigint into v_opening from private.ledger_entries e join private.ledger_journals j on j.id=e.journal_id where e.ledger_account_id=v_ledger and j.effective_at<p_period_start::timestamptz and j.posted_at<=v_cutoff;
 select coalesce(sum(case e.side when 'credit' then e.amount_minor else -e.amount_minor end),0)::bigint into v_closing from private.ledger_entries e join private.ledger_journals j on j.id=e.journal_id where e.ledger_account_id=v_ledger and j.effective_at<(p_period_end+1)::timestamptz and j.posted_at<=v_cutoff;
 select coalesce(max(version),0)+1 into v_version from public.statements where account_id=v_account.id and period_start=p_period_start and period_end=p_period_end;
 insert into public.statements(id,customer_id,account_id,currency,period_start,period_end,version,opening_minor,closing_minor,ledger_cutoff,object_key,status) values(p_statement_id,v_customer.id,v_account.id,v_account.currency,p_period_start,p_period_end,v_version,v_opening,v_closing,v_cutoff,p_object_key,'pending');return p_statement_id;
end;$$;

create or replace function public.finalize_current_statement(p_statement_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_statement public.statements%rowtype;
begin if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;select s.* into v_statement from public.statements s join public.customers c on c.id=s.customer_id where s.id=p_statement_id and c.auth_user_id=v_user for update of s;if not found or v_statement.status<>'pending' or not exists(select 1 from storage.objects where bucket_id='bank-statements' and name=v_statement.object_key and coalesce(metadata->>'mimetype','')='application/pdf') then raise exception 'Statement file unavailable' using errcode='23514';end if;update public.statements set status='ready' where id=p_statement_id;insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(v_user,'customer','statement.generated','statement',p_statement_id,gen_random_uuid());insert into private.outbox_events(event_type,aggregate_type,aggregate_id,payload_version,dedupe_key) values('statement.ready','statement',p_statement_id,1,'statement.ready:'||p_statement_id);end;$$;

create or replace function public.abandon_current_statement(p_statement_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();begin if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;delete from public.statements s using public.customers c where s.id=p_statement_id and s.customer_id=c.id and c.auth_user_id=v_user and s.status='pending';if not found then raise exception 'Statement unavailable' using errcode='42501';end if;end;$$;

revoke all on function public.begin_current_account_statement(uuid,uuid,date,date,text),public.finalize_current_statement(uuid),public.abandon_current_statement(uuid) from public,anon,authenticated,service_role;
grant execute on function public.begin_current_account_statement(uuid,uuid,date,date,text),public.finalize_current_statement(uuid),public.abandon_current_statement(uuid) to authenticated;
