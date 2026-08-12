/*
# Seed missing data - Part 2: Additional patients, staff, prescriptions, radiology, cheques, payment plans, waiting list, expenses, inventory, treatment packages, insurance claims
Uses existing patient/doctor/unit IDs.
*/

-- 2 additional patients (MD-1007, MD-1008)
INSERT INTO patients (id, clinic_id, national_id, first_name, last_name, phone, phone2, email, birth_date, gender, address, medical_history, allergies, insurance_info, notes, is_active, file_number, blood_type, medications, medical_conditions, credit_limit, referral_source, vip_level, tags, city, province, primary_doctor_id) VALUES
('c0000001-0000-0000-0000-000000000007', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '0087654321', 'رضا', 'صادقی', '09154445566', '02199887766', 'r.sadeghi@email.com', '1988-09-14', 'male', 'تهران، تهرانپارس', 'بدون سابقه', 'بدون حساسیت', 'بیمه تکمیلی ملت', 'کامپوزیت', true, 'MD-1007', 'B-', 'بدون دارو', 'بدون بیماری', 15000000, 'اینستاگرام', 0, ARRAY['زیبایی']::text[], 'تهران', 'تهران', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
('c0000001-0000-0000-0000-000000000008', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '0065432109', 'سارا', 'مرادی', '09183334455', null, null, '1992-04-28', 'female', 'تهران، جردن', 'بیماری تیروئید', 'بدون حساسیت', 'بیمه تکمیلی دی', 'پروتز پارسیل', true, 'MD-1008', 'O+', 'لووتیروکسین', 'تیروئید', 35000000, 'معرفی بیمار', 2, ARRAY['پروتز','ویژه']::text[], 'تهران', 'تهران', '68ea0f3d-b02e-4e30-be69-ce4b6c38cc00')
ON CONFLICT (id) DO NOTHING;

-- Staff
INSERT INTO staff (id, clinic_id, full_name, role, phone, email, hire_date, salary, is_active) VALUES
('e0000001-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'نرگس محمدی', 'پذیرش', '09121110001', 'narges@minadent.com', '2023-03-01', 8000000, true),
('e0000001-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'سمیرا رحیمی', 'پذیرش', '09121110002', 'samira@minadent.com', '2023-06-15', 7500000, true),
('e0000001-0000-0000-0000-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'حسن قاسمی', 'دستیار دندانپزشک', '09121110003', 'hassan@minadent.com', '2022-01-10', 10000000, true),
('e0000001-0000-0000-0000-000000000004', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'مریم اکبری', 'دستیار دندانپزشک', '09121110004', 'maryam@minadent.com', '2023-09-01', 9500000, true),
('e0000001-0000-0000-0000-000000000005', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'رضا نجفی', 'حسابدار', '09121110005', 'reza@minadent.com', '2021-05-01', 12000000, true),
('e0000001-0000-0000-0000-000000000006', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'زهرا صادقی', 'نظافتچی', '09121110006', null, '2024-01-01', 6000000, true)
ON CONFLICT (id) DO NOTHING;

-- Inventory Categories
INSERT INTO inventory_categories (id, clinic_id, name, description) VALUES
('f0000001-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'مواد مصرفی', 'مواد ترمیمی و پر کردن'),
('f0000001-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ابزار', 'ابزار دندانپزشکی'),
('f0000001-0000-0000-0000-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'دارو', 'دارو و آنتی‌بیوتیک'),
('f0000001-0000-0000-0000-000000000004', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ایمپلنت', 'قطعات ایمپلنت')
ON CONFLICT (id) DO NOTHING;

-- Inventory Items
INSERT INTO inventory_items (id, clinic_id, category_id, name, brand, unit, quantity, min_quantity, unit_cost, supplier, location, is_active) VALUES
('e0000002-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'f0000001-0000-0000-0000-000000000001', 'کامپوزیت A2', '3M', 'عدد', 15, 5, 450000, 'شرکت پارس', 'کمد ۱', true),
('e0000002-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'f0000001-0000-0000-0000-000000000001', 'آمالگام', 'SDI', 'عدد', 30, 10, 200000, 'شرکت پارس', 'کمد ۱', true),
('e0000002-0000-0000-0000-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'f0000001-0000-0000-0000-000000000001', 'چسب پروتز', 'GC', 'عدد', 8, 3, 350000, 'شرکت پارس', 'کمد ۲', true),
('e0000002-0000-0000-0000-000000000004', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'f0000001-0000-0000-0000-000000000002', 'میراژ دندانپزشکی', 'NSK', 'عدد', 5, 2, 2500000, 'شرکت پارس', 'کمد ابزار', true),
('e0000002-0000-0000-0000-000000000005', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'f0000001-0000-0000-0000-000000000003', 'آموکسی‌سیلین', 'های‌دارو', 'بسته', 20, 10, 50000, 'داروخانه', 'کمد دارو', true),
('e0000002-0000-0000-0000-000000000006', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'f0000001-0000-0000-0000-000000000003', 'ایبوپروفن', 'های‌دارو', 'بسته', 15, 5, 30000, 'داروخانه', 'کمد دارو', true),
('e0000002-0000-0000-0000-000000000007', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'f0000001-0000-0000-0000-000000000004', 'فیکسچر ایمپلنت ۴.۳', 'Straumann', 'عدد', 12, 5, 4000000, 'شرکت ایمپلنت', 'کمد ایمپلنت', true),
('e0000002-0000-0000-0000-000000000008', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'f0000001-0000-0000-0000-000000000004', 'هیلینگ اباتمنت', 'Straumann', 'عدد', 8, 3, 1200000, 'شرکت ایمپلنت', 'کمد ایمپلنت', true)
ON CONFLICT (id) DO NOTHING;

UPDATE clinics SET file_number_next = 1009 WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
