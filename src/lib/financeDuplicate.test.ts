import { describe, it, expect } from 'vitest'
import { checkDuplicatePayment } from './finance'
import type { Payment } from '../types'

describe('checkDuplicatePayment', () => {
  const basePayment: Payment = {
    id: 'pay-1',
    patient_id: 'pat-100',
    amount: 1500000,
    payment_method: 'card',
    payment_date: '2026-09-16',
    created_at: new Date('2026-09-16T10:00:00Z').toISOString(),
    status: 'completed',
  } as any

  it('returns false when no payments exist', () => {
    const res = checkDuplicatePayment({ patient_id: 'pat-100', amount: 1500000 }, [])
    expect(res.isDuplicate).toBe(false)
  })

  it('returns false when amount is zero or negative', () => {
    const res = checkDuplicatePayment({ patient_id: 'pat-100', amount: 0 }, [basePayment])
    expect(res.isDuplicate).toBe(false)
  })

  it('returns false when patient is different', () => {
    const res = checkDuplicatePayment(
      { patient_id: 'pat-999', amount: 1500000 },
      [basePayment],
      10,
      new Date('2026-09-16T10:03:00Z').getTime()
    )
    expect(res.isDuplicate).toBe(false)
  })

  it('returns false when existing payment is cancelled', () => {
    const cancelledPayment = { ...basePayment, status: 'cancelled' } as Payment
    const res = checkDuplicatePayment(
      { patient_id: 'pat-100', amount: 1500000 },
      [cancelledPayment],
      10,
      new Date('2026-09-16T10:03:00Z').getTime()
    )
    expect(res.isDuplicate).toBe(false)
  })

  it('returns false when amount differs', () => {
    const res = checkDuplicatePayment(
      { patient_id: 'pat-100', amount: 2000000 },
      [basePayment],
      10,
      new Date('2026-09-16T10:03:00Z').getTime()
    )
    expect(res.isDuplicate).toBe(false)
  })

  it('returns true when identical payment was made 3 minutes ago', () => {
    const now = new Date('2026-09-16T10:03:00Z').getTime()
    const res = checkDuplicatePayment(
      { patient_id: 'pat-100', amount: 1500000, payment_date: '2026-09-16' },
      [basePayment],
      10,
      now
    )
    expect(res.isDuplicate).toBe(true)
    expect(res.matchedPayment?.id).toBe('pay-1')
    expect(res.minutesDiff).toBe(3)
    expect(res.message).toContain('۱,۵۰۰,۰۰۰')
    expect(res.message).toContain('۳ دقیقه گذشته')
  })

  it('returns false when payment was made outside the window (e.g. 2 hours ago)', () => {
    const now = new Date('2026-09-16T12:00:00Z').getTime()
    const res = checkDuplicatePayment(
      { patient_id: 'pat-100', amount: 1500000 },
      [basePayment],
      10,
      now
    )
    expect(res.isDuplicate).toBe(false)
  })
})
