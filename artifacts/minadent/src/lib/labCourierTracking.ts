// src/lib/labCourierTracking.ts — Laboratory Courier Dispatch & Tracking System for MinaDent
import { buildPrintDocument, escapeHtml } from './printDocument'
import { toPersianDigits, toJalaliStringPretty, toJalaliDisplay } from './persianDate'
import { toothLabel } from './toothLabel'
import type { LabOrder, Laboratory, Patient, Doctor } from '../types'

export type LabDispatchType = 'clinic_courier' | 'lab_courier' | 'postal' | 'in_person'

export interface DispatchTypeOption {
  value: LabDispatchType
  label: string
  description: string
  color: 'primary' | 'secondary' | 'accent' | 'warning' | 'slate'
}

export const DISPATCH_TYPE_OPTIONS: DispatchTypeOption[] = [
  {
    value: 'clinic_courier',
    label: 'پیک اختصاصی مطب',
    description: 'ارسال و دریافت توسط پیک موتوری یا راننده کلینیک',
    color: 'primary',
  },
  {
    value: 'lab_courier',
    label: 'پیک اختصاصی لابراتوار',
    description: 'پیک طرف قرارداد یا راننده خود لابراتوار سازنده',
    color: 'accent',
  },
  {
    value: 'postal',
    label: 'پست پیشتاز / تیپاکس',
    description: 'ارسال با بارنامه رسمی، رهگیری پستی یا تیپاکس',
    color: 'secondary',
  },
  {
    value: 'in_person',
    label: 'تحویل و دریافت حضوری',
    description: 'مراجعه مستقیم توسط پرسنل کلینیک یا نماینده لابراتوار',
    color: 'slate',
  },
]

export function getDispatchTypeLabel(type?: string | null): string {
  if (!type) return 'نامشخص'
  const match = DISPATCH_TYPE_OPTIONS.find((opt) => opt.value === type)
  return match ? match.label : 'سایر'
}

/**
 * Checks whether an order currently in dispatch transit has passed its expected return date.
 */
export function isTransitOverdue(order: Partial<LabOrder>): boolean {
  if (!order.dispatched_at || order.delivered || order.work_done) return false
  const targetDateStr = order.expected_return_date || order.deadline
  if (!targetDateStr) return false

  const target = new Date(targetDateStr)
  if (isNaN(target.getTime())) return false

  const now = new Date()
  return now.getTime() > target.getTime()
}

/**
 * Validates courier phone and tracking code format.
 */
