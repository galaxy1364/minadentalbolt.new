/*
  # Link login accounts to staff records

  Needed so Staff.tsx can find and toggle a specific person's login
  access (suspend/reactivate) without a fragile email/phone match.
  Mirrors the doctor_id link added in migration 015 for the same
  reason.
*/

ALTER TABLE users ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES staff(id);
