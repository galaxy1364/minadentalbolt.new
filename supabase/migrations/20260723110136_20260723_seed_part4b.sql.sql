/*
# Seed missing data - Part 4: Payment plans, installments, insurance claims
Uses actual insurance company UUIDs from the database.
*/

-- Payment Plans
INSERT INTO payment_plans (id, clinic_id, patient_id, total_amount, installment_count, start_date, status, notes) VALUES
('f0000008-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a3eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 15000000, 6, CURRENT_DATE - 10, 'active', 'اقساط ارتودنسی'),
('f0000008-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a2eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 12000000, 4, CURRENT_DATE - 30, 'active', 'اقساط ایمپلنت'),
('f0000008-0000-0000-0000-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 8000000, 4, CURRENT_DATE - 1, 'active', 'اقساط پروتز')
ON CONFLICT (id) DO NOTHING;

-- Installments
INSERT INTO installments (id, payment_plan_id, clinic_id, patient_id, installment_number, amount, due_date, payment_date, status) VALUES
('f0000009-0000-0000-0000-000000000001', 'f0000008-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a3eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 1, 2500000, CURRENT_DATE - 10, CURRENT_DATE - 10, 'paid'),
('f0000009-0000-0000-0000-000000000002', 'f0000008-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a3eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 2, 2500000, CURRENT_DATE + 5, null, 'pending'),
('f0000009-0000-0000-0000-000000000003', 'f0000008-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a3eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 3, 2500000, CURRENT_DATE + 20, null, 'pending'),
('f0000009-0000-0000-0000-000000000004', 'f0000008-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a3eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 4, 2500000, CURRENT_DATE + 35, null, 'pending'),
('f0000009-0000-0000-0000-000000000005', 'f0000008-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a3eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 5, 2500000, CURRENT_DATE + 50, null, 'pending'),
('f0000009-0000-0000-0000-000000000006', 'f0000008-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a3eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 6, 2500000, CURRENT_DATE + 65, null, 'pending'),
('f0000009-0000-0000-0000-000000000007', 'f0000008-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a2eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 1, 3000000, CURRENT_DATE - 30, CURRENT_DATE - 30, 'paid'),
('f0000009-0000-0000-0000-000000000008', 'f0000008-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a2eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 2, 3000000, CURRENT_DATE + 10, null, 'pending'),
('f0000009-0000-0000-0000-000000000009', 'f0000008-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a2eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 3, 3000000, CURRENT_DATE + 40, null, 'pending'),
('f0000009-0000-0000-0000-000000000010', 'f0000008-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a2eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 4, 3000000, CURRENT_DATE + 70, null, 'pending'),
('f0000009-0000-0000-0000-000000000011', 'f0000008-0000-0000-0000-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 1, 2000000, CURRENT_DATE - 1, CURRENT_DATE - 1, 'paid'),
('f0000009-0000-0000-0000-000000000012', 'f0000008-0000-0000-0000-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 2, 2000000, CURRENT_DATE + 29, null, 'pending'),
('f0000009-0000-0000-0000-000000000013', 'f0000008-0000-0000-0000-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 3, 2000000, CURRENT_DATE + 59, null, 'pending'),
('f0000009-0000-0000-0000-000000000014', 'f0000008-0000-0000-0000-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 4, 2000000, CURRENT_DATE + 89, null, 'pending')
ON CONFLICT (id) DO NOTHING;

-- Insurance Claims (use actual company UUIDs)
INSERT INTO insurance_claims (id, clinic_id, patient_id, company_id, claim_number, amount, approved_amount, status, submitted_at, notes) VALUES
('f000000a-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '58b7b261-c502-4f56-a7e7-07c3e1dbd050', 'CL-1001', 150000, 105000, 'approved', now() - interval '5 days', 'تایید شده'),
('f000000a-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'c826e07f-2e51-4b10-bd08-dae80eed3628', 'CL-1002', 8000000, 6400000, 'approved', now() - interval '3 days', 'تایید شده'),
('f000000a-0000-0000-0000-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a5eebc99-9c0b-4ef8-bb6d-6bb9bd380a05', '98b5c6d9-40ce-4fe1-839f-ba73d0f5386d', 'CL-1003', 800000, null, 'pending', now() - interval '1 day', 'در انتظار'),
('f000000a-0000-0000-0000-000000000004', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0000001-0000-0000-0000-000000000008', 'c2476428-c9e5-447f-8fc2-83c0f2d9ce19', 'CL-1004', 4000000, null, 'submitted', now(), 'ارسال شده')
ON CONFLICT (id) DO NOTHING;
