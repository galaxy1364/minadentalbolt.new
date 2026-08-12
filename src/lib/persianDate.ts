// Jalali (Shamsi) date conversion utilities

export const persianMonths = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
]

export const persianWeekdays = [
  'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه',
]

export const persianWeekdaysShort = ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش']

function toJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
  let jy = gy <= 1600 ? 0 : 979
  gy -= gy <= 1600 ? 621 : 1600
  const gy2 = gm > 2 ? gy + 1 : gy
  let days = 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) - 80 + g_d_m[gm - 1] + gd - 1
  jy += 33 * Math.floor(days / 12053)
  days %= 12053
  jy += 4 * Math.floor(days / 1461)
  days %= 1461
  if (days > 365) {
    jy += Math.floor((days - 1) / 365)
    days = (days - 1) % 365
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30)
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30)
  return [jy, jm, jd]
}

function toGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  let gy = jy <= 979 ? 621 : 1600
  jy -= jy <= 979 ? 0 : 979
  let days = 365 * jy + Math.floor(jy / 33) * 8 + Math.floor((jy % 33 + 3) / 4) + 78 + jd + (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186)
  gy += 400 * Math.floor(days / 146097)
  days %= 146097
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524)
    days %= 36524
    if (days > 0) days++
  }
  gy += 4 * Math.floor(days / 1461)
  days %= 1461
  if (days > 365) {
    gy += Math.floor((days - 1) / 365)
    days = (days - 1) % 365
  }
  const sal_a = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  let leap = true
  let gm = 0
  for (gm = 0; gm < 13; gm++) {
    let v = sal_a[gm]
    if (gm === 2 && !leap) v = 28
    if (days < v) break
    days -= v
  }
  return [gy, gm, days + 1]
}

