// Minadent - Offline-first API layer
// All reads come from local IndexedDB (instant). All writes go to local DB + sync queue.
import { toJalaliString } from './persianDate'
import { toothLabel } from './toothLabel'
import { supabase, CLINIC_ID } from './supabase'
import { db } from './db'
import type { PatientPolicy } from './insurance'
import { DOCTOR_COLOR_PALETTE } from './doctorColors'
import { queueOperation } from './sync'
import { setPermissionOverrides } from './permissions'
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
  PersonalFinanceItem, PersonalFinanceItemInput, CashRegisterSession,
  ConsentFormInput, DashboardStats, DoctorInput, UnitInput,
  RolePermission, RolePermissionInput, CustomRole, CustomRoleInput,
  ManualReminder, ManualReminderInput,
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
  await logToTimeline(appt.patient_id, 'appointment_created', 'نوبت جدید',
    `نوبت ${toJalaliString(appt.date)} ساعت ${appt.start_time || '-'}`, id)
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

/**
 * Archives a patient. There is no way to delete one.
 *
 * This function used to cascade-delete fifteen tables — appointments,
 * encounters, treatments, payments, cheques, payment plans, lab orders,
 * implant cases, consent forms and the rest — and then remove the patient
 * row, queueing a `delete` for each one so the server was wiped too.
 *
 * That contradicted the project's first absolute prohibition, and it
 * destroyed the financial chain: a patient's cheques and instalments went
 * with the file, so the clinic lost the record of money it was owed.
 *
 * Migration 023 removed DELETE from the record tables' RLS policies, so
 * the server would now refuse those operations. Leaving the function as
 * it was would have wiped the LOCAL copy and then filled the sync queue
 * with rejections — the worst outcome, because the data would look gone
 * to the user while the failure hid in the queue.
 *
 * Archiving is an update: the file stays whole and stays findable in
 * Archive, and every related record is left exactly where it is.
 */
export async function archivePatient(id: string): Promise<void> {
  await updatePatient(id, { is_active: false })
}

/**
 * Cancels an appointment. Nothing is destroyed.
 *
 * A cancelled slot is clinical history — it is how a clinic sees that a
 * patient repeatedly books and does not come. Deleting the row erased
 * that, and after migration 023 the server refuses the delete anyway.
 */
