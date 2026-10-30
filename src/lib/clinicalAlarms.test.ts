import { describe, it, expect } from 'vitest'
import {
  findDueCheques,
  findPendingImplantStages,
  findOverdueLabOrders,
  getUrgentClinicAlarms,
} from './smartReminders'
import type { Cheque, ImplantCase, LabOrder, Patient } from '../types'

describe('Smart Clinic Alarms & Reminders Engine', () => {
  const patient: Patient = {
    id: 'p-1',
    clinic_id: 'c-1',
    first_name: 'رضا',
    last_name: 'احمدی',
    phone: '09123456789',
    created_at: '2026-01-01T10:00:00Z',
    updated_at: '2026-01-01T10:00:00Z',
    sync_version: 1,
  } as Patient

  const todayStr = '2026-09-11'

  describe('findDueCheques', () => {
    it('detects bounced cheques with highest priority', () => {
      const cheques: Cheque[] = [
        {
          id: 'ch-1',
          clinic_id: 'c-1',
          patient_id: 'p-1',
          amount: 5000000,
          due_date: '2026-09-01',
          status: 'bounced',
          bank_name: 'بانک ملت',
          cheque_number: '12345',
          sayad_id: '1234567890123456',
          purpose: 'payment',
        } as Cheque,
      ]

      const alarms = findDueCheques(cheques, [patient], todayStr)
      expect(alarms.length).toBe(1)
      expect(alarms[0].category).toBe('cheque_due')
      expect(alarms[0].urgency).toBe('urgent')
      expect(alarms[0].actionNeeded).toContain('برگشت')
      expect(alarms[0].patientName).toContain('رضا احمدی')
    })

    it('detects cheques due today', () => {
      const cheques: Cheque[] = [
        {
          id: 'ch-2',
          clinic_id: 'c-1',
          patient_id: 'p-1',
          amount: 3000000,
          due_date: '2026-09-11',
          status: 'pending',
          bank_name: 'صادرات',
          cheque_number: '67890',
          purpose: 'payment',
        } as Cheque,
      ]

      const alarms = findDueCheques(cheques, [patient], todayStr)
      expect(alarms.length).toBe(1)
      expect(alarms[0].urgency).toBe('urgent')
      expect(alarms[0].actionNeeded).toContain('سررسید امروز')
    })

    it('detects overdue cheques', () => {
      const cheques: Cheque[] = [
        {
          id: 'ch-3',
          clinic_id: 'c-1',
          patient_id: 'p-1',
          amount: 4000000,
          due_date: '2026-09-05',
          status: 'pending',
          bank_name: 'تجارت',
          purpose: 'payment',
        } as Cheque,
      ]

      const alarms = findDueCheques(cheques, [patient], todayStr)
      expect(alarms.length).toBe(1)
      expect(alarms[0].urgency).toBe('urgent')
      expect(alarms[0].actionNeeded).toContain('گذشته')
    })

    it('ignores cleared and cancelled cheques', () => {
      const cheques: Cheque[] = [
        {
          id: 'ch-4',
          clinic_id: 'c-1',
          patient_id: 'p-1',
          amount: 4000000,
          due_date: '2026-09-01',
          status: 'cleared',
          purpose: 'payment',
        } as Cheque,
        {
          id: 'ch-5',
          clinic_id: 'c-1',
          patient_id: 'p-1',
          amount: 2000000,
          due_date: '2026-09-01',
          status: 'cancelled',
          purpose: 'payment',
        } as Cheque,
      ]

      const alarms = findDueCheques(cheques, [patient], todayStr)
      expect(alarms.length).toBe(0)
    })
  })

  describe('findPendingImplantStages', () => {
    it('detects implant cases requiring next action', () => {
      const implants: ImplantCase[] = [
        {
          id: 'imp-1',
          clinic_id: 'c-1',
          patient_id: 'p-1',
          tooth_number: 16,
          status: 'fixture_placed',
          surgery_date: '2026-06-01',
          healing_period_weeks: 12,
          created_at: '2026-06-01T10:00:00Z',
          updated_at: '2026-06-01T10:00:00Z',
          sync_version: 1,
        } as unknown as ImplantCase,
      ]

      const alarms = findPendingImplantStages(implants, [patient], todayStr)
      expect(alarms.length).toBe(1)
      expect(alarms[0].category).toBe('implant_stage_due')
      expect(alarms[0].patientName).toContain('رضا احمدی')
    })

    it('ignores completed implant cases', () => {
      const implants: ImplantCase[] = [
        {
          id: 'imp-2',
          clinic_id: 'c-1',
          patient_id: 'p-1',
          tooth_number: 21,
          status: 'completed',
          crown_delivered_at: '2026-08-01',
          created_at: '2026-05-01T10:00:00Z',
          updated_at: '2026-08-01T10:00:00Z',
          sync_version: 1,
        } as unknown as ImplantCase,
      ]

      const alarms = findPendingImplantStages(implants, [patient], todayStr)
      expect(alarms.length).toBe(0)
    })
  })

  describe('findOverdueLabOrders', () => {
    it('detects orders past expected delivery date', () => {
      const labOrders: LabOrder[] = [
        {
          id: 'lab-1',
          clinic_id: 'c-1',
          patient_id: 'p-1',
          tooth_number: 14,
          item_name: 'روکش زیرکونیا',
          status: 'sent',
          expected_delivery_date: '2026-09-08',
          created_at: '2026-09-01T10:00:00Z',
          updated_at: '2026-09-01T10:00:00Z',
        } as unknown as LabOrder,
      ]

      const alarms = findOverdueLabOrders(labOrders, [patient], todayStr)
      expect(alarms.length).toBe(1)
      expect(alarms[0].category).toBe('lab_overdue')
      expect(alarms[0].urgency).toBe('urgent')
      expect(alarms[0].actionNeeded).toContain('تأخیر تحویل لابراتوار')
    })

    it('detects arrived orders needing patient delivery appointment', () => {
      const labOrders: LabOrder[] = [
        {
          id: 'lab-2',
          clinic_id: 'c-1',
          patient_id: 'p-1',
          tooth_number: 11,
          item_name: 'پرسلن',
          status: 'received',
          delivery_date: '2026-09-10',
          created_at: '2026-09-01T10:00:00Z',
          updated_at: '2026-09-10T10:00:00Z',
        } as unknown as LabOrder,
      ]

      const alarms = findOverdueLabOrders(labOrders, [patient], todayStr)
      expect(alarms.length).toBe(1)
      expect(alarms[0].actionNeeded).toContain('آماده تحویل به بیمار')
    })
  })

  describe('getUrgentClinicAlarms', () => {
    it('aggregates all urgent alarms and computes category counts', () => {
      const summary = getUrgentClinicAlarms({
        appointments: [],
        treatments: [],
        patients: [patient],
        installments: [
          {
            id: 'inst-1',
            clinic_id: 'c-1',
            patient_id: 'p-1',
            payment_plan_id: 'plan-1',
            installment_number: 1,
            amount: 2500000,
            due_date: '2026-09-01',
            status: 'pending',
            payment_date: null,
            reminder_sent: false,
            notes: null,
            created_at: '2026-08-01T10:00:00Z',
            updated_at: '2026-08-01T10:00:00Z',
            sync_version: 1,
          },
        ],
        cheques: [
          {
            id: 'ch-bounced',
            clinic_id: 'c-1',
            patient_id: 'p-1',
            amount: 10000000,
            due_date: '2026-09-01',
            status: 'bounced',
            bank_name: 'ملی',
            purpose: 'payment',
          } as Cheque,
        ],
        labOrders: [
          {
            id: 'lab-overdue',
            clinic_id: 'c-1',
            patient_id: 'p-1',
            tooth_number: 36,
            item_name: 'PFM',
            status: 'sent',
            expected_delivery_date: '2026-09-05',
            created_at: '2026-09-01T10:00:00Z',
            updated_at: '2026-09-01T10:00:00Z',
          } as unknown as LabOrder,
        ],
        implants: [
          {
            id: 'imp-stage',
            clinic_id: 'c-1',
            patient_id: 'p-1',
            tooth_number: 46,
            status: 'fixture_placed',
            surgery_date: '2026-05-01',
            healing_period_weeks: 8,
            created_at: '2026-05-01T10:00:00Z',
            updated_at: '2026-05-01T10:00:00Z',
            sync_version: 1,
          } as unknown as ImplantCase,
        ],
        today: todayStr,
      })

      expect(summary.totalUrgentCount).toBeGreaterThanOrEqual(3)
      expect(summary.countsByCategory.cheque_due).toBe(1)
      expect(summary.countsByCategory.installment_due).toBe(1)
      expect(summary.countsByCategory.lab_overdue).toBe(1)
      expect(summary.countsByCategory.implant_stage_due).toBe(1)
      expect(summary.hasCriticalItems).toBe(true)
    })
  })
})