export function toJalaliString(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const [jy, jm, jd] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate())
  return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`
}

export function toJalaliStringPretty(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const [jy, jm, jd] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate())
  return `${jd} ${persianMonths[jm - 1]} ${jy}`
}

export function getJalaliMonthYear(dateStr: string): { year: number; month: number } {
  const d = new Date(dateStr)
  const [jy, jm] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate())
  return { year: jy, month: jm }
}

export function getJalaliDateInfo(dateStr: string): { year: number; month: number; day: number; weekday: number; monthName: string } {
  const d = new Date(dateStr)
  const [jy, jm, jd] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate())
  return { year: jy, month: jm, day: jd, weekday: d.getDay(), monthName: persianMonths[jm - 1] }
}

// ── Jalali leap year calculation ──────────────────────────
// Algorithm: a year is leap if (year mod 33) is in {1, 5, 9, 13, 17, 22, 26, 30}
export function isJalaliLeapYear(jy: number): boolean {
  const r = jy % 33
  return r === 1 || r === 5 || r === 9 || r === 13 || r === 17 || r === 22 || r === 26 || r === 30
}

export function getJalaliMonthGrid(year: number, month: number): (number | null)[][] {
  const [gy, gm, gd] = toGregorian(year, month, 1)
  const firstDay = new Date(gy, gm - 1, gd)
  const startWeekday = firstDay.getDay()
  const daysInMonth = month <= 6 ? 31 : month <= 11 ? 30 : (isJalaliLeapYear(year) ? 30 : 29)
  const grid: (number | null)[][] = []
  let currentDay = 1
  let week: (number | null)[] = []
  for (let i = 0; i < startWeekday; i++) week.push(null)
  while (currentDay <= daysInMonth) {
    week.push(currentDay)
    currentDay++
    if (week.length === 7) { grid.push(week); week = [] }
  }
  if (week.length > 0) { while (week.length < 7) week.push(null); grid.push(week) }
  return grid
}

// ── Iranian official holidays (Jalali) ─────────────────────
// Key: "MM-DD" (month-day in Jalali) for fixed holidays, "YYYY-MM-DD" for variable ones
export interface IranianHoliday {
  date: string // "MM-DD" or "YYYY-MM-DD"
  title: string
  isHoliday: boolean
}

// Fixed annual holidays (Jalali month-day)
const fixedHolidays: Record<string, string> = {
  '01-01': 'نوروز - روز اول',
  '01-02': 'نوروز - روز دوم',
  '01-03': 'نوروز - روز سوم',
  '01-04': 'نوروز - روز چهارم',
  '01-12': 'روز جمهوری اسلامی',
  '01-13': 'سیزده‌بدر',
  '03-14': 'رحلت امام خمینی',
  '03-15': 'قیام ۱۵ خرداد',
  '11-22': 'پیروزی انقلاب اسلامی',
  '12-29': 'پنجشنبه آخر سال - ملی شدن صنعت نفت',
}

// Variable solar Hijri holidays (approximate — based on official calendar)
// These are the religious holidays that shift each year
const variableHolidays: Record<string, string> = {
  '1403-02-11': 'شهادت حضرت فاطمه زهرا (س)',
  '1403-02-28': 'ولادت امام علی (ع) - روز پدر',
  '1403-03-06': 'مبعث پیامبر اکرم (ص)',
  '1403-03-25': 'شهادت امام جعفر صادق (ع)',
  '1403-06-03': 'شهادت امام علی (ع)',
  '1403-06-15': 'ولادت امام زمان (ع) - نیمه شعبان',
  '1403-07-13': 'شهادت امام حسین (ع) - تاسوعا',
  '1403-07-14': 'شهادت امام حسین (ع) - عاشورا',
  '1403-08-20': 'اربعین حسینی',
  '1403-09-28': 'شهادت پیامبر اکرم (ص) و شهادت امام حسن (ع)',
  '1403-09-29': 'شهادت امام رضا (ع)',
  '1403-10-09': 'ولادت پیامبر اکرم (ص) و امام صادق (ع)',
  '1403-12-18': 'ولادت امام علی (ع) - روز پدر',
  '1403-12-28': 'شهادت امام حسین (ع) - تاسوعا',
  '1403-12-29': 'شهادت امام حسین (ع) - عاشورا',
  '1404-02-11': 'شهادت حضرت فاطمه زهرا (س)',
  '1404-02-28': 'ولادت امام علی (ع) - روز پدر',
  '1404-03-06': 'مبعث پیامبر اکرم (ص)',
  '1404-03-25': 'شهادت امام جعفر صادق (ع)',
  '1404-06-03': 'شهادت امام علی (ع)',
  '1404-06-15': 'ولادت امام زمان (ع) - نیمه شعبان',
  '1404-07-13': 'شهادت امام حسین (ع) - تاسوعا',
  '1404-07-14': 'شهادت امام حسین (ع) - عاشورا',
  '1404-08-20': 'اربعین حسینی',
  '1404-09-28': 'شهادت پیامبر اکرم (ص) و شهادت امام حسن (ع)',
  '1404-09-29': 'شهادت امام رضا (ع)',
  '1404-10-09': 'ولادت پیامبر اکرم (ص) و امام صادق (ع)',
  '1405-02-11': 'شهادت حضرت فاطمه زهرا (س)',
  '1405-02-28': 'ولادت امام علی (ع) - روز پدر',
  '1405-03-06': 'مبعث پیامبر اکرم (ص)',
  '1405-03-25': 'شهادت امام جعفر صادق (ع)',
  '1405-06-03': 'شهادت امام علی (ع)',
  '1405-06-15': 'ولادت امام زمان (ع) - نیمه شعبان',
  '1405-07-13': 'شهادت امام حسین (ع) - تاسوعا',
  '1405-07-14': 'شهادت امام حسین (ع) - عاشورا',
  '1405-08-20': 'اربعین حسینی',
  '1405-09-28': 'شهادت پیامبر اکرم (ص) و شهادت امام حسن (ع)',
  '1405-09-29': 'شهادت امام رضا (ع)',
  '1405-10-09': 'ولادت پیامبر اکرم (ص) و امام صادق (ع)',
  '1406-02-11': 'شهادت حضرت فاطمه زهرا (س)',
  '1406-02-28': 'ولادت امام علی (ع) - روز پدر',
  '1406-03-06': 'مبعث پیامبر اکرم (ص)',
  '1406-03-25': 'شهادت امام جعفر صادق (ع)',
  '1406-06-03': 'شهادت امام علی (ع)',
  '1406-06-15': 'ولادت امام زمان (ع) - نیمه شعبان',
  '1406-07-13': 'شهادت امام حسین (ع) - تاسوعا',
  '1406-07-14': 'شهادت امام حسین (ع) - عاشورا',
  '1406-08-20': 'اربعین حسینی',
  '1406-09-28': 'شهادت پیامبر اکرم (ص) و شهادت امام حسن (ع)',
  '1406-09-29': 'شهادت امام رضا (ع)',
  '1406-10-09': 'ولادت پیامبر اکرم (ص) و امام صادق (ع)',
  '1407-02-11': 'شهادت حضرت فاطمه زهرا (س)',
  '1407-02-28': 'ولادت امام علی (ع) - روز پدر',
  '1407-03-06': 'مبعث پیامبر اکرم (ص)',
  '1407-03-25': 'شهادت امام جعفر صادق (ع)',
  '1407-06-03': 'شهادت امام علی (ع)',
  '1407-06-15': 'ولادت امام زمان (ع) - نیمه شعبان',
  '1407-07-13': 'شهادت امام حسین (ع) - تاسوعا',
  '1407-07-14': 'شهادت امام حسین (ع) - عاشورا',
  '1407-08-20': 'اربعین حسینی',
  '1407-09-28': 'شهادت پیامبر اکرم (ص) و شهادت امام حسن (ع)',
  '1407-09-29': 'شهادت امام رضا (ع)',
  '1407-10-09': 'ولادت پیامبر اکرم (ص) و امام صادق (ع)',
}

export function getHoliday(jalaliDateStr: string): string | null {
  // jalaliDateStr format: "YYYY/MM/DD" or "YYYY-MM-DD"
  const normalized = jalaliDateStr.replace('/', '-')
  const parts = normalized.split('-')
  if (parts.length < 3) return null
  const year = parts[0]
  const month = parts[1].padStart(2, '0')
  const day = parts[2].padStart(2, '0')
  const fixedKey = `${month}-${day}`
  const variableKey = `${year}-${month}-${day}`
  return variableHolidays[variableKey] || fixedHolidays[fixedKey] || null
}

export function isHoliday(jalaliDateStr: string): boolean {
  return getHoliday(jalaliDateStr) !== null
}

export function getGregorianHolidays(year: number, month: number): Map<string, string> {
  // Returns a map of gregorian date "YYYY-MM-DD" -> holiday title for a given Jalali month
  const result = new Map<string, string>()
  const grid = getJalaliMonthGrid(year, month)
  for (const week of grid) {
    for (const day of week) {
      if (day === null) continue
      const jalaliStr = `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`
      const holiday = getHoliday(jalaliStr)
      if (holiday) {
        const gregStr = jalaliToGregorian(year, month, day)
        result.set(gregStr, holiday)
      }
    }
  }
  return result
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): string {
  const [gy, gm, gd] = toGregorian(jy, jm, jd)
  return `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`
}

export function formatTime(timeStr: string): string {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h)
  const period = hour < 12 ? 'صبح' : 'بعدازظهر'
  const displayHour = hour <= 12 ? hour : hour - 12
  return `${displayHour}:${m} ${period}`
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '۰'
  return toPersianDigits(amount.toLocaleString('en-US'))
}

export function formatNumber(n: number): string {
  return toPersianDigits(n.toLocaleString('en-US'))
}

export function toPersianDigits(s: string | number): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
  return String(s).replace(/[0-9]/g, (d) => persianDigits[parseInt(d)])
}

export function getTodayJalali(): string {
  return toJalaliString(new Date().toISOString())
}
