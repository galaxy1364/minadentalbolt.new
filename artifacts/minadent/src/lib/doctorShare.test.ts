import { describe, it, expect } from 'vitest'
import { calculateDoctorShare, type ShareTreatment, type ShareLabOrder } from './doctorShare'

describe('🔴 محاسبات سهم پزشکان — طبق قرارداد اجرایی مستر (بخش ۶)', () => {
  it('فرمول سهم مهدی: کل کارکرد منهای کل هزینه لابراتوار', () => {
    const treatments: ShareTreatment[] = [
      { id: 't1', doctor_id: 'doc-mehdi', total_price: 10_000_000, status: 'completed' },
      { id: 't2', doctor_id: 'doc-mehdi', total_price: 5_000_000, status: 'completed', is_implant_part: true },
    ]
    const labOrders: ShareLabOrder[] = [
      { id: 'l1', doctor_id: 'doc-mehdi', cost: 3_000_000, status: 'delivered' },
    ]

    const result = calculateDoctorShare(
      { doctorId: 'doc-mehdi', doctorName: 'مهدی', role: 'mehdi' },
      treatments,
      labOrders,
    )

    expect(result.totalGrossWork).toBe(15_000_000)
    expect(result.totalLabCost).toBe(3_000_000)
    expect(result.netBase).toBe(12_000_000)
    expect(result.finalDoctorShare).toBe(12_000_000)
  })

  it('فرمول سهم مینا: (کل کارکرد منهای هزینه لابراتوار) تقسیم بر ۲ با استثنای قطعات ایمپلنت', () => {
    const treatments: ShareTreatment[] = [
      // جراحی کاشت ایمپلنت: ۱۰ میلیون تومان (مشمول سهم مینا)
      { id: 't1', doctor_id: 'doc-mina', total_price: 10_000_000, status: 'completed', is_implant_surgery: true },
      // فیکسچر و اباتمنت: ۶ میلیون تومان (استثنا: متعلق به مهدی، از مبنای مینا کسر می‌شود)
      { id: 't2', doctor_id: 'doc-mina', total_price: 6_000_000, status: 'completed', is_implant_part: true },
    ]
    const labOrders: ShareLabOrder[] = [
      // روکش ایمپلنت لابراتوار: ۲ میلیون تومان
      { id: 'l1', doctor_id: 'doc-mina', cost: 2_000_000, status: 'delivered' },
    ]

    const result = calculateDoctorShare(
      { doctorId: 'doc-mina', doctorName: 'دکتر مینا مازندرانی', role: 'mina' },
      treatments,
      labOrders,
    )

    // کار کل: ۱۶ میلیون
    expect(result.totalGrossWork).toBe(16_000_000)
    // قطعات کسرشده: ۶ میلیون
    expect(result.implantPartsValue).toBe(6_000_000)
    // مبنای کار دستمزد: ۱۰ میلیون
    expect(result.billableWork).toBe(10_000_000)
    // منهای لابراتوار ۲ میلیون = ۸ میلیون خالص
    expect(result.netBase).toBe(8_000_000)
    // سهم مینا: ۵۰٪ از ۸ میلیون = ۴ میلیون
    expect(result.finalDoctorShare).toBe(4_000_000)
    expect(result.clinicShare).toBe(12_000_000) // ۴ میلیون سهم کلینیک از کار + ۶ میلیون قطعه + ۲ میلیون لابراتوار
  })

  it('درمان‌های لغوشده از محاسبات سهم پزشک و لابراتوار حذف می‌شوند', () => {
    const treatments: ShareTreatment[] = [
      { id: 't1', doctor_id: 'doc-mina', total_price: 5_000_000, status: 'completed' },
      { id: 't2', doctor_id: 'doc-mina', total_price: 8_000_000, status: 'cancelled' },
    ]
    const labOrders: ShareLabOrder[] = [
      { id: 'l1', doctor_id: 'doc-mina', cost: 1_000_000, status: 'delivered' },
      { id: 'l2', doctor_id: 'doc-mina', cost: 2_000_000, status: 'cancelled' },
    ]

    const result = calculateDoctorShare(
      { doctorId: 'doc-mina', doctorName: 'دکتر مینا مازندرانی', role: 'mina' },
      treatments,
      labOrders,
    )

    expect(result.totalGrossWork).toBe(5_000_000)
    expect(result.totalLabCost).toBe(1_000_000)
    expect(result.netBase).toBe(4_000_000)
    expect(result.finalDoctorShare).toBe(2_000_000)
  })
})
