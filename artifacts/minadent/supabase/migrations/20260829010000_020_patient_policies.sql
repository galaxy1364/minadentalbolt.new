-- 020_patient_policies.sql — per-patient insurance policies (MOD-FEAT-005)
--
-- insurance_companies already holds the insurer (clinic-wide). This holds
-- what a specific patient is actually entitled to: their policy number,
-- validity window, coverage percentage, and — the part the app had no
-- concept of before — the ceiling (سقف تعهد) beyond which the insurer
-- pays nothing and the remainder falls on the patient.

create table if not exists public.patient_policies (
  id                  uuid primary key default gen_random_uuid(),
  clinic_id           uuid not null,
  patient_id          uuid not null references public.patients(id) on delete restrict,
  company_id          uuid references public.insurance_companies(id) on delete restrict,
  policy_number       text,
  start_date          date,
  end_date            date,
  coverage_percentage numeric(5,2) not null default 0
    check (coverage_percentage >= 0 and coverage_percentage <= 100),
  -- NULL means unlimited cover. 0 means a policy that pays nothing —
  -- a real case (a lapsed benefit), so it must stay distinguishable.
  ceiling_amount      numeric(14,0) check (ceiling_amount is null or ceiling_amount >= 0),
  is_active           boolean not null default true,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- Mirrors validatePolicy() in src/lib/insurance.ts so a malformed row
  -- cannot arrive through the API and bypass the client-side check.
  constraint patient_policies_date_order check (
    start_date is null or end_date is null or start_date <= end_date
  )
);

create index if not exists patient_policies_patient_idx on public.patient_policies (patient_id, is_active);
create index if not exists patient_policies_clinic_idx  on public.patient_policies (clinic_id);
create index if not exists patient_policies_company_idx on public.patient_policies (company_id);

alter table public.patient_policies enable row level security;

-- Clinic-scoped, never USING (true).
drop policy if exists patient_policies_select on public.patient_policies;
create policy patient_policies_select on public.patient_policies
  for select using (clinic_id = current_clinic_id());

drop policy if exists patient_policies_insert on public.patient_policies;
create policy patient_policies_insert on public.patient_policies
  for insert with check (clinic_id = current_clinic_id());

drop policy if exists patient_policies_update on public.patient_policies;
create policy patient_policies_update on public.patient_policies
  for update using (clinic_id = current_clinic_id())
              with check (clinic_id = current_clinic_id());

-- Deliberately no DELETE policy: a lapsed policy stays on file because
-- past treatments were priced against it.
