import { describe, it, expect } from 'vitest'
import { generateSlots, slotAvailability } from './timeSlots'
import { computeWaitingTimeMinutes, formatWaitingTime } from './operatoryWorkflow'
import { matchWaitingListForCancelledSlot, SlotInfo } from './waitingListMatcher'
import { buildAuditLogObject } from './auditLogger'

describe('Appointment Booking & Operatory Lifecycle Flow (0 to 100)', () => {
  it('generates bookable slots, detects conflicts, and reserves a slot', () => {
    const shifts = [{ start_time: '09:00', end_time: '13:00' }]
    const slots = generateSlots(shifts, 30, 30)
    expect(slots).toContain('09:00')
    expect(slots).toContain('09:30')
    expect(slots).toContain('12:30')

    const booked = [
      { start_time: '10:00', end_time: '10:30', status: 'scheduled' as const }
    ]

    const states = slotAvailability(slots, booked, 30)
    const state1000 = states.find((s) => s.time === '10:00')
    const state1030 = states.find((s) => s.time === '10:30')

    expect(state1000?.taken).toBe(true)
    expect(state1030?.taken).toBe(false)
  })

  it('tracks clinical waiting time correctly across presence phases', () => {
    // 10:00 arrival, 10:25 chair entry => 25 mins wait
    const waitTime = computeWaitingTimeMinutes('10:00', '10:25')
    expect(waitTime).toBe(25)
    expect(formatWaitingTime(waitTime)).toBe('۲۵ دقیقه در انتظار')

    // Just checked in
    expect(formatWaitingTime(0)).toBe('هم‌اکنون پذیرش شد')
  })

  it('matches waiting list patients when an appointment is cancelled', () => {
    const freedSlot: SlotInfo = {
      date: '1405-06-20',
      start_time: '11:00',
      doctor_id: 'doc-1',
      unit_id: 'unit-1',
    }

    const waitingList = [
      {
        id: 'wait-1',
        patient_id: 'p-10',
        doctor_id: 'doc-1',
        preferred_date: '1405-06-20',
        priority: 4,
        status: 'waiting' as const,
        patient: { first_name: 'سارا', last_name: 'احمدی', phone: '09121111111' }
      },
      {
        id: 'wait-2',
        patient_id: 'p-11',
        doctor_id: 'doc-2', // different doctor
        preferred_date: '1405-06-25',
        priority: 2,
        status: 'waiting' as const,
        patient: { first_name: 'رضا', last_name: 'کریمی', phone: '09122222222' }
      }
    ]

    const matches = matchWaitingListForCancelledSlot(freedSlot, waitingList as any)
    expect(matches.length).toBe(2)
    expect(matches[0].entry.id).toBe('wait-1')
    expect(matches[0].score).toBeGreaterThan(matches[1].score)
    expect(matches[0].matchReason).toContain('تطابق کامل تاریخ و پزشک درخواستی')
  })

  it('records ISO-27001 compliant immutable audit log on appointment actions', () => {
    const log = buildAuditLogObject({
      table_name: 'appointments',
      operation: 'insert',
      record_id: 'appt-999',
      summary: 'رزرو نوبت ویزیت ارتودنسی برای خانم احمدی',
      actor_name: 'پذیرش کلینیک',
      actor_role: 'منشی',
    })

    expect(log.table_name).toBe('appointments')
    expect(log.operation).toBe('insert')
    expect(log.record_id).toBe('appt-999')
    expect(log.actor_role).toBe('منشی')
    expect(log.created_at).toBeDefined()
  })
})
