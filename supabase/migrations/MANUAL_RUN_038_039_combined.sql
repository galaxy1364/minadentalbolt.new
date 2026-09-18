-- ════════════════════════════════════════════════════════════════════════
-- MinaDent — MIGRATION 038 + 039
-- اجرا در: https://supabase.com/dashboard/project/gkxkihdibkmpryopbkkz/sql/new
-- ════════════════════════════════════════════════════════════════════════

-- ── STEP 1: تابع کمکی clinic_id ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION app_clinic_id() RETURNS uuid
  LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
  $$ SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid $$;

-- ── STEP 2: فعال کردن RLS روی همه جداول ─────────────────────────────────
DO $$ BEGIN
  ALTER TABLE patients                ENABLE ROW LEVEL SECURITY;
  ALTER TABLE appointments            ENABLE ROW LEVEL SECURITY;
  ALTER TABLE encounters              ENABLE ROW LEVEL SECURITY;
  ALTER TABLE treatments              ENABLE ROW LEVEL SECURITY;
  ALTER TABLE payments                ENABLE ROW LEVEL SECURITY;
  ALTER TABLE doctors                 ENABLE ROW LEVEL SECURITY;
  ALTER TABLE units                   ENABLE ROW LEVEL SECURITY;
  ALTER TABLE procedures              ENABLE ROW LEVEL SECURITY;
  ALTER TABLE laboratories            ENABLE ROW LEVEL SECURITY;
  ALTER TABLE lab_orders              ENABLE ROW LEVEL SECURITY;
  ALTER TABLE insurance_companies     ENABLE ROW LEVEL SECURITY;
  ALTER TABLE insurance_claims        ENABLE ROW LEVEL SECURITY;
  ALTER TABLE prescriptions           ENABLE ROW LEVEL SECURITY;
  ALTER TABLE radiology_images        ENABLE ROW LEVEL SECURITY;
  ALTER TABLE treatment_phases        ENABLE ROW LEVEL SECURITY;
  ALTER TABLE patient_timeline        ENABLE ROW LEVEL SECURITY;
  ALTER TABLE waiting_list            ENABLE ROW LEVEL SECURITY;
  ALTER TABLE staff                   ENABLE ROW LEVEL SECURITY;
  ALTER TABLE expenses                ENABLE ROW LEVEL SECURITY;
  ALTER TABLE treatment_packages      ENABLE ROW LEVEL SECURITY;
  ALTER TABLE consent_forms           ENABLE ROW LEVEL SECURITY;
  ALTER TABLE tooth_records           ENABLE ROW LEVEL SECURITY;
  ALTER TABLE inventory_items         ENABLE ROW LEVEL SECURITY;
  ALTER TABLE inventory_categories    ENABLE ROW LEVEL SECURITY;
  ALTER TABLE payment_plans           ENABLE ROW LEVEL SECURITY;
  ALTER TABLE installments            ENABLE ROW LEVEL SECURITY;
  ALTER TABLE cheques                 ENABLE ROW LEVEL SECURITY;
  ALTER TABLE doctor_schedules        ENABLE ROW LEVEL SECURITY;
  ALTER TABLE implant_cases           ENABLE ROW LEVEL SECURITY;
  ALTER TABLE implant_components      ENABLE ROW LEVEL SECURITY;
  ALTER TABLE sms_templates           ENABLE ROW LEVEL SECURITY;
  ALTER TABLE personal_finance_items  ENABLE ROW LEVEL SECURITY;
  ALTER TABLE cash_register_sessions  ENABLE ROW LEVEL SECURITY;
  ALTER TABLE manual_reminders        ENABLE ROW LEVEL SECURITY;
  ALTER TABLE patient_policies        ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS implant_cost_items   ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS perio_exams          ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS ortho_exams          ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS role_permissions     ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS custom_roles         ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS notification_logs    ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS otp_codes            ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS sms_logs             ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ── STEP 3: ساخت سیاست‌های RLS بر اساس clinic_id ───────────────────────
DO $policies$ DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'patients','appointments','encounters','treatments','payments',
    'doctors','units','procedures','laboratories','lab_orders',
    'insurance_companies','insurance_claims','prescriptions',
    'radiology_images','treatment_phases','patient_timeline',
    'waiting_list','staff','expenses','treatment_packages',
    'consent_forms','tooth_records','inventory_items',
    'inventory_categories','payment_plans','installments','cheques',
    'doctor_schedules','implant_cases','implant_components',
    'sms_templates','personal_finance_items','cash_register_sessions',
    'manual_reminders','patient_policies'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS clinic_all ON %I', tbl);
    EXECUTE format(
      $pol$
        CREATE POLICY clinic_all ON %I
          FOR ALL
          TO anon, authenticated
          USING      (clinic_id = app_clinic_id())
          WITH CHECK (clinic_id = app_clinic_id())
      $pol$, tbl
    );
  END LOOP;
END
$policies$;

-- سیاست برای جداول اختیاری (فقط اگر ستون clinic_id داشته باشند)
DO $opt$ DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'implant_cost_items','perio_exams','ortho_exams',
    'role_permissions','custom_roles','notification_logs',
    'otp_codes','sms_logs'
  ]) LOOP
    -- Only add policy if: table exists AND has a clinic_id column
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name  = tbl
        AND column_name = 'clinic_id'
    ) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('DROP POLICY IF EXISTS clinic_all ON %I', tbl);
      EXECUTE format(
        $pol$
          CREATE POLICY clinic_all ON %I
            FOR ALL TO anon, authenticated
            USING (clinic_id = app_clinic_id())
            WITH CHECK (clinic_id = app_clinic_id())
        $pol$, tbl
      );
    END IF;
  END LOOP;
END
$opt$;

-- جدول users: بدون clinic_id — RLS خاموش بماند
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;

-- ── STEP 4: جدول clinic_settings (تنظیمات مشترک کلینیک) ────────────────
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
  FOR ALL TO anon, authenticated
  USING      (clinic_id = app_clinic_id())
  WITH CHECK (clinic_id = app_clinic_id());

-- داده اولیه
INSERT INTO clinic_settings (clinic_id, key, value)
VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'general',    '{}'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'fileNumber', '{}'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'pos',        '{}'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'appt_goal',  '{"value": 10}')
ON CONFLICT (clinic_id, key) DO NOTHING;

-- ── STEP 5: تأیید نتیجه ──────────────────────────────────────────────────
SELECT
  t.table_name,
  pt.rowsecurity AS rls_on,
  (SELECT count(*) FROM pg_policies WHERE tablename = t.table_name) AS policies
FROM information_schema.tables t
LEFT JOIN pg_tables pt ON pt.tablename = t.table_name AND pt.schemaname = 'public'
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;
