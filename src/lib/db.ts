import Dexie, { Table } from 'dexie'
import type {
  Patient, Doctor, Unit, Appointment, Encounter, Treatment, Payment,
  Procedure, Laboratory, LabOrder, InsuranceCompany, InsuranceClaim,
  Prescription, RadiologyImage, TreatmentPhase, PatientTimeline,
  WaitingListEntry, Staff, Expense, TreatmentPackage, ConsentForm,
  ToothRecord, InventoryItem, InventoryCategory, PaymentPlan, Installment,
  Cheque, DoctorSchedule, ImplantCase, ImplantComponent, SmsTemplate,
} from '../types'

export interface SyncQueueEntry {
  id?: number
  table_name: string
  operation: 'insert' | 'update' | 'delete'
  record_id: string
  data: any
  created_at: number
  retry_count: number
}

export interface SyncMeta {
  table_name: string
  last_sync_at: string
}

export interface AuditLogEntry {
  id?: number
  table_name: string
  operation: 'insert' | 'update' | 'delete'
  record_id: string
  summary: string
  actor_name: string
  actor_role: string | null
  created_at: string
}

export interface BackupSnapshot {
  id?: number
  date: string // YYYY-MM-DD, one per day
  created_at: string
  record_count: number
  data: string // JSON-stringified { [table]: rows[] }
}

class MinadentDB extends Dexie {
  patients!: Table<Patient, string>
  doctors!: Table<Doctor, string>
  units!: Table<Unit, string>
  appointments!: Table<Appointment, string>
  encounters!: Table<Encounter, string>
  treatments!: Table<Treatment, string>
  payments!: Table<Payment, string>
  procedures!: Table<Procedure, string>
  laboratories!: Table<Laboratory, string>
  lab_orders!: Table<LabOrder, string>
  insurance_companies!: Table<InsuranceCompany, string>
  insurance_claims!: Table<InsuranceClaim, string>
  prescriptions!: Table<Prescription, string>
  radiology_images!: Table<RadiologyImage, string>
  treatment_phases!: Table<TreatmentPhase, string>
  patient_timeline!: Table<PatientTimeline, string>
  waiting_list!: Table<WaitingListEntry, string>
  staff!: Table<Staff, string>
  expenses!: Table<Expense, string>
  treatment_packages!: Table<TreatmentPackage, string>
  consent_forms!: Table<ConsentForm, string>
  tooth_records!: Table<ToothRecord, string>
  inventory_items!: Table<InventoryItem, string>
  inventory_categories!: Table<InventoryCategory, string>
  payment_plans!: Table<PaymentPlan, string>
  installments!: Table<Installment, string>
  cheques!: Table<Cheque, string>
  doctor_schedules!: Table<DoctorSchedule, string>
  implant_cases!: Table<ImplantCase, string>
  implant_components!: Table<ImplantComponent, string>
  sms_templates!: Table<SmsTemplate, string>
  sync_queue!: Table<SyncQueueEntry, number>
  sync_meta!: Table<SyncMeta, string>
  audit_log!: Table<AuditLogEntry, number>
  backup_snapshots!: Table<BackupSnapshot, number>

  constructor() {
    super('minadent')
    this.version(1).stores({
      patients: 'id, clinic_id, file_number, national_id, first_name, last_name, phone, is_active, vip_level',
      doctors: 'id, clinic_id, specialty, is_active',
      units: 'id, clinic_id, number, is_active',
      appointments: 'id, clinic_id, patient_id, doctor_id, unit_id, date, status, type, start_time',
      encounters: 'id, clinic_id, patient_id, doctor_id, appointment_id, encounter_date, status',
      treatments: 'id, encounter_id, clinic_id, patient_id, doctor_id, tooth_number, status, procedure_category',
      payments: 'id, clinic_id, patient_id, encounter_id, payment_date, status, payment_method',
      procedures: 'id, clinic_id, code, category, is_active',
      laboratories: 'id, clinic_id, is_active',
      lab_orders: 'id, clinic_id, lab_id, patient_id, doctor_id, status, deadline',
      insurance_companies: 'id, clinic_id, is_active',
      insurance_claims: 'id, clinic_id, patient_id, company_id, status',
      prescriptions: 'id, clinic_id, patient_id, doctor_id, status',
      radiology_images: 'id, clinic_id, patient_id, doctor_id, image_type',
      treatment_phases: 'id, clinic_id, patient_id, doctor_id, status',
      patient_timeline: 'id, clinic_id, patient_id, event_type, event_date',
      waiting_list: 'id, clinic_id, patient_id, doctor_id, priority, status',
      staff: 'id, clinic_id, role, is_active',
      expenses: 'id, clinic_id, category, date',
      treatment_packages: 'id, clinic_id, is_active',
      consent_forms: 'id, clinic_id, patient_id, doctor_id',
      tooth_records: 'id, patient_id, clinic_id, tooth_number',
      inventory_items: 'id, clinic_id, category_id, name, brand, quantity, min_quantity',
      inventory_categories: 'id, clinic_id, name',
      payment_plans: 'id, clinic_id, patient_id, status',
      installments: 'id, payment_plan_id, clinic_id, patient_id, status, due_date',
      cheques: 'id, clinic_id, patient_id, status, due_date',
      doctor_schedules: 'id, clinic_id, doctor_id, day_of_week',
      implant_cases: 'id, clinic_id, patient_id, doctor_id, stage, success_status',
      implant_components: 'id, clinic_id, implant_case_id, component_type',
      sms_templates: 'id, clinic_id, type, is_active',
      sync_queue: '++id, table_name, operation, record_id, created_at, retry_count',
      sync_meta: 'table_name, last_sync_at',
    })
    // v2: local-only audit trail + automatic daily backup snapshots.
    // Neither table is in TABLE_NAMES, so neither is pushed to Supabase —
    // both stay purely on-device for now.
    this.version(2).stores({
      audit_log: '++id, table_name, operation, record_id, created_at',
      backup_snapshots: '++id, date, created_at',
    })
  }
}

export const db = new MinadentDB()

// ── Multi-tab schema-upgrade safety ─────────────────────────────────────
// IndexedDB upgrades (like the audit_log/backup_snapshots tables added in
// v2) can hang forever — silently, with no error — if another browser tab
// (or a leftover service-worker-cached page) still holds an open
// connection to the OLD database version. That blocks the upgrade
// transaction indefinitely, which is exactly the "app never finishes
// loading, stuck on skeletons" failure mode. These two handlers make
// every future version bump safe automatically:
db.on('versionchange', () => {
  // Another tab wants to upgrade — release our own connection so it can
  // proceed instead of blocking it.
  db.close()
  window.location.reload()
})
db.on('blocked', () => {
  // Our own upgrade is being blocked by another open tab/connection.
  console.warn('Database upgrade blocked by another open tab — please close other tabs of this app and reload.')
})

export const TABLE_NAMES = [
  'patients', 'doctors', 'units', 'appointments', 'encounters', 'treatments',
  'payments', 'procedures', 'laboratories', 'lab_orders', 'insurance_companies',
  'insurance_claims', 'prescriptions', 'radiology_images', 'treatment_phases',
  'patient_timeline', 'waiting_list', 'staff', 'expenses', 'treatment_packages',
  'consent_forms', 'tooth_records', 'inventory_items', 'inventory_categories',
  'payment_plans', 'installments', 'cheques', 'doctor_schedules',
  'implant_cases', 'implant_components', 'sms_templates',
] as const

export type TableName = typeof TABLE_NAMES[number]
