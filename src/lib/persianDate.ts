import { toJalaali, toGregorian as jalaaliToGregorian, isLeapJalaaliYear } from 'jalaali-js'

// Jalali (Shamsi) date conversion utilities

export const persianMonths = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
]

export const persianWeekdays = [
  'شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه',
]

// Iranian week starts on شنبه (Saturday) and ends on جمعه (Friday) — in
// an RTL grid, array index 0 renders in the RIGHTMOST column, so شنبه
// must be first here for Friday to correctly land in the last (left)
// column, matching every real Iranian calendar.
export const persianWeekdaysShort = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']

// Converts a JS Date's native getDay() (0=Sunday...6=Saturday) to the
// Saturday-first index (0=Saturday...6=Friday) used everywhere in this
// app for weekday-column math and persianWeekdaysShort lookups —
// centralizing this in one place instead of each caller doing its own
// (previously inconsistent, sometimes wrong) getDay() math directly.
export function jsDateToPersianWeekday(date: Date): number {
  return (date.getDay() + 1) % 7
}

// Real, thoroughly-tested Gregorian<->Jalali conversion via jalaali-js
// (the standard, widely-used implementation of the correct algorithm)
// — the previous hand-rolled version here had a genuine, confirmed bug
// (off by a full day, and structurally wrong around Nowruz/leap-year
// boundaries), caught because a user's real device showed a different
// date than this app computed. Kept the same function names/signatures
// so every caller in this file needs zero changes.
function toJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const { jy, jm, jd } = toJalaali(gy, gm, gd)
  return [jy, jm, jd]
}

function toGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  const { gy, gm, gd } = jalaaliToGregorian(jy, jm, jd)
  return [gy, gm, gd]
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
  if (isNaN(d.getTime())) return getJalaliMonthYear(new Date().toISOString().slice(0, 10))
  const [jy, jm] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate())
  return { year: jy, month: jm }
}

export function getJalaliDateInfo(dateStr: string): { year: number; month: number; day: number; weekday: number; monthName: string } {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return getJalaliDateInfo(new Date().toISOString().slice(0, 10))
  const [jy, jm, jd] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate())
  return { year: jy, month: jm, day: jd, weekday: jsDateToPersianWeekday(d), monthName: persianMonths[jm - 1] }
}

// ── Jalali leap year calculation ──────────────────────────
// Algorithm: a year is leap if (year mod 33) is in {1, 5, 9, 13, 17, 22, 26, 30}
export function isJalaliLeapYear(jy: number): boolean {
  return isLeapJalaaliYear(jy)
}

export function getJalaliMonthGrid(year: number, month: number): (number | null)[][] {
  const [gy, gm, gd] = toGregorian(year, month, 1)
  const firstDay = new Date(gy, gm - 1, gd)
  const startWeekday = jsDateToPersianWeekday(firstDay)
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
  // Defensive guard: jalaali-js throws on non-finite input (e.g. NaN
  // year/month, which is exactly what produced a real corrupted
  // "N-0a-0N"-style date saved to a patient's treatment phase before
  // this file's toGregorian was replaced with jalaali-js). Falling
  // back to today instead of letting a malformed string reach a
  // Postgres `date` column (which silently gets stuck failing to sync
  // forever) or crashing the calendar outright.
  try {
    const [gy, gm, gd] = toGregorian(jy, jm, jd)
    if (!Number.isFinite(gy) || !Number.isFinite(gm) || !Number.isFinite(gd)) throw new Error('non-finite result')
    return `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
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
