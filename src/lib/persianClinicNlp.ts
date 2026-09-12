import { toPersianDigits, formatCurrency, toJalaliStringPretty } from './persianDate'

export type ClinicAiIntentType =
  | 'create_appointment'
  | 'record_payment'
  | 'create_installment_plan'
  | 'record_treatment'
  | 'query_debt'
  | 'unknown'

export interface ParsedAiAction {
  intent: ClinicAiIntentType
  confidence: number
  title: string
  description: string
  details: { label: string; value: string }[]
  patientName?: string
  amount?: number
  toothNumber?: number
  date?: string // ISO format YYYY-MM-DD
  time?: string // HH:mm
  service?: string
  installmentsCount?: number
  downPayment?: number
  paymentMethod?: 'cash' | 'card' | 'transfer' | 'cheque'
  rawText: string
}

// ── Persian Digits & Words Normalization ──────────────────────
const PERSIAN_DIGITS_MAP: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
}

export function normalizePersianDigits(str: string): string {
  return str.replace(/[۰-۹٠-٩]/g, (w) => PERSIAN_DIGITS_MAP[w] || w)
}

const NUMBER_WORDS: Record<string, number> = {
  'یک': 1, 'یه': 1, 'دو': 2, 'سه': 3, 'چهار': 4, 'پنج': 5,
  'شش': 6, 'شیش': 6, 'هفت': 7, 'هشت': 8, 'نه': 9, 'ده': 10,
  'یازده': 11, 'دوازده': 12, 'سیزده': 13, 'چهارده': 14, 'پانزده': 15,
  'شانزده': 16, 'هفده': 17, 'هجده': 18, 'نوزده': 19, 'بیست': 20,
  'سی': 30, 'چهل': 40, 'پنجاه': 50, 'شصت': 60, 'هفتاد': 70,
  'هشتاد': 80, 'نود': 90, 'صد': 100, 'دویست': 200, 'سیصد': 300,
  'چهارصد': 400, 'پانصد': 500, 'ششصد': 600, 'هفتصد': 700,
  'هشتصد': 800, 'نهصد': 900,
}

/**
 * Parses Persian amounts like:
 * - "۳ میلیون" -> 3000000
 * - "۲ میلیون و ۵۰۰ هزار" -> 2500000
 * - "۵۰۰ هزار تومن" -> 500000
 * - "10,000,000" -> 10000000
 */
export function extractPersianAmount(text: string): number | null {
  const norm = normalizePersianDigits(text).replace(/,/g, '')

  // Check for exact numbers followed by million/thousand
  const millionMatch = norm.match(/(\d+(?:\.\d+)?)\s*(?:میلیون|میلیون\s*تومان|ملیون)/i)
  const thousandMatch = norm.match(/(\d+(?:\.\d+)?)\s*(?:هزار|هزار\s*تومان)/i)

  let total = 0
  let found = false

  if (millionMatch) {
    total += Math.round(parseFloat(millionMatch[1]) * 1_000_000)
    found = true
  }
  if (thousandMatch) {
    total += Math.round(parseFloat(thousandMatch[1]) * 1_000)
    found = true
  }

  if (found) return total

  // Check for raw large digits
  const rawNumMatch = norm.match(/(\d{4,10})\s*(?:تومان|تومن|ریال)?/)
  if (rawNumMatch) {
    let num = parseInt(rawNumMatch[1], 10)
    if (norm.includes('ریال')) num = Math.round(num / 10)
    return num
  }

  // Word-based numbers like "دو میلیون"
  for (const [word, val] of Object.entries(NUMBER_WORDS)) {
    if (norm.includes(`${word} میلیون`)) {
      total += val * 1_000_000
      found = true
    }
  }

  return found ? total : null
}

/**
 * Parses relative Persian dates:
 * - امروز
 * - فردا
 * - پس‌فردا
 */
export function extractPersianDate(text: string, referenceDate = new Date()): string {
  const norm = text.toLowerCase()
  const d = new Date(referenceDate)

  if (norm.includes('پس‌فردا') || norm.includes('پس فردا')) {
    d.setDate(d.getDate() + 2)
  } else if (norm.includes('فردا')) {
    d.setDate(d.getDate() + 1)
  } else {
    // defaults to today or leaves intact
  }

  return d.toISOString().slice(0, 10)
}

/**
 * Parses Persian time:
 * - ساعت ۵ عصر -> 17:00
 * - ساعت ۱۰ صبح -> 10:00
 * - ساعت ۱۸:۳۰ -> 18:30
 */
export function extractPersianTime(text: string): string {
  const norm = normalizePersianDigits(text)
  const timeMatch = norm.match(/(?:ساعت\s*)?(\d{1,2})(?::(\d{2}))?\s*(عصر|صبح|ظهر|شب)?/)

  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10)
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0
    const modifier = timeMatch[3]

    if ((modifier === 'عصر' || modifier === 'شب') && hours < 12) {
      hours += 12
    } else if (modifier === 'صبح' && hours === 12) {
      hours = 0
    } else if (!modifier && hours >= 1 && hours <= 8) {
      // In dental clinics, times 1 to 8 without modifier are almost always 13:00 to 20:00
      hours += 12
    }

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }

  return '17:00' // Clinic default evening hour
}

