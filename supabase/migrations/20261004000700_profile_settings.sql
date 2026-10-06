-- Milestone C customer profile, preferences, address and private synthetic documents.
create policy bank_documents_insert_quarantined on storage.objects for insert to authenticated with check(
  bucket_id='bank-documents' and exists(
    select 1 from public.customer_documents d
    where d.object_key=name and d.status='quarantined' and private.owns_customer(d.customer_id)
  )
);

create policy bank_documents_delete_owned on storage.objects for delete to authenticated using(
  bucket_id='bank-documents' and exists(
    select 1 from public.customer_documents d
    where d.object_key=name and private.owns_customer(d.customer_id)
  )
);

create or replace function public.update_current_contact(p_display_name text,p_phone text)
returns void language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_customer_id uuid;v_profile_id uuid;
begin
  if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
  if char_length(btrim(p_display_name)) not between 1 and 120 or p_phone is null or char_length(btrim(p_phone)) not between 7 and 32 or btrim(p_phone)!~'^\+?[0-9 ()-]+$' then raise exception 'Invalid contact details' using errcode='22023';end if;
  select c.id,c.profile_id into v_customer_id,v_profile_id from public.customers c where c.auth_user_id=v_user and c.account_status<>'closed' for update;
  if v_customer_id is null then raise exception 'Customer unavailable' using errcode='42501';end if;
  update public.profiles set display_name=btrim(p_display_name) where id=v_profile_id;
  update public.customers set phone=btrim(p_phone) where id=v_customer_id;
  insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(v_user,'customer','profile.contact_updated','customer',v_customer_id,gen_random_uuid());
end;$$;

