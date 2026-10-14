revoke select on public.payment_collections from authenticated;
grant select(id,account_id,provider,provider_reference,provider_transaction_id,amount_minor,currency,channel,status,paid_at,failure_code,created_at,updated_at) on public.payment_collections to authenticated;

revoke select on public.payout_withdrawals from authenticated;
grant select(id,account_id,provider,provider_reference,provider_transfer_id,amount_minor,currency,beneficiary_name,bank_name,masked_destination,status,failure_code,created_at,updated_at,completed_at) on public.payout_withdrawals to authenticated;
