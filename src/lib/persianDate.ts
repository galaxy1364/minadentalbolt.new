import { getLunarHoliday } from './lunarHolidays'
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
//
// ⚠️ Found and fixed a real, serious bug here: the 1405 entries below
// used to repeat the exact same month/day across every year (1403
// through 1407) — but lunar Hijri holidays shift roughly 11 days
// earlier each solar year, so that pattern was mathematically
// guaranteed to be wrong for every year except at most one. Verified
// and corrected the full 1405 set against multiple current official
// Iranian calendar sources (rokna.net, motaharicalendar.com,
// beytoote.com, banichap.com) — Eid Ghorban, Ghadir Khom, Ashura,
// Arbaeen, Rehlat-e-Rasool, Imam Reza's martyrdom, etc. were all on
// the wrong month before this fix. Eid Fetr/Eid Ghorban/Ghadir were
// also completely MISSING from this table before, not just wrong.
//
// The 1403, 1404, 1406, and 1407 entries below still have the exact
// same unverified copy-pasted-forward pattern and are very likely
// wrong in the same way — flagged here rather than silently trusted.
// Only 1405 (the current year) has been verified and corrected.
const variableHolidays: Record<string, string> = {
  '1405-01-25': 'شهادت امام جعفر صادق (ع)',
  '1405-03-06': 'عید سعید قربان',
  '1405-03-14': 'عید سعید غدیر خم',
  '1405-04-04': 'عاشورای حسینی (تاسوعا/عاشورا)',
  '1405-05-13': 'اربعین حسینی',
  '1405-05-21': 'رحلت رسول اکرم (ص) و شهادت امام حسن مجتبی (ع)',
  '1405-05-22': 'شهادت امام رضا (ع)',
  '1405-05-30': 'شهادت امام حسن عسکری (ع)',
  '1405-06-08': 'میلاد پیامبر اکرم (ص) و امام جعفر صادق (ع)',
  '1405-08-22': 'شهادت حضرت فاطمه زهرا (س)',
  '1405-12-09': 'شهادت امام علی (ع)',
}

export function getHoliday(jalaliDateStr: string): string | null {
  // jalaliDateStr format: "YYYY/MM/DD" or "YYYY-MM-DD"
  // replaceAll, not replace: String.replace with a string pattern only
  // swaps the FIRST occurrence, so "1406/05/01" became "1406-05/01" and
  // the day parsed as "05/01" — meaning no lookup key ever matched and
  // getHoliday silently returned null for every slash-formatted date.
  // This was a pre-existing bug, not introduced here; it surfaced only
  // because an integration test scanned a full year instead of testing
  // the function with the dash format it happened to work with.
  const normalized = jalaliDateStr.replace(/\//g, '-')
  const parts = normalized.split('-')
  if (parts.length < 3) return null
  const year = parts[0]
  const month = parts[1].padStart(2, '0')
  const day = parts[2].padStart(2, '0')
  const fixedKey = `${month}-${day}`
  const variableKey = `${year}-${month}-${day}`

  const verified = variableHolidays[variableKey] || fixedHolidays[fixedKey]
  if (verified) return verified

  // MOD-DATA-001 — fall back to computing the lunar holiday from the
  // Hijri calendar for any year without hand-verified data.
  //
  // This replaced 51 hardcoded entries for 1403/1404/1406/1407 that
  // were copy-pasted forward from 1405 with identical month/day values.
  // Lunar holidays shift ~11 days earlier per solar year, so those were
  // mathematically guaranteed wrong — and this data is shown directly
  // in the appointments UI, meaning a wrong date books a patient on a
  // holiday or closes the clinic on a working day.
  //
  // Deleting wrong data rather than keeping it was deliberate: a
  // confidently-wrong holiday is worse than a computed approximation,
  // because staff trust it. Iran determines the lunar calendar by
  // moon sighting rather than calculation, so these computed dates can
  // differ from the official announcement by about a day — which is
  // why they're prefixed as approximate rather than presented as fact.
  try {
    const gregorian = jalaliToGregorian(Number(year), Number(month), Number(day))
    const computed = getLunarHoliday(gregorian)
    return computed ? `${computed} (تقریبی)` : null
  } catch {
    return null
  }
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

/** Reverse of toPersianDigits — normalizes Persian/Arabic-Indic digits typed
 * on a Persian keyboard back to plain ASCII digits, for validating or storing
 * user-entered numeric codes (e.g. sayad cheque IDs, national IDs). */
export function toEnglishDigits(s: string | number): string {
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹'
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩'
  return String(s).replace(/[۰-۹٠-٩]/g, (d) => {
    const pIdx = persianDigits.indexOf(d)
    if (pIdx !== -1) return String(pIdx)
    return String(arabicDigits.indexOf(d))
  })
}

export function getTodayJalali(): string {
  return toJalaliString(new Date().toISOString())
}

/** The correct way to get "today" as a plain YYYY-MM-DD string in the
 * user's LOCAL calendar day — NOT `new Date().toISOString().slice(0,10)`,
 * which silently returns YESTERDAY's date for roughly the first few
 * hours of each local day in any timezone ahead of UTC (Iran is
 * UTC+3:30, so this bug window was every day from midnight to ~3:30am
 * local time). That single-line pattern existed in ~50 places across
 * this codebase; this is the one correct replacement for the "today,
 * for local calendar/selection purposes" case. */
export function todayLocalISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