/**
 * Extracts patient name following patterns like:
 * - برای [نام بیمار] نوبت
 * - بیمار [نام بیمار]
 * - [نام بیمار] این‌قدر پرداخت کرد
 */
export function extractPatientName(text: string): string | undefined {
  const patterns = [
    /(?:برای|به نام|بیمار)\s+([آ-ی\s]{3,25}?)(?:\s+(?:نوبت|طرح|اقساط|پرداخت|دندان|روکش|ویزیت))/i,
    /^([آ-ی\s]{3,25}?)\s+(?:(?:\d+|[۰-۹]+)\s*(?:میلیون|هزار|تومان|تومن)?\s*)?(?:پرداخت|واریز|تسویه|نوبت|طرح|قسط)/i,
    /^([آ-ی\s]{3,25}?)\s+(?:[۰-۹\d]+)\s*(?:میلیون|هزار|تومان)/i,
    /(?:بیمار)\s+([آ-ی\s]{3,20})/i,
    /برای\s+([آ-ی\s]{3,20})/i,
  ]

  for (const pat of patterns) {
    const m = text.match(pat)
    if (m && m[1]) {
      const clean = m[1].trim()
      // ensure it's not a common stopword
      if (!['من', 'ما', 'شما', 'کلینیک', 'دکتر'].includes(clean)) {
        return clean
      }
    }
  }

  return undefined
}

/**
 * Extracts tooth number:
 * - دندان ۱۶ -> 16
 * - دندان شماره ۴۶ -> 46
 */
export function extractToothNumber(text: string): number | undefined {
  const norm = normalizePersianDigits(text)
  const m = norm.match(/(?:دندان|شماره|پلاک)\s*(?:شماره\s*)?(\d{1,2})/i)
  if (m && m[1]) {
    const num = parseInt(m[1], 10)
    if (num >= 11 && num <= 48) return num
  }
  return undefined
}

/**
 * Main NLP Classifier and intent parser for conversational Persian clinic commands.
 */
