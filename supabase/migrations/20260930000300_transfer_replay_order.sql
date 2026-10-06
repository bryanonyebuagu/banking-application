-- Recheck a transfer's stored idempotent result after acquiring balance locks,
-- before evaluating the post-transfer available balance.
create or replace function private.post_customer_debit_operation(
  p_actor_id uuid,p_operation text,p_idempotency_key text,p_payload_hash text,
  p_source_ledger_id uuid,p_destination_ledger_id uuid,p_amount_minor bigint,p_correlation_id uuid
) returns uuid language plpgsql security definer set search_path=''
as $$
declare v_balance bigint;v_held bigint;v_request private.idempotency_requests%rowtype;
begin
  perform 1 from private.account_balances where ledger_account_id in(p_source_ledger_id,p_destination_ledger_id) order by ledger_account_id for update;
  select * into v_request from private.idempotency_requests where actor_id=p_actor_id and operation=p_operation and key=p_idempotency_key for update;
  if found then
    if v_request.payload_hash<>p_payload_hash then raise exception 'Idempotency payload mismatch' using errcode='23505';end if;
    if v_request.state='succeeded' then return v_request.result_id;end if;
  end if;
  select -net_debit_minor into v_balance from private.account_balances where ledger_account_id=p_source_ledger_id;
  select coalesce(sum(amount_minor),0) into v_held from private.balance_holds where ledger_account_id=p_source_ledger_id and status='active' and expires_at>now();
  if v_balance-v_held<p_amount_minor then raise exception 'Insufficient available balance' using errcode='P0001';end if;
  return private.post_ledger_operation(p_actor_id,p_operation,p_idempotency_key,p_payload_hash,p_source_ledger_id,p_destination_ledger_id,p_amount_minor,now(),p_correlation_id);
end;
$$;
revoke all on function private.post_customer_debit_operation(uuid,text,text,text,uuid,uuid,bigint,uuid) from public,anon,authenticated,service_role;
