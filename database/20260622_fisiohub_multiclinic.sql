begin;

create extension if not exists citext;
create extension if not exists pgcrypto;

create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  legal_name text,
  document_number text,
  phone text not null,
  email citext not null,
  address text not null,
  logo_url text,
  is_active boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists clinics_document_number_unique
  on public.clinics (regexp_replace(document_number, '[^0-9]', '', 'g'))
  where document_number is not null and document_number <> '';

-- Existing installations were single-clinic. Keep every current row together.
insert into public.clinics (name, slug, phone, email, address)
select 'Clinica Principal', 'clinica-principal', 'Nao informado', 'contato@clinica.local', 'Nao informado'
where not exists (select 1 from public.clinics);

do $$
declare
  tenant_table text;
begin
  foreach tenant_table in array array[
    'users', 'app_sessions', 'patients', 'patient_records', 'notebooks', 'pages',
    'document_versions', 'projects', 'project_patients', 'tasks', 'project_collaborators',
    'notebook_collaborators', 'comments', 'activity_logs', 'mentorships', 'progress_notes',
    'competency_evaluations', 'calendar_events', 'services', 'professional_services',
    'professional_working_hours', 'professional_time_off', 'appointments', 'notifications',
    'notification_settings', 'physiotherapy_evaluations', 'treatment_sessions',
    'exercise_library', 'exercises', 'exercise_prescriptions', 'prescription_exercises',
    'exercise_executions', 'goniometry_measurements', 'functional_test_results',
    'evolution_photos', 'clinical_reports', 'clinic_settings', 'site_pages', 'site_assets'
  ] loop
    if to_regclass('public.' || tenant_table) is not null then
      execute format('alter table public.%I add column if not exists clinic_id uuid', tenant_table);
      execute format(
        'update public.%I set clinic_id = (select id from public.clinics order by created_at limit 1) where clinic_id is null',
        tenant_table
      );
      execute format('alter table public.%I alter column clinic_id set not null', tenant_table);
      if not exists (
        select 1 from pg_constraint
         where conrelid = ('public.' || tenant_table)::regclass
           and conname = tenant_table || '_clinic_id_fkey'
      ) then
        execute format(
          'alter table public.%I add constraint %I foreign key (clinic_id) references public.clinics(id) on delete restrict',
          tenant_table,
          tenant_table || '_clinic_id_fkey'
        );
      end if;
      execute format('create index if not exists %I on public.%I (clinic_id)', 'idx_' || tenant_table || '_clinic_id', tenant_table);
    end if;
  end loop;
end $$;

alter table public.patients drop constraint if exists patients_cpf_key;
create unique index if not exists patients_clinic_cpf_unique
  on public.patients (clinic_id, regexp_replace(cpf, '[^0-9]', '', 'g'))
  where cpf is not null and cpf <> '';

create or replace function public.enforce_same_clinic_reference()
returns trigger
language plpgsql
as $$
declare
  reference_id uuid;
  reference_clinic_id uuid;
begin
  reference_id := nullif(to_jsonb(new) ->> tg_argv[1], '')::uuid;
  if reference_id is null then
    return new;
  end if;

  execute format('select clinic_id from public.%I where id = $1', tg_argv[0])
    into reference_clinic_id using reference_id;

  if reference_clinic_id is null or reference_clinic_id <> new.clinic_id then
    raise exception 'Cross-clinic reference blocked for %.%', tg_table_name, tg_argv[1]
      using errcode = '42501';
  end if;
  return new;
end;
$$;

do $$
declare
  rule record;
  trigger_name text;
begin
  for rule in
    select * from (values
      ('patient_records', 'patients', 'patient_id'),
      ('patient_records', 'users', 'created_by'),
      ('pages', 'notebooks', 'notebook_id'),
      ('pages', 'pages', 'parent_id'),
      ('pages', 'pages', 'parent_page_id'),
      ('project_patients', 'projects', 'project_id'),
      ('project_patients', 'patients', 'patient_id'),
      ('tasks', 'projects', 'project_id'),
      ('tasks', 'tasks', 'parent_task_id'),
      ('tasks', 'patients', 'patient_id'),
      ('tasks', 'users', 'assigned_to'),
      ('tasks', 'users', 'assignee_id'),
      ('project_collaborators', 'projects', 'project_id'),
      ('project_collaborators', 'users', 'user_id'),
      ('notebook_collaborators', 'notebooks', 'notebook_id'),
      ('notebook_collaborators', 'users', 'user_id'),
      ('mentorships', 'users', 'mentor_id'),
      ('mentorships', 'users', 'mentee_id'),
      ('mentorships', 'users', 'intern_id'),
      ('progress_notes', 'mentorships', 'mentorship_id'),
      ('competency_evaluations', 'mentorships', 'mentorship_id'),
      ('calendar_events', 'patients', 'patient_id'),
      ('calendar_events', 'users', 'professional_id'),
      ('appointments', 'patients', 'patient_id'),
      ('appointments', 'users', 'professional_id'),
      ('appointments', 'services', 'service_id'),
      ('appointments', 'calendar_events', 'calendar_event_id'),
      ('notifications', 'users', 'user_id'),
      ('notification_settings', 'users', 'user_id'),
      ('physiotherapy_evaluations', 'patients', 'patient_id'),
      ('physiotherapy_evaluations', 'users', 'evaluator_id'),
      ('treatment_sessions', 'patients', 'patient_id'),
      ('treatment_sessions', 'users', 'therapist_id'),
      ('treatment_sessions', 'physiotherapy_evaluations', 'evaluation_id'),
      ('treatment_sessions', 'appointments', 'appointment_id'),
      ('exercise_prescriptions', 'patients', 'patient_id'),
      ('exercise_prescriptions', 'users', 'prescribed_by'),
      ('exercise_prescriptions', 'physiotherapy_evaluations', 'evaluation_id'),
      ('prescription_exercises', 'exercise_prescriptions', 'prescription_id'),
      ('prescription_exercises', 'exercise_library', 'exercise_id'),
      ('prescription_exercises', 'exercises', 'legacy_exercise_id'),
      ('exercise_executions', 'prescription_exercises', 'prescription_exercise_id'),
      ('exercise_executions', 'patients', 'patient_id'),
      ('goniometry_measurements', 'physiotherapy_evaluations', 'evaluation_id'),
      ('goniometry_measurements', 'patients', 'patient_id'),
      ('functional_test_results', 'physiotherapy_evaluations', 'evaluation_id'),
      ('functional_test_results', 'patients', 'patient_id'),
      ('evolution_photos', 'patients', 'patient_id'),
      ('evolution_photos', 'users', 'uploaded_by'),
      ('clinical_reports', 'patients', 'patient_id'),
      ('clinical_reports', 'users', 'generated_by')
    ) as rules(child_table, parent_table, reference_column)
  loop
    if to_regclass('public.' || rule.child_table) is not null
       and to_regclass('public.' || rule.parent_table) is not null then
      trigger_name := 'tenant_guard_' || rule.reference_column;
      execute format('drop trigger if exists %I on public.%I', trigger_name, rule.child_table);
      execute format(
        'create trigger %I before insert or update on public.%I for each row execute function public.enforce_same_clinic_reference(%L, %L)',
        trigger_name, rule.child_table, rule.parent_table, rule.reference_column
      );
    end if;
  end loop;
end $$;

commit;
