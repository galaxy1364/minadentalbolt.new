-- MinaDent 2026 - Patient File Number System & Upgrades

-- Add file number columns to clinics table
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS file_number_prefix VARCHAR(10) DEFAULT 'MD';
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS file_number_next INTEGER DEFAULT 1001;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS file_number_format VARCHAR(50) DEFAULT 'PREFIX-NNNN';

-- Add file number columns to patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS file_number VARCHAR(50) UNIQUE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS file_number_manual BOOLEAN DEFAULT false;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS file_number_assigned_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for file number search
CREATE INDEX IF NOT EXISTS idx_patients_file_number ON patients(clinic_id, file_number);

-- File Number Generator Function
CREATE OR REPLACE FUNCTION generate_file_number(p_clinic_id UUID, manual_number VARCHAR DEFAULT NULL)
RETURNS VARCHAR AS $$
DECLARE
  v_prefix VARCHAR(10);
  v_next INTEGER;
  v_format VARCHAR(50);
  v_file_number VARCHAR(50);
BEGIN
  IF manual_number IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM patients WHERE clinic_id = p_clinic_id AND file_number = manual_number) THEN
      RAISE EXCEPTION 'شماره پرونده % قبلاً استفاده شده', manual_number;
    END IF;
    RETURN manual_number;
  END IF;

  SELECT COALESCE(file_number_prefix, 'MD'), COALESCE(file_number_next, 1001), COALESCE(file_number_format, 'PREFIX-NNNN')
  INTO v_prefix, v_next, v_format
  FROM clinics WHERE id = p_clinic_id;

  CASE v_format
    WHEN 'PREFIX-NNNN' THEN
      v_file_number := v_prefix || '-' || LPAD(v_next::TEXT, 4, '0');
    WHEN 'PREFIX-NNNNN' THEN
      v_file_number := v_prefix || '-' || LPAD(v_next::TEXT, 5, '0');
    WHEN 'NNNN-PREFIX' THEN
      v_file_number := LPAD(v_next::TEXT, 4, '0') || '-' || v_prefix;
    ELSE
      v_file_number := v_prefix || '-' || LPAD(v_next::TEXT, 4, '0');
  END CASE;

  UPDATE clinics SET file_number_next = v_next + 1 WHERE id = p_clinic_id;

  RETURN v_file_number;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate file number on patient insert
CREATE OR REPLACE FUNCTION auto_generate_file_number() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.file_number IS NULL THEN
    NEW.file_number := generate_file_number(NEW.clinic_id, NULL);
    NEW.file_number_manual := false;
  ELSE
    NEW.file_number_manual := true;
  END IF;
  NEW.file_number_assigned_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_file_number ON patients;
CREATE TRIGGER trg_auto_file_number
  BEFORE INSERT ON patients
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_file_number();

-- Add tooth surfaces to treatments
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS tooth_surface VARCHAR(10);
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS procedure_code VARCHAR(20);
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS procedure_category VARCHAR(50);
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS doctor_share DECIMAL(15,2) DEFAULT 0;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS doctor_share_calculated BOOLEAN DEFAULT false;

-- Add more columns to patients
ALTER TABLE patients ADD COLUMN IF NOT EXISTS national_id VARCHAR(10);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS gender VARCHAR(10);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS blood_type VARCHAR(5);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS allergies TEXT[];
ALTER TABLE patients ADD COLUMN IF NOT EXISTS medications TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS medical_conditions TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(15,2) DEFAULT 0;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS referral_source VARCHAR(50);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS vip_level INTEGER DEFAULT 0;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE patients ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS province VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_number VARCHAR(50);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS primary_doctor_id UUID;

-- Add more columns to appointments (using 'date' not 'appointment_date')
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS booking_source VARCHAR(20) DEFAULT 'phone';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES users(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS estimated_fee DECIMAL(15,2);

-- Create payment_plans table
CREATE TABLE IF NOT EXISTS payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  name VARCHAR(100),
  total_amount DECIMAL(15,2) NOT NULL,
  down_payment DECIMAL(15,2) DEFAULT 0,
  number_of_installments INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  interest_rate DECIMAL(5,2) DEFAULT 0,
  late_fee_rate DECIMAL(5,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for payment_plans
ALTER TABLE payment_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_payment_plans" ON payment_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_payment_plans" ON payment_plans FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_payment_plans" ON payment_plans FOR UPDATE TO authenticated USING (true);
CREATE POLICY "delete_payment_plans" ON payment_plans FOR DELETE TO authenticated USING (true);

-- Add payment_plan_id to installments
ALTER TABLE installments ADD COLUMN IF NOT EXISTS payment_plan_id UUID REFERENCES payment_plans(id);

-- Create doctor_schedules table
CREATE TABLE IF NOT EXISTS doctor_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  doctor_id UUID NOT NULL REFERENCES doctors(id),
  day_of_week INTEGER NOT NULL,
  start_time TIME NOT NULL DEFAULT '08:00',
  end_time TIME NOT NULL DEFAULT '20:00',
  slot_duration INTEGER DEFAULT 30,
  break_duration INTEGER DEFAULT 0,
  break_start TIME,
  break_end TIME,
  max_appointments INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinic_id, doctor_id, day_of_week)
);

-- RLS for doctor_schedules
ALTER TABLE doctor_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_doctor_schedules" ON doctor_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_doctor_schedules" ON doctor_schedules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_doctor_schedules" ON doctor_schedules FOR UPDATE TO authenticated USING (true);
CREATE POLICY "delete_doctor_schedules" ON doctor_schedules FOR DELETE TO authenticated USING (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(clinic_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON appointments(clinic_id, doctor_id, date);
CREATE INDEX IF NOT EXISTS idx_cheques_due_date ON cheques(clinic_id, due_date, status);
CREATE INDEX IF NOT EXISTS idx_installments_due_date ON installments(clinic_id, due_date, status);
CREATE INDEX IF NOT EXISTS idx_treatments_tooth ON treatments(patient_id, tooth_number);