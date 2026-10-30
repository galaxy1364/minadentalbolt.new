// src/lib/waitingListMatcher.test.ts
import { describe, it, expect } from 'vitest'
import { matchWaitingListForCancelledSlot, SlotInfo } from './waitingListMatcher'
import { WaitingListEntryWithRelations } from '../types'

function makeMockWaitingEntry(
  id: string,
  patientName: string,
  doctorId?: string | null,
  prefDate?: string | null,
  priority: number = 2,
  status: string = 'waiting'
): WaitingListEntryWithRelations {
  return {
    id,
    clinic_id: 'test-clinic',
    patient_id: `p-${id}`,
    doctor_id: doctorId ?? null,
    preferred_date: prefDate ?? null,
    priority,
    status: status as any,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    patient: {
      id: `p-${id}`,
      clinic_id: 'test-clinic',
      first_name: patientName.split(' ')[0],
      last_name: patientName.split(' ')[1] || 'بیمار',
      file_number: `MD-${id}`,
      is_active: true,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    } as any,
  } as unknown as WaitingListEntryWithRelations
}

describe('waitingListMatcher', () => {
  const slot: SlotInfo = {
    date: '2026-04-10',
    start_time: '16:00',
    doctor_id: 'doc-1',
  }

  it('filters out non-waiting or cancelled entries', () => {
    const e1 = makeMockWaitingEntry('1', 'علی رضایی', 'doc-1', '2026-04-10', 2, 'scheduled')
    const e2 = makeMockWaitingEntry('2', 'سارا احمدی', 'doc-1', '2026-04-10', 2, 'cancelled')
    const e3 = makeMockWaitingEntry('3', 'مهدی کریمی', 'doc-1', '2026-04-10', 2, 'waiting')

    const res = matchWaitingListForCancelledSlot(slot, [e1, e2, e3])
    expect(res).toHaveLength(1)
    expect(res[0].entry.id).toBe('3')
  })

  it('ranks perfect doctor + date match above generic matches', () => {
    const perfect = makeMockWaitingEntry('1', 'محمد حسینی', 'doc-1', '2026-04-10', 2)
    const urgentOther = makeMockWaitingEntry('2', 'پویا مرادی', 'doc-2', '2026-04-15', 4) // urgent priority 4
    const sameDocDiffDate = makeMockWaitingEntry('3', 'زهرا کیانی', 'doc-1', '2026-04-12', 2)

    const res = matchWaitingListForCancelledSlot(slot, [urgentOther, sameDocDiffDate, perfect])

    expect(res[0].entry.id).toBe('1')
    expect(res[0].matchReason).toContain('تطابق کامل')
  })

  it('prioritizes urgent patients when dates differ', () => {
    const urgent = makeMockWaitingEntry('1', 'اورژانسی علیزاده', null, null, 4)
    const normal = makeMockWaitingEntry('2', 'عادی بهرامی', null, null, 1)

    const res = matchWaitingListForCancelledSlot(slot, [normal, urgent])
    expect(res[0].entry.id).toBe('1')
    expect(res[0].matchReason).toContain('اولویت فوری')
  })
})
