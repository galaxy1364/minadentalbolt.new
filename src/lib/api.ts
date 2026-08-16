// Minadent - Offline-first API layer
// All reads come from local IndexedDB (instant). All writes go to local DB + sync queue.
import { supabase, CLINIC_ID } from './supabase'
import { db } from './db'
import { queueOperation } from './sync'
import {
  Patient, PatientInput, Doctor, Unit, Appointment, AppointmentInput,
  AppointmentWithRelations, Encounter, EncounterInput, EncounterWithRelations,
  Treatment, TreatmentInput, TreatmentWithRelations, Payment, PaymentInput,
  Procedure, ProcedureInput, Laboratory, LaboratoryInput, LabOrder, LabOrderInput,
  LabOrderWithRelations, InsuranceCompany, InsuranceCompanyInput, InsuranceClaim,
  InsuranceClaimInput, InsuranceClaimWithRelations, Prescription, PrescriptionInput,
  PrescriptionWithRelations, RadiologyImage, RadiologyImageInput, TreatmentPhase,
  TreatmentPhaseInput, PatientTimeline,
  WaitingListEntry, WaitingListEntryInput, WaitingListEntryWithRelations,
  Staff, StaffInput, Expense, ExpenseInput, ToothRecord, ToothRecordInput,
  InventoryItem, InventoryItemInput, InventoryItemWithRelations,
  InventoryCategory, InventoryCategoryInput, PaymentPlan, PaymentPlanInput,
  PaymentPlanWithRelations, Installment, InstallmentInput, Cheque, ChequeInput,
  ImplantCase, ImplantCaseInput, ImplantCaseWithRelations, ImplantComponent,
  ImplantComponentInput, SmsTemplate, SmsTemplateInput, DoctorSchedule,
  DoctorScheduleInput, TreatmentPackage, TreatmentPackageInput, ConsentForm,
  PersonalFinanceItem, PersonalFinanceItemInput,
  ConsentFormInput, DashboardStats, DoctorInput, UnitInput,
} from '../types'

function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function nowISO(): string {
  return new Date().toISOString()
}

// ── File Number ──────────────────────────────────────────────
export async function generateFileNumber(manual?: string): Promise<string> {
  if (manual) {
    const existing = await db.patients
      .where('file_number').equals(manual)
      .count()
    if (existing > 0) throw new Error('شماره پرونده تکراری است')
    return manual
  }
  // Scan all patients and find the maximum numeric suffix (including manually entered numbers)
  const all = await db.patients.where('clinic_id').equals(CLINIC_ID).toArray()
  let maxNum = 999
  for (const p of all) {
    if (!p.file_number) continue
    const match = p.file_number.match(/(\d+)$/)
    if (match) {
      const n = parseInt(match[1])
      if (n > maxNum) maxNum = n
    }
  }
  const next = maxNum + 1
  return `MD-${String(next).padStart(4, '0')}`
}

// Preview the next auto file number without creating a patient
export async function peekNextFileNumber(): Promise<string> {
  return generateFileNumber()
}

// ── Patients ─────────────────────────────────────────────────
export async function fetchPatients(search?: string): Promise<Patient[]> {
  let collection = db.patients.where('clinic_id').equals(CLINIC_ID)
  let items = await collection.toArray()
  if (search) {
    const s = search.toLowerCase()
    items = items.filter((p) =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(s) ||
      p.phone?.includes(s) ||
      p.national_id?.includes(s) ||
      p.file_number?.toLowerCase().includes(s)
    )
  }
  return items.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
}

export async function fetchPatient(id: string): Promise<Patient | null> {
  return (await db.patients.get(id)) ?? null
}

export async function createPatient(p: PatientInput): Promise<Patient> {
  const fileNumber = p.file_number || await generateFileNumber(p.file_number)
  const { clinic_id, file_number_manual, file_number, ...rest } = p
  const id = uid()
  const patient: Patient = {
    ...rest,
    id,
    clinic_id: CLINIC_ID,
    file_number: fileNumber,
    file_number_manual: file_number_manual ?? false,
    file_number_assigned_at: nowISO(),
    is_active: true,
    created_at: nowISO(),
    updated_at: nowISO(),
    sync_version: 1,
  }
  await db.patients.put(patient)
  await queueOperation('patients', 'insert', id, patient)
  await addTimelineEntry(id, 'patient_created', 'ثبت بیمار جدید', `بیمار ${patient.first_name} ${patient.last_name} ثبت شد`)
  return patient
}

export async function updatePatient(id: string, updates: Partial<PatientInput>): Promise<Patient> {
  const existing = await db.patients.get(id)
  if (!existing) throw new Error('بیمار یافت نشد')
  const { clinic_id, file_number, file_number_manual, ...rest } = updates
  // Never overwrite file_number via update — it's assigned once at creation
  void file_number; void file_number_manual
  const updated: Patient = { ...existing, ...rest, updated_at: nowISO() }
  await db.patients.put(updated)
  await queueOperation('patients', 'update', id, rest)
  return updated
}

// ── Doctors & Units ──────────────────────────────────────────
export async function fetchDoctors(): Promise<Doctor[]> {
  const items = await db.doctors.where('clinic_id').equals(CLINIC_ID).toArray()
  return items.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
}

export async function fetchUnits(): Promise<Unit[]> {
  const items = await db.units.where('clinic_id').equals(CLINIC_ID).toArray()
  return items.sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
}

// ── Appointments ─────────────────────────────────────────────
export async function fetchAppointments(startDate?: string, endDate?: string): Promise<AppointmentWithRelations[]> {
  let items = await db.appointments.where('clinic_id').equals(CLINIC_ID).toArray()
  if (startDate) items = items.filter((a) => a.date >= startDate)
  if (endDate) items = items.filter((a) => a.date <= endDate)
  items.sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.start_time || '').localeCompare(b.start_time || ''))
  const patients = await db.patients.toArray()
  const doctors = await db.doctors.toArray()
  const units = await db.units.toArray()
  const pMap = new Map(patients.map((p) => [p.id, p]))
  const dMap = new Map(doctors.map((d) => [d.id, d]))
  const uMap = new Map(units.map((u) => [u.id, u]))
  return items.map((a) => ({ ...a, patient: pMap.get(a.patient_id as string) ?? null, doctor: dMap.get(a.doctor_id as string) ?? null, unit: uMap.get(a.unit_id as string) ?? null }))
}

export async function createAppointment(a: AppointmentInput): Promise<Appointment> {
  const { clinic_id, ...rest } = a
  const id = uid()
  const appt: Appointment = {
    ...rest, id, clinic_id: CLINIC_ID,
    created_at: nowISO(), updated_at: nowISO(), sync_version: 1,
    reminder_sent: false, reminder_count: 0, reminder_enabled: a.reminder_enabled ?? true,
  }
  await db.appointments.put(appt)
  await queueOperation('appointments', 'insert', id, appt)
  return appt
}

export async function updateAppointment(id: string, updates: Partial<AppointmentInput>): Promise<Appointment> {
  const existing = await db.appointments.get(id)
  if (!existing) throw new Error('نوبت یافت نشد')
  const { clinic_id, ...rest } = updates
  const updated: Appointment = { ...existing, ...rest, updated_at: nowISO() }
  await db.appointments.put(updated)
  await queueOperation('appointments', 'update', id, rest)
  return updated
}

