-- MinaDent: Disable RLS on all tables so anon/offline tokens can sync
-- This is safe for a single-clinic deployment where all staff use the same Supabase project
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/gkxkihdibkmpryopbkkz/sql

-- Core clinical tables
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE encounters DISABLE ROW LEVEL SECURITY;
ALTER TABLE treatments DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE doctors DISABLE ROW LEVEL SECURITY;
ALTER TABLE units DISABLE ROW LEVEL SECURITY;

-- Supporting tables
ALTER TABLE procedures DISABLE ROW LEVEL SECURITY;
ALTER TABLE laboratories DISABLE ROW LEVEL SECURITY;
ALTER TABLE lab_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_claims DISABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE radiology_images DISABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_phases DISABLE ROW LEVEL SECURITY;
ALTER TABLE patient_timeline DISABLE ROW LEVEL SECURITY;
ALTER TABLE waiting_list DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_packages DISABLE ROW LEVEL SECURITY;
ALTER TABLE consent_forms DISABLE ROW LEVEL SECURITY;
ALTER TABLE tooth_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE installments DISABLE ROW LEVEL SECURITY;
ALTER TABLE cheques DISABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE implant_cases DISABLE ROW LEVEL SECURITY;
ALTER TABLE implant_components DISABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE cash_register_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE manual_reminders DISABLE ROW LEVEL SECURITY;
ALTER TABLE patient_policies DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Optional tables (may not exist yet)
DO $$ BEGIN
  ALTER TABLE IF EXISTS implant_cost_items DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS perio_exams DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS ortho_exams DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS role_permissions DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS custom_roles DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS notification_logs DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS otp_codes DISABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Grant full access to anon role (for offline/unauthenticated devices)
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Also add missing tables that might not exist yet
CREATE TABLE IF NOT EXISTS implant_cost_items (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL,
  implant_case_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  amount NUMERIC NOT NULL DEFAULT 0,
  doctor_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE implant_cost_items DISABLE ROW LEVEL SECURITY;
GRANT ALL ON implant_cost_items TO anon;

CREATE TABLE IF NOT EXISTS perio_exams (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  doctor_id TEXT,
  exam_date TEXT NOT NULL,
  sites JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE perio_exams DISABLE ROW LEVEL SECURITY;
GRANT ALL ON perio_exams TO anon;

CREATE TABLE IF NOT EXISTS ortho_exams (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  doctor_id TEXT,
  exam_date TEXT NOT NULL,
  findings JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE ortho_exams DISABLE ROW LEVEL SECURITY;
GRANT ALL ON ortho_exams TO anon;

CREATE TABLE IF NOT EXISTS role_permissions (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL,
  role_key TEXT NOT NULL,
  module_path TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY;
GRANT ALL ON role_permissions TO anon;

CREATE TABLE IF NOT EXISTS custom_roles (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL,
  role_key TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  base_role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE custom_roles DISABLE ROW LEVEL SECURITY;
GRANT ALL ON custom_roles TO anon;

-- Verify: check which tables exist
SELECT table_name, row_security
FROM information_schema.tables t
LEFT JOIN pg_tables pt ON pt.tablename = t.table_name AND pt.schemaname = 'public'
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY table_name;
