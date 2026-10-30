/**
 * Jalali Persian Date & Number Formatting Utilities
 * Fully dynamic system date integration via Intl.DateTimeFormat('fa-IR-u-ca-persian')
 * Zero hardcoding: Dynamically computes Persian year, month, day, weekday, and month lengths.
 */

export function toPersianDigits(n: number | string): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(n).replace(/[0-9]/g, (w) => persianDigits[+w]);
}

export function toEnglishDigits(str: string): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let res = String(str);
  persianDigits.forEach((p, idx) => {
    res = res.replace(new RegExp(p, 'g'), String(idx));
  });
  arabicDigits.forEach((a, idx) => {
    res = res.replace(new RegExp(a, 'g'), String(idx));
  });
  return res;
}

export function formatToman(amount: number): string {
  return toPersianDigits(Math.round(amount).toLocaleString('fa-IR')) + ' تومان';
}

export const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد',
  'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر',
  'دی', 'بهمن', 'اسفند'
] as const;

export const PERSIAN_WEEKDAYS = [
  'شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'
] as const;

export interface PersianDateInfo {
  year: number;
  month: number; // 1-12
  monthIndex: number; // 0-11
  day: number; // 1-31
  dayName: string;
  monthName: string;
  formatted: string; // e.g. "۱۴۰۵/۰۷/۳۰"
  formattedEn: string; // e.g. "1405/07/30"
}

/**
 * Mathematical algorithm to convert Gregorian date to Jalali date
 * Used as high-reliability dynamic fallback when Intl returns non-standard formats
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
  let jy = -1595 + (33 * Math.floor(days / 12053));
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return [jy, jm, jd];
}

/**
 * Checks if a Persian year is a leap year (30 days in Esfand)
 */
export function isPersianLeapYear(year: number): boolean {
  // Traditional 33-year leap cycle algorithm
  const rem = year % 33;
  return [1, 5, 9, 13, 17, 22, 26, 30].includes(rem);
}

/**
 * Return number of days in a given Persian month (1-indexed: 1 = Farvardin, 12 = Esfand)
 * Defaults dynamically to current Persian year.
 */
export function getDaysInPersianMonth(month: number, year?: number): number {
  const targetYear = year || getPersianDateParts().year;
  if (month >= 1 && month <= 6) {
    return 31;
  }
  if (month >= 7 && month <= 11) {
    return 30;
  }
  if (month === 12) {
    return isPersianLeapYear(targetYear) ? 30 : 29;
  }
  return 30;
}

/**
 * Extract Persian date parts dynamically using native Intl.DateTimeFormat('fa-IR-u-ca-persian')
 */
export function getPersianDateParts(date: Date = new Date()): PersianDateInfo {
  try {
    const formatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      weekday: 'long'
    });

    const parts = formatter.formatToParts(date);
    let yearStr = '';
    let monthStr = '';
    let dayStr = '';
    let weekdayStr = '';

    for (const part of parts) {
      if (part.type === 'year') {
        yearStr = toEnglishDigits(part.value).replace(/[^\d]/g, '');
      } else if (part.type === 'month') {
        monthStr = toEnglishDigits(part.value).replace(/[^\d]/g, '');
      } else if (part.type === 'day') {
        dayStr = toEnglishDigits(part.value).replace(/[^\d]/g, '');
      } else if (part.type === 'weekday') {
        weekdayStr = part.value.trim();
      }
    }

    if (!yearStr || !monthStr || !dayStr) {
      const [jy, jm, jd] = gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
      yearStr = String(jy);
      monthStr = String(jm);
      dayStr = String(jd);
    }

    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);
    const monthIndex = Math.max(0, Math.min(11, month - 1));
    const monthName = PERSIAN_MONTHS[monthIndex];

    const mmEn = String(month).padStart(2, '0');
    const ddEn = String(day).padStart(2, '0');
    const formattedEn = `${year}/${mmEn}/${ddEn}`;
    const formatted = toPersianDigits(formattedEn);

    return {
      year,
      month,
      monthIndex,
      day,
      dayName: weekdayStr || PERSIAN_WEEKDAYS[(date.getDay() + 1) % 7],
      monthName,
      formatted,
      formattedEn
    };
  } catch {
    // Dynamic mathematical fallback
    const [jy, jm, jd] = gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
    const monthIndex = Math.max(0, Math.min(11, jm - 1));
    const mmEn = String(jm).padStart(2, '0');
    const ddEn = String(jd).padStart(2, '0');
    const formattedEn = `${jy}/${mmEn}/${ddEn}`;
    return {
      year: jy,
      month: jm,
      monthIndex,
      day: jd,
      dayName: PERSIAN_WEEKDAYS[(date.getDay() + 1) % 7],
      monthName: PERSIAN_MONTHS[monthIndex],
      formatted: toPersianDigits(formattedEn),
      formattedEn
    };
  }
}