export function parseClinicCommand(rawInput: string): ParsedAiAction {
  const text = rawInput.trim()
  const norm = normalizePersianDigits(text).toLowerCase()

  // 1. Check Appointment Intent
  if (
    norm.includes('نوبت') ||
    norm.includes('وقت') ||
    norm.includes('رزرو') ||
    norm.includes('ویزیت')
  ) {
    const patientName = extractPatientName(text) || 'بیمار جدید'
    const date = extractPersianDate(text)
    const time = extractPersianTime(text)
    const tooth = extractToothNumber(text)

    let service = 'ویزیت و معاینه'
    if (norm.includes('عصب‌کشی') || norm.includes('عصب کشی')) service = 'عصب‌کشی (اندو)'
    else if (norm.includes('جرم‌گیری') || norm.includes('بروساژ')) service = 'جرم‌گیری و بروساژ'
    else if (norm.includes('ایمپلنت')) service = 'جراحی ایمپلنت'
    else if (norm.includes('روکش')) service = 'تحویل روکش دندان'
    else if (norm.includes('پر کردن') || norm.includes('ترمیم')) service = 'ترمیم کامپوزیت'
    else if (norm.includes('کشیدن')) service = 'کشیدن دندان'

    return {
      intent: 'create_appointment',
      confidence: 0.95,
      title: `ثبت نوبت جدید برای ${patientName}`,
      description: `رزرو نوبت ${service} در تاریخ ${toJalaliStringPretty(date)} ساعت ${toPersianDigits(time)}`,
      patientName,
      date,
      time,
      service,
      toothNumber: tooth,
      details: [
        { label: 'نام بیمار', value: patientName },
        { label: 'تاریخ نوبت', value: toJalaliStringPretty(date) },
        { label: 'ساعت', value: toPersianDigits(time) },
        { label: 'نوع خدمت', value: service },
        ...(tooth ? [{ label: 'شماره دندان', value: toPersianDigits(tooth) }] : []),
      ],
      rawText: text,
    }
  }

  // 2. Check Installment Plan Intent
  if (
    norm.includes('قسط') ||
    norm.includes('اقساط') ||
    norm.includes('قسط‌بندی') ||
    norm.includes('طرح اقساط')
  ) {
    const patientName = extractPatientName(text) || 'بیمار'
    const amount = extractPersianAmount(text) || 10_000_000

    // extract count of installments
    const countMatch = norm.match(/(?:در|طی)?\s*(\d+)\s*قسط/)
    let installmentsCount = 4
    if (countMatch) {
      installmentsCount = parseInt(countMatch[1], 10)
    }

    // downpayment
    let downPayment = 0
    if (norm.includes('پیش‌پرداخت') || norm.includes('پیش پرداخت')) {
      const downText = text.split(/پیش‌پرداخت|پیش پرداخت/)[1]
      if (downText) {
        downPayment = extractPersianAmount(downText) || 0
      }
    }

    return {
      intent: 'create_installment_plan',
      confidence: 0.92,
      title: `طرح اقساط برای ${patientName}`,
      description: `ایجاد طرح اقساط ${toPersianDigits(installmentsCount)} ماهه به مبلغ کل ${formatCurrency(amount)} تومان`,
      patientName,
      amount,
      installmentsCount,
      downPayment,
      details: [
        { label: 'نام بیمار', value: patientName },
        { label: 'مبلغ کل طرح', value: `${formatCurrency(amount)} تومان` },
        { label: 'تعداد اقساط', value: `${toPersianDigits(installmentsCount)} قسط ماهانه` },
        { label: 'پیش‌پرداخت', value: `${formatCurrency(downPayment)} تومان` },
        {
          label: 'مبلغ هر قسط',
          value: `${formatCurrency(Math.round((amount - downPayment) / installmentsCount))} تومان`,
        },
      ],
      rawText: text,
    }
  }

  // 3. Check Payment Intent
  if (
    norm.includes('پرداخت') ||
    norm.includes('واریز') ||
    norm.includes('تسویه') ||
    norm.includes('کارتخوان') ||
    norm.includes('کارت کشید')
  ) {
    const patientName = extractPatientName(text) || 'بیمار'
    const amount = extractPersianAmount(text) || 1_000_000

    let paymentMethod: 'cash' | 'card' | 'transfer' | 'cheque' = 'card'
    if (norm.includes('نقد') || norm.includes('اسکناس')) paymentMethod = 'cash'
    else if (norm.includes('کارتخوان') || norm.includes('پوز') || norm.includes('کارت')) paymentMethod = 'card'
    else if (norm.includes('واریز') || norm.includes('شبا') || norm.includes('کارت به کارت')) paymentMethod = 'transfer'
    else if (norm.includes('چک')) paymentMethod = 'cheque'

    const methodLabels: Record<string, string> = {
      card: 'کارتخوان (POS)',
      cash: 'نقدی',
      transfer: 'واریز به حساب / کارت‌به‌کارت',
      cheque: 'چک صیادی',
    }

    return {
      intent: 'record_payment',
      confidence: 0.94,
      title: `ثبت دریافتی از ${patientName}`,
      description: `ثبت پرداخت به مبلغ ${formatCurrency(amount)} تومان از طریق ${methodLabels[paymentMethod]}`,
      patientName,
      amount,
      paymentMethod,
      details: [
        { label: 'نام بیمار', value: patientName },
        { label: 'مبلغ پرداختی', value: `${formatCurrency(amount)} تومان` },
        { label: 'روش پرداخت', value: methodLabels[paymentMethod] },
        { label: 'تاریخ ثبت', value: toJalaliStringPretty(new Date().toISOString()) },
      ],
      rawText: text,
    }
  }

  // 4. Check Treatment Recording Intent
  if (
    norm.includes('روکش') ||
    norm.includes('عصب‌کشی') ||
    norm.includes('عصب کشی') ||
    norm.includes('ترمیم') ||
    norm.includes('ایمپلنت') ||
    norm.includes('دندان')
  ) {
    const patientName = extractPatientName(text) || 'بیمار'
    const tooth = extractToothNumber(text) || 16
    let service = 'درمان دندانپزشکی'

    if (norm.includes('روکش زیرکونیا')) service = 'روکش تمام سرامیک زیرکونیا'
    else if (norm.includes('روکش')) service = 'روکش PFM'
    else if (norm.includes('عصب‌کشی') || norm.includes('عصب کشی')) service = 'عصب‌کشی تخصصی'
    else if (norm.includes('ایمپلنت')) service = 'کاشت فیکسچر ایمپلنت'
    else if (norm.includes('ترمیم')) service = 'ترمیم کامپوزیت زیبایی'

    return {
      intent: 'record_treatment',
      confidence: 0.88,
      title: `ثبت طرح درمان برای ${patientName}`,
      description: `ثبت ${service} برای دندان شماره ${toPersianDigits(tooth)} در پرونده بیمار`,
      patientName,
      toothNumber: tooth,
      service,
      details: [
        { label: 'نام بیمار', value: patientName },
        { label: 'شماره دندان (FDI)', value: toPersianDigits(tooth) },
        { label: 'عنوان درمان', value: service },
        { label: 'وضعیت', value: 'در حال انجام / ثبت اولیه' },
      ],
      rawText: text,
    }
  }

  return {
    intent: 'unknown',
    confidence: 0.2,
    title: 'دستور نامشخص',
    description: 'لطفاً دستور خود را با نام بیمار، خدمت دندانپزشکی یا مبلغ مشخص بیان کنید.',
    details: [{ label: 'متن دریافتی', value: text }],
    rawText: text,
  }
}
