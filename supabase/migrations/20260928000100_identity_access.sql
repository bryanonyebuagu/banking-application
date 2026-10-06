-- Batch 1: deny-by-default identity and access foundations.
-- Provider workflows and staff commands arrive in their own phases.
create schema private;
revoke all on schema private from public, anon, authenticated;
revoke create on schema public from public, anon, authenticated;
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema private revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema private revoke execute on functions from public, anon, authenticated, service_role;

create role bank_policy_reader nologin noinherit;
grant bank_policy_reader to postgres;
grant usage on schema public, private to bank_policy_reader;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete restrict,
  display_name text not null default '' check (char_length(display_name) <= 120),
  locale text not null default 'en-US' check (char_length(locale) between 2 and 35),
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, auth_user_id)
);
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete restrict,
  profile_id uuid not null unique,
  first_name text not null check (char_length(first_name) between 1 and 100),
  middle_name text check (char_length(middle_name) <= 100),
  last_name text not null check (char_length(last_name) between 1 and 100),
  contact_email text not null check (char_length(contact_email) between 3 and 254),
  phone text check (char_length(phone) <= 32),
  date_of_birth date,
  customer_since date not null default current_date,
  verification_status text not null default 'not_started' check (verification_status in ('not_started','pending','verified','failed','manual_review')),
  account_status text not null default 'active' check (account_status in ('active','restricted','closed')),
  employment text check (char_length(employment) <= 200),
  income_range text check (char_length(income_range) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(profile_id, auth_user_id) references public.profiles(id, auth_user_id) on delete restrict
);
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  line1 text not null check (char_length(line1) between 1 and 200),
  line2 text check (char_length(line2) <= 200),
  city text not null check (char_length(city) between 1 and 100),
  state text check (char_length(state) <= 100),
  postal_code text not null check (char_length(postal_code) between 1 and 20),
  country text not null check (country ~ '^[A-Z]{2}$'),
  type text not null check (type in ('home','mailing')),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index addresses_customer_idx on public.addresses(customer_id);
create unique index addresses_primary_idx on public.addresses(customer_id, type) where is_primary;

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete restrict,
  device_token_hash text not null unique check (device_token_hash ~ '^[0-9a-f]{64}$'),
  label text not null check (char_length(label) between 1 and 120),
  trusted_until timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, auth_user_id)
);
create index devices_user_idx on public.devices(auth_user_id);
create table public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete restrict,
  provider_session_id uuid not null unique,
  device_id uuid,
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  idle_expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(device_id, auth_user_id) references public.devices(id, auth_user_id) on delete restrict,
  check (expires_at > created_at),
  check (idle_expires_at <= expires_at)
);
create index app_sessions_user_idx on public.app_sessions(auth_user_id);

create table private.supported_currencies (
  code text primary key check (code ~ '^[A-Z]{3}$'),
  minor_units smallint not null check (minor_units between 0 and 6)
);
insert into private.supported_currencies values ('USD', 2);
create table private.staff_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name in ('support_agent','fraud_analyst','operations','administrator')),
  created_at timestamptz not null default now()
);
insert into private.staff_roles(name) values ('support_agent'),('fraud_analyst'),('operations'),('administrator');
create table private.staff_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references private.staff_roles(id) on delete restrict,
  action text not null check (char_length(action) between 1 and 100),
  resource_type text not null check (char_length(resource_type) between 1 and 80),
  scope text not null check (scope in ('assigned','all')),
  created_at timestamptz not null default now(),
  unique(role_id, action, resource_type, scope)
);
create table private.staff_assignments (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete restrict,
  role_id uuid not null references private.staff_roles(id) on delete restrict,
  granted_by uuid not null references auth.users(id) on delete restrict,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (auth_user_id <> granted_by)
);
create unique index staff_assignments_active_idx on private.staff_assignments(auth_user_id,role_id) where revoked_at is null;
create index staff_assignments_role_idx on private.staff_assignments(role_id);
create table private.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete restrict,
  actor_role text not null check (char_length(actor_role) between 1 and 80),
  action text not null check (char_length(action) between 1 and 100),
  resource_type text not null check (char_length(resource_type) between 1 and 80),
  resource_id uuid,
  reason_code text check (char_length(reason_code) <= 80),
  correlation_id uuid not null,
  created_at timestamptz not null default now()
);
create index audit_logs_actor_idx on private.audit_logs(actor_id,created_at);
create index audit_logs_resource_idx on private.audit_logs(resource_type,resource_id,created_at);

