begin;

alter table public.clinics add column if not exists address_line text;
alter table public.clinics add column if not exists address_number text;
alter table public.clinics add column if not exists address_complement text;
alter table public.clinics add column if not exists neighborhood text;
alter table public.clinics add column if not exists city text;
alter table public.clinics add column if not exists state text;
alter table public.clinics add column if not exists postal_code text;
alter table public.clinics add column if not exists responsible_name text;

create table if not exists public.analysis_reports (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  title text not null,
  analysis_type text not null default 'operational'
    check (analysis_type in ('operational', 'clinical', 'financial', 'team', 'custom')),
  status text not null default 'draft' check (status in ('draft', 'final', 'archived')),
  notes text,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_analysis_reports_clinic_updated
  on public.analysis_reports (clinic_id, updated_at desc);

commit;
