/**
 * MOD-FEAT-040 | تست اقلام هزینه‌ی ایمپلنت
 *
 * فهرست مهدی: کشیدن، پودر استخوان، ممبران، سینوس لیفت، جراحی لثه، بازسازی
 * استخوان، بارگذاری فوری، جراحی فک — هر کدام با قیمت خودش. دستمزد جراح.
 * پروتزکار: دستمزد، تعداد روکش، پونتیک، نوع (PFM، زیرکونیا، IPS)، چسبی یا
 * پیچ‌شونده. «و بقیه‌ی اپشن‌ها.»
 *
 * شش بولی و دو ستون قیمت نمی‌توانستند قیمت، «بقیه»، یا اینکه دستمزد مال
 * کیست را حمل کنند.
 */
import { describe, it, expect } from 'vitest'
import {
  COST_KINDS, costKindMeta, lineTotal, itemsTotal, caseTotal, totalsByGroup,
  feesByDoctor, describeItem, suggestOpgDate,
} from './implantCosting'

const line = (over: Record<string, unknown> = {}) => ({
  kind: 'bone_graft', label: 'پیوند استخوان', variant: null, quantity: 1,
  unit_price: 2_000_000, doctor_id: null, is_active: true, ...over,
}) as never

describe('🔴 هر گزینه‌ای که مهدی گفت، یک نوع دارد', () => {
  it('گزینه‌های جراحی', () => {
    for (const k of ['extraction', 'bone_graft', 'membrane', 'sinus_lift', 'gum_surgery', 'gbr', 'immediate_loading', 'jaw_surgery']) {
      expect(costKindMeta(k).group, k).toBe('surgical')
    }
  })

  it('دستمزد جراح و پروتزکار', () => {
    expect(costKindMeta('surgeon_fee').group).toBe('fee')
    expect(costKindMeta('prosthodontist_fee').group).toBe('fee')
  })

  it('سه نوع روکش، هر سه با تعداد و نوع نگهداری', () => {
    for (const k of ['crown_pfm', 'crown_zirconia', 'crown_ips']) {
      const m = costKindMeta(k)
      expect(m.countable, k).toBe(true)
      expect(m.hasRetention, k).toBe(true)
    }
  })

  it('پونتیک تعداد دارد ولی نوع نگهداری نه', () => {
    expect(costKindMeta('pontic').countable).toBe(true)
    expect(costKindMeta('pontic').hasRetention).toBeFalsy()
  })

  it('🔴 «بقیه‌ی اپشن‌ها» رد نمی‌شود', () => {
    // نوعی که برنامه نمی‌شناسد همچنان یک ردیف معتبر است — حرف کلینیک ثبت
    // می‌شود، نه رد.
    const m = costKindMeta('laser_something')
    expect(m.kind).toBe('laser_something')
    expect(m.label).toBe('laser_something')
  })

  it('هیچ نوعی دوبار تعریف نشده', () => {
    const kinds = COST_KINDS.map((k) => k.kind)
    expect(new Set(kinds).size).toBe(kinds.length)
  })
})

describe('🔴 حساب، دقیق', () => {
  it('جمع سطر = تعداد × قیمت واحد', () => {
    expect(lineTotal(line({ quantity: 3, unit_price: 4_000_000 }))).toBe(12_000_000)
  })

  it('تعداد کمتر از یک، یک حساب می‌شود', () => {
    expect(lineTotal(line({ quantity: 0, unit_price: 1_000_000 }))).toBe(1_000_000)
  })

  it('قیمت منفی صفر می‌شود', () => {
    expect(lineTotal(line({ unit_price: -5 }))).toBe(0)
  })

  it('ردیف غیرفعال شمرده نمی‌شود', () => {
    expect(itemsTotal([line(), line({ is_active: false })])).toBe(2_000_000)
  })

  it('🔴 جمع مورد = قیمت فیکسچر + اقلام', () => {
    // total_cost روی مورد، قیمت خودِ ایمپلنت می‌ماند؛ اقلام دورش می‌نشینند.
    expect(caseTotal(15_000_000, [line(), line({ kind: 'surgeon_fee', unit_price: 5_000_000 })])).toBe(22_000_000)
  })

  it('تفکیک گروه', () => {
    const t = totalsByGroup([
      line({ kind: 'sinus_lift', unit_price: 3_000_000 }),
      line({ kind: 'surgeon_fee', unit_price: 5_000_000 }),
      line({ kind: 'crown_zirconia', quantity: 2, unit_price: 4_000_000 }),
    ])
    expect(t).toEqual({ surgical: 3_000_000, fee: 5_000_000, prosthetic: 8_000_000 })
  })
})