export async function cancelAppointment(id: string): Promise<void> {
  await updateAppointment(id, { status: 'cancelled' })
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
  await logToTimeline(enc.patient_id, 'encounter_created', 'ویزیت',
    enc.chief_complaint ? `ویزیت باز شد — ${enc.chief_complaint}` : 'ویزیت باز شد', id)
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
  await logToTimeline(treatment.patient_id, 'treatment_created', 'درمان ثبت شد',
    `${treatment.procedure_name || 'رویه'}${treatment.tooth_number ? ` — دندان ${toothLabel(treatment.tooth_number)}` : ''}`, id)
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
  // Update implant case paid_amount — same sync as encounters above.
  // Previously implant_cases.paid_amount had no link at all to the real
  // payment ledger and was purely hand-typed in the Implants form.
  if (payment.implant_case_id && payment.status === 'completed') {
    const implantCase = await db.implant_cases.get(payment.implant_case_id)
    if (implantCase) {
      const updatedCase = { ...implantCase, paid_amount: (implantCase.paid_amount ?? 0) + (payment.amount ?? 0), updated_at: nowISO() }
      await db.implant_cases.put(updatedCase)
      await queueOperation('implant_cases', 'update', implantCase.id, { paid_amount: updatedCase.paid_amount })
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
  await logToTimeline(order.patient_id, 'lab_order_created', 'سفارش لابراتوار',
    `${order.work_type || 'سفارش'}${order.tooth_number ? ` — دندان ${toothLabel(order.tooth_number)}` : ''}`, id)
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

export async function addTimelineEntry(
  patientId: string,
  eventType: string,
  title: string,
  description?: string,
  referenceId?: string | null,
): Promise<PatientTimeline> {
  const id = uid()
  const entry: PatientTimeline = {
    id, clinic_id: CLINIC_ID, patient_id: patientId,
    event_type: eventType, title, description: description ?? null,
    reference_id: referenceId ?? null, metadata: null,
    event_date: nowISO(), created_at: nowISO(),
  }
  await db.patient_timeline.put(entry)
  await queueOperation('patient_timeline', 'insert', id, entry)
  return entry
}

/**
 * MOD-FEAT-019 | نوشتن رویداد روی تایم‌لاین بیمار
 *
 * Until now addTimelineEntry had exactly one caller — patient
 * registration — so every timeline showed one line and then nothing,
 * forever. Appointments, visits, treatments, lab cases and implants all
 * happened without leaving a trace on the one screen that is meant to be
 * the patient's history.
 *
 * These hooks sit here rather than in the pages deliberately. A page is a
 * path, and a path can be forgotten — that is exactly how the visit total
 * drifted (MOD-FIX-008) and how editing a treatment stopped reaching the
 * lab (MOD-FIX-007). Every route into these records already passes
 * through these functions, so a future screen gets the timeline for free.
 *
 * A timeline entry is a record OF something, never the thing itself, so
 * failing to write one must not take the real record down with it.
 * Losing a history line is bad; losing the treatment it describes is not
 * acceptable. Hence the swallow.
 */
async function logToTimeline(
  patientId: string | null | undefined,
  eventType: string,
  title: string,
  description: string,
  referenceId: string,
): Promise<void> {
  if (!patientId) return
  try {
    await addTimelineEntry(patientId, eventType, title, description, referenceId)
  } catch {
    /* intentionally swallowed — see the note above */
  }
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
  await syncDoctorRecordForStaff(staff)
  return staff
}

/**
 * Keeps the `doctors` table (what Appointments/Treatments/Implants
 * actually query for scheduling) in sync with `staff` (HR/commission).
 * Adding/editing someone in پرسنل with is_doctor checked was
 * previously invisible everywhere else in the app — this closes that
 * gap for every future create/update, not just a one-time backfill.
 */
async function syncDoctorRecordForStaff(staff: Staff): Promise<void> {
  const existing = await db.doctors.where('staff_id').equals(staff.id).first()
  if (staff.is_doctor) {
    if (existing) {
      const updated: Doctor = {
        ...existing, name: staff.full_name, specialty: staff.specialty ?? existing.specialty,
        license_number: staff.license_number ?? existing.license_number,
        is_active: staff.is_active, updated_at: nowISO(),
      }
      await db.doctors.put(updated)
      await queueOperation('doctors', 'update', existing.id, { name: updated.name, specialty: updated.specialty, license_number: updated.license_number, is_active: updated.is_active })
    } else {
      const docId = uid()
      const existingCount = await db.doctors.where('clinic_id').equals(CLINIC_ID).count()
      const doc: Doctor = {
        id: docId, user_id: null, clinic_id: CLINIC_ID, staff_id: staff.id,
        name: staff.full_name, specialty: staff.specialty ?? null, license_number: staff.license_number ?? null,
        color: DOCTOR_COLOR_PALETTE[existingCount % DOCTOR_COLOR_PALETTE.length],
        is_active: staff.is_active, created_at: nowISO(), updated_at: nowISO(), sync_version: 1,
      } as Doctor
      await db.doctors.put(doc)
      await queueOperation('doctors', 'insert', docId, doc)
    }
  } else if (existing && existing.is_active) {
    // is_doctor was unchecked — deactivate the linked doctor record
    // rather than deleting it (appointments/treatments may already
    // reference it historically).
    const updated: Doctor = { ...existing, is_active: false, updated_at: nowISO() }
    await db.doctors.put(updated)
    await queueOperation('doctors', 'update', existing.id, { is_active: false })
  }
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

export async function createPaymentPlan(
  p: PaymentPlanInput,
  installments: InstallmentInput[],
  guaranteeCheque?: Omit<ChequeInput, 'purpose' | 'payment_plan_id' | 'amount'>,
): Promise<PaymentPlan> {
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
  // A payment plan always requires a guarantee cheque covering the full
  // plan amount — collateral held separately from the (cash-only) monthly
  // installments, not a scheduled deposit itself. Created atomically with
  // the plan so a plan can never exist without one.
  if (guaranteeCheque) {
    const { clinic_id: _ci2, ...chequeRest } = guaranteeCheque
    const chequeId = uid()
    const cheque: Cheque = {
      ...chequeRest, amount: plan.total_amount, purpose: 'guarantee', payment_plan_id: planId,
      id: chequeId, clinic_id: CLINIC_ID, created_at: nowISO(), updated_at: nowISO(), sync_version: 1,
    }
    await db.cheques.put(cheque)
    await queueOperation('cheques', 'insert', chequeId, cheque)
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
  const ic: ImplantCase = { ...rest, is_active: (rest as any).is_active ?? true, id, clinic_id: CLINIC_ID, created_at: nowISO(), updated_at: nowISO() }
  await db.implant_cases.put(ic)
  await queueOperation('implant_cases', 'insert', id, ic)
  await logToTimeline(ic.patient_id, 'implant_case_created', 'مورد ایمپلنت',
    `ایمپلنت${ic.tooth_number ? ` دندان ${toothLabel(ic.tooth_number)}` : ''} ثبت شد`, id)
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
  // Placing a component drawn from tracked inventory decrements that
  // item's stock by 1 — this is the connection that was previously
  // completely missing, letting inventory counts silently drift from
  // reality the moment implant work actually consumed real stock.
  if ((comp as any).inventory_item_id) {
    const item = await db.inventory_items.get((comp as any).inventory_item_id)
    if (item) {
      const updated = { ...item, quantity: Math.max(0, (item.quantity ?? 0) - 1), updated_at: nowISO() }
      await db.inventory_items.put(updated)
      await queueOperation('inventory_items', 'update', item.id, { quantity: updated.quantity })
    }
  }
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
/** Cancels this record. Migration 023 removed DELETE from
 * public.treatments, so destroying it is no longer possible — and the row
 * is history the clinic may need to explain a number later. */
export async function cancelTreatment(id: string): Promise<void> {
  await updateTreatment(id, { status: 'cancelled' } as never)
}
/** Cancels this record. Migration 023 removed DELETE from
 * public.encounters, so destroying it is no longer possible — and the row
 * is history the clinic may need to explain a number later. */
export async function cancelEncounter(id: string): Promise<void> {
  await updateEncounter(id, { status: 'cancelled' } as never)
}
/** Cancels this record. Migration 023 removed DELETE from
 * public.payments, so destroying it is no longer possible — and the row
 * is history the clinic may need to explain a number later. */
export async function cancelPayment(id: string): Promise<void> {
  await updatePayment(id, { status: 'cancelled' } as never)
}
/** Cancels this record. Migration 023 removed DELETE from
 * public.lab_orders, so destroying it is no longer possible — and the row
 * is history the clinic may need to explain a number later. */
export async function cancelLabOrder(id: string): Promise<void> {
  await updateLabOrder(id, { status: 'cancelled' } as never)
}
/** Deactivates instead of deleting. Migration 026 removed DELETE from
 * public.laboratories.
 *
 * The reason is not tidiness: treatments, appointments and lab orders
 * that already happened still point at these rows. Deleting one does not
 * delete the history referencing it — it makes that history unreadable,
 * so last year's invoice can no longer say what was done or who did it. */
export async function deactivateLab(id: string): Promise<void> {
  await updateLab(id, { is_active: false } as never)
}
/** Cancels this record. Migration 023 removed DELETE from
 * public.implant_cases, so destroying it is no longer possible — and the row
 * is history the clinic may need to explain a number later. */
export async function cancelImplantCase(id: string): Promise<void> {
  await updateImplantCase(id, { status: 'cancelled' } as never)
}
export async function deactivateImplantComponent(id: string): Promise<void> {
  // Reverse the inventory deduction — removing a mistakenly-added
  // component (or one entered by mistake) shouldn't leave stock
  // permanently short.
  const comp = await db.implant_components.get(id)
  if ((comp as any)?.inventory_item_id) {
    const item = await db.inventory_items.get((comp as any).inventory_item_id)
    if (item) {
      const updated = { ...item, quantity: (item.quantity ?? 0) + 1, updated_at: nowISO() }
      await db.inventory_items.put(updated)
      await queueOperation('inventory_items', 'update', item.id, { quantity: updated.quantity })
    }
  }
  // Deactivated, not deleted — see migration 028. Deleting locally
  // while the server keeps the row is the divergence case.
  await updateImplantComponent(id, { is_active: false } as never)
}
/** Deactivates instead of deleting. Migration 026 removed DELETE from
 * public.inventory_items.
 *
 * The reason is not tidiness: treatments, appointments and lab orders
 * that already happened still point at these rows. Deleting one does not
 * delete the history referencing it — it makes that history unreadable,
 * so last year's invoice can no longer say what was done or who did it. */
export async function deactivateInventoryItem(id: string): Promise<void> {
  await updateInventoryItem(id, { is_active: false } as never)
}
/** Deactivates instead of deleting. Migration 026 removed DELETE from
 * public.staff.
 *
 * The reason is not tidiness: treatments, appointments and lab orders
 * that already happened still point at these rows. Deleting one does not
 * delete the history referencing it — it makes that history unreadable,
 * so last year's invoice can no longer say what was done or who did it. */
export async function deactivateStaff(id: string): Promise<void> {
  await updateStaff(id, { is_active: false } as never)
}
/** Cancels this record. Migration 023 removed DELETE from
 * public.waiting_list, so destroying it is no longer possible — and the row
 * is history the clinic may need to explain a number later. */
export async function cancelWaitingEntry(id: string): Promise<void> {
  await updateWaitingEntry(id, { status: 'cancelled' } as never)
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

/** Cancels this record. Migration 023 removed DELETE from
 * public.prescriptions, so destroying it is no longer possible — and the row
 * is history the clinic may need to explain a number later. */
export async function cancelPrescription(id: string): Promise<void> {
  await updatePrescription(id, { status: 'cancelled' } as never)
}
/** Cancels this record. Migration 023 removed DELETE from
 * public.cheques, so destroying it is no longer possible — and the row
 * is history the clinic may need to explain a number later. */
export async function cancelCheque(id: string): Promise<void> {
  await updateCheque(id, { status: 'cancelled' } as never)
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

/** Cancels this record. Migration 023 removed DELETE from
 * public.payment_plans, so destroying it is no longer possible — and the row
 * is history the clinic may need to explain a number later. */
export async function cancelPaymentPlan(id: string): Promise<void> {
  await updatePaymentPlan(id, { status: 'cancelled' } as never)
}
/** Resets a tooth to healthy rather than removing its row.
 *
 * The old version deleted only the LOCAL row while migration 023 had
 * already stopped the server doing the same — the divergence case, which
 * is worse than either behaviour alone: the record vanishes on this
 * device, survives on the server, and the next sync pull brings it back,
 * so the user believes the app ignored them.
 *
 * A tooth always exists; what is being undone is the finding recorded on
 * it, so clearing the finding is the honest operation. */
export async function resetToothRecord(id: string): Promise<void> {
  await updateToothRecord(id, {
    condition: 'healthy',
    surfaces: '[]',
    is_missing: false,
    is_implant: false,
  } as never)
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

/** Deactivates instead of deleting. Migration 026 removed DELETE from
 * public.doctors.
 *
 * The reason is not tidiness: treatments, appointments and lab orders
 * that already happened still point at these rows. Deleting one does not
 * delete the history referencing it — it makes that history unreadable,
 * so last year's invoice can no longer say what was done or who did it. */
export async function deactivateDoctor(id: string): Promise<void> {
  await updateDoctor(id, { is_active: false } as never)
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

/** Deactivates instead of deleting. Migration 026 removed DELETE from
 * public.units.
 *
 * The reason is not tidiness: treatments, appointments and lab orders
 * that already happened still point at these rows. Deleting one does not
 * delete the history referencing it — it makes that history unreadable,
 * so last year's invoice can no longer say what was done or who did it. */
export async function deactivateUnit(id: string): Promise<void> {
  await updateUnit(id, { is_active: false } as never)
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

/** Deactivates instead of deleting. Migration 026 removed DELETE from
 * public.procedures.
 *
 * The reason is not tidiness: treatments, appointments and lab orders
 * that already happened still point at these rows. Deleting one does not
 * delete the history referencing it — it makes that history unreadable,
 * so last year's invoice can no longer say what was done or who did it. */
export async function deactivateProcedure(id: string): Promise<void> {
  await updateProcedure(id, { is_active: false } as never)
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
  // Recalculate implant case paid_amount if amount or status changed
  if (updated.implant_case_id && (rest.amount !== undefined || rest.status !== undefined)) {
    const allPayments = await db.payments.where('implant_case_id').equals(updated.implant_case_id).and((p) => p.status === 'completed').toArray()
    const totalPaid = allPayments.reduce((sum, p) => sum + (p.amount ?? 0), 0)
    const implantCase = await db.implant_cases.get(updated.implant_case_id)
    if (implantCase) {
      const updatedCase = { ...implantCase, paid_amount: totalPaid, updated_at: nowISO() }
      await db.implant_cases.put(updatedCase)
      await queueOperation('implant_cases', 'update', implantCase.id, { paid_amount: totalPaid })
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
  await syncDoctorRecordForStaff(updated)
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

/** Deactivates. expenses is one of the tables migration 023 closed
 * DELETE on, and it had no status column at all — migration 027 added
 * is_active so a mistaken expense can still be retired. */
export async function deactivateExpense(id: string): Promise<void> {
  await updateExpense(id, { is_active: false } as never)
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

/** Deactivates instead of deleting. Migration 026 removed DELETE from
 * public.insurance_companies.
 *
 * The reason is not tidiness: treatments, appointments and lab orders
 * that already happened still point at these rows. Deleting one does not
 * delete the history referencing it — it makes that history unreadable,
 * so last year's invoice can no longer say what was done or who did it. */
export async function deactivateInsuranceCompany(id: string): Promise<void> {
  await updateInsuranceCompany(id, { is_active: false } as never)
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

/** Cancels this record. Migration 023 removed DELETE from
 * public.insurance_claims, so destroying it is no longer possible — and the row
 * is history the clinic may need to explain a number later. */
export async function cancelInsuranceClaim(id: string): Promise<void> {
  await updateInsuranceClaim(id, { status: 'cancelled' } as never)
}

// ── Radiology Images CRUD ────────────────────────────────────
export async function createRadiologyImage(r: RadiologyImageInput): Promise<RadiologyImage> {
  const { clinic_id, ...rest } = r
  const id = uid()
  const img: RadiologyImage = { ...rest, is_active: rest.is_active ?? true, id, clinic_id: CLINIC_ID, created_at: nowISO(), updated_at: nowISO() }
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

/** Cancels this record. Migration 023 removed DELETE from
 * public.radiology_images, so destroying it is no longer possible — and the row
 * is history the clinic may need to explain a number later. */
export async function cancelRadiologyImage(id: string): Promise<void> {
  await updateRadiologyImage(id, { status: 'cancelled' } as never)
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

/** Cancels this record. Migration 023 removed DELETE from
 * public.treatment_phases, so destroying it is no longer possible — and the row
 * is history the clinic may need to explain a number later. */
export async function cancelTreatmentPhase(id: string): Promise<void> {
  await updateTreatmentPhase(id, { status: 'cancelled' } as never)
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

/** Deactivates instead of deleting. Migration 026 removed DELETE from
 * public.sms_templates.
 *
 * The reason is not tidiness: treatments, appointments and lab orders
 * that already happened still point at these rows. Deleting one does not
 * delete the history referencing it — it makes that history unreadable,
 * so last year's invoice can no longer say what was done or who did it. */
export async function deactivateSmsTemplate(id: string): Promise<void> {
  await updateSmsTemplate(id, { is_active: false } as never)
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

/** Deactivates instead of deleting. Migration 026 removed DELETE from
 * public.treatment_packages.
 *
 * The reason is not tidiness: treatments, appointments and lab orders
 * that already happened still point at these rows. Deleting one does not
 * delete the history referencing it — it makes that history unreadable,
 * so last year's invoice can no longer say what was done or who did it. */
export async function deactivateTreatmentPackage(id: string): Promise<void> {
  await updateTreatmentPackage(id, { is_active: false } as never)
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

/** Deactivates instead of deleting. Migration 026 removed DELETE from
 * public.inventory_categories.
 *
 * The reason is not tidiness: treatments, appointments and lab orders
 * that already happened still point at these rows. Deleting one does not
 * delete the history referencing it — it makes that history unreadable,
 * so last year's invoice can no longer say what was done or who did it. */
export async function deactivateInventoryCategory(id: string): Promise<void> {
  await updateInventoryCategory(id, { is_active: false } as never)
}

// ── Consent Forms CRUD ───────────────────────────────────────
export async function createConsentForm(c: ConsentFormInput): Promise<ConsentForm> {
  const { clinic_id, ...rest } = c
  const id = uid()
  const form: ConsentForm = { ...rest, is_active: (rest as any).is_active ?? true, id, clinic_id: CLINIC_ID, created_at: nowISO() }
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

/** Cancels this record. Migration 023 removed DELETE from
 * public.consent_forms, so destroying it is no longer possible — and the row
 * is history the clinic may need to explain a number later. */
export async function cancelConsentForm(id: string): Promise<void> {
  await updateConsentForm(id, { status: 'cancelled' } as never)
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

/** Deactivates instead of deleting. Migration 026 removed DELETE from
 * public.doctor_schedules.
 *
 * The reason is not tidiness: treatments, appointments and lab orders
 * that already happened still point at these rows. Deleting one does not
 * delete the history referencing it — it makes that history unreadable,
 * so last year's invoice can no longer say what was done or who did it. */
export async function deactivateDoctorSchedule(id: string): Promise<void> {
  await updateDoctorSchedule(id, { is_active: false } as never)
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

/** Cancels. personal_finance_items already has a status column, so it
 * needed no migration — only stopping the delete the server refuses. */
export async function cancelPersonalFinanceItem(id: string): Promise<void> {
  await updatePersonalFinanceItem(id, { status: 'cancelled' } as never)
}

// ── Smart Cash Register (صندوق‌داری هوشمند) ──────────────────────
export async function fetchCashRegisterSessions(): Promise<CashRegisterSession[]> {
  const items = await db.cash_register_sessions.where('clinic_id').equals(CLINIC_ID).toArray()
  return items.sort((a, b) => b.opened_at.localeCompare(a.opened_at))
}

export async function getOpenCashRegisterSession(): Promise<CashRegisterSession | null> {
  const items = await db.cash_register_sessions.where({ clinic_id: CLINIC_ID, status: 'open' }).toArray()
  return items[0] || null
}

export async function openCashRegisterSession(openingBalance: number): Promise<CashRegisterSession> {
  // Defense in depth: the UI already hides the "open" form while a
  // session is open, but that alone doesn't stop it — e.g. two browser
  // tabs open at once, or a stale UI state after a slow sync. Two
  // concurrently open sessions would corrupt expectedCashInDrawer (which
  // assumes a single open session) and make the physical reconciliation
  // meaningless, so the API layer refuses this regardless of what the UI
  // currently shows.
  const alreadyOpen = await getOpenCashRegisterSession()
  if (alreadyOpen) throw new Error('یک صندوق از قبل باز است — ابتدا آن را ببندید')
  const id = uid()
  const session: CashRegisterSession = {
    id, clinic_id: CLINIC_ID, opened_at: nowISO(), closed_at: null,
    opening_balance: openingBalance, expected_closing_balance: null, counted_closing_balance: null,
    discrepancy: null, opened_by: null, closed_by: null, status: 'open', notes: null,
    created_at: nowISO(), updated_at: nowISO(),
  }
  await db.cash_register_sessions.put(session)
  await queueOperation('cash_register_sessions', 'insert', id, session)
  return session
}

export async function closeCashRegisterSession(id: string, expectedBalance: number, countedBalance: number, notes: string | null): Promise<CashRegisterSession> {
  const existing = await db.cash_register_sessions.get(id)
  if (!existing) throw new Error('صندوق یافت نشد')
  const updated: CashRegisterSession = {
    ...existing, closed_at: nowISO(), expected_closing_balance: expectedBalance,
    counted_closing_balance: countedBalance, discrepancy: countedBalance - expectedBalance,
    status: 'closed', notes, updated_at: nowISO(),
  }
  await db.cash_register_sessions.put(updated)
  await queueOperation('cash_register_sessions', 'update', id, updated)
  return updated
}

// ── Staff login access (suspend/reactivate a login without deleting it) ──
export async function fetchStaffLoginStatuses(): Promise<Map<string, { userId: string; isActive: boolean }>> {
  const { data, error } = await supabase.from('users').select('id, staff_id, is_active').not('staff_id', 'is', null)
  const map = new Map<string, { userId: string; isActive: boolean }>()
  if (error || !data) return map
  for (const row of data as any[]) {
    if (row.staff_id) map.set(row.staff_id, { userId: row.id, isActive: row.is_active !== false })
  }
  return map
}

export async function setStaffLoginActive(userId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('users').update({ is_active: isActive }).eq('id', userId)
  if (error) throw new Error(error.message)
}

// ── Online Booking Requests (نوبت‌دهی آنلاین) ─────────────────────
export async function fetchOnlineBookingRequests(): Promise<any[]> {
  const { data, error } = await supabase
    .from('online_booking_requests')
    .select('*')
    .eq('clinic_id', CLINIC_ID)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}

export async function rejectBookingRequest(id: string): Promise<void> {
  const { error } = await supabase.from('online_booking_requests')
    .update({ status: 'rejected', reviewed_at: nowISO() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function convertBookingRequestToAppointment(
  request: { id: string; full_name: string; phone: string; preferred_date: string | null; preferred_time: string | null; reason: string | null },
  patientId: string,
  doctorId: string,
  date: string,
  startTime: string,
  endTime: string,
): Promise<Appointment> {
  const appt = await createAppointment({
    patient_id: patientId, doctor_id: doctorId, unit_id: null,
    date, start_time: startTime, end_time: endTime,
    type: 'consultation', status: 'scheduled',
    notes: request.reason ? `از نوبت‌دهی آنلاین: ${request.reason}` : 'ثبت‌شده از نوبت‌دهی آنلاین',
    estimated_fee: null, duration_minutes: null, reminder_sent: false, created_by: null,
    last_reminder_sent: null, reminder_count: 0, reminder_enabled: true,
    booking_source: 'online', confirmed_at: null, confirmed_by: null,
  } as any)
  const { error } = await supabase.from('online_booking_requests')
    .update({ status: 'converted', converted_appointment_id: appt.id, reviewed_at: nowISO() })
    .eq('id', request.id)
  if (error) throw new Error(error.message)
  return appt
}

// ── Editable RBAC (role_permissions + custom_roles) ─────────────────────
export async function fetchRolePermissions(): Promise<RolePermission[]> {
  return db.role_permissions.where('clinic_id').equals(CLINIC_ID).toArray()
}

export async function fetchCustomRoles(): Promise<CustomRole[]> {
  return db.custom_roles.where('clinic_id').equals(CLINIC_ID).toArray()
}

/** Toggles (or creates, if this role/module pair has never been saved
 * before — e.g. a brand-new custom role) a single permission cell. */
export async function setRolePermission(roleKey: string, modulePath: string, allowed: boolean): Promise<void> {
  const all = await db.role_permissions.where('clinic_id').equals(CLINIC_ID).toArray()
  const existing = all.find((r) => r.role_key === roleKey && r.module_path === modulePath)
  if (existing) {
    const updated: RolePermission = { ...existing, allowed, updated_at: nowISO() }
    await db.role_permissions.put(updated)
    await queueOperation('role_permissions', 'update', existing.id, { allowed, updated_at: updated.updated_at })
  } else {
    const id = uid()
    const row: RolePermission = {
      id, clinic_id: CLINIC_ID, role_key: roleKey, module_path: modulePath, allowed,
      created_at: nowISO(), updated_at: nowISO(), sync_version: 1,
    }
    await db.role_permissions.put(row)
    await queueOperation('role_permissions', 'insert', id, row)
  }
}

/** Creates a new custom role plus one role_permissions row per known
 * module, all defaulting to false ('/' is intentionally NOT force-allowed
 * here — a brand-new role starts fully locked down; the admin opts modules
 * in explicitly, which is the safer default for a just-created role). */
export async function createCustomRole(roleKey: string, label: string, modulePaths: string[]): Promise<CustomRole> {
  const id = uid()
  const role: CustomRole = { id, clinic_id: CLINIC_ID, role_key: roleKey, label, created_at: nowISO(), updated_at: nowISO(), sync_version: 1 }
  await db.custom_roles.put(role)
  await queueOperation('custom_roles', 'insert', id, role)
  for (const modulePath of modulePaths) {
    const permId = uid()
    const perm: RolePermission = {
      id: permId, clinic_id: CLINIC_ID, role_key: roleKey, module_path: modulePath, allowed: false,
      created_at: nowISO(), updated_at: nowISO(), sync_version: 1,
    }
    await db.role_permissions.put(perm)
    await queueOperation('role_permissions', 'insert', permId, perm)
  }
  return role
}

/** Deletes a custom role and every permission row it owns. Built-in
 * (system) roles aren't rows in custom_roles at all, so they can never be
 * passed to this function by construction — the UI only offers delete on
 * roles that came from fetchCustomRoles(). */
export async function deactivateCustomRole(roleKey: string): Promise<void> {
  const role = (await db.custom_roles.where('clinic_id').equals(CLINIC_ID).toArray()).find((r) => r.role_key === roleKey)
  if (!role) return
  const updated = { ...role, is_active: false, updated_at: nowISO() }
  await db.custom_roles.put(updated)
  await queueOperation('custom_roles', 'update', role.id, { is_active: false })
  // The role's permission rows are left alone. They are meaningless
  // while the role is inactive, and keeping them means reactivating a
  // role restores exactly what it could do before rather than silently
  // coming back with no access.
}

/** Builds the { role_key: allowedPaths[] } map that permissions.ts'
 * canAccess() reads synchronously, and installs it via
 * setPermissionOverrides(). Call once on app boot (Layout.tsx) and again
 * after any RBAC edit in Settings so the change takes effect immediately
 * without a full reload. */
export async function loadRolePermissionOverrides(): Promise<void> {
  const rows = await fetchRolePermissions()
  const map: Record<string, string[]> = {}
  for (const row of rows) {
    if (!row.allowed) continue
    if (!map[row.role_key]) map[row.role_key] = []
    map[row.role_key].push(row.module_path)
  }
  setPermissionOverrides(map)
}

// ── Manual (editable, patient-linked) reminders ─────────────────────────
export async function fetchManualReminders(): Promise<ManualReminder[]> {
  const items = await db.manual_reminders.where('clinic_id').equals(CLINIC_ID).toArray()
  return items.sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
}

export async function createManualReminder(r: ManualReminderInput): Promise<ManualReminder> {
  const { clinic_id, ...rest } = r
  const id = uid()
  const reminder: ManualReminder = { ...rest, id, clinic_id: CLINIC_ID, created_at: nowISO(), updated_at: nowISO(), sync_version: 1 }
  await db.manual_reminders.put(reminder)
  await queueOperation('manual_reminders', 'insert', id, reminder)
  return reminder
}

export async function updateManualReminder(id: string, updates: Partial<ManualReminderInput>): Promise<ManualReminder> {
  const existing = await db.manual_reminders.get(id)
  if (!existing) throw new Error('یادآوری یافت نشد')
  const { clinic_id, ...rest } = updates
  const updated: ManualReminder = { ...existing, ...rest, updated_at: nowISO() }
  await db.manual_reminders.put(updated)
  await queueOperation('manual_reminders', 'update', id, rest)
  return updated
}

// ── Per-patient insurance policies (MOD-FEAT-005) ───────────────────────
export async function fetchPatientPolicies(patientId: string): Promise<PatientPolicy[]> {
  const rows = await db.patient_policies.where('patient_id').equals(patientId).toArray()
  return rows.filter((p) => p.clinic_id === CLINIC_ID)
}

export type PatientPolicyInput = Omit<PatientPolicy, 'id' | 'clinic_id' | 'created_at' | 'updated_at'>

export async function createPatientPolicy(p: PatientPolicyInput): Promise<PatientPolicy> {
  const id = uid()
  const row: PatientPolicy = { ...p, id, clinic_id: CLINIC_ID, created_at: nowISO(), updated_at: nowISO() }
  await db.patient_policies.put(row)
  await queueOperation('patient_policies', 'insert', id, row)
  return row
}

export async function updatePatientPolicy(id: string, updates: Partial<PatientPolicyInput>): Promise<PatientPolicy> {
  const existing = await db.patient_policies.get(id)
  if (!existing) throw new Error('بیمه یافت نشد')
  const updated: PatientPolicy = { ...existing, ...updates, updated_at: nowISO() }
  await db.patient_policies.put(updated)
  await queueOperation('patient_policies', 'update', id, updates)
  return updated
}

/** Soft-deactivate — a lapsed policy stays on file for past treatments. */
export async function archivePatientPolicy(id: string): Promise<void> {
  await updatePatientPolicy(id, { is_active: false })
}
