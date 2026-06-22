begin;

create table if not exists public.patient_profiles (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null unique references public.patients(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  age integer not null check (age between 0 and 130),
  condition text not null check (condition in ('lombalgia', 'cervicalgia', 'ombro', 'joelho')),
  severity text not null check (severity in ('mild', 'moderate', 'severe')),
  pain_level integer not null check (pain_level between 0 and 10),
  lifestyle text not null check (lifestyle in ('sedentary', 'active', 'very_active')),
  updated_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.patient_profile_history (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  age integer not null check (age between 0 and 130),
  condition text not null check (condition in ('lombalgia', 'cervicalgia', 'ombro', 'joelho')),
  severity text not null check (severity in ('mild', 'moderate', 'severe')),
  pain_level integer not null check (pain_level between 0 and 10),
  lifestyle text not null check (lifestyle in ('sedentary', 'active', 'very_active')),
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists idx_patient_profiles_clinic_patient
  on public.patient_profiles (clinic_id, patient_id);

create index if not exists idx_patient_profile_history_clinic_patient_created
  on public.patient_profile_history (clinic_id, patient_id, created_at desc);

create or replace function public.enforce_patient_profile_clinic()
returns trigger
language plpgsql
as $$
declare
  patient_clinic_id uuid;
  responsible_clinic_id uuid;
  responsible_user_id uuid;
begin
  select clinic_id into patient_clinic_id from public.patients where id = new.patient_id;
  responsible_user_id := coalesce(
    nullif(to_jsonb(new) ->> 'updated_by', ''),
    nullif(to_jsonb(new) ->> 'created_by', '')
  )::uuid;
  select clinic_id into responsible_clinic_id from public.users where id = responsible_user_id;

  if patient_clinic_id is null
     or responsible_clinic_id is null
     or patient_clinic_id <> new.clinic_id
     or responsible_clinic_id <> new.clinic_id then
    raise exception 'Cross-clinic patient profile reference blocked'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists tenant_guard_patient_profiles on public.patient_profiles;
create trigger tenant_guard_patient_profiles
before insert or update on public.patient_profiles
for each row execute function public.enforce_patient_profile_clinic();

drop trigger if exists tenant_guard_patient_profile_history on public.patient_profile_history;
create trigger tenant_guard_patient_profile_history
before insert or update on public.patient_profile_history
for each row execute function public.enforce_patient_profile_clinic();

commit;
