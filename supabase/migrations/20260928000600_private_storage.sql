insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('bank-statements','bank-statements',false,10485760,array['application/pdf']),
 ('bank-documents','bank-documents',false,5242880,array['application/pdf','image/png','image/jpeg']),
 ('bank-test-checks','bank-test-checks',false,5242880,array['image/png','image/jpeg']);
-- No customer uploads or mutations until validation/quarantine workflows exist.
-- Full object-key lookup binds access to a trusted owner record, not just a path prefix.
create policy bank_statements_read on storage.objects for select to authenticated using(
 bucket_id='bank-statements' and exists(select 1 from public.statements s where s.object_key=name and s.status='ready' and private.owns_customer(s.customer_id))
);
create policy bank_documents_read on storage.objects for select to authenticated using(
 bucket_id='bank-documents' and exists(select 1 from public.customer_documents d where d.object_key=name and d.status='ready' and private.owns_customer(d.customer_id))
);
create policy bank_checks_read on storage.objects for select to authenticated using(
 bucket_id='bank-test-checks' and exists(select 1 from public.check_deposits d where d.object_key=name and private.owns_customer(d.customer_id))
);
