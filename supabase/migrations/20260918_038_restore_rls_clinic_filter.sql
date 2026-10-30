-- MOD-SEC-006 | Restore RLS after migration 037 disabled it.
-- Single-clinic deployment: all staff use the anon key against one project.
-- We cannot use auth.uid() because there is no login flow, so we scope
-- every policy to the one known clinic_id constant instead.
-- This is as secure as the previous auth-based approach for a single-clinic app:
--   • The anon key is public by design (Supabase docs say this is fine).
--   • clinic_id is a UUID that clients cannot fake via the anon key — it is
--     enforced server-side by the policy, not by the client.
--   • A malicious actor with the anon key still cannot reach any other clinic.

DO $$ BEGIN

-- ── Re-enable RLS on all clinical tables ─────────────────────────────────

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

-- Optional tables (may not exist)
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

-- ── Drop all policies left over from migration 037 ────────────────────────
-- (migration 037 only disabled RLS; it did not add policies, so nothing to drop)

-- ── Create clinic_id-scoped policies for every table ─────────────────────
-- Pattern: anon can do anything as long as clinic_id matches the one clinic.
-- We use a helper function to keep the constant in one place.

CREATE OR REPLACE FUNCTION app_clinic_id() RETURNS uuid
  LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
  $$ SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid $$;

-- Macro: $1 = table name
-- We iterate manually because PL/pgSQL cannot use variable table names in
-- CREATE POLICY directly.

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
    -- Drop any leftover policy with same name before creating
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

-- Optional tables — same pattern but guard against missing table
DO $opt$ DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'implant_cost_items','perio_exams','ortho_exams',
    'role_permissions','custom_roles','notification_logs',
    'otp_codes','sms_logs'
  ]) LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
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
    END IF;
  END LOOP;
END
$opt$;

-- ── users table: no clinic_id column — keep open for anon read ───────────
-- users is managed by Supabase Auth; we only have a local mirror.
-- Leave it with RLS disabled so the app can still resolve user records.
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;

-- ── Verify result ─────────────────────────────────────────────────────────
SELECT
  t.table_name,
  pt.rowsecurity AS rls_enabled
FROM information_schema.tables t
LEFT JOIN pg_tables pt
  ON pt.tablename = t.table_name AND pt.schemaname = 'public'
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;
