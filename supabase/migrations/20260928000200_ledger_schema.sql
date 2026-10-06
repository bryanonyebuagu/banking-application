-- Ledger structure only. Atomic posting commands and financial fixtures are Phase 8.
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  account_type text not null check (account_type in ('checking','savings')),
  nickname text not null check (char_length(nickname) between 1 and 80),
  synthetic_identifier text not null unique check (synthetic_identifier ~ '^SIM-[A-Z0-9-]{8,40}$'),
  masked_account_number text not null check (masked_account_number ~ '^\*{4}[0-9]{4}$'),
  routing_identifier text not null default 'SIM-ROUTING' check (routing_identifier like 'SIM-%'),
  currency text not null default 'USD' references private.supported_currencies(code),
  status text not null default 'active' check (status in ('active','frozen','restricted','closed')),
  opened_at timestamptz not null default now(), closed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,customer_id,currency), unique(id,currency),
  check ((status='closed') = (closed_at is not null)),
  check (closed_at is null or closed_at>=opened_at)
);
create index accounts_customer_idx on public.accounts(customer_id);
alter table public.accounts enable row level security;
revoke all on public.accounts from public,anon,authenticated,service_role;
grant select on public.accounts to authenticated;
create policy accounts_owner_read on public.accounts for select to authenticated using(private.owns_customer(customer_id));
create trigger touch_updated_at before update on public.accounts for each row execute function private.touch_updated_at();

create table private.ledger_accounts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid unique,
  class text not null check(class in ('asset','liability','equity','income','expense')),
  normal_side text not null check(normal_side in ('debit','credit')),
  currency text not null references private.supported_currencies(code),
  system_code text unique check(char_length(system_code) between 1 and 80),
  created_at timestamptz not null default now(),
  unique(id,currency),
  foreign key(account_id,currency) references public.accounts(id,currency) on delete restrict,
  check ((class in ('asset','expense') and normal_side='debit') or (class in ('liability','equity','income') and normal_side='credit')),
  check (account_id is null or (class='liability' and system_code is null))
);
create table private.ledger_journals (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null unique,
  currency text not null references private.supported_currencies(code),
  posted_at timestamptz not null default now(), effective_at timestamptz not null,
  reversal_of uuid unique,
  actor_id uuid not null references auth.users(id) on delete restrict,
  correlation_id uuid not null,
  created_at timestamptz not null default now(),
  creation_xid xid8 not null default pg_current_xact_id(),
  unique(id,currency),
  foreign key(reversal_of,currency) references private.ledger_journals(id,currency) on delete restrict,
  check(reversal_of is null or reversal_of<>id)
);
create index ledger_journals_actor_idx on private.ledger_journals(actor_id,posted_at);
create table private.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null,
  ledger_account_id uuid not null,
  side text not null check(side in ('debit','credit')),
  amount_minor bigint not null check(amount_minor>0),
  currency text not null,
  created_at timestamptz not null default now(),
  foreign key(journal_id,currency) references private.ledger_journals(id,currency) on delete restrict,
  foreign key(ledger_account_id,currency) references private.ledger_accounts(id,currency) on delete restrict
);
create index ledger_entries_journal_idx on private.ledger_entries(journal_id);
create index ledger_entries_account_idx on private.ledger_entries(ledger_account_id,created_at,id);
create table private.account_balances (
  ledger_account_id uuid primary key references private.ledger_accounts(id) on delete restrict,
  net_debit_minor bigint not null default 0,
  version bigint not null default 0 check(version>=0),
  updated_at timestamptz not null default now()
);
create table private.balance_holds (
  id uuid primary key default gen_random_uuid(),
  ledger_account_id uuid not null references private.ledger_accounts(id) on delete restrict,
  operation_id uuid not null unique,
  amount_minor bigint not null check(amount_minor>0),
  status text not null default 'active' check(status in ('active','captured','released','expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(expires_at>created_at)
);
create index balance_holds_active_idx on private.balance_holds(ledger_account_id,expires_at) where status='active';

create function private.validate_journal() returns trigger language plpgsql set search_path='' as $$
declare target uuid; entry_count bigint; debit_total numeric; credit_total numeric;
begin
  if tg_table_name='ledger_journals' then target:=new.id; else target:=new.journal_id; end if;
  select count(*),coalesce(sum(amount_minor) filter(where side='debit'),0),coalesce(sum(amount_minor) filter(where side='credit'),0)
    into entry_count,debit_total,credit_total from private.ledger_entries where journal_id=target;
  if entry_count<2 or debit_total<>credit_total then
    raise exception 'Journal must contain at least two balanced entries' using errcode='23514';
  end if;
  return null;
end;
$$;
create constraint trigger journal_balanced after insert on private.ledger_journals deferrable initially deferred for each row execute function private.validate_journal();
create constraint trigger entries_balanced after insert on private.ledger_entries deferrable initially deferred for each row execute function private.validate_journal();
create function private.reject_late_entry() returns trigger language plpgsql set search_path='' as $$
begin
  if not exists(select 1 from private.ledger_journals where id=new.journal_id and creation_xid=pg_current_xact_id()) then
    raise exception 'Entries must be inserted in the journal creation transaction' using errcode='23514';
  end if;
  return new;
end;
$$;
create trigger no_late_entries before insert on private.ledger_entries for each row execute function private.reject_late_entry();
create trigger journals_immutable before update or delete or truncate on private.ledger_journals for each statement execute function private.reject_history_mutation();
create trigger entries_immutable before update or delete or truncate on private.ledger_entries for each statement execute function private.reject_history_mutation();
revoke all on function private.validate_journal(),private.reject_late_entry() from public,anon,authenticated,service_role;
do $$ declare t text; begin
  foreach t in array array['ledger_accounts','ledger_journals','ledger_entries','account_balances','balance_holds'] loop
    execute format('alter table private.%I enable row level security',t);
    execute format('revoke all on private.%I from public,anon,authenticated,service_role',t);
  end loop;
end; $$;
