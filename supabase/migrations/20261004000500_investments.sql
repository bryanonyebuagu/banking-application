-- Milestone B simulated investment accounts, prices, cash and holdings.
create unique index investment_transactions_journal_unique on public.investment_transactions(journal_id);
insert into private.ledger_accounts(id,class,normal_side,currency,system_code) values(gen_random_uuid(),'asset','debit','USD','SIMULATED_INVESTMENT_CLEARING_USD') on conflict(system_code) do nothing;
insert into private.account_balances(ledger_account_id) select id from private.ledger_accounts where system_code='SIMULATED_INVESTMENT_CLEARING_USD' on conflict do nothing;
insert into private.investment_instruments(id,symbol,name) values
('10000000-0000-4000-8000-000000000001','SIM-BLUE','Synthetic Blue Chip Fund'),
('10000000-0000-4000-8000-000000000002','SIM-GREEN','Synthetic Green Energy Fund'),
('10000000-0000-4000-8000-000000000003','SIM-BOND','Synthetic Bond Fund') on conflict(symbol) do nothing;
insert into private.investment_prices(instrument_id,price,currency,observed_at) values
('10000000-0000-4000-8000-000000000001',125.50,'USD','2026-10-04T00:00:00Z'),
('10000000-0000-4000-8000-000000000002',48.25,'USD','2026-10-04T00:00:00Z'),
('10000000-0000-4000-8000-000000000003',99.75,'USD','2026-10-04T00:00:00Z') on conflict do nothing;

create or replace function public.open_current_investment_account()
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_customer uuid;v_ledger uuid:=gen_random_uuid();v_account uuid;
begin
 if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
 select id into v_customer from public.customers where auth_user_id=v_user and verification_status='verified' and account_status='active';
 if v_customer is null then raise exception 'Investment account unavailable' using errcode='42501';end if;
 select id into v_account from public.investment_accounts where customer_id=v_customer and status='active';if v_account is not null then return v_account;end if;
 insert into private.ledger_accounts(id,class,normal_side,currency) values(v_ledger,'liability','credit','USD');insert into private.account_balances(ledger_account_id) values(v_ledger);
 insert into public.investment_accounts(customer_id,cash_ledger_account_id,currency,status) values(v_customer,v_ledger,'USD','active') returning id into v_account;
 return v_account;
end;$$;

create or replace function public.get_current_investment_overview()
returns table(investment_account_id uuid,cash_minor bigint,market_value_minor bigint,cost_basis_minor bigint,currency text)
language sql stable security definer set search_path='' as $$
 select ia.id,greatest(-b.net_debit_minor,0),
 coalesce((select sum(round(h.quantity*p.price*100))::bigint from public.investment_holdings h join lateral(select price from private.investment_prices where instrument_id=h.instrument_id and currency=h.currency order by observed_at desc limit 1)p on true where h.investment_account_id=ia.id),0),
 coalesce((select sum(h.cost_basis_minor)::bigint from public.investment_holdings h where h.investment_account_id=ia.id),0),ia.currency
 from public.investment_accounts ia join public.customers c on c.id=ia.customer_id join private.account_balances b on b.ledger_account_id=ia.cash_ledger_account_id
 where c.auth_user_id=auth.uid() and private.session_is_active()
$$;

create or replace function public.get_current_investment_instruments()
returns table(id uuid,symbol text,name text,price numeric,currency text,observed_at timestamptz)
language sql stable security definer set search_path='' as $$
 select i.id,i.symbol,i.name,p.price,p.currency,p.observed_at from private.investment_instruments i join lateral(select price,currency,observed_at from private.investment_prices where instrument_id=i.id order by observed_at desc limit 1)p on true
 where auth.uid() is not null and private.session_is_active() order by i.symbol
$$;