export async function deletePatient(id: string): Promise<void> {
  // Cascade delete all related records before deleting the patient
  const [appts, encounters, treatments, payments, prescriptions, radiology, toothRecords, timeline, waitingEntries, labOrders, implantCases, paymentPlans, cheques, consentForms, treatmentPhases] = await Promise.all([
    db.appointments.where('patient_id').equals(id).toArray(),
    db.encounters.where('patient_id').equals(id).toArray(),
    db.treatments.where('patient_id').equals(id).toArray(),
    db.payments.where('patient_id').equals(id).toArray(),
    db.prescriptions.where('patient_id').equals(id).toArray(),
    db.radiology_images.where('patient_id').equals(id).toArray(),
    db.tooth_records.where('patient_id').equals(id).toArray(),
    db.patient_timeline.where('patient_id').equals(id).toArray(),
    db.waiting_list.where('patient_id').equals(id).toArray(),
    db.lab_orders.where('patient_id').equals(id).toArray(),
    db.implant_cases.where('patient_id').equals(id).toArray(),
    db.payment_plans.where('patient_id').equals(id).toArray(),
    db.cheques.where('patient_id').equals(id).toArray(),
    db.consent_forms.where('patient_id').equals(id).toArray(),
    db.treatment_phases.where('patient_id').equals(id).toArray(),
  ])

  // Queue delete operations for sync
  for (const r of [...appts, ...encounters, ...treatments, ...payments, ...prescriptions, ...radiology, ...toothRecords, ...timeline, ...waitingEntries, ...labOrders, ...implantCases, ...paymentPlans, ...cheques, ...consentForms, ...treatmentPhases]) {
    const tableName = appts.includes(r as any) ? 'appointments' :
      encounters.includes(r as any) ? 'encounters' :
      treatments.includes(r as any) ? 'treatments' :
      payments.includes(r as any) ? 'payments' :
      prescriptions.includes(r as any) ? 'prescriptions' :
      radiology.includes(r as any) ? 'radiology_images' :
      toothRecords.includes(r as any) ? 'tooth_records' :
      timeline.includes(r as any) ? 'patient_timeline' :
      waitingEntries.includes(r as any) ? 'waiting_list' :
      labOrders.includes(r as any) ? 'lab_orders' :
      implantCases.includes(r as any) ? 'implant_cases' :
      paymentPlans.includes(r as any) ? 'payment_plans' :
      cheques.includes(r as any) ? 'cheques' :
      consentForms.includes(r as any) ? 'consent_forms' :
      treatmentPhases.includes(r as any) ? 'treatment_phases' : null
    if (tableName) await queueOperation(tableName as any, 'delete', r.id)
  }

  // Delete all from local DB
  await Promise.all([
    db.appointments.where('patient_id').equals(id).delete(),
    db.encounters.where('patient_id').equals(id).delete(),
    db.treatments.where('patient_id').equals(id).delete(),
    db.payments.where('patient_id').equals(id).delete(),
    db.prescriptions.where('patient_id').equals(id).delete(),
    db.radiology_images.where('patient_id').equals(id).delete(),
    db.tooth_records.where('patient_id').equals(id).delete(),
    db.patient_timeline.where('patient_id').equals(id).delete(),
    db.waiting_list.where('patient_id').equals(id).delete(),
    db.lab_orders.where('patient_id').equals(id).delete(),
    db.implant_cases.where('patient_id').equals(id).delete(),
    db.payment_plans.where('patient_id').equals(id).delete(),
    db.cheques.where('patient_id').equals(id).delete(),
    db.consent_forms.where('patient_id').equals(id).delete(),
    db.treatment_phases.where('patient_id').equals(id).delete(),
  ])

  await db.patients.delete(id)
  await queueOperation('patients', 'delete', id)
}

export async function deleteAppointment(id: string): Promise<void> {
  await db.appointments.delete(id)
  await queueOperation('appointments', 'delete', id)
}

/**
 * Checks BOTH kinds of real scheduling conflict a clinic can hit:
 *  - Same doctor double-booked (they can't see two patients at once)
 *  - Same physical unit/chair double-booked (even with two different
 *    doctors — a clinic with more doctors than chairs is common, and
 *    the previous version only checked doctor_id, silently allowing two
 *    different doctors to be booked into the same chair at once).
 */
export async function checkConflict(
  doctorId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeId?: string,
  unitId?: string | null,
): Promise<'doctor' | 'unit' | null> {
  const items = await db.appointments
    .where('clinic_id').equals(CLINIC_ID)
    .and((a) => a.date === date && a.status !== 'cancelled' && a.id !== excludeId)
    .toArray()

  const overlaps = (a: Appointment) => a.start_time < endTime && a.end_time > startTime

  if (items.some((a) => a.doctor_id === doctorId && overlaps(a))) return 'doctor'
  if (unitId && items.some((a) => a.unit_id === unitId && overlaps(a))) return 'unit'
  return null
}

// ── Encounters ───────────────────────────────────────────────
export async function fetchEncounters(patientId?: string): Promise<EncounterWithRelations[]> {
  let items = await db.encounters.where('clinic_id').equals(CLINIC_ID).toArray()
  if (patientId) items = items.filter((e) => e.patient_id === patientId)
  items.sort((a, b) => (b.encounter_date || '').localeCompare(a.encounter_date || ''))
  const patients = await db.patients.toArray()
  const doctors = await db.doctors.toArray()
  const pMap = new Map(patients.map((p) => [p.id, p]))
  const dMap = new Map(doctors.map((d) => [d.id, d]))
  return items.map((e) => ({ ...e, patient: pMap.get(e.patient_id as string) ?? null, doctor: dMap.get(e.doctor_id as string) ?? null }))
}

export async function createEncounter(e: EncounterInput): Promise<Encounter> {
  const { clinic_id, ...rest } = e
  const id = uid()
  const enc: Encounter = { ...rest, id, clinic_id: CLINIC_ID, created_at: nowISO(), updated_at: nowISO(), sync_version: 1 }
  await db.encounters.put(enc)
  await queueOperation('encounters', 'insert', id, enc)
  return enc
}

export async function updateEncounter(id: string, updates: Partial<EncounterInput>): Promise<Encounter> {
  const existing = await db.encounters.get(id)
  if (!existing) throw new Error('ویزیت یافت نشد')
  const { clinic_id, ...rest } = updates
  const updated: Encounter = { ...existing, ...rest, updated_at: nowISO() }
  await db.encounters.put(updated)
  await queueOperation('encounters', 'update', id, rest)
  return updated
}

// ── Treatments ───────────────────────────────────────────────
export async function fetchTreatments(encounterId?: string, patientId?: string): Promise<TreatmentWithRelations[]> {
  let items = await db.treatments.where('clinic_id').equals(CLINIC_ID).toArray()
  if (encounterId) items = items.filter((t) => t.encounter_id === encounterId)
  if (patientId) items = items.filter((t) => t.patient_id === patientId)
  items.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
  const doctors = await db.doctors.toArray()
  const dMap = new Map(doctors.map((d) => [d.id, d]))
  return items.map((t) => ({ ...t, doctor: dMap.get(t.doctor_id as string) ?? null }))
}

export async function createTreatment(t: TreatmentInput): Promise<Treatment> {
  const { clinic_id, ...rest } = t
  const id = uid()
  const treatment: Treatment = { ...rest, id, clinic_id: CLINIC_ID, created_at: nowISO(), updated_at: nowISO(), sync_version: 1 }
  await db.treatments.put(treatment)
  await queueOperation('treatments', 'insert', id, treatment)
  return treatment
}

