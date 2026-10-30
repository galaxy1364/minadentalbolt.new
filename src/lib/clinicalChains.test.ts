import { describe, it, expect } from 'vitest'
import { getChainedNextSteps } from './clinicalChains'
import type { Treatment, Procedure } from '../types'

describe('ADA CDT Procedure Chains (clinicalChains.ts)', () => {
  const mockProcedures: Procedure[] = [
    {
      id: 'proc-buildup',
      clinic_id: 'clinic-1',
      code: 'CDT-2950',
      name: 'بازسازی و بیلداپ کامپوزیت',
      category: 'ترمیم',
      default_price: 3_500_000,
      description: 'بیلداپ دندان',
      is_active: true,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      sync_version: 1,
    },
    {
      id: 'proc-crown',
      clinic_id: 'clinic-1',
      code: 'CDT-2740',
      name: 'روکش زیرکونیا تمام سرامیک',
      category: 'پروتز ثابت',
      default_price: 7_000_000,
      description: 'روکش زیبایی زیرکونیا',
      is_active: true,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      sync_version: 1,
    },
  ]

  it('عصب‌کشی (Endo) دندان: پیشنهاد بیلداپ، پست و روکش را برمی‌گرداند', () => {
    const endoTreatment = {
      id: 't-endo',
      procedure_name: 'عصب‌کشی ۳ کانال',
      tooth_number: '14',
      status: 'completed',
    } as Treatment

    const steps = getChainedNextSteps(endoTreatment, [], mockProcedures)
    expect(steps.length).toBeGreaterThanOrEqual(2)

    const titles = steps.map((s) => s.title)
    expect(titles).toContain('بازسازی تاج (Core Buildup)')
    expect(titles).toContain('روکش دندان (Crown)')

    // Check pre-filling from catalog
    const buildup = steps.find((s) => s.id === 'CHAIN-ENDO-BUILDUP')
    expect(buildup?.estimatedPrice).toBe(3_500_000)
    expect(buildup?.procedureCode).toBe('CDT-2950')
  })

  it('اگر بیلداپ قبلاً برای همان دندان انجام شده باشد، مجدداً پیشنهاد بیلداپ نمی‌دهد', () => {
    const endoTreatment = {
      id: 't-endo',
      procedure_name: 'عصب‌کشی',
      tooth_number: '14',
      status: 'completed',
    } as Treatment

    const history = [
      {
        id: 't-buildup',
        procedure_name: 'بیلداپ تاج',
        tooth_number: '14',
        status: 'completed',
      } as Treatment,
    ]

    const steps = getChainedNextSteps(endoTreatment, history, mockProcedures)
    const titles = steps.map((s) => s.title)
    expect(titles).not.toContain('بازسازی تاج (Core Buildup)')
    expect(titles).toContain('روکش دندان (Crown)')
  })

  it('بیلداپ تاج دندان: مستقیماً قالب‌گیری و روکش را پیشنهاد می‌دهد', () => {
    const buildupTreatment = {
      id: 't-buildup',
      procedure_name: 'بیلداپ کامپوزیت',
      tooth_number: '21',
      status: 'completed',
    } as Treatment

    const steps = getChainedNextSteps(buildupTreatment, [], mockProcedures)
    expect(steps.length).toBe(1)
    expect(steps[0].id).toBe('CHAIN-BUILDUP-CROWN')
    expect(steps[0].toothNumber).toBe('21')
    expect(steps[0].urgency).toBe('critical')
  })

  it('جراحی کاشت ایمپلنت: بستن هیلینگ اباتمنت و روکش ایمپلنت را پیشنهاد می‌دهد', () => {
    const implantSurgery = {
      id: 't-imp',
      procedure_name: 'جراحی کاشت ایمپلنت (فیکسچر)',
      tooth_number: '46',
      status: 'completed',
    } as Treatment

    const steps = getChainedNextSteps(implantSurgery, [], mockProcedures)
    const ids = steps.map((s) => s.id)
    expect(ids).toContain('CHAIN-IMPLANT-HEALING')
    expect(ids).toContain('CHAIN-IMPLANT-CROWN')
  })

  it('جرم‌گیری عمیق / درمان لثه: ارزیابی مجدد پریو را پیشنهاد می‌دهد', () => {
    const scaling = {
      id: 't-scaling',
      procedure_name: 'جرم‌گیری و بروساژ فک بالا و پایین',
      tooth_number: null,
      status: 'completed',
    } as Treatment

    const steps = getChainedNextSteps(scaling, [], mockProcedures)
    expect(steps.length).toBe(1)
    expect(steps[0].id).toBe('CHAIN-PERIO-REEVAL')
    expect(steps[0].procedureCategory).toBe('پریودنتیکس')
  })

  it('کشیدن دندان آسیاب معمولی: کاشت ایمپلنت جایگزین را پیشنهاد می‌دهد', () => {
    const ext = {
      id: 't-ext',
      procedure_name: 'کشیدن دندان با بی‌حسی',
      tooth_number: '36',
      status: 'completed',
    } as Treatment

    const steps = getChainedNextSteps(ext, [], mockProcedures)
    expect(steps.length).toBe(1)
    expect(steps[0].id).toBe('CHAIN-EXTRACTION-IMPLANT')
    expect(steps[0].toothNumber).toBe('36')
  })

  it('کشیدن دندان عقل (۱۸، ۲۸، ۳۸، ۴۸): نباید ایمپلنت جایگزین پیشنهاد دهد', () => {
    const wisdomExt = {
      id: 't-ext-wisdom',
      procedure_name: 'جراحی کشیدن دندان عقل نهفته',
      tooth_number: '38',
      status: 'completed',
    } as Treatment

    const steps = getChainedNextSteps(wisdomExt, [], mockProcedures)
    expect(steps.length).toBe(0)
  })
})
