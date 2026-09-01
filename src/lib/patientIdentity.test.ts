/**
 * MOD-FIX-017 | یک قانون برای هویت بیمار
 *
 * این تست‌ها از این آمدند که مسیر ویرایش بیمار، اعتبارسنجی مسیر ثبت را
 * نداشت: می‌شد بیماری ساخت که موبایل و کد ملی‌اش اجباری بود، بعد در
 * ویرایش هر دو را پاک کرد و ذخیره شد.
 */
import { describe, it, expect } from 'vitest'
import {
  validatePatientIdentity, findNationalIdDuplicate, duplicateNationalIdMessage,
  REQUIRED_IDENTITY_FIELDS, type PatientIdentityDraft,
} from './patientIdentity'
import type { Patient } from '../types'

const draft = (over: Partial<PatientIdentityDraft> = {}): PatientIdentityDraft => ({
  first_name: 'زهرا', last_name: 'کریمی', phone: '09121234567',
  national_id: '0079542118', phone2: '02133445566', ...over,
})

const patient = (over: Partial<Patient> = {}): Patient => ({
  id: 'p1', first_name: 'مریم', last_name: 'رضایی', national_id: '1111111111', ...over,
} as Patient)

describe('اعتبارسنجی هویت بیمار', () => {
  it('هویت کامل ایرادی ندارد', () => {
    expect(validatePatientIdentity(draft())).toBeNull()
  })

  it('هر پنج فیلد واقعاً مسدود می‌کنند — نه فقط هشدار', () => {
    // «فیلد اجباری که فقط هشدار می‌دهد» در ENGINEERING-STANDARD.md ممنوع است.
    for (const field of REQUIRED_IDENTITY_FIELDS) {
      expect(validatePatientIdentity(draft({ [field]: '' })), `${field} مسدود نکرد`).not.toBeNull()
      expect(validatePatientIdentity(draft({ [field]: '   ' })), `${field} با فاصله رد شد`).not.toBeNull()
    }
  })

  it('پیام موبایل می‌گوید چرا لازم است', () => {
    expect(validatePatientIdentity(draft({ phone: '' }))).toContain('یادآوری')
  })
})

describe('کد ملی تکراری', () => {
  const existing = [patient({ id: 'p1', national_id: '0079542118' })]

  it('پرونده‌ی دیگری با همین کد ملی پیدا می‌شود', () => {
    expect(findNationalIdDuplicate('0079542118', existing, 'p2')?.id).toBe('p1')
  })

  it('خودِ همان پرونده تکراری حساب نمی‌شود', () => {
    // وگرنه ویرایش هر بیماری بدون تغییر کد ملی مسدود می‌شد.
    expect(findNationalIdDuplicate('0079542118', existing, 'p1')).toBeNull()
  })

  it('کد ملی خالی تکراری نیست', () => {
    expect(findNationalIdDuplicate('', existing, 'p2')).toBeNull()
    expect(findNationalIdDuplicate('   ', existing, 'p2')).toBeNull()
  })

  it('فاصله‌ی اضافه جلوی تشخیص تکراری را نمی‌گیرد', () => {
    expect(findNationalIdDuplicate('  0079542118  ', existing, 'p2')?.id).toBe('p1')
  })

  it('پیام، نام صاحب پرونده‌ی قبلی را می‌گوید', () => {
    expect(duplicateNationalIdMessage(existing[0])).toContain('مریم رضایی')
  })
})
