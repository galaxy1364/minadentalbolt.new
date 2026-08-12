-- OTP Tables and Enhanced RLS Policies
-- Version: 004

-- ============================================
-- OTP CODES TABLE (for phone authentication)
-- ============================================
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(10) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT false,
  attempts INTEGER DEFAULT 0,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes(expires_at);

-- ============================================
-- COMMISSION RULES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  
  type VARCHAR(20) DEFAULT 'percentage' CHECK (type IN ('percentage', 'fixed', 'tiered', 'hybrid')),
  percentage DECIMAL(5, 2) DEFAULT 40,
  fixed_amount DECIMAL(12, 2) DEFAULT 0,
  tiers JSONB DEFAULT '[]'::jsonb,
  treatment_rates JSONB DEFAULT '{}'::jsonb,
  
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_to DATE,
  
  min_amount DECIMAL(12, 2),
  max_amount DECIMAL(12, 2),
  
  deduct_lab_costs BOOLEAN DEFAULT true,
  deduct_material_costs BOOLEAN DEFAULT false,
  deduct_discounts BOOLEAN DEFAULT false,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BACKUP LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS backup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  metadata JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TOOTH RECORDS TABLE (for dental chart)
-- ============================================
CREATE TABLE IF NOT EXISTS tooth_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  
  tooth_number INTEGER NOT NULL CHECK (tooth_number BETWEEN 11 AND 48),
  is_missing BOOLEAN DEFAULT false,
  is_implant BOOLEAN DEFAULT false,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(patient_id, tooth_number)
);

-- ============================================
-- ENABLE RLS ON NEW TABLES
-- ============================================
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tooth_records ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES FOR OTP_CODES
-- ============================================
CREATE POLICY "otp_select_own" ON otp_codes FOR SELECT
  TO authenticated USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY "otp_insert_clinic" ON otp_codes FOR INSERT
  TO authenticated WITH CHECK (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY "otp_update_own" ON otp_codes FOR UPDATE
  TO authenticated USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- ============================================
-- RLS POLICIES FOR COMMISSION_RULES
-- ============================================
CREATE POLICY "commission_select" ON commission_rules FOR SELECT
  TO authenticated USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY "commission_insert" ON commission_rules FOR INSERT
  TO authenticated WITH CHECK (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY "commission_update" ON commission_rules FOR UPDATE
  TO authenticated USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- ============================================
-- RLS POLICIES FOR BACKUP_LOGS
-- ============================================
CREATE POLICY "backup_select" ON backup_logs FOR SELECT
  TO authenticated USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY "backup_insert" ON backup_logs FOR INSERT
  TO authenticated WITH CHECK (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- ============================================
-- RLS POLICIES FOR TOOTH_RECORDS
-- ============================================
CREATE POLICY "tooth_select" ON tooth_records FOR SELECT
  TO authenticated USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY "tooth_insert" ON tooth_records FOR INSERT
  TO authenticated WITH CHECK (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY "tooth_update" ON tooth_records FOR UPDATE
  TO authenticated USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- ============================================
-- DOCTOR SHARES MUTATION POLICIES
-- ============================================
CREATE POLICY "doctor_shares_insert" ON doctor_shares FOR INSERT
  TO authenticated WITH CHECK (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY "doctor_shares_update" ON doctor_shares FOR UPDATE
  TO authenticated USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));