create or replace function public.update_current_primary_address(p_line1 text,p_line2 text,p_city text,p_state text,p_postal_code text,p_country text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_customer_id uuid;v_address_id uuid;
begin
  if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
  if char_length(btrim(p_line1)) not between 1 and 200 or char_length(btrim(p_city)) not between 1 and 100 or char_length(btrim(p_postal_code)) not between 1 and 20 or upper(btrim(p_country))!~'^[A-Z]{2}$' or char_length(coalesce(btrim(p_line2),''))>200 or char_length(coalesce(btrim(p_state),''))>100 then raise exception 'Invalid address' using errcode='22023';end if;
  select id into v_customer_id from public.customers where auth_user_id=v_user and account_status<>'closed';
  if v_customer_id is null then raise exception 'Customer unavailable' using errcode='42501';end if;
  select id into v_address_id from public.addresses where customer_id=v_customer_id and type='home' and is_primary for update;
  if v_address_id is null then
    insert into public.addresses(customer_id,line1,line2,city,state,postal_code,country,type,is_primary) values(v_customer_id,btrim(p_line1),nullif(btrim(p_line2),''),btrim(p_city),nullif(btrim(p_state),''),btrim(p_postal_code),upper(btrim(p_country)),'home',true) returning id into v_address_id;
  else
    update public.addresses set line1=btrim(p_line1),line2=nullif(btrim(p_line2),''),city=btrim(p_city),state=nullif(btrim(p_state),''),postal_code=btrim(p_postal_code),country=upper(btrim(p_country)) where id=v_address_id;
  end if;
  insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(v_user,'customer','profile.address_updated','address',v_address_id,gen_random_uuid());
  return v_address_id;
end;$$;

create or replace function public.update_current_preferences(p_locale text,p_timezone text,p_marketing_opt_in boolean,p_hide_balances boolean)
returns void language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_customer_id uuid;v_profile_id uuid;
begin
  if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
  if p_locale not in('en-US','en-GB') or p_timezone not in('UTC','Africa/Lagos','America/New_York','America/Chicago','America/Denver','America/Los_Angeles','Europe/London') then raise exception 'Unsupported preference' using errcode='22023';end if;
  select id,profile_id into v_customer_id,v_profile_id from public.customers where auth_user_id=v_user and account_status<>'closed';
  if v_customer_id is null then raise exception 'Customer unavailable' using errcode='42501';end if;
  insert into public.customer_preferences(customer_id,locale,timezone,marketing_opt_in,hide_balances) values(v_customer_id,p_locale,p_timezone,p_marketing_opt_in,p_hide_balances)
  on conflict(customer_id) do update set locale=excluded.locale,timezone=excluded.timezone,marketing_opt_in=excluded.marketing_opt_in,hide_balances=excluded.hide_balances;
  update public.profiles set locale=p_locale,timezone=p_timezone where id=v_profile_id;
  insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(v_user,'customer','profile.preferences_updated','customer',v_customer_id,gen_random_uuid());
end;$$;

create or replace function public.begin_current_document_upload(p_document_id uuid,p_kind text,p_object_key text,p_mime_type text,p_size_bytes bigint)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_customer_id uuid;v_extension text;
begin
  if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
  if p_kind not in('synthetic_identity','correspondence') or p_mime_type not in('application/pdf','image/png','image/jpeg') or p_size_bytes not between 1 and 5242880 then raise exception 'Invalid document' using errcode='22023';end if;
  select id into v_customer_id from public.customers where auth_user_id=v_user and account_status='active';
  if v_customer_id is null then raise exception 'Customer unavailable' using errcode='42501';end if;
  v_extension:=case p_mime_type when 'application/pdf' then '.pdf' when 'image/png' then '.png' else '.jpg' end;
  if p_object_key<>v_customer_id||'/'||p_document_id||v_extension then raise exception 'Invalid object key' using errcode='22023';end if;
  insert into public.customer_documents(id,customer_id,kind,object_key,mime_type,size_bytes,status) values(p_document_id,v_customer_id,p_kind,p_object_key,p_mime_type,p_size_bytes,'quarantined');
  return p_document_id;
end;$$;

create or replace function public.finalize_current_document_upload(p_document_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_document public.customer_documents%rowtype;v_object storage.objects%rowtype;
begin
  if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
  select d.* into v_document from public.customer_documents d join public.customers c on c.id=d.customer_id where d.id=p_document_id and c.auth_user_id=v_user for update of d;
  if not found or v_document.status<>'quarantined' then raise exception 'Document unavailable' using errcode='42501';end if;
  select * into v_object from storage.objects where bucket_id='bank-documents' and name=v_document.object_key;
  if not found or coalesce((v_object.metadata->>'size')::bigint,0)<>v_document.size_bytes or coalesce(v_object.metadata->>'mimetype','')<>v_document.mime_type then raise exception 'Uploaded object mismatch' using errcode='23514';end if;
  update public.customer_documents set status='ready' where id=p_document_id;
  insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(v_user,'customer','document.uploaded','customer_document',p_document_id,gen_random_uuid());
end;$$;

create or replace function public.delete_current_document(p_document_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_deleted uuid;
begin
  if v_user is null or not private.session_is_active() then raise exception 'Active session required' using errcode='42501';end if;
  delete from public.customer_documents d using public.customers c where d.id=p_document_id and d.customer_id=c.id and c.auth_user_id=v_user returning d.id into v_deleted;
  if v_deleted is null then raise exception 'Document unavailable' using errcode='42501';end if;
  insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id) values(v_user,'customer','document.deleted','customer_document',p_document_id,gen_random_uuid());
end;$$;

revoke all on function public.update_current_contact(text,text),public.update_current_primary_address(text,text,text,text,text,text),public.update_current_preferences(text,text,boolean,boolean),public.begin_current_document_upload(uuid,text,text,text,bigint),public.finalize_current_document_upload(uuid),public.delete_current_document(uuid) from public,anon,authenticated,service_role;
grant execute on function public.update_current_contact(text,text),public.update_current_primary_address(text,text,text,text,text,text),public.update_current_preferences(text,text,boolean,boolean),public.begin_current_document_upload(uuid,text,text,text,bigint),public.finalize_current_document_upload(uuid),public.delete_current_document(uuid) to authenticated;
