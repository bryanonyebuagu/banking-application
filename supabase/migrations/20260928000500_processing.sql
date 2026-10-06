create table private.idempotency_requests (
 id uuid primary key default gen_random_uuid(),actor_id uuid not null references auth.users(id),operation text not null check(length(operation) between 1 and 100),
 key text not null check(length(key) between 1 and 200),payload_hash text not null check(payload_hash ~ '^[0-9a-f]{64}$'),
 state text not null check(state in ('processing','succeeded','failed')),result_type text,result_id uuid,error_code text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(actor_id,operation,key),
 check(state<>'succeeded' or (result_type is not null and result_id is not null)),check(state<>'failed' or error_code is not null)
);
create table private.outbox_events (
 id uuid primary key default gen_random_uuid(),event_type text not null check(length(event_type) between 1 and 100),aggregate_type text not null,aggregate_id uuid not null,
 payload_version integer not null check(payload_version>0),dedupe_key text not null unique,
 status text not null default 'pending' check(status in ('pending','processing','completed','failed')),attempt_count integer not null default 0 check(attempt_count>=0),
 next_attempt_at timestamptz not null default now(),lease_until timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index outbox_due_idx on private.outbox_events(next_attempt_at) where status in ('pending','failed');
create table private.jobs (
 id uuid primary key default gen_random_uuid(),event_id uuid references private.outbox_events(id),kind text not null,resource_type text not null,resource_id uuid not null,
 initiating_customer_id uuid references public.customers(id),worker_actor_id uuid references auth.users(id),dedupe_key text not null unique,
 status text not null default 'pending' check(status in ('pending','processing','completed','failed','cancelled')),attempt_count integer not null default 0 check(attempt_count>=0),
 next_attempt_at timestamptz not null default now(),lease_until timestamptz,last_error_code text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index jobs_due_idx on private.jobs(next_attempt_at) where status in ('pending','failed');
create table private.recurring_schedules (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id),kind text not null check(kind in ('transfer','payment')),
 source_account_id uuid not null,destination_account_id uuid,recipient_id uuid,payee_id uuid,amount_minor bigint not null check(amount_minor>0),currency text not null,
 frequency text not null check(frequency in ('weekly','monthly')),local_time time not null,timezone text not null check(length(timezone) between 1 and 100),next_run_at timestamptz not null,end_at timestamptz,
 status text not null check(status in ('active','paused','cancelled','completed')),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(id,customer_id),
 foreign key(source_account_id,customer_id,currency) references public.accounts(id,customer_id,currency),foreign key(destination_account_id,currency) references public.accounts(id,currency),
 foreign key(recipient_id,customer_id) references public.transfer_recipients(id,customer_id),foreign key(payee_id,customer_id) references public.payees(id,customer_id),
 check((kind='payment' and payee_id is not null and destination_account_id is null and recipient_id is null) or (kind='transfer' and payee_id is null and num_nonnulls(destination_account_id,recipient_id)=1)),
 check(destination_account_id is null or destination_account_id<>source_account_id),check(end_at is null or end_at>=created_at)
);
create index recurring_due_idx on private.recurring_schedules(next_run_at) where status='active';
create table private.schedule_occurrences (
 id uuid primary key default gen_random_uuid(),schedule_id uuid not null references private.recurring_schedules(id),due_at timestamptz not null,command_id uuid not null unique,
 status text not null check(status in ('pending','processing','completed','failed','cancelled')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(schedule_id,due_at)
);
alter table public.transfers add column schedule_id uuid;
alter table public.transfers add foreign key(schedule_id,customer_id) references private.recurring_schedules(id,customer_id);
alter table public.payments add column schedule_id uuid;
alter table public.payments add foreign key(schedule_id,customer_id) references private.recurring_schedules(id,customer_id);
alter table public.notifications add foreign key(event_id) references private.outbox_events(id);
do $$ declare t text; begin
 foreach t in array array['idempotency_requests','outbox_events','jobs','recurring_schedules','schedule_occurrences'] loop
  execute format('alter table private.%I enable row level security',t);
  execute format('revoke all on private.%I from public,anon,authenticated,service_role',t);
  execute format('create trigger touch_updated_at before update on private.%I for each row execute function private.touch_updated_at()',t);
 end loop;
end; $$;
-- Cover referencing FK columns not already covered by the leading columns of an index.
do $$ declare fk record; cols text; begin
 for fk in select c.oid,c.conrelid,c.conkey,n.nspname,t.relname,c.conname from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace where c.contype='f' and n.nspname in ('public','private') loop
  if not exists(select 1 from pg_index i where i.indrelid=fk.conrelid and i.indisvalid and i.indpred is null and (i.indkey::smallint[])[0:array_length(fk.conkey,1)-1]=fk.conkey[1:array_length(fk.conkey,1)]) then
   select string_agg(quote_ident(a.attname),',' order by k.ordinality) into cols from unnest(fk.conkey) with ordinality k(num,ordinality) join pg_attribute a on a.attrelid=fk.conrelid and a.attnum=k.num;
   execute format('create index %I on %I.%I(%s)','fk_'||substr(md5(fk.nspname||'.'||fk.relname||'.'||fk.conname),1,20)||'_idx',fk.nspname,fk.relname,cols);
  end if;
 end loop;
end; $$;
