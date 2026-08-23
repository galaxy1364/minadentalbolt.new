// Minadent - Persian RTL Dental Clinic Management System
// TypeScript interfaces for all database tables

// ============================================================================
// Base Table Types
// ============================================================================

export interface Patient {
  id: string
  clinic_id: string
  national_id: string | null
  first_name: string
  last_name: string
  phone: string | null
  phone2: string | null
  email: string | null
  birth_date: string | null
  gender: string | null
  address: string | null
  medical_history: string | null
  allergies: string | null
  insurance_info: string | null
  notes: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  sync_version: number
  file_number: string | null
  file_number_manual: boolean | null
  file_number_assigned_at: string | null
  blood_type: string | null
  medications: string | null
  medical_conditions: string | null
  credit_limit: number | null
  referral_source: string | null
  vip_level: number | null
  tags: string[] | null
  city: string | null
  province: string | null
  postal_code: string | null
  insurance_number: string | null
  primary_doctor_id: string | null
}

export interface Doctor {
  id: string
  user_id: string | null
  clinic_id: string
  staff_id: string | null
  name: string | null
  specialty: string | null
  license_number: string | null
  /** Fixed color for this doctor, shown consistently everywhere an
   * appointment/schedule item needs to visually indicate whose it is
   * (booking wizard, calendar, appointment lists) — without this,
   * there was no way to tell doctors apart at a glance in a
   * multi-doctor clinic. */
  color: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  sync_version: number
}

export interface Unit {
  id: string
  clinic_id: string
  name: string
  number: number | null
  is_active: boolean
  created_at: string
  updated_at: string
  sync_version: number
}

export interface Appointment {
  id: string
  clinic_id: string
  patient_id: string
  doctor_id: string | null
  unit_id: string | null
  date: string
  start_time: string
  end_time: string
  status: string
  type: string | null
  notes: string | null
  duration_minutes: number | null
  reminder_sent: boolean | null
  created_by: string | null
  created_at: string
  updated_at: string
  sync_version: number
  last_reminder_sent: string | null
  reminder_count: number | null
  reminder_enabled: boolean | null
  booking_source: string | null
  confirmed_at: string | null
  confirmed_by: string | null
  estimated_fee: number | null
}

export interface Encounter {
  id: string
  clinic_id: string
  patient_id: string
  doctor_id: string | null
  appointment_id: string | null
  encounter_date: string
  chief_complaint: string | null
  diagnosis: string | null
  treatment_plan: string | null
  notes: string | null
  status: string
  total_amount: number | null
  paid_amount: number | null
  discount_amount: number | null
  created_by: string | null
  created_at: string
  updated_at: string
  sync_version: number
}

export interface Treatment {
  id: string
  encounter_id: string
  clinic_id: string
  patient_id: string
  doctor_id: string | null
  tooth_number: string | null
  tooth_surface: string | null
  procedure_code: string | null
  procedure_name: string | null
  description: string | null
  quantity: number | null
  unit_price: number | null
  discount: number | null
  total_price: number | null
  lab_id: string | null
  lab_cost: number | null
  status: string
  notes: string | null
  created_at: string
  updated_at: string
  sync_version: number
  procedure_category: string | null
  doctor_share: number | null
  doctor_share_calculated: boolean | null
}

export interface Payment {
  id: string
  clinic_id: string
  patient_id: string
  encounter_id: string | null
  /** Links this payment to an implant case so its paid_amount stays in
   * sync with the real payment ledger — mirrors encounter_id's role for
   * encounters.paid_amount. Independent of encounter_id: a payment is
   * attributed to at most one of the two, never both. */
  implant_case_id: string | null
  amount: number
  payment_method: string
  reference: string | null
  notes: string | null
  status: string
  payment_date: string
  created_by: string | null
  created_at: string
  updated_at: string
  sync_version: number
}

export interface Procedure {
  id: string
  clinic_id: string
  code: string
  name: string
  category: string | null
  default_price: number | null
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  sync_version: number
}

export interface Laboratory {
  id: string
  clinic_id: string
  name: string
  type: string | null
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  default_for: string | null
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
  sync_version: number
}

