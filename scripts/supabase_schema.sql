-- ==============================================================
-- 🦷 مینادنتال (MinaDental) - اسکریپت راه‌اندازی دیتابیس ابری سوپابیس
-- کدهای زیر را در بخش SQL Editor پروژه سوپابیس خود کپی و دکمه RUN را بزنید.
-- ==============================================================

-- ۱. فعال‌سازی اکستنشن UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ۲. ساخت جدول بیماران (Patients)
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  file_number TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  national_id TEXT,
  phone TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  medical_history TEXT[] DEFAULT '{}',
  total_cost BIGINT DEFAULT 0,
  paid_amount BIGINT DEFAULT 0,
  balance BIGINT DEFAULT 0,
  active_treatments_count INTEGER DEFAULT 0,
  last_visit TEXT,
  next_appointment TEXT,
  teeth_conditions JSONB DEFAULT '{}'::jsonb,
  sayad_checks JSONB DEFAULT '[]'::jsonb,
  installments JSONB DEFAULT '[]'::jsonb,
  lab_orders JSONB DEFAULT '[]'::jsonb,
  implant_cases JSONB DEFAULT '[]'::jsonb,
  payments JSONB DEFAULT '[]'::jsonb,
  prescriptions JSONB DEFAULT '[]'::jsonb,
  consents JSONB DEFAULT '[]'::jsonb,
  treatments JSONB DEFAULT '[]'::jsonb,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ۳. ساخت جدول نوبت‌های کلینیک (Appointments)
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  patient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  unit TEXT NOT NULL, -- یونیت ۱، یونیت ۲، اتاق جراحی
  doctor TEXT NOT NULL,
  date TEXT NOT NULL, -- e.g. "۱۴۰۵/۰۷/۳۰"
  time TEXT NOT NULL, -- e.g. "۱۶:۳۰"
  duration_minutes INTEGER DEFAULT 30,
  treatment TEXT NOT NULL,
  status TEXT DEFAULT 'scheduled', -- scheduled, waiting, in_chair, completed, cancelled
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ۴. ساخت جدول انبار و متریال دندانپزشکی (Inventory)
CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  min_alert INTEGER NOT NULL DEFAULT 5,
  expiry_date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ۵. فعال‌سازی ارتباط بلادرنگ (Supabase Realtime) برای همه جداول
ALTER PUBLICATION supabase_realtime ADD TABLE patients;
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory;

-- ۶. باز کردن دسترسی امن (Row Level Security - RLS) برای کلاینت با کلید Anon
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-write for clinic terminal" ON patients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for clinic appointments" ON appointments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for clinic inventory" ON inventory FOR ALL USING (true) WITH CHECK (true);

-- تایید راه‌اندازی موفق
SELECT 'دیتابیس ابری مینادنتال با موفقیت فعال و آماده کار شد.' AS status;
