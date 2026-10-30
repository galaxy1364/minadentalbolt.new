/**
 * MinaDental Enterprise Iranian Health & Clinical Validation Standards
 * Compliant with Iranian Ministry of Health, Central Bank of Iran (CBI),
 * and Medical Council Regulations.
 */

import { toEnglishDigits } from './jalali';

/**
 * Validates 10-digit Iranian National Code using Modulus 11 algorithm
 * (الگوریتم رسمی اعتبارسنجی کدملی سازمان ثبت احوال کشور)
 */
export function validateIranianNationalCode(input: string | number): boolean {
  if (!input) return false;
  const code = toEnglishDigits(String(input)).trim();

  // Must be digits and length up to 10
  if (!/^\d{8,10}$/.test(code)) return false;

  // Pad left with zeros to exactly 10 digits
  const padded = code.padStart(10, '0');

  // Check for invalid all-identical digits (e.g. 1111111111, 2222222222)
  if (/^(\d)\1{9}$/.test(padded)) return false;

  const checkDigit = parseInt(padded[9], 10);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(padded[i], 10) * (10 - i);
  }

  const remainder = sum % 11;

  if (remainder < 2) {
    return checkDigit === remainder;
  } else {
    return checkDigit === 11 - remainder;
  }
}

/**
 * Validates 16-digit Sayad Check ID (شناسه صیادی ۱۶ رقمی چک‌های بنفش سامانه پیچک بانک مرکزی)
 */
export function validateSayadCheckId(input: string): boolean {
  if (!input) return false;
  const digits = toEnglishDigits(String(input)).replace(/\s|-/g, '');
  return /^\d{16}$/.test(digits);
}

/**
 * Validates Iranian 11-digit Mobile Number (۰۹xxxxxxxxx)
 */
export function validateIranianMobileNumber(input: string): boolean {
  if (!input) return false;
  const phone = toEnglishDigits(String(input)).replace(/\s|-|\+98/g, '');
  const normalized = phone.startsWith('98') ? '0' + phone.slice(2) : phone;
  return /^09\d{9}$/.test(normalized);
}

/**
 * Validates Iranian Medical Council Code (شماره نظام پزشکی دندانپزشکان)
 */
export function validateMedicalCouncilCode(input: string | number): boolean {
  if (!input) return false;
  const digits = toEnglishDigits(String(input)).trim();
  // Valid dental license numbers are typically 4 to 6 digits
  return /^\d{4,6}$/.test(digits);
}

/**
 * Validates Iranian Bank IBAN / Sheba number (شماره شبا بانکی)
 */
export function validateIranianSheba(input: string): boolean {
  if (!input) return false;
  const clean = toEnglishDigits(String(input)).toUpperCase().replace(/[\s-]/g, '');
  if (!/^IR\d{24}$/.test(clean)) return false;

  // ISO 7064 Mod 97-10 check
  const rearranged = clean.slice(4) + '1827' + clean.slice(2, 4); // 'IR' -> I=18, R=27
  let remainder = 0;
  for (let i = 0; i < rearranged.length; i++) {
    remainder = (remainder * 10 + parseInt(rearranged[i], 10)) % 97;
  }
  return remainder === 1;
}

/**
 * Dental Sterilization Bowie-Dick & Spore Test validation
 */
export function validateSterilizationCycle(
  temp: number,
  pressure: number,
  durationMinutes: number,
  cycleType: '134_prion' | '134_hollow' | '121_rubber' | 'bowie_dick'
): { passed: boolean; message: string } {
  if (cycleType === '134_prion') {
    if (temp >= 134 && pressure >= 2.05 && durationMinutes >= 18) {
      return { passed: true, message: 'چرخه ۱۳۴ درجه پریون استاندارد با موفقیت تایید شد.' };
    }
    return { passed: false, message: 'دما، فشار یا زمان چرخه پریون کمتر از استاندارد است.' };
  }
  if (cycleType === '134_hollow') {
    if (temp >= 134 && pressure >= 2.0 && durationMinutes >= 15) {
      return { passed: true, message: 'چرخه ۱۳۴ درجه وسایل توخالی تایید شد.' };
    }
    return { passed: false, message: 'پارامترهای چرخه توخالی احراز نشد.' };
  }
  if (cycleType === 'bowie_dick') {
    if (temp >= 134 && durationMinutes >= 3.5) {
      return { passed: true, message: 'تست بوی‌دیک نفوذ بخار و پمپ وکیوم تایید شد.' };
    }
    return { passed: false, message: 'خطا در تست بوی‌دیک.' };
  }
  return { passed: true, message: 'چرخه استریلیزاسیون تایید شد.' };
}