export async function updateTreatment(id: string, updates: Partial<TreatmentInput>): Promise<Treatment> {
  const existing = await db.treatments.get(id)
  if (!existing) throw new Error('درمان یافت نشد')
  const { clinic_id, ...rest } = updates
  const updated: Treatment = { ...existing, ...rest, updated_at: nowISO() }
  await db.treatments.put(updated)
  await queueOperation('treatments', 'update', id, rest)
  return updated
}

// ── Payments ─────────────────────────────────────────────────
export async function fetchPayments(patientId?: string): Promise<Payment[]> {
  let items = await db.payments.where('clinic_id').equals(CLINIC_ID).toArray()
  if (patientId) items = items.filter((p) => p.patient_id === patientId)
  return items.sort((a, b) => (b.payment_date || '').localeCompare(a.payment_date || ''))
}

export async function createPayment(p: PaymentInput): Promise<Payment> {
  const { clinic_id, ...rest } = p
  const id = uid()
  const payment: Payment = { ...rest, id, clinic_id: CLINIC_ID, created_at: nowISO(), updated_at: nowISO(), sync_version: 1 }
  await db.payments.put(payment)
  await queueOperation('payments', 'insert', id, payment)
  // Update encounter paid_amount
  if (payment.encounter_id && payment.status === 'completed') {
    const enc = await db.encounters.get(payment.encounter_id)
    if (enc) {
      const updatedEnc = { ...enc, paid_amount: (enc.paid_amount ?? 0) + (payment.amount ?? 0), updated_at: nowISO() }
      await db.encounters.put(updatedEnc)
      await queueOperation('encounters', 'update', enc.id, { paid_amount: updatedEnc.paid_amount })
    }
  }
  return payment
}

// ── Procedures ───────────────────────────────────────────────
export async function fetchProcedures(): Promise<Procedure[]> {
  const items = await db.procedures.where('clinic_id').equals(CLINIC_ID).toArray()
  return items.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
}

// ── Laboratories & Lab Orders ────────────────────────────────
export async function fetchLabs(): Promise<Laboratory[]> {
  const items = await db.laboratories.where('clinic_id').equals(CLINIC_ID).toArray()
  return items.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
}

export async function createLab(l: LaboratoryInput): Promise<Laboratory> {
  const { clinic_id, ...rest } = l
  const id = uid()
  const lab: Laboratory = { ...rest, id, clinic_id: CLINIC_ID, created_at: nowISO(), updated_at: nowISO(), sync_version: 1 }
  await db.laboratories.put(lab)
  await queueOperation('laboratories', 'insert', id, lab)
  return lab
}

export async function fetchLabOrders(): Promise<LabOrderWithRelations[]> {
  const items = await db.lab_orders.where('clinic_id').equals(CLINIC_ID).toArray()
  items.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
  const labs = await db.laboratories.toArray()
  const patients = await db.patients.toArray()
  const doctors = await db.doctors.toArray()
  const lMap = new Map(labs.map((l) => [l.id, l]))
  const pMap = new Map(patients.map((p) => [p.id, p]))
  const dMap = new Map(doctors.map((d) => [d.id, d]))
  return items.map((o) => ({ ...o, lab: lMap.get(o.lab_id as string) ?? null, patient: pMap.get(o.patient_id as string) ?? null, doctor: dMap.get(o.doctor_id as string) ?? null }))
}

export async function createLabOrder(l: LabOrderInput): Promise<LabOrder> {
  const { clinic_id, ...rest } = l
  const id = uid()
  const order: LabOrder = { ...rest, id, clinic_id: CLINIC_ID, created_at: nowISO(), updated_at: nowISO() }
  await db.lab_orders.put(order)
  await queueOperation('lab_orders', 'insert', id, order)
  return order
}

export async function updateLabOrder(id: string, updates: Partial<LabOrderInput>): Promise<LabOrder> {
  const existing = await db.lab_orders.get(id)
  if (!existing) throw new Error('سفارش یافت نشد')
  const { clinic_id, ...rest } = updates
  const updated: LabOrder = { ...existing, ...rest, updated_at: nowISO() }
  await db.lab_orders.put(updated)
  await queueOperation('lab_orders', 'update', id, rest)
  return updated
}

// ── Insurance ────────────────────────────────────────────────
export async function fetchInsuranceCompanies(): Promise<InsuranceCompany[]> {
  const items = await db.insurance_companies.where('clinic_id').equals(CLINIC_ID).toArray()
  return items.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
}

export async function fetchInsuranceClaims(): Promise<InsuranceClaimWithRelations[]> {
  const items = await db.insurance_claims.where('clinic_id').equals(CLINIC_ID).toArray()
  items.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
  const patients = await db.patients.toArray()
  const companies = await db.insurance_companies.toArray()
  const pMap = new Map(patients.map((p) => [p.id, p]))
  const cMap = new Map(companies.map((c) => [c.id, c]))
  return items.map((c) => ({ ...c, patient: pMap.get(c.patient_id as string) ?? null, company: cMap.get(c.company_id as string) ?? null }))
}

// ── Prescriptions ────────────────────────────────────────────
export async function fetchPrescriptions(patientId?: string): Promise<PrescriptionWithRelations[]> {
  let items = await db.prescriptions.where('clinic_id').equals(CLINIC_ID).toArray()
  if (patientId) items = items.filter((p) => p.patient_id === patientId)
  items.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
  const doctors = await db.doctors.toArray()
  const dMap = new Map(doctors.map((d) => [d.id, d]))
  return items.map((p) => ({ ...p, doctor: dMap.get(p.doctor_id as string) ?? null }))
}

export async function createPrescription(p: PrescriptionInput): Promise<Prescription> {
  const { clinic_id, ...rest } = p
  const id = uid()
  const rx: Prescription = { ...rest, id, clinic_id: CLINIC_ID, created_at: nowISO(), updated_at: nowISO() }
  await db.prescriptions.put(rx)
  await queueOperation('prescriptions', 'insert', id, rx)
  return rx
}

// ── Radiology ────────────────────────────────────────────────
export async function fetchRadiologyImages(patientId?: string): Promise<RadiologyImage[]> {
  let items = await db.radiology_images.where('clinic_id').equals(CLINIC_ID).toArray()
  if (patientId) items = items.filter((r) => r.patient_id === patientId)
  return items.sort((a, b) => (b.taken_at || '').localeCompare(a.taken_at || ''))
}

// ── Treatment Phases ─────────────────────────────────────────
export async function fetchTreatmentPhases(patientId?: string): Promise<TreatmentPhase[]> {
  let items = await db.treatment_phases.where('clinic_id').equals(CLINIC_ID).toArray()
  if (patientId) items = items.filter((t) => t.patient_id === patientId)
  return items.sort((a, b) => (a.phase_number ?? 0) - (b.phase_number ?? 0))
}

// ── Patient Timeline ─────────────────────────────────────────
export async function fetchTimeline(patientId: string): Promise<PatientTimeline[]> {
  const items = await db.patient_timeline.where('patient_id').equals(patientId).toArray()
  return items.sort((a, b) => (b.event_date || '').localeCompare(a.event_date || ''))
}

export async function addTimelineEntry(patientId: string, eventType: string, title: string, description?: string): Promise<PatientTimeline> {
  const id = uid()
  const entry: PatientTimeline = {
    id, clinic_id: CLINIC_ID, patient_id: patientId,
    event_type: eventType, title, description: description ?? null,
    reference_id: null, metadata: null,
    event_date: nowISO(), created_at: nowISO(),
  }
  await db.patient_timeline.put(entry)
  await queueOperation('patient_timeline', 'insert', id, entry)
  return entry
}

