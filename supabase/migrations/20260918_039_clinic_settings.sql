-- MOD-DATA-003 | clinic_settings table
-- Stores clinic-wide preferences that must be shared across all devices.
-- Replaces localStorage keys: minadent_general, minadent_fileNumber,
-- minadent_pos, minadent_appt-goal.
-- Per-device preferences (haptics, sound, dash filters) stay in localStorage.

CREATE TABLE IF NOT EXISTS clinic_settings (
  clinic_id  UUID NOT NULL,
  key        TEXT NOT NULL,
  value      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (clinic_id, key)
);

ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clinic_all ON clinic_settings;
CREATE POLICY clinic_all ON clinic_settings
  FOR ALL
  TO anon, authenticated
  USING      (clinic_id = app_clinic_id())
  WITH CHECK (clinic_id = app_clinic_id());

-- Seed initial empty rows so the app can upsert immediately
INSERT INTO clinic_settings (clinic_id, key, value)
VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'general',    '{}'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'fileNumber', '{}'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'pos',        '{}'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'appt_goal',  '{"value": 10}')
ON CONFLICT (clinic_id, key) DO NOTHING;