export interface LabOrder {
  id: string
  clinic_id: string
  lab_id: string
  patient_id: string
  doctor_id: string | null
  encounter_id: string | null
  work_type: string | null
  tooth_number: string | null
  shade: string | null
  material: string | null
  deadline: string | null
  status: string
  /** Finer-grained pipeline stage than `status` — basic foundation for
   * a future visual step-by-step tracker (scan -> courier -> CAD/CAM
   * -> firing -> QC -> ready). Defaults to the first stage. */
  stage: 'scan_impression' | 'sent_to_courier' | 'cad_cam_design' | 'firing_layering' | 'quality_control' | 'ready_delivery'
  cost: number | null
  received_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface InsuranceCompany {
  id: string
  clinic_id: string
  name: string
  code: string | null
  phone: string | null
  address: string | null
  discount_percentage: number | null
  coverage_percentage: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface InsuranceClaim {
  id: string
  clinic_id: string
  patient_id: string
  company_id: string | null
  encounter_id: string | null
  claim_number: string | null
  amount: number | null
  approved_amount: number | null
  status: string
  submitted_at: string | null
  response_at: string | null
  notes: string | null
  /** Set the moment 'ثبت به‌عنوان پرداخت' is used — guards against
   * double-recording the same claim's approved_amount as a second
   * completed Payment, which would incorrectly reduce the patient's
   * balance twice for the same insurance settlement. */
  payment_recorded_at: string | null
  created_at: string
  updated_at: string
}

export interface Prescription {
  id: string
  clinic_id: string
  patient_id: string
  doctor_id: string | null
  encounter_id: string | null
  medications: Record<string, any> | null
  notes: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface RadiologyImage {
  id: string
  clinic_id: string
  patient_id: string
  doctor_id: string | null
  encounter_id: string | null
  image_type: string | null
  tooth_number: string | null
  image_url: string | null
  description: string | null
  taken_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface TreatmentPhase {
  id: string
  clinic_id: string
  patient_id: string
  doctor_id: string | null
  phase_number: number
  title: string | null
  description: string | null
  procedures: string | null
  estimated_cost: number | null
  actual_cost: number | null
  estimated_duration_days: number | null
  status: string
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
}

export interface PatientTimeline {
  id: string
  clinic_id: string
  patient_id: string
  event_type: string
  event_date: string
  title: string | null
  description: string | null
  reference_id: string | null
  metadata: Record<string, any> | null
  created_at: string
}

export interface WaitingListEntry {
  id: string
  clinic_id: string
  patient_id: string
  doctor_id: string | null
  preferred_date: string | null
  preferred_time: string | null
  reason: string | null
  priority: number | null
  status: string
  notified_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Staff {
  id: string
  clinic_id: string
  full_name: string
  role: string | null
  phone: string | null
  email: string | null
  hire_date: string | null
  salary: number | null
  is_active: boolean
  created_at: string
  updated_at: string
  is_doctor: boolean | null
  share_percentage: number | null
  share_type: string | null
  fixed_share_amount: number | null
  specialty: string | null
  license_number: string | null
  is_clinic_owner: boolean | null
}

export interface Expense {
  id: string
  clinic_id: string
  category: string
  amount: number
  description: string | null
  date: string
  payment_method: string | null
  reference: string | null
  created_at: string
  updated_at: string
}

export interface TreatmentPackage {
  id: string
  clinic_id: string
  name: string
  description: string | null
  included_procedures: Record<string, any> | null
  total_price: number | null
  discount_percentage: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ConsentForm {
  id: string
  clinic_id: string
  patient_id: string
  doctor_id: string | null
  treatment_description: string | null
  risks: string | null
  signed_at: string | null
  signed_by_patient: boolean | null
  notes: string | null
  created_at: string
}

export interface ToothRecord {
  id: string
  patient_id: string
  clinic_id: string
  tooth_number: string
  is_missing: boolean | null
  is_implant: boolean | null
  notes: string | null
  surfaces: string | null
  condition: string | null
  created_at: string
  updated_at: string
}

export interface InventoryItem {
  id: string
  clinic_id: string
  category_id: string | null
  name: string
  brand: string | null
  unit: string | null
  quantity: number | null
  min_quantity: number | null
  unit_cost: number | null
  supplier: string | null
  expiry_date: string | null
  location: string | null
  notes: string | null
  /** Scanned/entered via camera barcode reader — powers scan-to-find
   * (increment stock on an existing item) and scan-to-create
   * (pre-fill a new item's barcode) in the Inventory module. */
  barcode: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  sync_version: number
}

export interface InventoryCategory {
  id: string
  clinic_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface PaymentPlan {
  id: string
  clinic_id: string
  patient_id: string
  encounter_id: string | null
  total_amount: number
  installment_count: number
  start_date: string
  status: string
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  sync_version: number
}

export interface Installment {
  id: string
  payment_plan_id: string
  clinic_id: string
  patient_id: string
  installment_number: number
  amount: number
  due_date: string
  payment_date: string | null
  status: string
  reminder_sent: boolean | null
  notes: string | null
  created_at: string
  updated_at: string
  sync_version: number
}

export interface Cheque {
  id: string
  clinic_id: string
  patient_id: string
  amount: number
  bank_name: string | null
  branch: string | null
  cheque_number: string | null
  account_number: string | null
  issue_date: string
  due_date: string
  payee_name: string | null
  /** شناسه صیاد (Sayad tracking ID) printed on the physical cheque —
   * manually entered for now; foundation for real-time bank
   * verification later. */
  sayad_id: string | null
  /** 'payment': a normal cheque representing an actual scheduled deposit.
   * 'guarantee': collateral held against a payment_plan's full remaining
   * balance — not itself a scheduled deposit, so it should never be
   * counted in cash-flow-in projections the way a payment cheque is. */
  purpose: 'payment' | 'guarantee'
  /** Set only when purpose is 'guarantee' — the plan this cheque secures. */
  payment_plan_id: string | null
  status: string
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  sync_version: number
}

export interface DoctorSchedule {
  id: string
  clinic_id: string
  doctor_id: string
  day_of_week: number
  start_time: string
  end_time: string
  slot_duration: number | null
  break_duration: number | null
  break_start: string | null
  break_end: string | null
  max_appointments: number | null
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ImplantCase {
  id: string
  clinic_id: string
  patient_id: string
  doctor_id: string | null
  tooth_number: string | null
  brand: string | null
  model: string | null
  diameter: string | null
  length: string | null
  surgery_date: string | null
  healing_abutment_date: string | null
  impression_date: string | null
  crown_delivery_date: string | null
  stage: string | null
  bone_graft: boolean | null
  gbr: boolean | null
  membrane_used: boolean | null
  extraction_needed: boolean | null
  sinus_lift: boolean | null
  immediate_loading: boolean | null
  total_cost: number | null
  paid_amount: number | null
  warranty_years: number | null
  /** How the surgeon's share for THIS case is determined — an automatic
   * formula ((revenue minus deductible material costs) / 2, mirroring
   * the same net-split logic used for regular doctor commissions) or a
   * manually negotiated fixed amount. Cases vary enough (who did the
   * surgery vs. who seated the crown, special arrangements, etc.) that
   * this needs to be a real per-case choice, not a single global rule. */
  surgery_fee_mode: 'formula' | 'negotiated' | null
  surgery_fee_amount: number | null
  surgery_settled: boolean | null
  prosthesis_doctor_id: string | null
  prosthesis_fee_amount: number | null
  prosthesis_settled: boolean | null
  notes: string | null
  success_status: string | null
  failure_reason: string | null
  created_at: string
  updated_at: string
}

export interface ImplantComponent {
  id: string
  clinic_id: string
  implant_case_id: string
  component_type: string | null
  brand: string | null
  model: string | null
  serial_number: string | null
  cost: number | null
  placed_date: string | null
  notes: string | null
  /** Whether this component's cost counts toward the deduction before
   * computing the surgeon's share. Fixture is always excluded
   * regardless of this flag (its cost is billed separately) — other
   * consumables (abutment, membrane, etc.) are opt-in per case since
   * not every case uses every material. */
  include_in_doctor_share: boolean | null
  created_at: string
  updated_at: string
}

export interface SmsTemplate {
  id: string
  clinic_id: string
  type: string
  name: string
  template: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// ============================================================================
// Relation Types (WithRelations)
// ============================================================================

export type AppointmentWithRelations = Appointment & {
  patient: Patient | null
  doctor: Doctor | null
  unit: Unit | null
}

export type EncounterWithRelations = Encounter & {
  patient: Patient | null
  doctor: Doctor | null
}

export type TreatmentWithRelations = Treatment & {
  doctor: Doctor | null
}

export type LabOrderWithRelations = LabOrder & {
  lab: Laboratory | null
  patient: Patient | null
  doctor: Doctor | null
}

export type InsuranceClaimWithRelations = InsuranceClaim & {
  patient: Patient | null
  company: InsuranceCompany | null
}

export type PrescriptionWithRelations = Prescription & {
  doctor: Doctor | null
}

export type WaitingListEntryWithRelations = WaitingListEntry & {
  patient: Patient | null
  doctor: Doctor | null
}

export type InventoryItemWithRelations = InventoryItem & {
  category: InventoryCategory | null
}

export type PaymentPlanWithRelations = PaymentPlan & {
  installments: Installment[]
}

export type ImplantCaseWithRelations = ImplantCase & {
  patient: Patient | null
  doctor: Doctor | null
  components: ImplantComponent[]
}

export interface DashboardStats {
  patientCount: number
  todayAppointments: number
  encounterCount: number
  totalRevenue: number
  activeLabOrders: number
  implantCount: number
}

// ============================================================================
// Input Helper Types
// ============================================================================

export type PatientInput = Omit<
  Patient,
  'id' | 'created_at' | 'updated_at' | 'sync_version' | 'file_number_assigned_at'
> & {
  clinic_id?: string
  file_number?: string
  file_number_manual?: boolean
}

export type DoctorInput = Omit<
  Doctor,
  'id' | 'created_at' | 'updated_at' | 'sync_version' | 'clinic_id'
> & {
  clinic_id?: string
}

export type UnitInput = Omit<
  Unit,
  'id' | 'created_at' | 'updated_at' | 'sync_version' | 'clinic_id'
> & {
  clinic_id?: string
}

export type AppointmentInput = Omit<
  Appointment,
  'id' | 'created_at' | 'updated_at' | 'sync_version'
> & {
  clinic_id?: string
}

export type EncounterInput = Omit<
  Encounter,
  'id' | 'created_at' | 'updated_at' | 'sync_version'
> & {
  clinic_id?: string
}

export type TreatmentInput = Omit<
  Treatment,
  'id' | 'created_at' | 'updated_at' | 'sync_version'
> & {
  clinic_id?: string
}

export type PaymentInput = Omit<
  Payment,
  'id' | 'created_at' | 'updated_at' | 'sync_version'
> & {
  clinic_id?: string
}

export type LaboratoryInput = Omit<
  Laboratory,
  'id' | 'created_at' | 'updated_at' | 'sync_version'
> & {
  clinic_id?: string
}

export type LabOrderInput = Omit<
  LabOrder,
  'id' | 'created_at' | 'updated_at'
> & {
  clinic_id?: string
}

export type PrescriptionInput = Omit<
  Prescription,
  'id' | 'created_at' | 'updated_at'
> & {
  clinic_id?: string
}

export type WaitingListEntryInput = Omit<
  WaitingListEntry,
  'id' | 'created_at' | 'updated_at'
> & {
  clinic_id?: string
}

export type StaffInput = Omit<
  Staff,
  'id' | 'created_at' | 'updated_at' | 'clinic_id'
> & {
  clinic_id?: string
}

export type ExpenseInput = Omit<
  Expense,
  'id' | 'created_at' | 'updated_at'
> & {
  clinic_id?: string
}

export type ToothRecordInput = Omit<
  ToothRecord,
  'id' | 'created_at' | 'updated_at'
> & {
  clinic_id?: string
}

export type InventoryItemInput = Omit<
  InventoryItem,
  'id' | 'created_at' | 'updated_at' | 'sync_version'
> & {
  clinic_id?: string
}

export type PaymentPlanInput = Omit<
  PaymentPlan,
  'id' | 'created_at' | 'updated_at' | 'sync_version'
> & {
  clinic_id?: string
}

export type InstallmentInput = Omit<
  Installment,
  'id' | 'created_at' | 'updated_at' | 'sync_version'
> & {
  clinic_id?: string
}

export type ChequeInput = Omit<
  Cheque,
  'id' | 'created_at' | 'updated_at' | 'sync_version'
> & {
  clinic_id?: string
}

export type ImplantCaseInput = Omit<
  ImplantCase,
  'id' | 'created_at' | 'updated_at'
> & {
  clinic_id?: string
}

export type ImplantComponentInput = Omit<
  ImplantComponent,
  'id' | 'created_at' | 'updated_at'
> & {
  clinic_id?: string
}

export type ProcedureInput = Omit<
  Procedure,
  'id' | 'created_at' | 'updated_at' | 'sync_version' | 'clinic_id'
> & {
  clinic_id?: string
}

export type InsuranceCompanyInput = Omit<
  InsuranceCompany,
  'id' | 'created_at' | 'updated_at' | 'clinic_id'
> & {
  clinic_id?: string
}

export type InsuranceClaimInput = Omit<
  InsuranceClaim,
  'id' | 'created_at' | 'updated_at' | 'clinic_id'
> & {
  clinic_id?: string
}

export type RadiologyImageInput = Omit<
  RadiologyImage,
  'id' | 'created_at' | 'updated_at' | 'clinic_id'
> & {
  clinic_id?: string
}

export type TreatmentPhaseInput = Omit<
  TreatmentPhase,
  'id' | 'created_at' | 'updated_at' | 'clinic_id'
> & {
  clinic_id?: string
}

export type SmsTemplateInput = Omit<
  SmsTemplate,
  'id' | 'created_at' | 'updated_at' | 'clinic_id'
> & {
  clinic_id?: string
}

export type TreatmentPackageInput = Omit<
  TreatmentPackage,
  'id' | 'created_at' | 'updated_at' | 'clinic_id'
> & {
  clinic_id?: string
}

export type InventoryCategoryInput = Omit<
  InventoryCategory,
  'id' | 'created_at' | 'updated_at' | 'clinic_id'
> & {
  clinic_id?: string
}

export type ConsentFormInput = Omit<
  ConsentForm,
  'id' | 'created_at' | 'clinic_id'
> & {
  clinic_id?: string
}

export type DoctorScheduleInput = Omit<
  DoctorSchedule,
  'id' | 'created_at' | 'updated_at' | 'clinic_id'
> & {
  clinic_id?: string
}

export interface PersonalFinanceItem {
  id: string
  clinic_id: string
  /** loan/وام, rent/اجاره, cheque/چک, debt/بدهی, or a generic 'other' —
   * a single flexible table for the whole personal-finance module
   * rather than four separate tables, since they share the same shape
   * (a party you owe or are owed, an amount, a due date, a status). */
  item_type: 'loan' | 'rent' | 'cheque' | 'debt' | 'other'
  title: string
  counterparty: string | null
  total_amount: number
  paid_amount: number
  due_date: string | null
  monthly_amount: number | null
  interest_rate: number | null
  cheque_number: string | null
  bank_name: string | null
  status: 'active' | 'completed' | 'overdue' | 'cancelled'
  notes: string | null
  created_at: string
  updated_at: string
}

export type PersonalFinanceItemInput = Omit<PersonalFinanceItem, 'id' | 'created_at' | 'updated_at'> & { clinic_id?: string }

// ── Editable RBAC (role_permissions + custom_roles) ────────────────────
export interface RolePermission {
  id: string
  clinic_id: string
  role_key: string
  module_path: string
  allowed: boolean
  created_at: string
  updated_at: string
  sync_version: number
}
export type RolePermissionInput = Omit<RolePermission, 'id' | 'created_at' | 'updated_at' | 'sync_version'> & { clinic_id?: string }

export interface CustomRole {
  id: string
  clinic_id: string
  role_key: string
  label: string
  created_at: string
  updated_at: string
  sync_version: number
}
export type CustomRoleInput = Omit<CustomRole, 'id' | 'created_at' | 'updated_at' | 'sync_version'> & { clinic_id?: string }

export interface CashRegisterSession {
  id: string
  clinic_id: string
  opened_at: string
  closed_at: string | null
  opening_balance: number
  expected_closing_balance: number | null
  counted_closing_balance: number | null
  discrepancy: number | null
  opened_by: string | null
  closed_by: string | null
  status: 'open' | 'closed'
  notes: string | null
  created_at: string
  updated_at: string
}

export type CashRegisterSessionInput = Omit<CashRegisterSession, 'id' | 'created_at' | 'updated_at'> & { clinic_id?: string }