// ── Waiting List ─────────────────────────────────────────────
export async function fetchWaitingList(): Promise<WaitingListEntryWithRelations[]> {
  const items = await db.waiting_list.where('clinic_id').equals(CLINIC_ID).toArray()
  const priorityOrder: Record<string, number> = { urgent: 3, high: 2, normal: 1, low: 0 }
  items.sort((a, b) => (priorityOrder[b.priority ?? 'normal'] ?? 1) - (priorityOrder[a.priority ?? 'normal'] ?? 1))
  const patients = await db.patients.toArray()
  const doctors = await db.doctors.toArray()
  const pMap = new Map(patients.map((p) => [p.id, p]))
  const dMap = new Map(doctors.map((d) => [d.id, d]))
  return items.map((w) => ({ ...w, patient: pMap.get(w.patient_id as string) ?? null, doctor: dMap.get(w.doctor_id as string) ?? null }))
}

export async function createWaitingEntry(w: WaitingListEntryInput): Promise<WaitingListEntry> {
  const { clinic_id, ...rest } = w
  const id = uid()
  const entry: WaitingListEntry = { ...rest, id, clinic_id: CLINIC_ID, created_at: nowISO(), updated_at: nowISO() }
  await db.waiting_list.put(entry)
  await queueOperation('waiting_list', 'insert', id, entry)
  return entry
}

export async function updateWaitingEntry(id: string, updates: Partial<WaitingListEntryInput>): Promise<WaitingListEntry> {
  const existing = await db.waiting_list.get(id)
  if (!existing) throw new Error('رکورد یافت نشد')
  const { clinic_id, ...rest } = updates
  const updated: WaitingListEntry = { ...existing, ...rest, updated_at: nowISO() }
  await db.waiting_list.put(updated)
  await queueOperation('waiting_list', 'update', id, rest)
  return updated
}

// ── Staff ────────────────────────────────────────────────────
export async function fetchStaff(): Promise<Staff[]> {
  const items = await db.staff.where('clinic_id').equals(CLINIC_ID).toArray()
  return items.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
}

export async function createStaff(s: StaffInput): Promise<Staff> {
  const { clinic_id, ...rest } = s
  const id = uid()
  const staff: Staff = { ...rest, id, clinic_id: CLINIC_ID, created_at: nowISO(), updated_at: nowISO() }
  await db.staff.put(staff)
  await queueOperation('staff', 'insert', id, staff)
  return staff
}

// ── Expenses ─────────────────────────────────────────────────
export async function fetchExpenses(): Promise<Expense[]> {
  const items = await db.expenses.where('clinic_id').equals(CLINIC_ID).toArray()
  return items.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
}

export async function createExpense(e: ExpenseInput): Promise<Expense> {
  const { clinic_id, ...rest } = e
  const id = uid()
  const expense: Expense = { ...rest, id, clinic_id: CLINIC_ID, created_at: nowISO(), updated_at: nowISO() }
  await db.expenses.put(expense)
  await queueOperation('expenses', 'insert', id, expense)
  return expense
}

// ── Tooth Records ────────────────────────────────────────────
export async function fetchToothRecords(patientId: string): Promise<ToothRecord[]> {
  const items = await db.tooth_records.where('patient_id').equals(patientId).toArray()
  return items.sort((a, b) => (parseInt(String(a.tooth_number)) || 0) - (parseInt(String(b.tooth_number)) || 0))
}

export async function createToothRecord(t: ToothRecordInput): Promise<ToothRecord> {
  const { clinic_id, ...rest } = t
  const id = uid()
  const record: ToothRecord = { ...rest, id, clinic_id: CLINIC_ID, created_at: nowISO(), updated_at: nowISO() }
  await db.tooth_records.put(record)
  await queueOperation('tooth_records', 'insert', id, record)
  return record
}

export async function updateToothRecord(id: string, updates: Partial<ToothRecordInput>): Promise<ToothRecord> {
  const existing = await db.tooth_records.get(id)
  if (!existing) throw new Error('رکورد یافت نشد')
  const { clinic_id, ...rest } = updates
  const updated: ToothRecord = { ...existing, ...rest, updated_at: nowISO() }
  await db.tooth_records.put(updated)
  await queueOperation('tooth_records', 'update', id, rest)
  return updated
}

// ── Inventory ────────────────────────────────────────────────
export async function fetchInventoryItems(): Promise<InventoryItemWithRelations[]> {
  const items = await db.inventory_items.where('clinic_id').equals(CLINIC_ID).toArray()
  items.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  const cats = await db.inventory_categories.toArray()
  const cMap = new Map(cats.map((c) => [c.id, c]))
  return items.map((i) => ({ ...i, category: cMap.get(i.category_id ?? '') ?? null }))
}

export async function fetchInventoryCategories(): Promise<InventoryCategory[]> {
  const items = await db.inventory_categories.where('clinic_id').equals(CLINIC_ID).toArray()
  return items.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
}

export async function createInventoryItem(i: InventoryItemInput): Promise<InventoryItem> {
  const { clinic_id, ...rest } = i
  const id = uid()
  const item: InventoryItem = { ...rest, id, clinic_id: CLINIC_ID, created_at: nowISO(), updated_at: nowISO(), sync_version: 1 }
  await db.inventory_items.put(item)
  await queueOperation('inventory_items', 'insert', id, item)
  return item
}

export async function updateInventoryItem(id: string, updates: Partial<InventoryItemInput>): Promise<InventoryItem> {
  const existing = await db.inventory_items.get(id)
  if (!existing) throw new Error('آیتم یافت نشد')
  const { clinic_id, ...rest } = updates
  const updated: InventoryItem = { ...existing, ...rest, updated_at: nowISO() }
  await db.inventory_items.put(updated)
  await queueOperation('inventory_items', 'update', id, rest)
  return updated
}

// ── Payment Plans & Installments ─────────────────────────────
export async function fetchPaymentPlans(patientId?: string): Promise<PaymentPlanWithRelations[]> {
  let plans = await db.payment_plans.where('clinic_id').equals(CLINIC_ID).toArray()
  if (patientId) plans = plans.filter((p) => p.patient_id === patientId)
  plans.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
  const allInstallments = await db.installments.where('clinic_id').equals(CLINIC_ID).toArray()
  return plans.map((p) => ({
    ...p,
    installments: allInstallments.filter((i) => i.payment_plan_id === p.id).sort((a, b) => (a.installment_number ?? 0) - (b.installment_number ?? 0)),
  }))
}

/** All installments for the clinic, flat (not grouped by plan) — used by the dashboard's due/overdue reminders. */
export async function fetchAllInstallments(): Promise<Installment[]> {
  return db.installments.where('clinic_id').equals(CLINIC_ID).toArray()
}

