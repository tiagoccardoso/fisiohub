begin;

alter table public.clinics add column if not exists stripe_customer_id text;
alter table public.clinics add column if not exists stripe_subscription_id text;

create table if not exists public.clinic_subscriptions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  plan text not null default 'unknown' check (plan in ('trial', 'monthly', 'yearly', 'unknown')),
  status text not null default 'incomplete',
  trial_start timestamptz,
  trial_end timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at timestamptz,
  canceled_at timestamptz,
  cancel_at_period_end boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinic_subscriptions_clinic_unique unique (clinic_id)
);

create unique index if not exists clinic_subscriptions_stripe_customer_unique
  on public.clinic_subscriptions (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists clinic_subscriptions_stripe_subscription_unique
  on public.clinic_subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

create index if not exists idx_clinic_subscriptions_status
  on public.clinic_subscriptions (status);

create index if not exists idx_clinic_subscriptions_clinic_status
  on public.clinic_subscriptions (clinic_id, status);

create table if not exists public.stripe_events (
  id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

create index if not exists idx_stripe_events_processed_at
  on public.stripe_events (processed_at desc);

commit;
