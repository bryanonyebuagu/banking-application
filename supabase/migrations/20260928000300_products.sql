-- Product records are read-only to customers; workflow commands arrive later.
create table public.transfer_recipients (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.customers(id),
 label text not null check(length(label) between 1 and 100), destination_token text not null check(destination_token like 'SIM-%'),
 masked_identifier text not null check(length(masked_identifier) between 1 and 32),
 status text not null default 'active' check(status in ('active','archived')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(), unique(id,customer_id)
);
create table public.payees (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id),
 name text not null check(length(name) between 1 and 120),synthetic_reference text not null check(synthetic_reference like 'SIM-%'), archived_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(id,customer_id)
);
create table public.transactions (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id),account_id uuid not null,
 operation_id uuid not null,journal_id uuid,type text not null check(type in ('deposit','withdrawal','transfer','card_payment','bill_payment','interest','fee','adjustment','reversal')),
 direction text not null check(direction in ('debit','credit')),amount_minor bigint not null check(amount_minor>0),currency text not null references private.supported_currencies(code),
 merchant text check(length(merchant)<=200),description text not null check(length(description)<=500),category text not null default 'Other',
 status text not null check(status in ('pending','posted','failed','reversed')),posted_at timestamptz,original_transaction_id uuid,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(id,customer_id,currency),unique(account_id,operation_id,direction),
 foreign key(account_id,customer_id,currency) references public.accounts(id,customer_id,currency),
 foreign key(journal_id,currency) references private.ledger_journals(id,currency),
 foreign key(original_transaction_id,customer_id,currency) references public.transactions(id,customer_id,currency),
 check(status not in ('posted','reversed') or (journal_id is not null and posted_at is not null))
);
create index transactions_history_idx on public.transactions(account_id,created_at desc,id);
create table public.transfers (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id),source_account_id uuid not null,destination_account_id uuid,recipient_id uuid,
 amount_minor bigint not null check(amount_minor>0),currency text not null references private.supported_currencies(code),memo text check(length(memo)<=500),scheduled_at timestamptz,
 status text not null check(status in ('scheduled','processing','completed','failed','cancelled')),journal_id uuid unique,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(source_account_id,customer_id,currency) references public.accounts(id,customer_id,currency),
 foreign key(destination_account_id,currency) references public.accounts(id,currency),
 foreign key(recipient_id,customer_id) references public.transfer_recipients(id,customer_id),
 foreign key(journal_id,currency) references private.ledger_journals(id,currency),
 check(num_nonnulls(destination_account_id,recipient_id)=1),check(destination_account_id is null or destination_account_id<>source_account_id),
 check(status<>'completed' or journal_id is not null),unique(id,customer_id)
);
create table public.payments (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id),account_id uuid not null,payee_id uuid not null,
 amount_minor bigint not null check(amount_minor>0),currency text not null references private.supported_currencies(code),scheduled_at timestamptz,
 status text not null check(status in ('scheduled','processing','completed','failed','cancelled')),journal_id uuid unique,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(account_id,customer_id,currency) references public.accounts(id,customer_id,currency),foreign key(payee_id,customer_id) references public.payees(id,customer_id),
 foreign key(journal_id,currency) references private.ledger_journals(id,currency),check(status<>'completed' or journal_id is not null),unique(id,customer_id)
);
create table public.credit_accounts (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id),ledger_account_id uuid not null unique,
 currency text not null references private.supported_currencies(code),credit_limit_minor bigint not null check(credit_limit_minor>=0),
 cycle_day smallint not null check(cycle_day between 1 and 28),due_day smallint not null check(due_day between 1 and 28),
 status text not null default 'active' check(status in ('active','restricted','closed')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(id,customer_id,currency),
 foreign key(ledger_account_id,currency) references private.ledger_accounts(id,currency)
);
create table public.cards (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id),credit_account_id uuid not null,currency text not null,
 synthetic_token text not null unique check(synthetic_token like 'SIM-%'),last_four text not null check(last_four ~ '^[0-9]{4}$'),cardholder text not null check(length(cardholder) between 1 and 120),
 status text not null check(status in ('active','locked','lost','stolen','replaced')),purchase_limit_minor bigint not null check(purchase_limit_minor>=0),replaced_card_id uuid,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(id,customer_id,currency),
 foreign key(credit_account_id,customer_id,currency) references public.credit_accounts(id,customer_id,currency),
 foreign key(replaced_card_id,customer_id,currency) references public.cards(id,customer_id,currency),check(replaced_card_id is null or replaced_card_id<>id)
);
create table public.card_transactions (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id),card_id uuid not null,journal_id uuid,hold_id uuid references private.balance_holds(id),
 merchant text not null check(length(merchant) between 1 and 200),amount_minor bigint not null check(amount_minor>0),currency text not null,
 category text not null default 'Other',location text check(length(location)<=200),kind text not null check(kind in ('purchase','refund','reversal')),
 status text not null check(status in ('pending','posted','reversed','released','failed')),original_id uuid,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(id,customer_id,currency),
 foreign key(card_id,customer_id,currency) references public.cards(id,customer_id,currency),foreign key(journal_id,currency) references private.ledger_journals(id,currency),
 foreign key(original_id,customer_id,currency) references public.card_transactions(id,customer_id,currency),check(status<>'posted' or journal_id is not null)
);
create table public.check_deposits (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id),account_id uuid not null,amount_minor bigint not null check(amount_minor>0),currency text not null,
 object_key text not null unique,status text not null check(status in ('submitted','reviewing','accepted','rejected')),reviewed_at timestamptz,journal_id uuid unique,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(account_id,customer_id,currency) references public.accounts(id,customer_id,currency),foreign key(journal_id,currency) references private.ledger_journals(id,currency),
 check(status<>'accepted' or (journal_id is not null and reviewed_at is not null))
);
create table public.statements (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id),account_id uuid,credit_account_id uuid,currency text not null,
 period_start date not null,period_end date not null,version integer not null check(version>0),opening_minor bigint not null,closing_minor bigint not null,
 ledger_cutoff timestamptz not null,object_key text unique,status text not null check(status in ('pending','ready','failed')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(account_id,customer_id,currency) references public.accounts(id,customer_id,currency),foreign key(credit_account_id,customer_id,currency) references public.credit_accounts(id,customer_id,currency),
 check(num_nonnulls(account_id,credit_account_id)=1),check(period_end>period_start),check(status<>'ready' or object_key is not null)
);
create unique index statements_account_period_idx on public.statements(account_id,period_start,period_end,version) where account_id is not null;
create unique index statements_credit_period_idx on public.statements(credit_account_id,period_start,period_end,version) where credit_account_id is not null;
create table public.loans (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id),ledger_account_id uuid not null unique,currency text not null,
 kind text not null check(kind in ('personal','auto')),principal_minor bigint not null check(principal_minor>0),rate numeric(12,8) not null check(rate>=0 and rate<=1),
 term_months integer not null check(term_months>0),monthly_payment_minor bigint not null check(monthly_payment_minor>0),next_due_date date,
 status text not null check(status in ('active','paid_off','restricted')),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(ledger_account_id,currency) references private.ledger_accounts(id,currency),unique(id,customer_id,currency)
);
create table public.mortgages (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id),ledger_account_id uuid not null unique,escrow_ledger_account_id uuid not null unique,currency text not null,
 principal_minor bigint not null check(principal_minor>0),rate numeric(12,8) not null check(rate>=0 and rate<=1),term_months integer not null check(term_months>0),
 monthly_payment_minor bigint not null check(monthly_payment_minor>0),next_due_date date,status text not null check(status in ('active','paid_off','restricted')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(id,customer_id,currency),
 foreign key(ledger_account_id,currency) references private.ledger_accounts(id,currency),foreign key(escrow_ledger_account_id,currency) references private.ledger_accounts(id,currency),check(ledger_account_id<>escrow_ledger_account_id)
);
create table public.loan_payments (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id),loan_id uuid not null,funding_account_id uuid not null,currency text not null,
 principal_minor bigint not null check(principal_minor>=0),interest_minor bigint not null check(interest_minor>=0),fee_minor bigint not null check(fee_minor>=0),journal_id uuid unique,
 status text not null check(status in ('pending','posted','failed')),paid_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(loan_id,customer_id,currency) references public.loans(id,customer_id,currency),foreign key(funding_account_id,customer_id,currency) references public.accounts(id,customer_id,currency),foreign key(journal_id,currency) references private.ledger_journals(id,currency),
 check(principal_minor::numeric+interest_minor+fee_minor>0),check(status<>'posted' or (journal_id is not null and paid_at is not null))
);
create table public.mortgage_payments (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id),mortgage_id uuid not null,funding_account_id uuid not null,currency text not null,
 principal_minor bigint not null check(principal_minor>=0),interest_minor bigint not null check(interest_minor>=0),escrow_minor bigint not null check(escrow_minor>=0),journal_id uuid unique,
 status text not null check(status in ('pending','posted','failed')),paid_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(mortgage_id,customer_id,currency) references public.mortgages(id,customer_id,currency),foreign key(funding_account_id,customer_id,currency) references public.accounts(id,customer_id,currency),foreign key(journal_id,currency) references private.ledger_journals(id,currency),
 check(principal_minor::numeric+interest_minor+escrow_minor>0),check(status<>'posted' or (journal_id is not null and paid_at is not null))
);
create table public.mortgage_applications (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id),synthetic_property_id text not null check(synthetic_property_id like 'SIM-%'),
 synthetic_employment_id text not null check(synthetic_employment_id like 'SIM-%'),requested_amount_minor bigint not null check(requested_amount_minor>0),currency text not null references private.supported_currencies(code),
 status text not null check(status in ('draft','submitted','reviewing','approved','declined','withdrawn')),review_audit_id uuid references private.audit_logs(id),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table private.investment_instruments (
 id uuid primary key default gen_random_uuid(),symbol text not null unique check(symbol like 'SIM-%'),name text not null,created_at timestamptz not null default now()
);
create table private.investment_prices (
 id uuid primary key default gen_random_uuid(),instrument_id uuid not null references private.investment_instruments(id),price numeric(28,10) not null check(price>0),currency text not null references private.supported_currencies(code),observed_at timestamptz not null,
 provenance text not null default 'simulated' check(provenance='simulated'),created_at timestamptz not null default now(),unique(instrument_id,currency,observed_at)
);
create table public.investment_accounts (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id),cash_ledger_account_id uuid not null unique,currency text not null,
 status text not null check(status in ('active','restricted','closed')),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(cash_ledger_account_id,currency) references private.ledger_accounts(id,currency),unique(id,customer_id,currency)
);
create table public.investment_holdings (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id),investment_account_id uuid not null,instrument_id uuid not null references private.investment_instruments(id),currency text not null,
 quantity numeric(28,10) not null check(quantity>=0),cost_basis_minor bigint not null check(cost_basis_minor>=0),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(investment_account_id,customer_id,currency) references public.investment_accounts(id,customer_id,currency),unique(investment_account_id,instrument_id)
);
create table public.investment_transactions (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id),investment_account_id uuid not null,instrument_id uuid references private.investment_instruments(id),currency text not null,
 kind text not null check(kind in ('buy','sell','dividend','deposit','withdrawal')),quantity numeric(28,10) check(quantity>0),price numeric(28,10) check(price>0),cash_amount_minor bigint not null check(cash_amount_minor>0),journal_id uuid not null,
 occurred_at timestamptz not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(investment_account_id,customer_id,currency) references public.investment_accounts(id,customer_id,currency),foreign key(journal_id,currency) references private.ledger_journals(id,currency),
 check(kind not in ('buy','sell') or (instrument_id is not null and quantity is not null and price is not null))
);
do $$ declare t text; begin
 foreach t in array array['transfer_recipients','payees','transactions','transfers','payments','credit_accounts','cards','card_transactions','check_deposits','statements','loans','mortgages','loan_payments','mortgage_payments','mortgage_applications','investment_accounts','investment_holdings','investment_transactions'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create policy owner_read on public.%I for select to authenticated using(private.owns_customer(customer_id))',t);
  execute format('create index %I on public.%I(customer_id)',t||'_customer_idx',t);
  execute format('create trigger touch_updated_at before update on public.%I for each row execute function private.touch_updated_at()',t);
 end loop;
 foreach t in array array['investment_instruments','investment_prices'] loop
  execute format('alter table private.%I enable row level security',t);
  execute format('revoke all on private.%I from public,anon,authenticated,service_role',t);
 end loop;
end; $$;