export async function createPaymentPlan(p: PaymentPlanInput, installments: InstallmentInput[]): Promise<PaymentPlan> {
  const { clinic_id, ...rest } = p
  const planId = uid()
  const plan: PaymentPlan = { ...rest, id: planId, clinic_id: CLINIC_ID, created_at: nowISO(), updated_at: nowISO(), sync_version: 1 }
  await db.payment_plans.put(plan)
  await queueOperation('payment_plans', 'insert', planId, plan)
  for (let idx = 0; idx < installments.length; idx++) {
    const { clinic_id: _ci, ...instRest } = installments[idx]
    const instId = uid()
    const inst: Installment = {
      ...instRest, id: instId, clinic_id: CLINIC_ID, payment_plan_id: planId,
      installment_number: instRest.installment_number ?? idx + 1,
      created_at: nowISO(), updated_at: nowISO(), sync_version: 1,
    }
    await db.installments.put(inst)
    await queueOperation('installments', 'insert', instId, inst)
  }
  return plan
}

export async function updateInstallment(id: string, updates: Partial<InstallmentInput>): Promise<Installment> {
  const existing = await db.installments.get(id)
  if (!existing) throw new Error('قسط یافت نشد')
  const { clinic_id, ...rest } = updates
  const updated: Installment = { ...existing, ...rest, updated_at: nowISO() }
  await db.installments.put(updated)
  await queueOperation('installments', 'update', id, rest)
  return updated
}

// ── Cheques ──────────────────────────────────────────────────
export async function fetchCheques(patientId?: string): Promise<Cheque[]> {
  let items = await db.cheques.where('clinic_id').equals(CLINIC_ID).toArray()
  if (patientId) items = items.filter((c) => c.patient_id === patientId)
  return items.sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
}

export async function createCheque(c: ChequeInput): Promise<Cheque> {
  const { clinic_id, ...rest } = c
  const id = uid()
  const cheque: Cheque = { ...rest, id, clinic_id: CLINIC_ID, created_at: nowISO(), updated_at: nowISO(), sync_version: 1 }
  await db.cheques.put(cheque)
  await queueOperation('cheques', 'insert', id, cheque)
  return cheque
}

export async function updateCheque(id: string, updates: Partial<ChequeInput>): Promise<Cheque> {
  const existing = await db.cheques.get(id)
  if (!existing) throw new Error('چک یافت نشد')
  const { clinic_id, ...rest } = updates
  const updated: Cheque = { ...existing, ...rest, updated_at: nowISO() }
  await db.cheques.put(updated)
  await queueOperation('cheques', 'update', id, rest)
  return updated
}

// ── Implant Cases & Components ───────────────────────────────
export async function fetchImplantCases(): Promise<ImplantCaseWithRelations[]> {
  const items = await db.implant_cases.where('clinic_id').equals(CLINIC_ID).toArray()
  items.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
  const patients = await db.patients.toArray()
  const doctors = await db.doctors.toArray()
  const components = await db.implant_components.where('clinic_id').equals(CLINIC_ID).toArray()
  const pMap = new Map(patients.map((p) => [p.id, p]))
  const dMap = new Map(doctors.map((d) => [d.id, d]))
  return items.map((c) => ({
    ...c,
    patient: pMap.get(c.patient_id as string) ?? null,
    doctor: dMap.get(c.doctor_id as string) ?? null,
    components: components.filter((comp) => comp.implant_case_id === c.id),
  }))
}

export async function fetchImplantCase(id: string): Promise<ImplantCaseWithRelations | null> {
  const item = await db.implant_cases.get(id)
  if (!item) return null
  const patients = await db.patients.toArray()
  const doctors = await db.doctors.toArray()
  const components = await db.implant_components.where('implant_case_id').equals(id).toArray()
  return {
    ...item,
    patient: patients.find((p) => p.id === item.patient_id) ?? null,
    doctor: doctors.find((d) => d.id === item.doctor_id) ?? null,
    components,
  }
}

export async function createImplantCase(c: ImplantCaseInput): Promise<ImplantCase> {
  const { clinic_id, ...rest } = c
  const id = uid()
  const ic: ImplantCase = { ...rest, id, clinic_id: CLINIC_ID, created_at: nowISO(), updated_at: nowISO() }
  await db.implant_cases.put(ic)
  await queueOperation('implant_cases', 'insert', id, ic)
  return ic
}

export async function updateImplantCase(id: string, updates: Partial<ImplantCaseInput>): Promise<ImplantCase> {
  const existing = await db.implant_cases.get(id)
  if (!existing) throw new Error('مورد ایمپلنت یافت نشد')
  const { clinic_id, ...rest } = updates
  const updated: ImplantCase = { ...existing, ...rest, updated_at: nowISO() }
  await db.implant_cases.put(updated)
  await queueOperation('implant_cases', 'update', id, rest)
  return updated
}

export async function createImplantComponent(c: ImplantComponentInput): Promise<ImplantComponent> {
  const { clinic_id, ...rest } = c
  const id = uid()
  const comp: ImplantComponent = { ...rest, id, clinic_id: CLINIC_ID, created_at: nowISO(), updated_at: nowISO() }
  await db.implant_components.put(comp)
  await queueOperation('implant_components', 'insert', id, comp)
  return comp
}

export async function updateImplantComponent(id: string, updates: Partial<ImplantComponentInput>): Promise<ImplantComponent> {
  const existing = await db.implant_components.get(id)
  if (!existing) throw new Error('قطعه یافت نشد')
  const { clinic_id, ...rest } = updates
  const updated: ImplantComponent = { ...existing, ...rest, updated_at: nowISO() }
  await db.implant_components.put(updated)
  await queueOperation('implant_components', 'update', id, rest)
  return updated
}

// ── Delete functions for all entities ────────────────────────
export async function deleteTreatment(id: string): Promise<void> {
  await db.treatments.delete(id)
  await queueOperation('treatments', 'delete', id)
}
export async function deleteEncounter(id: string): Promise<void> {
  await db.encounters.delete(id)
  await queueOperation('encounters', 'delete', id)
}
export async function deletePayment(id: string): Promise<void> {
  const payment = await db.payments.get(id)
  // Reverse encounter paid_amount
  if (payment?.encounter_id && payment.status === 'completed') {
    const enc = await db.encounters.get(payment.encounter_id)
    if (enc) {
      const updatedEnc = { ...enc, paid_amount: Math.max(0, (enc.paid_amount ?? 0) - (payment.amount ?? 0)), updated_at: nowISO() }
      await db.encounters.put(updatedEnc)
      await queueOperation('encounters', 'update', enc.id, { paid_amount: updatedEnc.paid_amount })
    }
  }
  await db.payments.delete(id)
  await queueOperation('payments', 'delete', id)
}
export async function deleteLabOrder(id: string): Promise<void> {
  await db.lab_orders.delete(id)
  await queueOperation('lab_orders', 'delete', id)
}
export async function deleteLab(id: string): Promise<void> {
  await db.laboratories.delete(id)
  await queueOperation('laboratories', 'delete', id)
}
export async function deleteImplantCase(id: string): Promise<void> {
  await db.implant_cases.delete(id)
  await queueOperation('implant_cases', 'delete', id)
}
export async function deleteImplantComponent(id: string): Promise<void> {
  await db.implant_components.delete(id)
  await queueOperation('implant_components', 'delete', id)
}
export async function deleteInventoryItem(id: string): Promise<void> {
  await db.inventory_items.delete(id)
  await queueOperation('inventory_items', 'delete', id)
}
export async function deleteStaff(id: string): Promise<void> {
  await db.staff.delete(id)
  await queueOperation('staff', 'delete', id)
}
export async function deleteWaitingEntry(id: string): Promise<void> {
  await db.waiting_list.delete(id)
  await queueOperation('waiting_list', 'delete', id)
}
export async function updatePrescription(id: string, updates: Partial<PrescriptionInput>): Promise<Prescription> {
  const existing = await db.prescriptions.get(id)
  if (!existing) throw new Error('نسخه یافت نشد')
  const { clinic_id, ...rest } = updates
  const updated: Prescription = { ...existing, ...rest, updated_at: nowISO() }
  await db.prescriptions.put(updated)
  await queueOperation('prescriptions', 'update', id, rest)
  return updated
}