create function private.reject_history_mutation() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'Append-only history cannot be changed' using errcode = '42501';
end;
$$;
revoke all on function private.reject_history_mutation() from public, anon, authenticated, service_role;
create trigger audit_logs_immutable before update or delete or truncate on private.audit_logs
for each statement execute function private.reject_history_mutation();

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function private.touch_updated_at() from public, anon, authenticated, service_role;
do $$
declare t text;
begin
  foreach t in array array['profiles','customers','addresses','devices','app_sessions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public, anon, authenticated, service_role', t);
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function private.touch_updated_at()', t);
  end loop;
  foreach t in array array['supported_currencies','staff_roles','staff_permissions','staff_assignments','audit_logs'] loop
    execute format('alter table private.%I enable row level security', t);
    execute format('revoke all on table private.%I from public, anon, authenticated, service_role', t);
  end loop;
end;
$$;

-- This non-login function owner can only read the two tables used below.
grant select on public.customers, public.app_sessions to bank_policy_reader;
create policy policy_reader_customers on public.customers for select to bank_policy_reader using (true);
create policy policy_reader_sessions on public.app_sessions for select to bank_policy_reader using (true);
create function private.session_is_active() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.app_sessions s
    where s.auth_user_id::text = (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
      and s.provider_session_id::text = (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'session_id')
      and s.revoked_at is null
      and s.expires_at > now()
      and s.idle_expires_at > now()
  );
$$;
create function private.owns_customer(target_customer_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.session_is_active() and exists (
    select 1 from public.customers c
    where c.id = target_customer_id and c.auth_user_id::text = (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  );
$$;
-- Ownership transfer requires CREATE only at migration time.
grant create on schema private to bank_policy_reader;
alter function private.session_is_active() owner to bank_policy_reader;
alter function private.owns_customer(uuid) owner to bank_policy_reader;
revoke create on schema private from bank_policy_reader;
revoke all on function private.session_is_active(), private.owns_customer(uuid) from public, anon, authenticated, service_role;
grant usage on schema private to authenticated;
grant execute on function private.session_is_active(), private.owns_customer(uuid) to authenticated;

create policy profiles_owner_read on public.profiles for select to authenticated
using (auth_user_id = (select auth.uid()) and (select private.session_is_active()));
create policy customers_owner_read on public.customers for select to authenticated
using (auth_user_id = (select auth.uid()) and (select private.session_is_active()));
create policy addresses_owner_read on public.addresses for select to authenticated
using (private.owns_customer(customer_id));
create policy devices_owner_read on public.devices for select to authenticated
using (auth_user_id = (select auth.uid()) and (select private.session_is_active()));
create policy sessions_owner_read on public.app_sessions for select to authenticated
using (auth_user_id = (select auth.uid()) and (select private.session_is_active()));
grant select on public.profiles, public.customers, public.addresses to authenticated;
grant select(id,auth_user_id,label,trusted_until,revoked_at,created_at,updated_at) on public.devices to authenticated;
grant select(id,auth_user_id,device_id,last_seen_at,expires_at,idle_expires_at,revoked_at,created_at,updated_at) on public.app_sessions to authenticated;
-- No customer DML, staff access or service-role writes until narrow commands
-- and provider-backed authorization tests accompany the relevant workflow.
