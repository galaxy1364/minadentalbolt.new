-- RLS Policies for MinaDent Tables

-- Users RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own" ON users
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "users_update_own" ON users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Clinics RLS
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinics_select_own" ON clinics
  FOR SELECT TO authenticated
  USING (id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "clinics_update_own" ON clinics
  FOR UPDATE TO authenticated
  USING (id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Patients RLS
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patients_select_clinic" ON patients
  FOR SELECT TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "patients_insert_clinic" ON patients
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "patients_update_clinic" ON patients
  FOR UPDATE TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ))
  WITH CHECK (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "patients_delete_clinic" ON patients
  FOR DELETE TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'doctor')
  ));

-- Doctors RLS
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doctors_select_clinic" ON doctors
  FOR SELECT TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "doctors_insert_clinic" ON doctors
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "doctors_update_clinic" ON doctors
  FOR UPDATE TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ))
  WITH CHECK (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

-- Units RLS
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "units_select_clinic" ON units
  FOR SELECT TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "units_insert_clinic" ON units
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "units_update_clinic" ON units
  FOR UPDATE TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ))
  WITH CHECK (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

-- Appointments RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointments_select_clinic" ON appointments
  FOR SELECT TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "appointments_insert_clinic" ON appointments
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "appointments_update_clinic" ON appointments
  FOR UPDATE TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ))
  WITH CHECK (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "appointments_delete_clinic" ON appointments
  FOR DELETE TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

-- Encounters RLS
ALTER TABLE encounters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "encounters_select_clinic" ON encounters
  FOR SELECT TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "encounters_insert_clinic" ON encounters
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "encounters_update_clinic" ON encounters
  FOR UPDATE TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ))
  WITH CHECK (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

-- Treatments RLS
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "treatments_select_clinic" ON treatments
  FOR SELECT TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "treatments_insert_clinic" ON treatments
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "treatments_update_clinic" ON treatments
  FOR UPDATE TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ))
  WITH CHECK (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

-- Payments RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_select_clinic" ON payments
  FOR SELECT TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "payments_insert_clinic" ON payments
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

-- Payment Plans RLS
ALTER TABLE payment_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_plans_select_clinic" ON payment_plans
  FOR SELECT TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "payment_plans_insert_clinic" ON payment_plans
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

-- Installments RLS
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "installments_select_clinic" ON installments
  FOR SELECT TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "installments_update_clinic" ON installments
  FOR UPDATE TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

-- Cheques RLS
ALTER TABLE cheques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cheques_select_clinic" ON cheques
  FOR SELECT TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "cheques_insert_clinic" ON cheques
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "cheques_update_clinic" ON cheques
  FOR UPDATE TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

-- Laboratories RLS
ALTER TABLE laboratories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "laboratories_select_clinic" ON laboratories
  FOR SELECT TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "laboratories_insert_clinic" ON laboratories
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

-- Procedures RLS
ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "procedures_select_clinic" ON procedures
  FOR SELECT TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "procedures_insert_clinic" ON procedures
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

-- Doctor Shares RLS
ALTER TABLE doctor_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doctor_shares_select_clinic" ON doctor_shares
  FOR SELECT TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

-- Notifications RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_insert_own" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Inventory RLS
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_categories_select_clinic" ON inventory_categories
  FOR SELECT TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "inventory_items_select_clinic" ON inventory_items
  FOR SELECT TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "inventory_transactions_select_clinic" ON inventory_transactions
  FOR SELECT TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

-- SMS Templates RLS
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_templates_select_clinic" ON sms_templates
  FOR SELECT TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));

-- SMS Logs RLS
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_logs_select_clinic" ON sms_logs
  FOR SELECT TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  ));