describe('🔴 دستمزد مال کیست', () => {
  it('فقط دستمزدها به پزشک نسبت داده می‌شوند', () => {
    // ممبران هزینه‌ی بیمار است، نه درآمد یک پزشک.
    const f = feesByDoctor([
      line({ kind: 'surgeon_fee', unit_price: 5_000_000, doctor_id: 'd1' }),
      line({ kind: 'prosthodontist_fee', unit_price: 3_000_000, doctor_id: 'd2' }),
      line({ kind: 'membrane', unit_price: 1_000_000, doctor_id: 'd1' }),
    ])
    expect(f).toEqual({ d1: 5_000_000, d2: 3_000_000 })
  })

  it('🔴 دستمزد بدون پزشک گم نمی‌شود', () => {
    // زیر «unassigned» می‌رود تا جمع همچنان بخواند، نه اینکه بی‌صدا حذف شود.
    const f = feesByDoctor([line({ kind: 'surgeon_fee', unit_price: 5_000_000 })])
    expect(f.unassigned).toBe(5_000_000)
  })
})

describe('توصیف یک سطر', () => {
  it('روکش با تعداد و نوع نگهداری', () => {
    expect(describeItem(line({ kind: 'crown_zirconia', label: 'روکش زیرکونیا', quantity: 2, variant: 'screw' })))
      .toBe('2 × روکش زیرکونیا (پیچ‌شونده)')
  })

  it('گزینه‌ی غیرقابل‌شمارش، تعداد نمی‌گیرد', () => {
    expect(describeItem(line({ kind: 'sinus_lift', label: 'سینوس لیفت', quantity: 2 }))).toBe('سینوس لیفت')
  })
})

describe('🔴 یادآوری OPG هم‌زمان با هیلینگ', () => {
  it('دو هفته پیش از پایان هیلینگ', () => {
    // «در مرحله ثبت تاریخ OPG همزمان با نوبت‌دهی هیلینگ باید یادآوری شود.»
    expect(suggestOpgDate('2026-12-01')).toBe('2026-11-17')
  })

  it('بدون پایان هیلینگ، پیشنهادی نیست', () => {
    expect(suggestOpgDate(null)).toBeNull()
    expect(suggestOpgDate('خراب')).toBeNull()
  })
})

/** قفل ساختاری: فرم و کارت از اقلام استفاده می‌کنند، نه از بولی‌ها. */
import implantsPage from '../pages/Implants.tsx?raw'

describe('🔴 اقلام جای بولی‌ها را گرفته‌اند', () => {
  it('ویرایشگر اقلام در فرم است', () => {
    expect(implantsPage).toContain('<ImplantCostItemsEditor')
  })

  it('اقلام با مورد ذخیره می‌شوند، در همان اقدام', () => {
    // پنجره‌ی پزشک یادمان داد دکمه‌ی ذخیره‌ی دوم چه می‌کند.
    expect(implantsPage).toContain('await persistCostItems(caseId)')
  })

  it('جمع کارت از اقلام است، بدون دوبار شمردن ستون‌های قدیمی', () => {
    expect(implantsPage).toContain('caseTotal(c.total_cost')
    expect(implantsPage).not.toContain('Number(c.bone_graft_cost || 0) + Number(c.sinus_lift_cost || 0)')
  })

  it('بولی‌های یتیم از فرم رفته‌اند', () => {
    // هیچ ورودی‌ای تنظیمشان نمی‌کرد؛ روی هر موردی که از برنامه ساخته
    // می‌شد همه false بودند.
    expect(implantsPage).not.toContain('bone_graft: caseForm.bone_graft')
    expect(implantsPage).not.toContain('{c.membrane_used && <Badge')
  })

  it('OPG هم‌زمان با هیلینگ پیشنهاد می‌شود', () => {
    expect(implantsPage).toContain('suggestOpgDate(end)')
  })
})
