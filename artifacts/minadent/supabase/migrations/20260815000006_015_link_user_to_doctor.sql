/*
  # Link login accounts to doctor records

  Without this, a logged-in user with role='doctor' had no way to
  determine WHICH row in the doctors table was actually theirs — this
  blocks any doctor-specific filtering/view (their own appointments,
  patients, commission) since nothing connected the auth identity to
  the scheduling record.
*/

ALTER TABLE users ADD COLUMN IF NOT EXISTS doctor_id uuid REFERENCES doctors(id);