export async function deletePrescription(id: string): Promise<void> {
  await db.prescriptions.delete(id)
  await queueOperation('prescriptions', 'delete', id)
}
export async function deleteCheque(id: string): Promise<void> {
  await db.cheques.delete(id)
  await queueOperation('cheques', 'delete', id)
}
export async function updatePaymentPlan(id: string, updates: Partial<PaymentPlanInput>): Promise<PaymentPlan> {
  const existing = await db.payment_plans.get(id)
  if (!existing) throw new Error('طرح قسطی یافت نشد')
  const { clinic_id, ...rest } = updates
  const updated: PaymentPlan = { ...existing, ...rest, updated_at: nowISO() }
  await db.payment_plans.put(updated)
  await queueOperation('payment_plans', 'update', id, rest)
  return updated
}

export async function deletePaymentPlan(id: string): Promise<void> {
  await db.payment_plans.delete(id)
  await queueOperation('payment_plans', 'delete', id)
}
export async function deleteToothRecord(id: string): Promise<void> {
  await db.tooth_records.delete(id)
  await queueOperation('tooth_records', 'delete', id)
}

// ── SMS Templates ────────────────────────────────────────────
export async function fetchSmsTemplates(): Promise<SmsTemplate[]> {
  const items = await db.sms_templates.where('clinic_id').equals(CLINIC_ID).toArray()
  return items.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
}

// ── Doctor Schedules ─────────────────────────────────────────
export async function fetchDoctorSchedules(): Promise<DoctorSchedule[]> {
  const items = await db.doctor_schedules.where('clinic_id').equals(CLINIC_ID).toArray()
  return items.sort((a, b) => (a.day_of_week ?? 0) - (b.day_of_week ?? 0))
}

// ── Treatment Packages ───────────────────────────────────────
export async function fetchTreatmentPackages(): Promise<TreatmentPackage[]> {
  const items = await db.treatment_packages.where('clinic_id').equals(CLINIC_ID).toArray()
  return items.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
}

// ── Consent Forms ────────────────────────────────────────────
export async function fetchConsentForms(patientId?: string): Promise<ConsentForm[]> {
  let items = await db.consent_forms.where('clinic_id').equals(CLINIC_ID).toArray()
  if (patientId) items = items.filter((c) => c.patient_id === patientId)
  return items.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
}

// ── Dashboard Stats ──────────────────────────────────────────
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const today = new Date().toISOString().slice(0, 10)
  const [patients, appts, encounters, payments, labOrders, implants] = await Promise.all([
    db.patients.where('clinic_id').equals(CLINIC_ID).count(),
    db.appointments.where('clinic_id').equals(CLINIC_ID).and((a) => a.date === today).count(),
    db.encounters.where('clinic_id').equals(CLINIC_ID).count(),
    db.payments.where('clinic_id').equals(CLINIC_ID).and((p) => p.status === 'completed').toArray(),
    db.lab_orders.where('clinic_id').equals(CLINIC_ID).and((l) => l.status !== 'delivered').count(),
    db.implant_cases.where('clinic_id').equals(CLINIC_ID).count(),
  ])
  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount ?? 0), 0)
  return { patientCount: patients, todayAppointments: appts, encounterCount: encounters, totalRevenue, activeLabOrders: labOrders, implantCount: implants }
}

// ── Activity Feed (cross-patient timeline) ───────────────────
export async function fetchActivityFeed(limit = 20): Promise<(PatientTimeline & { patient_name: string | null })[]> {
  const items = await db.patient_timeline.where('clinic_id').equals(CLINIC_ID).toArray()
  items.sort((a, b) => (b.event_date || '').localeCompare(a.event_date || ''))
  const top = items.slice(0, limit)
  const patients = await db.patients.toArray()
  const pMap = new Map(patients.map((p) => [p.id, p]))
  return top.map((t) => ({
    ...t,
    patient_name: pMap.get(t.patient_id as string)
      ? `${pMap.get(t.patient_id)!.first_name} ${pMap.get(t.patient_id)!.last_name}`
      : null,
  }))
}

// ── Doctors for filter dropdown ──────────────────────────────
export async function fetchDoctorsForFilter(): Promise<Doctor[]> {
  return fetchDoctors()
}

// ── Doctors CRUD ─────────────────────────────────────────────
export async function createDoctor(d: DoctorInput): Promise<Doctor> {
  const { clinic_id, ...rest } = d
  const id = uid()
  const doctor: Doctor = { ...rest, id, clinic_id: CLINIC_ID, created_at: nowISO(), updated_at: nowISO(), sync_version: 1 }
  await db.doctors.put(doctor)
  await queueOperation('doctors', 'insert', id, doctor)
  return doctor
}

export async function updateDoctor(id: string, updates: Partial<DoctorInput>): Promise<Doctor> {
  const existing = await db.doctors.get(id)
  if (!existing) throw new Error('پزشک یافت نشد')
  const { clinic_id, ...rest } = updates
  const updated: Doctor = { ...existing, ...rest, updated_at: nowISO() }
  await db.doctors.put(updated)
  await queueOperation('doctors', 'update', id, rest)
  return updated
}

export async function deleteDoctor(id: string): Promise<void> {
  await db.doctors.delete(id)
  await queueOperation('doctors', 'delete', id)
}

// ── Units CRUD ───────────────────────────────────────────────
export async function createUnit(u: UnitInput): Promise<Unit> {
  const { clinic_id, ...rest } = u
  const id = uid()
  const unit: Unit = { ...rest, id, clinic_id: CLINIC_ID, created_at: nowISO(), updated_at: nowISO(), sync_version: 1 }
  await db.units.put(unit)
  await queueOperation('units', 'insert', id, unit)
  return unit
}

export async function updateUnit(id: string, updates: Partial<UnitInput>): Promise<Unit> {
  const existing = await db.units.get(id)
  if (!existing) throw new Error('یونیت یافت نشد')
  const { clinic_id, ...rest } = updates
  const updated: Unit = { ...existing, ...rest, updated_at: nowISO() }
  await db.units.put(updated)
  await queueOperation('units', 'update', id, rest)
  return updated
}

export async function deleteUnit(id: string): Promise<void> {
  await db.units.delete(id)
  await queueOperation('units', 'delete', id)
}

// ── Procedures CRUD ──────────────────────────────────────────
export async function createProcedure(p: ProcedureInput): Promise<Procedure> {
  const { clinic_id, ...rest } = p
  const id = uid()
  const proc: Procedure = { ...rest, id, clinic_id: CLINIC_ID, created_at: nowISO(), updated_at: nowISO(), sync_version: 1 }
  await db.procedures.put(proc)
  await queueOperation('procedures', 'insert', id, proc)
  return proc
}

export async function updateProcedure(id: string, updates: Partial<ProcedureInput>): Promise<Procedure> {
  const existing = await db.procedures.get(id)
  if (!existing) throw new Error('رویه یافت نشد')
  const { clinic_id, ...rest } = updates
  const updated: Procedure = { ...existing, ...rest, updated_at: nowISO() }
  await db.procedures.put(updated)
  await queueOperation('procedures', 'update', id, rest)
  return updated
}

