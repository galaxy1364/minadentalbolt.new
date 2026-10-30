/*
  # Online booking requests (نوبت‌دهی آنلاین)

  A PUBLIC form (no login required) a clinic can link from their own
  website. Anonymous visitors can only INSERT a request — they can
  never read, update, or delete anything, unlike every other table in
  this schema which is locked to authenticated-only. Staff review
  requests inside the app and convert approved ones into real
  appointments.
*/

CREATE TABLE IF NOT EXISTS online_booking_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  preferred_date date,
  preferred_time text,
  reason text,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'converted')),
  converted_appointment_id uuid REFERENCES appointments(id),
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE online_booking_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_can_submit_booking_request" ON online_booking_requests
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "staff_manage_booking_requests" ON online_booking_requests
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_booking_requests_status ON online_booking_requests(status);
