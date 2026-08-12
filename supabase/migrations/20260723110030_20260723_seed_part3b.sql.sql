/*
# Seed missing data - Part 3: Prescriptions, radiology, cheques, waiting list, expenses, treatment packages
*/

-- Prescriptions (medications as jsonb)
INSERT INTO prescriptions (id, clinic_id, patient_id, doctor_id, medications, notes, status) VALUES
('f0000002-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '["آموکسی‌سیلین ۵۰۰mg - ۳ بار در روز - ۷ روز"]'::jsonb, 'بعد از غذا', 'completed'),
('f0000002-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', '68ea0f3d-b02e-4e30-be69-ce4b6c38cc00', '["ایبوپروفن ۴۰۰mg - ۲ بار در روز - ۵ روز"]'::jsonb, 'بعد از غذا', 'completed'),
('f0000002-0000-0000-0000-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a2eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', '3550a19d-7e3d-436f-a62e-18f4e5e49811', '["آموکسی‌سیلین ۵۰۰mg","ژل کلرhexidine"]'::jsonb, 'بعد از جراحی', 'completed'),
('f0000002-0000-0000-0000-000000000004', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a5eebc99-9c0b-4ef8-bb6d-6bb9bd380a05', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '["آموکسی‌سیلین ۵۰۰mg","ایبوپروفن ۴۰۰mg"]'::jsonb, 'بعد از درمان ریشه', 'completed'),
('f0000002-0000-0000-0000-000000000005', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a3eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'dfaecb68-420e-4b04-a5a0-f920ba10934e', '["ژل کلرhexidine"]'::jsonb, 'شروع بعد از نصب براکت', 'completed'),
('f0000002-0000-0000-0000-000000000006', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0000001-0000-0000-0000-000000000008', '68ea0f3d-b02e-4e30-be69-ce4b6c38cc00', '["ایبوپروفن ۴۰۰mg"]'::jsonb, 'در صورت درد', 'active')
ON CONFLICT (id) DO NOTHING;

-- Radiology Images
INSERT INTO radiology_images (id, clinic_id, patient_id, doctor_id, image_type, tooth_number, image_url, description, taken_at) VALUES
('f0000003-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'panoramic', null, 'https://images.pexels.com/photos/4173251/pexels-photo-4173251.jpeg', 'پانورامیک کامل', now()),
('f0000003-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a2eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', '3550a19d-7e3d-436f-a62e-18f4e5e49811', 'panoramic', null, 'https://images.pexels.com/photos/4173251/pexels-photo-4173251.jpeg', 'پانورامیک پیش از جراحی', now() - interval '30 days'),
('f0000003-0000-0000-0000-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a2eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', '3550a19d-7e3d-436f-a62e-18f4e5e49811', 'periapical', '36', 'https://images.pexels.com/photos/4173251/pexels-photo-4173251.jpeg', 'پری‌اپیکال دندان ۳۶', now() - interval '30 days'),
('f0000003-0000-0000-0000-000000000004', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a5eebc99-9c0b-4ef8-bb6d-6bb9bd380a05', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'periapical', '36', 'https://images.pexels.com/photos/4173251/pexels-photo-4173251.jpeg', 'پری‌اپیکال پیش از درمان', now() - interval '2 days'),
('f0000003-0000-0000-0000-000000000005', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a5eebc99-9c0b-4ef8-bb6d-6bb9bd380a05', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'periapical', '36', 'https://images.pexels.com/photos/4173251/pexels-photo-4173251.jpeg', 'پری‌اپیکال بعد از درمان', now() - interval '2 days'),
('f0000003-0000-0000-0000-000000000006', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', '68ea0f3d-b02e-4e30-be69-ce4b6c38cc00', 'panoramic', null, 'https://images.pexels.com/photos/4173251/pexels-photo-4173251.jpeg', 'پانورامیک پروتز', now() - interval '1 day'),
('f0000003-0000-0000-0000-000000000007', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a3eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'dfaecb68-420e-4b04-a5a0-f920ba10934e', 'cephalometric', null, 'https://images.pexels.com/photos/4173251/pexels-photo-4173251.jpeg', 'سفالومتریک ارتودنسی', now() - interval '1 day'),
('f0000003-0000-0000-0000-000000000008', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0000001-0000-0000-0000-000000000007', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'intraoral', null, 'https://images.pexels.com/photos/4173251/pexels-photo-4173251.jpeg', 'داخل دهانی', now() - interval '7 days')
ON CONFLICT (id) DO NOTHING;

-- Cheques
INSERT INTO cheques (id, clinic_id, patient_id, amount, bank_name, branch, cheque_number, account_number, issue_date, due_date, payee_name, status) VALUES
('f0000004-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a3eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 2000000, 'بانک ملت', 'شعبه ولیعصر', 'CH-1001', '1234567890', to_char(CURRENT_DATE - 10, 'YYYY-MM-DD'), to_char(CURRENT_DATE + 5, 'YYYY-MM-DD'), 'کلینیک مینا', 'pending'),
('f0000004-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a3eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 2000000, 'بانک ملت', 'شعبه ولیعصر', 'CH-1002', '1234567890', to_char(CURRENT_DATE - 10, 'YYYY-MM-DD'), to_char(CURRENT_DATE + 20, 'YYYY-MM-DD'), 'کلینیک مینا', 'pending'),
('f0000004-0000-0000-0000-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a3eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 2000000, 'بانک ملت', 'شعبه ولیعصر', 'CH-1003', '1234567890', to_char(CURRENT_DATE - 10, 'YYYY-MM-DD'), to_char(CURRENT_DATE + 35, 'YYYY-MM-DD'), 'کلینیک مینا', 'pending'),
('f0000004-0000-0000-0000-000000000004', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a2eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 3000000, 'بانک صادرات', 'شعبه شریعتی', 'CH-2001', '0987654321', to_char(CURRENT_DATE - 30, 'YYYY-MM-DD'), to_char(CURRENT_DATE + 10, 'YYYY-MM-DD'), 'کلینیک مینا', 'deposited')
ON CONFLICT (id) DO NOTHING;

-- Waiting List (preferred_date is date type, use CURRENT_DATE directly)
INSERT INTO waiting_list (id, clinic_id, patient_id, doctor_id, preferred_date, preferred_time, reason, priority, status, notes) VALUES
('f0000005-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a4eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', CURRENT_DATE + 2, 'صبح', 'درمان کامپوزیت', 'normal', 'waiting', 'تماس حاصل شود'),
('f0000005-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0000001-0000-0000-0000-000000000007', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', CURRENT_DATE + 3, 'بعدازظهر', 'ونیر کامپوزیت', 'high', 'waiting', 'اولویت بالا'),
('f0000005-0000-0000-0000-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0000001-0000-0000-0000-000000000008', '68ea0f3d-b02e-4e30-be69-ce4b6c38cc00', CURRENT_DATE + 1, 'صبح', 'پروتز - تحویل', 'urgent', 'notified', 'اطلاع داده شد'),
('f0000005-0000-0000-0000-000000000004', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a5eebc99-9c0b-4ef8-bb6d-6bb9bd380a05', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', CURRENT_DATE + 4, 'هر زمان', 'درمان ریشه - ادامه', 'normal', 'waiting', null),
('f0000005-0000-0000-0000-000000000005', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', CURRENT_DATE + 5, 'بعدازظهر', 'فالوآپ', 'low', 'scheduled', 'نوبت داده شد'),
('f0000005-0000-0000-0000-000000000006', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a2eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', '3550a19d-7e3d-436f-a62e-18f4e5e49811', CURRENT_DATE + 3, 'صبح', 'فالوآپ جراحی ایمپلنت', 'high', 'waiting', 'اولویت بالا'),
('f0000005-0000-0000-0000-000000000007', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a3eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'dfaecb68-420e-4b04-a5a0-f920ba10934e', CURRENT_DATE + 7, 'بعدازظهر', 'تنظیم ارتودنسی', 'normal', 'waiting', null),
('f0000005-0000-0000-0000-000000000008', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', '68ea0f3d-b02e-4e30-be69-ce4b6c38cc00', CURRENT_DATE + 2, 'هر زمان', 'پروتز - امتحان', 'normal', 'waiting', null)
ON CONFLICT (id) DO NOTHING;

-- Expenses (date is date type, use CURRENT_DATE directly)
INSERT INTO expenses (id, clinic_id, category, amount, description, date, payment_method, reference) VALUES
('f0000006-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'اجاره', 50000000, 'اجاره مطب', CURRENT_DATE, 'transfer', 'TR-EXP-001'),
('f0000006-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'حقوق', 45000000, 'حقوق پرسنل', CURRENT_DATE - 1, 'transfer', 'TR-EXP-002'),
('f0000006-0000-0000-0000-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'مواد مصرفی', 8000000, 'خرید مواد ترمیمی', CURRENT_DATE - 2, 'card', 'TR-EXP-003'),
('f0000006-0000-0000-0000-000000000004', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'لابراتوار', 5000000, 'هزینه لابراتوار', CURRENT_DATE - 3, 'cash', null),
('f0000006-0000-0000-0000-000000000005', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'قبوض', 2000000, 'قبوض برق و آب', CURRENT_DATE - 5, 'online', 'TR-EXP-005')
ON CONFLICT (id) DO NOTHING;

-- Treatment Packages (included_procedures as jsonb)
INSERT INTO treatment_packages (id, clinic_id, name, description, included_procedures, total_price, discount_percentage, is_active) VALUES
('f0000007-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'پکیج ایمپلنت کامل', 'ایمپلنت شامل جراحی، فیکسچر، اباتمنت و کرون', '["P017","P013"]'::jsonb, 16000000, 10, true),
('f0000007-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'پکیج ارتودنسی کامل', 'ارتودنسی ثابت فلزی شامل همه ویزیت‌ها', '["P019"]'::jsonb, 13500000, 10, true),
('f0000007-0000-0000-0000-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'پکیج زیبایی', 'بلیچینگ و ونیر کامپوزیت', '["P024","P025"]'::jsonb, 4500000, 10, true),
('f0000007-0000-0000-0000-000000000004', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'پکیج پروتز کامل', 'پروتز کامل فک بالا و پایین', '["P015","P016"]'::jsonb, 14400000, 10, true)
ON CONFLICT (id) DO NOTHING;
