-- Persisted Phase 4 registration and synthetic identity verification commands.
create table public.registration_drafts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete restrict,
  current_step text not null default 'personal' check (current_step in ('personal','address','employment','review')),
  first_name text check (first_name is null or char_length(first_name) between 1 and 100),
  middle_name text check (middle_name is null or char_length(middle_name) <= 100),
  last_name text check (last_name is null or char_length(last_name) between 1 and 100),
  date_of_birth date check (date_of_birth is null or date_of_birth between current_date - interval '120 years' and current_date - interval '18 years'),
  phone text check (phone is null or char_length(phone) between 7 and 32),
  line1 text check (line1 is null or char_length(line1) between 1 and 200),
  line2 text check (line2 is null or char_length(line2) <= 200),
  city text check (city is null or char_length(city) between 1 and 100),
  state text check (state is null or char_length(state) between 1 and 100),
  postal_code text check (postal_code is null or char_length(postal_code) between 1 and 20),
  country text check (country is null or country ~ '^[A-Z]{2}$'),
  employment text check (employment is null or char_length(employment) between 1 and 200),
  income_range text check (income_range is null or income_range in ('under_25000','25000_49999','50000_74999','75000_99999','100000_149999','150000_plus')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.registration_drafts enable row level security;
revoke all on table public.registration_drafts from public, anon, authenticated, service_role;
grant select on table public.registration_drafts to authenticated;
create policy registration_draft_owner_read on public.registration_drafts for select to authenticated
using (auth_user_id = (select auth.uid()) and (select private.session_is_active()));
create trigger touch_updated_at before update on public.registration_drafts
for each row execute function private.touch_updated_at();

create unique index verification_records_one_pending_idx
on public.verification_records(customer_id) where status = 'pending';

create or replace function public.save_current_registration_personal(
  p_first_name text,
  p_middle_name text,
  p_last_name text,
  p_date_of_birth date,
  p_phone text
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid := auth.uid(); v_id uuid;
begin
  if v_user_id is null or not private.session_is_active() then raise exception 'AUTHENTICATION_REQUIRED' using errcode = '28000'; end if;
  if nullif(btrim(p_first_name),'') is null or char_length(btrim(p_first_name)) > 100
    or nullif(btrim(p_last_name),'') is null or char_length(btrim(p_last_name)) > 100
    or p_middle_name is not null and char_length(btrim(p_middle_name)) > 100
    or p_date_of_birth not between current_date - interval '120 years' and current_date - interval '18 years'
    or nullif(btrim(p_phone),'') is null or char_length(btrim(p_phone)) not between 7 and 32
  then raise exception 'INVALID_REGISTRATION_PERSONAL' using errcode = '22023'; end if;
  if exists(select 1 from public.customers where auth_user_id=v_user_id) then raise exception 'REGISTRATION_COMPLETE' using errcode = '23505'; end if;
  insert into public.registration_drafts(auth_user_id,current_step,first_name,middle_name,last_name,date_of_birth,phone)
  values(v_user_id,'address',btrim(p_first_name),nullif(btrim(p_middle_name),''),btrim(p_last_name),p_date_of_birth,btrim(p_phone))
  on conflict(auth_user_id) do update set
    current_step='address',first_name=excluded.first_name,middle_name=excluded.middle_name,last_name=excluded.last_name,
    date_of_birth=excluded.date_of_birth,phone=excluded.phone
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.save_current_registration_address(
  p_line1 text,
  p_line2 text,
  p_city text,
  p_state text,
  p_postal_code text,
  p_country text
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid := auth.uid(); v_id uuid;
begin
  if v_user_id is null or not private.session_is_active() then raise exception 'AUTHENTICATION_REQUIRED' using errcode = '28000'; end if;
  if nullif(btrim(p_line1),'') is null or char_length(btrim(p_line1)) > 200
    or nullif(btrim(p_city),'') is null or char_length(btrim(p_city)) > 100
    or nullif(btrim(p_state),'') is null or char_length(btrim(p_state)) > 100
    or nullif(btrim(p_postal_code),'') is null or char_length(btrim(p_postal_code)) > 20
    or upper(btrim(p_country)) !~ '^[A-Z]{2}$'
    or p_line2 is not null and char_length(btrim(p_line2)) > 200
  then raise exception 'INVALID_REGISTRATION_ADDRESS' using errcode = '22023'; end if;
  update public.registration_drafts set
    current_step='employment',line1=btrim(p_line1),line2=nullif(btrim(p_line2),''),city=btrim(p_city),state=btrim(p_state),
    postal_code=btrim(p_postal_code),country=upper(btrim(p_country))
  where auth_user_id=v_user_id and first_name is not null and last_name is not null
  returning id into v_id;
  if v_id is null then raise exception 'PERSONAL_STEP_REQUIRED' using errcode = '23514'; end if;
  return v_id;
end $$;

create or replace function public.save_current_registration_employment(p_employment text,p_income_range text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid := auth.uid(); v_id uuid;
begin
  if v_user_id is null or not private.session_is_active() then raise exception 'AUTHENTICATION_REQUIRED' using errcode = '28000'; end if;
  if nullif(btrim(p_employment),'') is null or char_length(btrim(p_employment)) > 200
    or p_income_range not in ('under_25000','25000_49999','50000_74999','75000_99999','100000_149999','150000_plus')
  then raise exception 'INVALID_REGISTRATION_EMPLOYMENT' using errcode = '22023'; end if;
  update public.registration_drafts set current_step='review',employment=btrim(p_employment),income_range=p_income_range
  where auth_user_id=v_user_id and line1 is not null and city is not null and postal_code is not null and country is not null
  returning id into v_id;
  if v_id is null then raise exception 'ADDRESS_STEP_REQUIRED' using errcode = '23514'; end if;
  return v_id;
end $$;

create or replace function public.complete_current_registration()
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid(); v_email text; v_draft public.registration_drafts%rowtype; v_profile_id uuid; v_customer_id uuid;
begin
  if v_user_id is null or not private.session_is_active() then raise exception 'AUTHENTICATION_REQUIRED' using errcode = '28000'; end if;
  select id into v_customer_id from public.customers where auth_user_id=v_user_id;
  if v_customer_id is not null then return v_customer_id; end if;
  v_email := nullif(nullif(current_setting('request.jwt.claims',true),'')::jsonb ->> 'email','');
  if v_email is null then raise exception 'VERIFIED_EMAIL_REQUIRED' using errcode = '23514'; end if;
  select * into v_draft from public.registration_drafts where auth_user_id=v_user_id for update;
  if v_draft.current_step <> 'review' or v_draft.first_name is null or v_draft.last_name is null or v_draft.date_of_birth is null
    or v_draft.phone is null or v_draft.line1 is null or v_draft.city is null or v_draft.state is null or v_draft.postal_code is null
    or v_draft.country is null or v_draft.employment is null or v_draft.income_range is null
  then raise exception 'REGISTRATION_INCOMPLETE' using errcode = '23514'; end if;
  insert into public.profiles(auth_user_id,display_name) values(v_user_id,v_draft.first_name||' '||v_draft.last_name) returning id into v_profile_id;
  insert into public.customers(auth_user_id,profile_id,first_name,middle_name,last_name,contact_email,phone,date_of_birth,employment,income_range)
  values(v_user_id,v_profile_id,v_draft.first_name,v_draft.middle_name,v_draft.last_name,lower(v_email),v_draft.phone,v_draft.date_of_birth,v_draft.employment,v_draft.income_range)
  returning id into v_customer_id;
  insert into public.addresses(customer_id,line1,line2,city,state,postal_code,country,type,is_primary)
  values(v_customer_id,v_draft.line1,v_draft.line2,v_draft.city,v_draft.state,v_draft.postal_code,v_draft.country,'home',true);
  insert into public.customer_preferences(customer_id) values(v_customer_id);
  insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,correlation_id)
  values(v_user_id,'customer','registration.completed','customer',v_customer_id,gen_random_uuid());
  delete from public.registration_drafts where id=v_draft.id;
  return v_customer_id;
end $$;

create or replace function public.begin_current_synthetic_verification(p_fixture_id text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid := auth.uid(); v_customer_id uuid; v_record_id uuid;
begin
  if v_user_id is null or not private.session_is_active() then raise exception 'AUTHENTICATION_REQUIRED' using errcode = '28000'; end if;
  if p_fixture_id not in ('SIM-VERIFIED-001','SIM-FAILED-001','SIM-REVIEW-001') then raise exception 'SYNTHETIC_FIXTURE_REQUIRED' using errcode = '22023'; end if;
  select id into v_customer_id from public.customers where auth_user_id=v_user_id and verification_status <> 'verified' for update;
  if v_customer_id is null then raise exception 'CUSTOMER_NOT_ELIGIBLE' using errcode = '23514'; end if;
  select id into v_record_id from public.verification_records where customer_id=v_customer_id and status='pending';
  if v_record_id is not null then return v_record_id; end if;
  insert into public.verification_records(customer_id,provider,synthetic_fixture_id,status,provider_reference)
  values(v_customer_id,'simulator',p_fixture_id,'pending','SIM-'||gen_random_uuid()::text) returning id into v_record_id;
  update public.customers set verification_status='pending' where id=v_customer_id;
  return v_record_id;
end $$;

create or replace function public.complete_current_synthetic_verification(p_record_id uuid,p_test_answer text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid := auth.uid(); v_record public.verification_records%rowtype; v_status text; v_reason text;
begin
  if v_user_id is null or not private.session_is_active() then raise exception 'AUTHENTICATION_REQUIRED' using errcode = '28000'; end if;
  select vr.* into v_record from public.verification_records vr join public.customers c on c.id=vr.customer_id
  where vr.id=p_record_id and c.auth_user_id=v_user_id and vr.status='pending' for update of vr;
  if v_record.id is null then raise exception 'PENDING_VERIFICATION_REQUIRED' using errcode = '23514'; end if;
  if p_test_answer <> 'BANK-SYNTHETIC-ONLY' then v_status := 'failed'; v_reason := 'synthetic_answer_mismatch';
  elsif v_record.synthetic_fixture_id='SIM-VERIFIED-001' then v_status := 'verified'; v_reason := null;
  elsif v_record.synthetic_fixture_id='SIM-FAILED-001' then v_status := 'failed'; v_reason := 'synthetic_fixture_failed';
  else v_status := 'manual_review'; v_reason := 'synthetic_manual_review'; end if;
  update public.verification_records set status=v_status,reason_code=v_reason where id=v_record.id;
  update public.customers set verification_status=v_status where id=v_record.customer_id;
  insert into private.audit_logs(actor_id,actor_role,action,resource_type,resource_id,reason_code,correlation_id)
  values(v_user_id,'customer','identity_verification.completed','verification_record',v_record.id,v_reason,gen_random_uuid());
  return v_status;
end $$;

do $$
declare signature text;
begin
  foreach signature in array array[
    'public.save_current_registration_personal(text,text,text,date,text)',
    'public.save_current_registration_address(text,text,text,text,text,text)',
    'public.save_current_registration_employment(text,text)',
    'public.complete_current_registration()',
    'public.begin_current_synthetic_verification(text)',
    'public.complete_current_synthetic_verification(uuid,text)'
  ] loop
    execute 'revoke all on function '||signature||' from public,anon,service_role';
    execute 'grant execute on function '||signature||' to authenticated';
  end loop;
end $$;
