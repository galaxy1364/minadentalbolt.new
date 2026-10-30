/**
 * MOD-TEST-031 | آزمون‌های موتور پیش‌نیازهای بالینی دندانپزشکی
 */
import { describe, it, expect } from 'vitest'
import {
  evaluateClinicalPrerequisites,
  isEndoProcedure,
  isPostProcedure,
  isCrownProcedure,
  isImplantSurgery,
  isImplantProstho,
  isAestheticProcedure,
} from './clinicalPrerequisites'
import type { Treatment } from '../types'

const mkTreat = (
  name: string,
  tooth: string | null = '16',
  status: string = 'completed',
  id: string = 't1',
): Treatment => ({
  id,
  tooth_number: tooth,
  procedure_name: name,
  status,
  total_price: 1000,
  clinic_id: 'c1',
  patient_id: 'p1',
  encounter_id: 'e1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  sync_version: 1,
} as Treatment)

describe('تشخیص نوع رویه‌های بالینی', () => {
  it('کلمات کلیدی عصب‌کشی را به‌درستی تشخیص می‌دهد', () => {
    expect(isEndoProcedure('عصب‌کشی ۳ کانال')).toBe(true)
    expect(isEndoProcedure('پالپکتومی دندان شیری')).toBe(true)
    expect(isEndoProcedure('درمان ریشه تخصصی')).toBe(true)
    expect(isEndoProcedure('جرم‌گیری')).toBe(false)
  })

  it('کلمات کلیدی پست و کور را تشخیص می‌دهد', () => {
    expect(isPostProcedure('پست و کور ریختگی')).toBe(true)
    expect(isPostProcedure('فایبرپست و بیلداپ')).toBe(true)
    expect(isPostProcedure('ترمیم کامپوزیت')).toBe(false)
  })

  it('روکش معمولی و روکش ایمپلنت را تفکیک می‌کند', () => {
    expect(isCrownProcedure('روکش زیرکونیا')).toBe(true)
    expect(isCrownProcedure('روکش PFM دندان ۱۶')).toBe(true)
    expect(isCrownProcedure('روکش ایمپلنت زیرکونیا')).toBe(false)
    expect(isImplantProstho('روکش ایمپلنت پیچ شونده')).toBe(true)
    expect(isImplantSurgery('کاشت فیکسچر ایمپلنت')).toBe(true)
  })
})

describe('ارزیابی پیش‌نیازهای بالینی (Clinical Prerequisites)', () => {
  it('پست و کور بدون عصب‌کشی خطا می‌دهد', () => {
    const post = mkTreat('پست و کور', '16', 'planned', 't-post')
    const history: Treatment[] = []

    const evalRes = evaluateClinicalPrerequisites(post, history)
    expect(evalRes.allowed).toBe(false)
    expect(evalRes.severity).toBe('error')
    expect(evalRes.ruleId).toBe('PREREQ-POST-REQUIRES-ENDO')
  })

  it('پست و کور با عصب‌کشی ناتمام خطا می‌دهد', () => {
    const post = mkTreat('پست و کور', '16', 'planned', 't-post')
    const history: Treatment[] = [mkTreat('عصب‌کشی دندان', '16', 'in_progress', 't-endo')]

    const evalRes = evaluateClinicalPrerequisites(post, history)
    expect(evalRes.allowed).toBe(false)
    expect(evalRes.severity).toBe('error')
    expect(evalRes.message).toContain('هنوز تکمیل نشده است')
  })

  it('پست و کور با عصب‌کشی تکمیل‌شده مجاز است', () => {
    const post = mkTreat('پست و کور', '16', 'planned', 't-post')
    const history: Treatment[] = [mkTreat('عصب‌کشی دندان', '16', 'completed', 't-endo')]

    const evalRes = evaluateClinicalPrerequisites(post, history)
    expect(evalRes.allowed).toBe(true)
    expect(evalRes.severity).toBe('none')
  })

  it('روکش دندان در صورت وجود عصب‌کشی ناتمام مسدود می‌شود', () => {
    const crown = mkTreat('روکش زیرکونیا', '26', 'planned', 't-crown')
    const history: Treatment[] = [mkTreat('عصب‌کشی ۲۶', '26', 'planned', 't-endo')]

    const evalRes = evaluateClinicalPrerequisites(crown, history)
    expect(evalRes.allowed).toBe(false)
    expect(evalRes.severity).toBe('error')
    expect(evalRes.ruleId).toBe('PREREQ-CROWN-PENDING-ENDO')
  })

  it('روکش دندان عصب‌کشی‌شده بدون بیلداپ هشدار (Warning) دریافت می‌کند', () => {
    const crown = mkTreat('روکش تمام سرامیک', '26', 'planned', 't-crown')
    const history: Treatment[] = [mkTreat('عصب‌کشی ۲۶', '26', 'completed', 't-endo')]

    const evalRes = evaluateClinicalPrerequisites(crown, history)
    expect(evalRes.allowed).toBe(true)
    expect(evalRes.severity).toBe('warning')
    expect(evalRes.ruleId).toBe('PREREQ-CROWN-NEEDS-BUILDUP')
  })

  it('پروتز ایمپلنت بدون جراحی فیکسچر خطا می‌دهد', () => {
    const prostho = mkTreat('روکش ایمپلنت', '36', 'planned', 't-prostho')
    const history: Treatment[] = []

    const evalRes = evaluateClinicalPrerequisites(prostho, history)
    expect(evalRes.allowed).toBe(false)
    expect(evalRes.severity).toBe('error')
    expect(evalRes.ruleId).toBe('PREREQ-IMPLANT-PROSTHO-REQUIRES-SURGERY')
  })

  it('پروتز ایمپلنت پس از تکمیل جراحی کاشت فیکسچر مجاز است', () => {
    const prostho = mkTreat('روکش ایمپلنت', '36', 'planned', 't-prostho')
    const history: Treatment[] = [mkTreat('کاشت فیکسچر ایمپلنت', '36', 'completed', 't-implant')]

    const evalRes = evaluateClinicalPrerequisites(prostho, history)
    expect(evalRes.allowed).toBe(true)
    expect(evalRes.severity).toBe('none')
  })

  it('درمان با ثبت تأیید پزشک (Override) استثناء می‌پذیرد', () => {
    const post = {
      ...mkTreat('پست و کور', '16', 'planned', 't-post'),
      prerequisite_override: true,
      prerequisite_override_reason: 'عصب‌کشی قبلاً در مرکز دیگر انجام شده است',
    }
    const evalRes = evaluateClinicalPrerequisites(post, [])
    expect(evalRes.allowed).toBe(true)
    expect(evalRes.severity).toBe('info')
    expect(evalRes.ruleId).toBe('OVERRIDDEN')
  })
})
