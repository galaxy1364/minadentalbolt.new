/*
  # Fix missing lab_orders table

  Found via a real end-to-end integrity test (booking -> patient ->
  encounter -> treatment -> payment -> lab order -> implant case,
  inserted and verified directly against the live database): the
  original schema reconstruction (migration 001) created `laboratories`
  but never created `lab_orders` — the entire Laboratory module has
  been non-functional against the live database since the project
  migration, with no error surfaced anywhere until this direct test.

  1. New table `lab_orders`
    Matches src/types/index.ts's LabOrder interface exactly.
*/

CREATE TABLE IF NOT EXISTS lab_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  lab_id uuid NOT NULL REFERENCES laboratories(id),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES doctors(id),
  encounter_id uuid REFERENCES encounters(id),
  work_type text,
  tooth_number text,
  shade text,
  material text,
  deadline date,
  status text NOT NULL DEFAULT 'pending',
  cost numeric,
  received_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lab_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_lab_orders" ON lab_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON lab_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_lab ON lab_orders(lab_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_encounter ON lab_orders(encounter_id);
