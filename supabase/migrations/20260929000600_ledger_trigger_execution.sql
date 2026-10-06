-- Ledger integrity triggers must read private tables when invoked by an
-- authenticated narrow command. Their execute privilege remains revoked.
alter function private.validate_journal() security definer;
alter function private.reject_late_entry() security definer;
revoke all on function private.validate_journal(),private.reject_late_entry() from public,anon,authenticated,service_role;
