-- 021_treatment_insurance_settlement.sql — freeze the insurance split
-- onto each treatment (MOD-FEAT-007).
--
-- Why store rather than derive: the split depends on how much ceiling
-- remained *at the time*. Recomputing it a month later, after further
-- claims have consumed the ceiling, produces a different number than the
-- one the patient was quoted and agreed to. The quote is a commitment,
-- so it is recorded.
--
-- All columns are nullable and default to NULL so every existing row
-- stays valid and simply reads as "uninsured" — see readSettlement() in
-- src/lib/insurance.ts.

alter table public.treatments
  add column if not exists policy_id              uuid references public.patient_policies(id) on delete set null,
  add column if not exists insurance_share        numeric(14,0),
  add column if not exists patient_share          numeric(14,0),
  add column if not exists insurance_capped       boolean,
  add column if not exists insurance_submitted    boolean not null default false,
  add column if not exists insurance_submitted_at timestamptz;

-- Neither share may be negative; a discount larger than the line total
-- must never invert into the clinic owing the patient.
alter table public.treatments
  drop constraint if exists treatments_shares_non_negative;
alter table public.treatments
  add constraint treatments_shares_non_negative check (
    (insurance_share is null or insurance_share >= 0)
    and (patient_share is null or patient_share >= 0)
  );

-- A submission timestamp without the flag (or the reverse) would make
-- the worklist disagree with the audit trail.
alter table public.treatments
  drop constraint if exists treatments_submission_consistent;
alter table public.treatments
  add constraint treatments_submission_consistent check (
    insurance_submitted = false or insurance_submitted_at is not null
  );

-- Drives the "waiting to be submitted" worklist; partial so it stays
-- small as submitted rows accumulate.
create index if not exists treatments_pending_claim_idx
  on public.treatments (clinic_id, patient_id)
  where insurance_submitted = false and insurance_share is not null;

-- RLS already enabled on public.treatments with clinic-scoped policies;
-- new columns inherit it, so nothing further is needed here.
