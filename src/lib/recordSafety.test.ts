/**
 * Guards the project's first absolute prohibition: no permanent deletes.
 *
 * These are source-level assertions rather than behavioural ones. That is
 * deliberate. The behaviour lives in Postgres (migration 023 removed
 * DELETE from the record tables' policies) and cannot be reached from a
 * unit test. What CAN regress here is someone reintroducing a delete
 * helper for a patient record, so that is what is pinned.
 */
import { describe, it, expect } from 'vitest'
// Imported as raw text by Vite so the test needs no Node type
// definitions and works the same in CI as it does locally.
import api from './api.ts?raw'

/** Tables that hold a patient's record or the money chain attached to it. */
const PROTECTED = [
  'patients', 'appointments', 'encounters', 'treatments', 'payments',
  'prescriptions', 'radiology_images', 'tooth_records', 'patient_timeline',
  'waiting_list', 'lab_orders', 'implant_cases', 'implant_components',
  'payment_plans', 'installments', 'cheques', 'consent_forms',
  'treatment_phases', 'insurance_claims', 'patient_policies',
  'expenses', 'personal_finance_items', 'cash_register_sessions',
  'manual_reminders',
]

/** Configuration tables. Migration 026 closed DELETE on these too:
 * treatments, appointments and lab orders that already happened still
 * point at them, so deleting one does not delete the history — it makes
 * that history unreadable. */
const CONFIG = [
  'doctors', 'staff', 'procedures', 'units', 'laboratories',
  'insurance_companies', 'inventory_items', 'inventory_categories',
  'sms_templates', 'treatment_packages', 'doctor_schedules', 'custom_roles',
]

describe('no permanent delete of a patient record', () => {
  it('deletePatient no longer exists', () => {
    // It used to cascade through fifteen tables and then remove the
    // patient row, taking the cheques and instalments with it.
    expect(api).not.toContain('export async function deletePatient')
  })

  it('archivePatient exists in its place', () => {
    expect(api).toContain('export async function archivePatient')
  })

  it('deleteAppointment no longer exists', () => {
    expect(api).not.toContain('export async function deleteAppointment')
  })

  it('cancelAppointment exists in its place', () => {
    expect(api).toContain('export async function cancelAppointment')
  })

  it('never queues a delete for a protected table', () => {
    // queueOperation(table, 'delete', ...) is what reaches the server.
    // After migration 023 the server refuses it, so queuing one would
    // leave the record gone locally and the failure buried in the sync
    // queue — worse than a visible error.
    const offenders = PROTECTED.filter((t) =>
      new RegExp(`queueOperation\\(\\s*'${t}'\\s*,\\s*'delete'`).test(api),
    )
    expect(offenders).toEqual([])
  })

  it('never clears a protected Dexie table by patient', () => {
    const offenders = PROTECTED.filter((t) =>
      new RegExp(`db\\.${t}\\.where\\('patient_id'\\)\\.equals\\([^)]*\\)\\.delete\\(`).test(api),
    )
    expect(offenders).toEqual([])
  })
})

describe('no permanent delete of configuration either', () => {
  it('never queues a delete for a config table', () => {
    const offenders = CONFIG.filter((t) =>
      new RegExp(`queueOperation\\(\\s*'${t}'\\s*,\\s*'delete'`).test(api),
    )
    expect(offenders).toEqual([])
  })

  it('never clears a config table locally', () => {
    const offenders = CONFIG.filter((t) =>
      new RegExp(`db\\.${t}\\.delete\\(`).test(api),
    )
    expect(offenders).toEqual([])
  })

  it('exposes a deactivate for each config area instead', () => {
    for (const fn of [
      'deactivateDoctor', 'deactivateUnit', 'deactivateProcedure',
      'deactivateStaff', 'deactivateLab', 'deactivateInsuranceCompany',
      'deactivateInventoryItem', 'deactivateInventoryCategory',
      'deactivateSmsTemplate', 'deactivateTreatmentPackage',
      'deactivateDoctorSchedule', 'deactivateCustomRole',
      'deactivateExpense', 'cancelPersonalFinanceItem',
    ]) {
      expect(api).toContain(`export async function ${fn}`)
    }
  })

  it('leaves no delete helper behind for any protected or config table', () => {
    // The compiler catches renamed call sites; this catches a new one
    // being written from scratch.
    const stale = [...PROTECTED, ...CONFIG].filter((t) =>
      new RegExp(`db\\.${t}\\.delete\\(|queueOperation\\(\\s*'${t}'\\s*,\\s*'delete'`).test(api),
    )
    expect(stale).toEqual([])
  })
})