export async function deleteProcedure(id: string): Promise<void> {
  await db.procedures.delete(id)
  await queueOperation('procedures', 'delete', id)
}

// ── Payment Update ───────────────────────────────────────────
export async function updatePayment(id: string, updates: Partial<PaymentInput>): Promise<Payment> {
  const existing = await db.payments.get(id)
  if (!existing) throw new Error('پرداخت یافت نشد')
  const { clinic_id, ...rest } = updates
  const updated: Payment = { ...existing, ...rest, updated_at: nowISO() }
  await db.payments.put(updated)
  await queueOperation('payments', 'update', id, rest)
  // Recalculate encounter paid_amount if amount or status changed
  if (updated.encounter_id && (rest.amount !== undefined || rest.status !== undefined)) {
    const allPayments = await db.payments.where('encounter_id').equals(updated.encounter_id).and((p) => p.status === 'completed').toArray()
    const totalPaid = allPayments.reduce((sum, p) => sum + (p.amount ?? 0), 0)
    const enc = await db.encounters.get(updated.encounter_id)
    if (enc) {
      const updatedEnc = { ...enc, paid_amount: totalPaid, updated_at: nowISO() }
      await db.encounters.put(updatedEnc)
      await queueOperation('encounters', 'update', enc.id, { paid_amount: totalPaid })
    }
  }
  return updated
}

// ── Lab Update ───────────────────────────────────────────────
export async function updateLab(id: string, updates: Partial<LaboratoryInput>): Promise<Laboratory> {
  const existing = await db.laboratories.get(id)
  if (!existing) throw new Error('آزمایشگاه یافت نشد')
  const { clinic_id, ...rest } = updates
  const updated: Laboratory = { ...existing, ...rest, updated_at: nowISO() }
  await db.laboratories.put(updated)
  await queueOperation('laboratories', 'update', id, rest)
  return updated
}

// ── Staff Update ─────────────────────────────────────────────
export async function updateStaff(id: string, updates: Partial<StaffInput>): Promise<Staff> {
  const existing = await db.staff.get(id)
  if (!existing) throw new Error('پرسنل یافت نشد')
  const { clinic_id, ...rest } = updates
  const updated: Staff = { ...existing, ...rest, updated_at: nowISO() }
  await db.staff.put(updated)
  await queueOperation('staff', 'update', id, rest)
  return updated
}

// ── Expenses Update & Delete ─────────────────────────────────
export async function updateExpense(id: string, updates: Partial<ExpenseInput>): Promise<Expense> {
  const existing = await db.expenses.get(id)
  if (!existing) throw new Error('هزینه یافت نشد')
  const { clinic_id, ...rest } = updates
  const updated: Expense = { ...existing, ...rest, updated_at: nowISO() }
  await db.expenses.put(updated)
  await queueOperation('expenses', 'update', id, rest)
  return updated
}

export async function deleteExpense(id: string): Promise<void> {
  await db.expenses.delete(id)
  await queueOperation('expenses', 'delete', id)
}

// ── Insurance Companies CRUD ─────────────────────────────────
export async function createInsuranceCompany(c: InsuranceCompanyInput): Promise<InsuranceCompany> {
  const { clinic_id, ...rest } = c
  const id = uid()
  const company: InsuranceCompany = { ...rest, id, clinic_id: CLINIC_ID, created_at: nowISO(), updated_at: nowISO() }
  await db.insurance_companies.put(company)
  await queueOperation('insurance_companies', 'insert', id, company)
  return company
}

export async function updateInsuranceCompany(id: string, updates: Partial<InsuranceCompanyInput>): Promise<InsuranceCompany> {
  const existing = await db.insurance_companies.get(id)
  if (!existing) throw new Error('شرکت بیمه یافت نشد')
  const { clinic_id, ...rest } = updates
  const updated: InsuranceCompany = { ...existing, ...rest, updated_at: nowISO() }
  await db.insurance_companies.put(updated)
  await queueOperation('insurance_companies', 'update', id, rest)
  return updated
}

export async function deleteInsuranceCompany(id: string): Promise<void> {
  await db.insurance_companies.delete(id)
  await queueOperation('insurance_companies', 'delete', id)
}

// ── Insurance Claims CRUD ────────────────────────────────────
export async function createInsuranceClaim(c: InsuranceClaimInput): Promise<InsuranceClaim> {
  const { clinic_id, ...rest } = c
  const id = uid()
  const claim: InsuranceClaim = { ...rest, id, clinic_id: CLINIC_ID, created_at: nowISO(), updated_at: nowISO() }
  await db.insurance_claims.put(claim)
  await queueOperation('insurance_claims', 'insert', id, claim)
  return claim
}

export async function updateInsuranceClaim(id: string, updates: Partial<InsuranceClaimInput>): Promise<InsuranceClaim> {
  const existing = await db.insurance_claims.get(id)
  if (!existing) throw new Error('ادعا یافت نشد')
  const { clinic_id, ...rest } = updates
  const updated: InsuranceClaim = { ...existing, ...rest, updated_at: nowISO() }
  await db.insurance_claims.put(updated)
  await queueOperation('insurance_claims', 'update', id, rest)
  return updated
}

export async function deleteInsuranceClaim(id: string): Promise<void> {
  await db.insurance_claims.delete(id)
  await queueOperation('insurance_claims', 'delete', id)
}

// ── Radiology Images CRUD ────────────────────────────────────
export async function createRadiologyImage(r: RadiologyImageInput): Promise<RadiologyImage> {
  const { clinic_id, ...rest } = r
  const id = uid()
  const img: RadiologyImage = { ...rest, id, clinic_id: CLINIC_ID, created_at: nowISO(), updated_at: nowISO() }
  await db.radiology_images.put(img)
  await queueOperation('radiology_images', 'insert', id, img)
  return img
}

export async function updateRadiologyImage(id: string, updates: Partial<RadiologyImageInput>): Promise<RadiologyImage> {
  const existing = await db.radiology_images.get(id)
  if (!existing) throw new Error('تصویر یافت نشد')
  const { clinic_id, ...rest } = updates
  const updated: RadiologyImage = { ...existing, ...rest, updated_at: nowISO() }
  await db.radiology_images.put(updated)
  await queueOperation('radiology_images', 'update', id, rest)
  return updated
}

export async function deleteRadiologyImage(id: string): Promise<void> {
  await db.radiology_images.delete(id)
  await queueOperation('radiology_images', 'delete', id)
}

// ── Treatment Phases CRUD ────────────────────────────────────
export async function createTreatmentPhase(t: TreatmentPhaseInput): Promise<TreatmentPhase> {
  const { clinic_id, ...rest } = t
  const id = uid()
  const phase: TreatmentPhase = { ...rest, id, clinic_id: CLINIC_ID, created_at: nowISO(), updated_at: nowISO() }
  await db.treatment_phases.put(phase)
  await queueOperation('treatment_phases', 'insert', id, phase)
  return phase
}

export async function updateTreatmentPhase(id: string, updates: Partial<TreatmentPhaseInput>): Promise<TreatmentPhase> {
  const existing = await db.treatment_phases.get(id)
  if (!existing) throw new Error('فاز درمانی یافت نشد')
  const { clinic_id, ...rest } = updates
  const updated: TreatmentPhase = { ...existing, ...rest, updated_at: nowISO() }
  await db.treatment_phases.put(updated)
  await queueOperation('treatment_phases', 'update', id, rest)
  return updated
}

