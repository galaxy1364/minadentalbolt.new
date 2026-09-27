-- Notification Logs Table
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID,
  appointment_id UUID,
  patient_id UUID,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  message_content TEXT,
  response_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_clinic_id ON notification_logs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_appointment_id ON notification_logs(appointment_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_patient_id ON notification_logs(patient_id);

-- Add reminder fields to appointments
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS last_reminder_sent TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT true;

-- RLS for notification_logs
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_notification_logs" ON notification_logs;
CREATE POLICY "select_notification_logs" ON notification_logs FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_notification_logs" ON notification_logs;
CREATE POLICY "insert_notification_logs" ON notification_logs FOR INSERT
  TO authenticated WITH CHECK (true);

-- RLS for sms_logs
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_sms_logs" ON sms_logs;
CREATE POLICY "select_sms_logs" ON sms_logs FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_sms_logs" ON sms_logs;
CREATE POLICY "insert_sms_logs" ON sms_logs FOR INSERT
  TO authenticated WITH CHECK (true);

-- RLS for sms_templates
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_sms_templates" ON sms_templates;
CREATE POLICY "select_sms_templates" ON sms_templates FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_sms_templates" ON sms_templates;
CREATE POLICY "insert_sms_templates" ON sms_templates FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_sms_templates" ON sms_templates;
CREATE POLICY "update_sms_templates" ON sms_templates FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
