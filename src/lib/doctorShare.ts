/**
 * doctorShare.ts — محاسبه‌ی سهم پزشکان طبق قرارداد اجرایی مستر (Section 6)
 *
 * قوانین قفل‌شده کلینیک مینادنت:
 *  - فرمول سهم مهدی: کل کارکرد − کل هزینه لابراتوار
 *  - فرمول سهم مینا: (کل کارکرد − کل هزینه لابراتوار) ÷ ۲
 *  - استثنای ایمپلنت: فقط جراحی/کاشت در فرمول مینا؛ قطعات Fixture/Abutment برای مهدی
 *  - برای سایر پزشکان: بر اساس درصد توافقی (پیش‌فرض ۵۰٪) منهای هزینه لابراتوار
 */

export interface ShareTreatment {
  id: string
  doctor_id: string | null
  procedure_name?: string | null
  total_price: number | null
  patient_share?: number | null
  status: string
  /** هزینه یا ارزش قطعه ایمپلنت (فیکسچر، اباتمنت) که متعلق به کلینیک/مهدی است */
  is_implant_part?: boolean
  is_implant_surgery?: boolean
}

export interface ShareLabOrder {
  id: string
  doctor_id?: string | null
  treatment_id?: string | null
  cost: number | null
  status: string
}

export interface DoctorShareConfig {
  doctorId: string
  doctorName: string
  role?: 'mehdi' | 'mina' | 'doctor'
  commissionPercent?: number
}

export interface DoctorShareBreakdown {
  doctorId: string
  doctorName: string
  totalGrossWork: number
  implantPartsValue: number
  billableWork: number
  totalLabCost: number
  netBase: number
  commissionPercent: number
  finalDoctorShare: number
  clinicShare: number
}

export function calculateDoctorShare(
  config: DoctorShareConfig,
  treatments: ShareTreatment[],
  labOrders: ShareLabOrder[] = [],
): DoctorShareBreakdown {
  const isDoctor = (t: ShareTreatment) => t.doctor_id === config.doctorId
  const billableTreatments = treatments.filter((t) => isDoctor(t) && t.status !== 'cancelled')

  let totalGrossWork = 0
  let implantPartsValue = 0

  for (const t of billableTreatments) {
    const price = t.patient_share ?? (t.total_price || 0)
    totalGrossWork += price
    if (t.is_implant_part) {
      implantPartsValue += price
    }
  }

  // هزینه لابراتوار مرتبط با این پزشک (کارهای لغوشده حساب نمی‌شوند)
  const activeLabs = labOrders.filter((l) => l.doctor_id === config.doctorId && l.status !== 'cancelled')
  const totalLabCost = activeLabs.reduce((sum, l) => sum + (l.cost || 0), 0)

  let commissionPercent = config.commissionPercent ?? 50
  let billableWork = totalGrossWork

  if (config.role === 'mehdi') {
    commissionPercent = 100
    // کل کارکرد شامل قطعات و جراحی منهای هزینه لابراتوار
    const netBase = Math.max(0, totalGrossWork - totalLabCost)
    const finalDoctorShare = netBase
    return {
      doctorId: config.doctorId,
      doctorName: config.doctorName,
      totalGrossWork,
      implantPartsValue,
      billableWork,
      totalLabCost,
      netBase,
      commissionPercent,
      finalDoctorShare,
      clinicShare: totalGrossWork - finalDoctorShare,
    }
  }

  if (config.role === 'mina') {
    commissionPercent = 50
    // استثنای ایمپلنت: قطعات (فیکسچر/اباتمنت) از مبنای محاسبه دکتر مینا کسر می‌شود
    billableWork = Math.max(0, totalGrossWork - implantPartsValue)
    const netBase = Math.max(0, billableWork - totalLabCost)
    const finalDoctorShare = Math.round(netBase / 2)
    return {
      doctorId: config.doctorId,
      doctorName: config.doctorName,
      totalGrossWork,
      implantPartsValue,
      billableWork,
      totalLabCost,
      netBase,
      commissionPercent,
      finalDoctorShare,
      clinicShare: totalGrossWork - finalDoctorShare,
    }
  }

  // سایر پزشکان کلینیک
  billableWork = Math.max(0, totalGrossWork - implantPartsValue)
  const netBase = Math.max(0, billableWork - totalLabCost)
  const finalDoctorShare = Math.round((netBase * commissionPercent) / 100)

  return {
    doctorId: config.doctorId,
    doctorName: config.doctorName,
    totalGrossWork,
    implantPartsValue,
    billableWork,
    totalLabCost,
    netBase,
    commissionPercent,
    finalDoctorShare,
    clinicShare: totalGrossWork - finalDoctorShare,
  }
}