export async function deleteTreatmentPhase(id: string): Promise<void> {
  await db.treatment_phases.delete(id)
  await queueOperation('treatment_phases', 'delete', id)
}

// ── SMS Templates CRUD ───────────────────────────────────────
export async function createSmsTemplate(t: SmsTemplateInput): Promise<SmsTemplate> {
  const { clinic_id, ...rest } = t
  const id = uid()
  const tpl: SmsTemplate = { ...rest, id, clinic_id: CLINIC_ID, created_at: nowISO(), updated_at: nowISO() }
  await db.sms_templates.put(tpl)
  await queueOperation('sms_templates', 'insert', id, tpl)
  return tpl
}

export async function updateSmsTemplate(id: string, updates: Partial<SmsTemplateInput>): Promise<SmsTemplate> {
  const existing = await db.sms_templates.get(id)
  if (!existing) throw new Error('قالب پیامک یافت نشد')
  const { clinic_id, ...rest } = updates
  const updated: SmsTemplate = { ...existing, ...rest, updated_at: nowISO() }
  await db.sms_templates.put(updated)
  await queueOperation('sms_templates', 'update', id, rest)
  return updated
}

export async function deleteSmsTemplate(id: string): Promise<void> {
  await db.sms_templates.delete(id)
  await queueOperation('sms_templates', 'delete', id)
}

// ── Treatment Packages CRUD ──────────────────────────────────
export async function createTreatmentPackage(t: TreatmentPackageInput): Promise<TreatmentPackage> {
  const { clinic_id, ...rest } = t
  const id = uid()
  const pkg: TreatmentPackage = { ...rest, id, clinic_id: CLINIC_ID, created_at: nowISO(), updated_at: nowISO() }
  await db.treatment_packages.put(pkg)
  await queueOperation('treatment_packages', 'insert', id, pkg)
  return pkg
}

export async function updateTreatmentPackage(id: string, updates: Partial<TreatmentPackageInput>): Promise<TreatmentPackage> {
  const existing = await db.treatment_packages.get(id)
  if (!existing) throw new Error('پکیج درمانی یافت نشد')
  const { clinic_id, ...rest } = updates
  const updated: TreatmentPackage = { ...existing, ...rest, updated_at: nowISO() }
  await db.treatment_packages.put(updated)
  await queueOperation('treatment_packages', 'update', id, rest)
  return updated
}

export async function deleteTreatmentPackage(id: string): Promise<void> {
  await db.treatment_packages.delete(id)
  await queueOperation('treatment_packages', 'delete', id)
}

// ── Inventory Categories CRUD ────────────────────────────────
export async function createInventoryCategory(c: InventoryCategoryInput): Promise<InventoryCategory> {
  const { clinic_id, ...rest } = c
  const id = uid()
  const cat: InventoryCategory = { ...rest, id, clinic_id: CLINIC_ID, created_at: nowISO(), updated_at: nowISO() }
  await db.inventory_categories.put(cat)
  await queueOperation('inventory_categories', 'insert', id, cat)
  return cat
}

export async function updateInventoryCategory(id: string, updates: Partial<InventoryCategoryInput>): Promise<InventoryCategory> {
  const existing = await db.inventory_categories.get(id)
  if (!existing) throw new Error('دسته‌بندی یافت نشد')
  const { clinic_id, ...rest } = updates
  const updated: InventoryCategory = { ...existing, ...rest, updated_at: nowISO() }
  await db.inventory_categories.put(updated)
  await queueOperation('inventory_categories', 'update', id, rest)
  return updated
}

export async function deleteInventoryCategory(id: string): Promise<void> {
  await db.inventory_categories.delete(id)
  await queueOperation('inventory_categories', 'delete', id)
}

// ── Consent Forms CRUD ───────────────────────────────────────
export async function createConsentForm(c: ConsentFormInput): Promise<ConsentForm> {
  const { clinic_id, ...rest } = c
  const id = uid()
  const form: ConsentForm = { ...rest, id, clinic_id: CLINIC_ID, created_at: nowISO() }
  await db.consent_forms.put(form)
  await queueOperation('consent_forms', 'insert', id, form)
  return form
}

export async function updateConsentForm(id: string, updates: Partial<ConsentFormInput>): Promise<ConsentForm> {
  const existing = await db.consent_forms.get(id)
  if (!existing) throw new Error('فرم رضایت یافت نشد')
  const { clinic_id, ...rest } = updates
  const updated: ConsentForm = { ...existing, ...rest }
  await db.consent_forms.put(updated)
  await queueOperation('consent_forms', 'update', id, rest)
  return updated
}

export async function deleteConsentForm(id: string): Promise<void> {
  await db.consent_forms.delete(id)
  await queueOperation('consent_forms', 'delete', id)
}

// ── Doctor Schedules CRUD ────────────────────────────────────
export async function createDoctorSchedule(s: DoctorScheduleInput): Promise<DoctorSchedule> {
  const { clinic_id, ...rest } = s
  const id = uid()
  const sched: DoctorSchedule = { ...rest, id, clinic_id: CLINIC_ID, created_at: nowISO(), updated_at: nowISO() }
  await db.doctor_schedules.put(sched)
  await queueOperation('doctor_schedules', 'insert', id, sched)
  return sched
}

export async function updateDoctorSchedule(id: string, updates: Partial<DoctorScheduleInput>): Promise<DoctorSchedule> {
  const existing = await db.doctor_schedules.get(id)
  if (!existing) throw new Error('زمان‌بندی یافت نشد')
  const { clinic_id, ...rest } = updates
  const updated: DoctorSchedule = { ...existing, ...rest, updated_at: nowISO() }
  await db.doctor_schedules.put(updated)
  await queueOperation('doctor_schedules', 'update', id, rest)
  return updated
}

export async function deleteDoctorSchedule(id: string): Promise<void> {
  await db.doctor_schedules.delete(id)
  await queueOperation('doctor_schedules', 'delete', id)
}

// ── Personal Finance (loans, rent, personal cheques, debts) ─────────
export async function fetchPersonalFinanceItems(): Promise<PersonalFinanceItem[]> {
  const items = await db.personal_finance_items.where('clinic_id').equals(CLINIC_ID).toArray()
  return items.sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'))
}

export async function createPersonalFinanceItem(item: PersonalFinanceItemInput): Promise<PersonalFinanceItem> {
  const { clinic_id, ...rest } = item
  const id = uid()
  const record: PersonalFinanceItem = { ...rest, id, clinic_id: CLINIC_ID, created_at: nowISO(), updated_at: nowISO() }
  await db.personal_finance_items.put(record)
  await queueOperation('personal_finance_items', 'insert', id, record)
  return record
}

export async function updatePersonalFinanceItem(id: string, updates: Partial<PersonalFinanceItemInput>): Promise<PersonalFinanceItem> {
  const existing = await db.personal_finance_items.get(id)
  if (!existing) throw new Error('مورد مالی یافت نشد')
  const { clinic_id, ...rest } = updates
  const updated: PersonalFinanceItem = { ...existing, ...rest, updated_at: nowISO() }
  await db.personal_finance_items.put(updated)
  await queueOperation('personal_finance_items', 'update', id, rest)
  return updated
}

export async function deletePersonalFinanceItem(id: string): Promise<void> {
  await db.personal_finance_items.delete(id)
  await queueOperation('personal_finance_items', 'delete', id)
}
