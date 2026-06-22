begin;

create or replace function public.is_valid_cpf(value text)
returns boolean
language plpgsql
immutable
strict
as $$
declare
  digits text := regexp_replace(value, '[^0-9]', '', 'g');
  total integer;
  remainder integer;
  expected_digit integer;
  position integer;
begin
  if length(digits) <> 11 or digits ~ '^([0-9])\1{10}$' then
    return false;
  end if;

  total := 0;
  for position in 1..9 loop
    total := total + substring(digits, position, 1)::integer * (11 - position);
  end loop;
  remainder := (total * 10) % 11;
  expected_digit := case when remainder = 10 then 0 else remainder end;
  if expected_digit <> substring(digits, 10, 1)::integer then
    return false;
  end if;

  total := 0;
  for position in 1..10 loop
    total := total + substring(digits, position, 1)::integer * (12 - position);
  end loop;
  remainder := (total * 10) % 11;
  expected_digit := case when remainder = 10 then 0 else remainder end;
  return expected_digit = substring(digits, 11, 1)::integer;
end;
$$;

alter table public.patients drop constraint if exists patients_cpf_required_valid;
alter table public.patients
  add constraint patients_cpf_required_valid
  check (cpf is not null and public.is_valid_cpf(cpf)) not valid;

alter table public.patients drop constraint if exists patients_cpf_key;

-- New and updated rows are protected immediately. Validate legacy rows only when safe.
do $$
begin
  if not exists (
    select 1
      from public.patients
     where cpf is null or not public.is_valid_cpf(cpf)
  ) then
    alter table public.patients validate constraint patients_cpf_required_valid;
    alter table public.patients alter column cpf set not null;
  else
    raise notice 'CPF constraint applies to new rows; correct legacy patients before validation.';
  end if;
end $$;

drop index if exists public.idx_patients_cpf;
do $$
begin
  if not exists (
    select 1
      from public.patients
     where cpf is not null
     group by clinic_id, regexp_replace(cpf, '[^0-9]', '', 'g')
    having count(*) > 1
  ) then
    create unique index if not exists patients_clinic_cpf_unique
      on public.patients (clinic_id, regexp_replace(cpf, '[^0-9]', '', 'g'));
  else
    raise notice 'Correct duplicate CPFs within each clinic before creating patients_clinic_cpf_unique.';
  end if;
end $$;

commit;
