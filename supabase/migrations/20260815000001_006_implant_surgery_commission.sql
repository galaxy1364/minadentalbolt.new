/*
  # Implant surgery commission fields

  Adds the fields needed for a real, per-case surgeon commission engine
  for implant cases (previously only a single global net-split/percentage
  rule existed at the doctor level — implants need per-case flexibility
  since arrangements vary: negotiated flat fee vs formula-based, and
  which consumable costs count toward the deduction varies by case).

  1. Changes to `implant_cases`
    - `surgery_fee_mode` (text, 'formula' | 'negotiated') — how this
      case's surgeon share is determined
    - `surgery_fee_amount` (numeric) — the negotiated amount, only used
      when surgery_fee_mode = 'negotiated'
    - `surgery_settled` (boolean) — whether the surgeon has actually
      been paid for this case yet

  2. Changes to `implant_components`
    - `include_in_doctor_share` (boolean, default true) — whether this
      component's cost is deducted before computing the surgeon's share.
      Fixture is always excluded in application logic regardless of this
      flag (billed separately); other consumables (abutment, membrane,
      etc.) are opt-in per case.
*/

ALTER TABLE implant_cases
  ADD COLUMN IF NOT EXISTS surgery_fee_mode text CHECK (surgery_fee_mode IN ('formula', 'negotiated')),
  ADD COLUMN IF NOT EXISTS surgery_fee_amount numeric,
  ADD COLUMN IF NOT EXISTS surgery_settled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS gbr boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS membrane_used boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS extraction_needed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS prosthesis_doctor_id uuid REFERENCES doctors(id);

ALTER TABLE implant_components
  ADD COLUMN IF NOT EXISTS include_in_doctor_share boolean DEFAULT true;
