/**
 * MOD-FEAT-022 | تحویل دندان از چارت به ماژول‌های دیگر
 *
 * گزارش مهدی: «اگر شخصی فقط کار لابراتوار داشت مستقیم از چارت انتخاب
 * شود… کل روند یکپارچه در لابراتوار و ایمپلنت هم باشد.»
 *
 * ممیزی MOD-TEST-001 نشان داد چرا این ممکن نبود: `DentalChart` دقیقاً یک
 * خروجی داشت — `onAddTreatment(toothNumber)`. نه دری به لابراتوار، نه به
 * ایمپلنت. هر کدام انتخابگر پالمر مستقل خودشان را داشتند، پس همان دندانی
 * که پزشک روی چارت لمس کرده بود، در ماژول بعدی از صفر دوباره پرسیده
 * می‌شد.
 *
 * سطح دندان هم منتقل می‌شود. `onAddTreatment` فقط شماره را می‌داد، پس
 * وضعیتی که کاربر همان لحظه در ویرایشگر دندان ثبت کرده بود دور ریخته
 * می‌شد و دوباره پرسیده می‌شد.
 */

export type ChartDestination = 'treatment' | 'lab' | 'implant'

export interface ChartToothContext {
  toothNumber: string
  surface?: string | null
  patientId: string
  doctorId?: string | null
}

export interface ChartHandoff {
  /** مسیری که باید به آن رفت. */
  path: string
  /** حالتی که صفحه‌ی مقصد می‌خواند. */
  state: {
    quickStartToothNumber: string
    quickStartToothSurface: string | null
    quickStartPatientId: string
    quickStartDoctorId: string | null
  }
}

const DESTINATION_PATHS: Record<Exclude<ChartDestination, 'treatment'>, string> = {
  lab: '/laboratory',
  implant: '/implants',
}

/**
 * Where a chart action goes and what it carries.
 *
 * 'treatment' returns null on purpose: a treatment is recorded inside the
 * visit that is already open, so navigating away would abandon it. Lab
 * orders and implant cases live in their own modules and genuinely need a
 * route change.
 */
export function buildChartHandoff(
  destination: ChartDestination,
  ctx: ChartToothContext,
): ChartHandoff | null {
  if (destination === 'treatment') return null
  if (!ctx.toothNumber || !ctx.patientId) return null

  return {
    path: DESTINATION_PATHS[destination],
    state: {
      quickStartToothNumber: String(ctx.toothNumber),
      quickStartToothSurface: ctx.surface || null,
      quickStartPatientId: ctx.patientId,
      quickStartDoctorId: ctx.doctorId || null,
    },
  }
}

export interface ReceivedHandoff {
  toothNumber: string
  surface: string | null
  patientId: string
  doctorId: string | null
}

/**
 * Reads a hand-off on the receiving page.
 *
 * Returns null rather than a half-filled object when the tooth or the
 * patient is missing: a form that opens itself with only half the answer
 * is worse than one the person opened deliberately, because they cannot
 * tell what was prefilled and what they still have to enter.
 */
export function readChartHandoff(state: unknown): ReceivedHandoff | null {
  if (!state || typeof state !== 'object') return null
  const s = state as Record<string, unknown>
  const toothNumber = typeof s.quickStartToothNumber === 'string' ? s.quickStartToothNumber : ''
  const patientId = typeof s.quickStartPatientId === 'string' ? s.quickStartPatientId : ''
  if (!toothNumber || !patientId) return null

  return {
    toothNumber,
    surface: typeof s.quickStartToothSurface === 'string' ? s.quickStartToothSurface : null,
    patientId,
    doctorId: typeof s.quickStartDoctorId === 'string' ? s.quickStartDoctorId : null,
  }
}
