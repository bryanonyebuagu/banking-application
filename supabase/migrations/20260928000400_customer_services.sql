create table public.verification_records (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id),provider text not null default 'simulator' check(provider='simulator'),
 synthetic_fixture_id text not null check(synthetic_fixture_id like 'SIM-%'),status text not null check(status in ('not_started','pending','verified','failed','manual_review')),
 provider_reference text unique,reviewed_by uuid references auth.users(id),reason_code text check(length(reason_code)<=80),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.notifications (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id),event_id uuid not null,type text not null check(length(type) between 1 and 100),
 title text not null check(length(title) between 1 and 160),body text not null check(length(body)<=1000),resource_type text,resource_id uuid,read_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(customer_id,event_id,type)
);
create table public.notification_preferences (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id),type text not null check(length(type) between 1 and 100),
 channel text not null check(channel in ('in_app','email')),enabled boolean not null default true,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(customer_id,type,channel)
);
create table public.customer_preferences (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null unique references public.customers(id),locale text not null default 'en-US',timezone text not null default 'UTC',
 marketing_opt_in boolean not null default false,hide_balances boolean not null default false,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.account_preferences (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id),account_id uuid not null unique,currency text not null,
 paperless boolean not null default true,display_order integer not null default 0 check(display_order>=0),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),foreign key(account_id,customer_id,currency) references public.accounts(id,customer_id,currency)
);
create table public.customer_documents (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id),kind text not null check(kind in ('synthetic_identity','correspondence','generated')),
 object_key text not null unique,mime_type text not null check(mime_type in ('application/pdf','image/png','image/jpeg')),size_bytes bigint not null check(size_bytes between 1 and 5242880),
 status text not null check(status in ('quarantined','ready','rejected')),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(object_key like customer_id::text||'/%'),check(object_key not like '%..%')
);
create table public.support_tickets (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id),assigned_staff_id uuid references auth.users(id),
 subject text not null check(length(subject) between 1 and 200),status text not null check(status in ('open','in_progress','waiting_for_customer','resolved','closed')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(id,customer_id)
);
create index support_tickets_assigned_idx on public.support_tickets(assigned_staff_id,status);
create table public.support_messages (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id),ticket_id uuid not null,author_id uuid not null references auth.users(id),
 body text not null check(length(body) between 1 and 10000),visibility text not null check(visibility in ('customer','internal')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),foreign key(ticket_id,customer_id) references public.support_tickets(id,customer_id)
);
create index support_messages_ticket_idx on public.support_messages(ticket_id,created_at,id);
create table public.login_events (
 id uuid primary key default gen_random_uuid(),auth_user_id uuid not null references auth.users(id),event_type text not null check(event_type in ('login','logout','refresh','revoked')),
 outcome text not null check(outcome in ('success','failure','denied')),reason_code text check(length(reason_code)<=80),occurred_at timestamptz not null,
 created_at timestamptz not null default now()
);
create table public.security_events (
 id uuid primary key default gen_random_uuid(),auth_user_id uuid not null references auth.users(id),event_type text not null check(length(event_type) between 1 and 100),
 outcome text not null check(outcome in ('success','failure','denied')),reason_code text check(length(reason_code)<=80),correlation_id uuid not null,occurred_at timestamptz not null,
 created_at timestamptz not null default now()
);
do $$ declare t text; begin
 foreach t in array array['verification_records','notifications','notification_preferences','customer_preferences','account_preferences','customer_documents','support_tickets','support_messages'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create index %I on public.%I(customer_id)',t||'_customer_idx',t);
  execute format('create trigger touch_updated_at before update on public.%I for each row execute function private.touch_updated_at()',t);
  if t='support_messages' then
   execute format('create policy owner_read on public.%I for select to authenticated using(visibility=''customer'' and private.owns_customer(customer_id))',t);
  else
   execute format('create policy owner_read on public.%I for select to authenticated using(private.owns_customer(customer_id))',t);
  end if;
 end loop;
 foreach t in array array['login_events','security_events'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create index %I on public.%I(auth_user_id,occurred_at)',t||'_user_idx',t);
  execute format('create policy owner_read on public.%I for select to authenticated using(auth_user_id=(select auth.uid()) and (select private.session_is_active()))',t);
  execute format('create trigger immutable_event before update or delete or truncate on public.%I for each statement execute function private.reject_history_mutation()',t);
 end loop;
end; $$;
alter table public.check_deposits add constraint check_object_owner check(object_key like customer_id::text||'/%' and object_key not like '%..%');
alter table public.statements add constraint statement_object_owner check(object_key is null or (object_key like customer_id::text||'/%' and object_key not like '%..%'));