create or replace function public.fund_current_investment_account(p_investment_account_id uuid,p_funding_account_id uuid,p_amount_minor bigint,p_idempotency_key text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_customer uuid;v_invest public.investment_accounts%rowtype;v_account public.accounts%rowtype;v_source uuid;v_hash text;v_journal uuid;v_tx uuid;
begin
 if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
 select id into v_customer from public.customers where auth_user_id=v_user and account_status='active';
 select * into v_invest from public.investment_accounts where id=p_investment_account_id and customer_id=v_customer and status='active';
 select * into v_account from public.accounts where id=p_funding_account_id and customer_id=v_customer and status='active' and currency=v_invest.currency;
 if v_invest.id is null or v_account.id is null or p_amount_minor not between 100 and 100000000 then raise exception 'Funding unavailable' using errcode='42501';end if;
 select id into v_source from private.ledger_accounts where account_id=v_account.id;v_hash:=encode(extensions.digest(concat_ws('|',p_investment_account_id,p_funding_account_id,p_amount_minor,v_invest.currency),'sha256'),'hex');
 v_journal:=private.post_customer_debit_operation(v_user,'investment_deposit',p_idempotency_key,v_hash,v_source,v_invest.cash_ledger_account_id,p_amount_minor,gen_random_uuid());
 select id into v_tx from public.investment_transactions where journal_id=v_journal;
 if v_tx is null then insert into public.investment_transactions(customer_id,investment_account_id,currency,kind,cash_amount_minor,journal_id,occurred_at) values(v_customer,v_invest.id,v_invest.currency,'deposit',p_amount_minor,v_journal,now()) returning id into v_tx;
 insert into public.transactions(customer_id,account_id,operation_id,journal_id,type,direction,amount_minor,currency,description,category,status,posted_at) values(v_customer,v_account.id,gen_random_uuid(),v_journal,'investment_deposit','debit',p_amount_minor,v_account.currency,'Transfer to simulated investments','Investment','posted',now());end if;return v_tx;
end;$$;

create or replace function public.trade_current_investment(p_investment_account_id uuid,p_instrument_id uuid,p_kind text,p_quantity numeric,p_idempotency_key text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_customer uuid;v_invest public.investment_accounts%rowtype;v_price numeric;v_cash bigint;v_clearing uuid;v_hash text;v_request private.idempotency_requests%rowtype;v_journal uuid;v_tx uuid;v_holding public.investment_holdings%rowtype;v_reduced bigint;
begin
 if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;if p_kind not in('buy','sell') or p_quantity<=0 or p_quantity>100000 then raise exception 'Invalid trade' using errcode='22023';end if;
 select id into v_customer from public.customers where auth_user_id=v_user and account_status='active';select * into v_invest from public.investment_accounts where id=p_investment_account_id and customer_id=v_customer and status='active' for update;
 select price into v_price from private.investment_prices where instrument_id=p_instrument_id and currency=v_invest.currency order by observed_at desc limit 1;
 if v_invest.id is null or v_price is null then raise exception 'Trade unavailable' using errcode='42501';end if;v_cash:=round(p_quantity*v_price*100);v_hash:=encode(extensions.digest(concat_ws('|',p_investment_account_id,p_instrument_id,p_kind,p_quantity,v_price,v_invest.currency),'sha256'),'hex');
 select * into v_request from private.idempotency_requests where actor_id=v_user and operation='investment_'||p_kind and key=p_idempotency_key;
 if found then if v_request.payload_hash<>v_hash then raise exception 'Idempotency payload mismatch' using errcode='23505';end if;if v_request.state='succeeded' then select id into v_tx from public.investment_transactions where journal_id=v_request.result_id;return v_tx;end if;end if;
 select * into v_holding from public.investment_holdings where investment_account_id=v_invest.id and instrument_id=p_instrument_id for update;
 if p_kind='buy' and (select -net_debit_minor from private.account_balances where ledger_account_id=v_invest.cash_ledger_account_id for update)<v_cash then raise exception 'Insufficient investment cash' using errcode='23514';end if;
 if p_kind='sell' and (v_holding.id is null or v_holding.quantity<p_quantity) then raise exception 'Insufficient holding' using errcode='23514';end if;
 select id into v_clearing from private.ledger_accounts where system_code='SIMULATED_INVESTMENT_CLEARING_USD';
 if p_kind='buy' then v_journal:=private.post_ledger_operation(v_user,'investment_buy',p_idempotency_key,v_hash,v_invest.cash_ledger_account_id,v_clearing,v_cash,now(),gen_random_uuid());else v_journal:=private.post_ledger_operation(v_user,'investment_sell',p_idempotency_key,v_hash,v_clearing,v_invest.cash_ledger_account_id,v_cash,now(),gen_random_uuid());end if;
 select id into v_tx from public.investment_transactions where journal_id=v_journal;
 if v_tx is null then
  if p_kind='buy' then insert into public.investment_holdings(customer_id,investment_account_id,instrument_id,currency,quantity,cost_basis_minor) values(v_customer,v_invest.id,p_instrument_id,v_invest.currency,p_quantity,v_cash) on conflict(investment_account_id,instrument_id) do update set quantity=public.investment_holdings.quantity+excluded.quantity,cost_basis_minor=public.investment_holdings.cost_basis_minor+excluded.cost_basis_minor;
  else v_reduced:=round(v_holding.cost_basis_minor*p_quantity/v_holding.quantity);update public.investment_holdings set quantity=quantity-p_quantity,cost_basis_minor=cost_basis_minor-v_reduced where id=v_holding.id;end if;
  insert into public.investment_transactions(customer_id,investment_account_id,instrument_id,currency,kind,quantity,price,cash_amount_minor,journal_id,occurred_at) values(v_customer,v_invest.id,p_instrument_id,v_invest.currency,p_kind,p_quantity,v_price,v_cash,v_journal,now()) returning id into v_tx;
 end if;return v_tx;
end;$$;

revoke all on function public.open_current_investment_account(),public.get_current_investment_overview(),public.get_current_investment_instruments(),public.fund_current_investment_account(uuid,uuid,bigint,text),public.trade_current_investment(uuid,uuid,text,numeric,text) from public,anon,authenticated,service_role;
grant execute on function public.open_current_investment_account(),public.get_current_investment_overview(),public.get_current_investment_instruments(),public.fund_current_investment_account(uuid,uuid,bigint,text),public.trade_current_investment(uuid,uuid,text,numeric,text) to authenticated;