/**
 * Get formatted current Persian date string in Persian digits (e.g. "۱۴۰۵/۰۷/۳۰")
 */
export function getCurrentPersianDate(date?: Date): string {
  return getPersianDateParts(date || new Date()).formatted;
}

/**
 * Get formatted English digits Persian date string (e.g. "1405/07/30")
 */
export function getCurrentPersianDateEn(date?: Date): string {
  return getPersianDateParts(date || new Date()).formattedEn;
}

/**
 * Get current Persian day of week name (e.g. "پنج‌شنبه")
 */
export function getCurrentPersianDayName(date?: Date): string {
  return getPersianDateParts(date || new Date()).dayName;
}

/**
 * Get current Persian month name (e.g. "مهر" or "آبان")
 */
export function getCurrentPersianMonthName(date?: Date): string {
  return getPersianDateParts(date || new Date()).monthName;
}

/**
 * Get current Persian year as number
 */
export function getCurrentPersianYear(date?: Date): number {
  return getPersianDateParts(date || new Date()).year;
}

/**
 * Format any year, month, day into Persian date string "YYYY/MM/DD" with Persian digits
 */
export function formatPersianDateString(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return toPersianDigits(`${year}/${mm}/${dd}`);
}

/**
 * Format any year, month, day into English-digit Persian date string "YYYY/MM/DD"
 */
export function formatPersianDateStringEn(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}/${mm}/${dd}`;
}

/**
 * Format Persian date into full textual representation (e.g. "پنج‌شنبه، ۳۰ مهر ۱۴۰۵")
 */
export function formatPersianDateFull(date: Date = new Date()): string {
  const p = getPersianDateParts(date);
  return `${p.dayName}، ${toPersianDigits(p.day)} ${p.monthName} ${toPersianDigits(p.year)}`;
}

/**
 * Parse a Persian date string "YYYY/MM/DD" or "YYYY-MM-DD" into numeric parts
 */
export function parsePersianDate(dateStr: string): { year: number; month: number; day: number } {
  const en = toEnglishDigits(dateStr || '').trim();
  const parts = en.split(/[/-]/).map(p => parseInt(p, 10));
  if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return { year: parts[0], month: parts[1], day: parts[2] };
  }
  const cur = getPersianDateParts();
  return { year: cur.year, month: cur.month, day: cur.day };
}

/**
 * Get dynamic Persian date relative to today or given base date
 * e.g. offsetDays = 0 (today), 1 (tomorrow), -5 (5 days ago), 30 (next month), 90 (implant healing)
 */
export function getRelativePersianDate(offsetDays: number, baseDate: Date = new Date()): string {
  const target = new Date(baseDate.getTime() + offsetDays * 86400000);
  return getCurrentPersianDate(target);
}

/**
 * Add days to an existing Persian date string
 */
export function addDaysToPersianDate(persianDate: string, days: number): string {
  const parsed = parsePersianDate(persianDate);
  let { year, month, day } = parsed;
  day += days;
  while (day > getDaysInPersianMonth(month, year)) {
    day -= getDaysInPersianMonth(month, year);
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }
  while (day < 1) {
    month--;
    if (month < 1) {
      month = 12;
      year--;
    }
    day += getDaysInPersianMonth(month, year);
  }
  return formatPersianDateString(year, month, day);
}

/**
 * Add months to an existing Persian date string
 */
export function addMonthsToPersianDate(persianDate: string, months: number): string {
  const parsed = parsePersianDate(persianDate);
  let year = parsed.year;
  let month = parsed.month + months;
  while (month > 12) {
    month -= 12;
    year++;
  }
  while (month < 1) {
    month += 12;
    year--;
  }
  const maxDays = getDaysInPersianMonth(month, year);
  const day = Math.min(parsed.day, maxDays);
  return formatPersianDateString(year, month, day);
}

/**
 * Checks if two Persian dates represent the exact same day,
 * independent of whether they use Persian or English digits, or leading zeroes.
 */
export function isSamePersianDate(d1?: string | null, d2?: string | null): boolean {
  if (!d1 || !d2) return false;
  const c1 = toEnglishDigits(d1).trim().replace(/[^\d/]/g, '');
  const c2 = toEnglishDigits(d2).trim().replace(/[^\d/]/g, '');
  if (c1 === c2) return true;
  const p1 = c1.split('/');
  const p2 = c2.split('/');
  if (p1.length >= 3 && p2.length >= 3) {
    return (
      parseInt(p1[0], 10) === parseInt(p2[0], 10) &&
      parseInt(p1[1], 10) === parseInt(p2[1], 10) &&
      parseInt(p1[2], 10) === parseInt(p2[2], 10)
    );
  }
  return false;
}

/**
 * Checks if a given Persian date matches today's date
 */
export function isPersianDateToday(dateStr?: string | null): boolean {
  return isSamePersianDate(dateStr, getCurrentPersianDate());
}