export function validateDispatchInfo(info: {
  dispatch_type?: string | null
  courier_phone?: string | null
  tracking_code?: string | null
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (info.courier_phone && info.courier_phone.trim()) {
    const cleanedPhone = info.courier_phone.replace(/[\s-]/g, '')
    // Must be standard Iranian mobile (09...) or landline
    if (!/^(09\d{9}|0\d{9,10})$/.test(cleanedPhone)) {
      errors.push('شماره تماس پیک نامعتبر است (باید با ۰۹ شروع شده و ۱۱ رقم باشد)')
    }
  }

  if (info.dispatch_type === 'postal' && (!info.tracking_code || !info.tracking_code.trim())) {
    errors.push('برای ارسال پستی/تیپاکس، ثبت کد رهگیری یا شماره بارنامه الزامی است')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Returns formatted badge text, color, and transit status.
 */
export function formatCourierBadge(order: Partial<LabOrder>): {
  label: string
  color: 'slate' | 'primary' | 'warning' | 'success' | 'error' | 'accent'
  isOverdue: boolean
} {
  const overdue = isTransitOverdue(order)

  if (order.delivered) {
    return { label: 'تحویل داده شده به بیمار', color: 'success', isOverdue: false }
  }

  if (order.work_done) {
    return { label: 'در مطب (آماده تحویل)', color: 'accent', isOverdue: false }
  }

  if (overdue) {
    return {
      label: `تاخیر در بازگشت پیک (${getDispatchTypeLabel(order.dispatch_type)})`,
      color: 'error',
      isOverdue: true,
    }
  }

  if (order.dispatched_at) {
    const courierText = order.courier_name ? ` — ${order.courier_name}` : ''
    return {
      label: `${getDispatchTypeLabel(order.dispatch_type)}${courierText}`,
      color: 'warning',
      isOverdue: false,
    }
  }

  return {
    label: order.dispatch_type ? getDispatchTypeLabel(order.dispatch_type) : 'آماده بسته‌بندی و ارسال',
    color: 'slate',
    isOverdue: false,
  }
}

export interface LabDispatchSlipParams {
  order: LabOrder
  patient?: Patient | null
  doctor?: Doctor | null
  lab?: Laboratory | null
  clinicName?: string
  clinicPhone?: string
  clinicAddress?: string
}

/**
 * Generates an official, PWA-safe printable Work Order & Courier Dispatch Manifest
 * (برگه رسمی حواله پیک و ارسال کار به لابراتوار دندانپزشکی)
 */
export function generateLabDispatchSlip(params: LabDispatchSlipParams): string {
  const {
    order,
    patient,
    doctor,
    lab,
    clinicName = 'کلینیک دندانپزشکی مینا',
    clinicPhone = '۰۲۱-۸۸۰۰۰۰۰۰',
    clinicAddress = 'تهران، خیابان ولیعصر',
  } = params

  const patientName = patient ? `${patient.first_name || ''} ${patient.last_name || ''}`.trim() : 'بیمار بدون نام'
  const doctorName = doctor?.name ? `دکتر ${doctor.name}` : 'دندانپزشک معالج'
  const labName = lab?.name || 'لابراتوار دندانپزشکی طرف قرارداد'
  const labPhone = lab?.phone || lab?.contact_person || '—'

  const toothStr = order.tooth_number ? `دندان ${toothLabel(order.tooth_number)}` : 'نامشخص'
  const surfacesStr = order.tooth_surface ? `سطوح ${order.tooth_surface}` : ''
  const shadeStr = order.shade ? `رنگ ${order.shade}` : 'تعیین نشده'
  const materialStr = order.material || 'متریال استاندارد'
  const workTypeStr = order.work_type || 'پروتز دندانی'

  const dispatchTypeLabel = getDispatchTypeLabel(order.dispatch_type)
  const courierName = order.courier_name || 'پیک کلینیک'
  const courierPhone = order.courier_phone || '—'
  const trackingCode = order.tracking_code || '—'

  const dispatchDate = order.dispatched_at
    ? toJalaliStringPretty(order.dispatched_at)
    : toJalaliStringPretty(new Date().toISOString())

  const returnDate = order.expected_return_date
    ? toJalaliStringPretty(order.expected_return_date)
    : order.deadline
      ? toJalaliStringPretty(order.deadline)
      : 'تعیین‌نشده'

  const deadlineDisplay = order.deadline ? toJalaliDisplay(order.deadline) : '—'

  const styles = `
    .manifest-card {
      border: 2px solid #0f766e;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
      background: #ffffff;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0f766e;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .clinic-brand h1 {
      margin: 0 0 4px 0;
      color: #0f766e;
      font-size: 18px;
      font-weight: 800;
    }
    .clinic-brand p {
      margin: 0;
      font-size: 11px;
      color: #64748b;
    }
    .slip-badge {
      background: #f0fdfa;
      border: 1px solid #99f6e4;
      color: #0f766e;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 700;
      text-align: center;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 14px;
    }
    .info-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 12px;
      line-height: 1.7;
    }
    .info-title {
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 6px;
      border-bottom: 1px dashed #cbd5e1;
      padding-bottom: 4px;
      font-size: 12px;
    }
    .specs-box {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 14px;
      font-size: 12px;
      line-height: 1.8;
    }
    .specs-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-top: 6px;
    }
    .spec-item {
      background: #ffffff;
      border: 1px solid #d1fae5;
      border-radius: 6px;
      padding: 6px 8px;
      text-align: center;
    }
    .spec-item span {
      display: block;
      font-size: 10px;
      color: #64748b;
    }
    .spec-item strong {
      font-size: 12px;
      color: #065f46;
    }
    .courier-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 14px;
      font-size: 12px;
    }
    .signatures-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      margin-top: 24px;
      padding-top: 14px;
      border-top: 1px dashed #cbd5e1;
    }
    .sig-box {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px;
      height: 85px;
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      font-size: 11px;
      color: #475569;
    }
    .sig-line {
      border-bottom: 1px dotted #94a3b8;
      margin-top: auto;
    }
  `

  const bodyHtml = `
    <div class="manifest-card">
      <div class="header-row">
        <div class="clinic-brand">
          <h1>${escapeHtml(clinicName)}</h1>
          <p>${escapeHtml(clinicAddress)} · تلفن: ${escapeHtml(toPersianDigits(clinicPhone))}</p>
        </div>
        <div class="slip-badge">
          <div>حواله رسمی ارسال کار به لابراتوار</div>
          <div>شماره سفارش: ${escapeHtml(toPersianDigits(order.id.slice(-6).toUpperCase()))}</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="info-box">
          <div class="info-title">👤 مشخصات بیمار و پزشک</div>
          <div><strong>بیمار:</strong> ${escapeHtml(patientName)}</div>
          <div><strong>شماره پرونده:</strong> ${patient?.file_number ? escapeHtml(toPersianDigits(patient.file_number)) : '—'}</div>
          <div><strong>پزشک معالج:</strong> ${escapeHtml(doctorName)}</div>
        </div>

        <div class="info-box">
          <div class="info-title">🏢 مشخصات لابراتوار مقصد</div>
          <div><strong>نام لابراتوار:</strong> ${escapeHtml(labName)}</div>
          <div><strong>تلفن / رابط:</strong> ${escapeHtml(toPersianDigits(labPhone))}</div>
          <div><strong>موعد تحویل به مطب (Deadline):</strong> ${escapeHtml(deadlineDisplay)}</div>
        </div>
      </div>

      <div class="specs-box">
        <div class="info-title" style="color: #065f46; border-bottom-color: #a7f3d0;">🦷 مشخصات فنی پروتز و دستور ساخت</div>
        <div class="specs-grid">
          <div class="spec-item">
            <span>نوع کار</span>
            <strong>${escapeHtml(workTypeStr)}</strong>
          </div>
          <div class="spec-item">
            <span>موقعیت دندان</span>
            <strong>${escapeHtml(toothStr)} ${surfacesStr ? `(${escapeHtml(surfacesStr)})` : ''}</strong>
          </div>
          <div class="spec-item">
            <span>رنگ انتخابی VITA</span>
            <strong style="color: #d97706;">${escapeHtml(shadeStr)}</strong>
          </div>
          <div class="spec-item">
            <span>متریال سازه</span>
            <strong>${escapeHtml(materialStr)}</strong>
          </div>
        </div>

        ${order.notes ? `
          <div style="margin-top: 10px; background: #ffffff; border: 1px solid #d1fae5; border-radius: 6px; padding: 8px; font-size: 11px;">
            <strong>توضیحات اختصاصی پزشک به تکنسین:</strong> ${escapeHtml(order.notes)}
          </div>
        ` : ''}
      </div>

      <div class="courier-box">
        <div class="info-title" style="color: #92400e; border-bottom-color: #fde68a;">🛵 اطلاعات بارنامه، پیک و زمان‌بندی تردد</div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 6px;">
          <div><strong>نوع ارسال:</strong> ${escapeHtml(dispatchTypeLabel)}</div>
          <div><strong>نام پیک / متصدی:</strong> ${escapeHtml(courierName)}</div>
          <div><strong>تلفن پیک:</strong> ${escapeHtml(toPersianDigits(courierPhone))}</div>
          <div><strong>کد رهگیری / بارنامه:</strong> ${escapeHtml(toPersianDigits(trackingCode))}</div>
          <div><strong>تاریخ خروج از مطب:</strong> ${escapeHtml(dispatchDate)}</div>
          <div><strong>تاریخ تخمینی بازگشت:</strong> ${escapeHtml(returnDate)}</div>
        </div>
      </div>

      <div class="signatures-row">
        <div class="sig-box">
          <div>تحویل‌دهنده (دستیار کلینیک)</div>
          <div class="sig-line"></div>
          <div>امضا و تاریخ</div>
        </div>
        <div class="sig-box">
          <div>متصدی حمل / پیک</div>
          <div class="sig-line"></div>
          <div>امضا و ساعت تحویل</div>
        </div>
        <div class="sig-box">
          <div>تحویل‌گیرنده (لابراتوار)</div>
          <div class="sig-line"></div>
          <div>امضا و مهر لابراتوار</div>
        </div>
      </div>
    </div>
  `

  return buildPrintDocument({
    title: `حواله پیک لابراتوار - ${patientName} - ${toothStr}`,
    styles,
    bodyHtml,
    shareText: `حواله ارسال به لابراتوار: ${patientName} - ${workTypeStr} (${toothStr}) - پیک: ${courierName}`,
  })
}
