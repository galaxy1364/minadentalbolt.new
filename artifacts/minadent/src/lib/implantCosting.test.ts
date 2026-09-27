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

/**
 * MOD-FEAT-041 | از ایمپلنت به لابراتوار
 *
 * سه بار در «ریسک باقی‌مانده» نوشته شد: «ارسال به لابراتوار از ایمپلنت
 * هنوز سفارش نمی‌سازد». کارت می‌گفت اقدام بعدی چیست و راهی برای انجامش
 * نمی‌داد. فرم لابراتوار همه‌چیز را دوباره می‌پرسید — و تایپ دوباره همان
 * جایی است که روکش برای دندان اشتباه سفارش می‌شود.
 */
import { deriveLabOrderFromImplant } from './implantCosting'

const implant = (over: Record<string, unknown> = {}) => ({
  id: 'ic1', patient_id: 'p1', doctor_id: 'surgeon', prosthesis_doctor_id: 'prostho',
  tooth_number: '36', ...over,
}) as never

describe('🔴 سفارش از مورد مشتق می‌شود، نه دوباره تایپ', () => {
  it('بیمار و دندان از مورد', () => {
    const o = deriveLabOrderFromImplant(implant(), [])
    expect(o.patient_id).toBe('p1')
    expect(o.tooth_number).toBe('36')
  })

  it('🔴 پزشک سفارش، پروتزکار است نه جراح', () => {
    expect(deriveLabOrderFromImplant(implant(), []).doctor_id).toBe('prostho')
  })

  it('بدون پروتزکار، جراح — سفارش هرگز بی‌پزشک نیست', () => {
    expect(deriveLabOrderFromImplant(implant({ prosthesis_doctor_id: null }), []).doctor_id).toBe('surgeon')
  })
})

describe('🔴 جنس و تعداد از اقلام قیمت‌گذاری‌شده', () => {
  it('روکش زیرکونیا → جنس zirconia', () => {
    const o = deriveLabOrderFromImplant(implant(), [line({ kind: 'crown_zirconia', label: 'روکش زیرکونیا' })])
    expect(o.material).toBe('zirconia')
    expect(o.work_type).toBe('implant_crown')
  })

  it('روکش PFM → pfm · IPS → ips_emax', () => {
    expect(deriveLabOrderFromImplant(implant(), [line({ kind: 'crown_pfm' })]).material).toBe('pfm')
    expect(deriveLabOrderFromImplant(implant(), [line({ kind: 'crown_ips' })]).material).toBe('ips_emax')
  })

  it('🔴 بیش از یک واحد → پل', () => {
    const o = deriveLabOrderFromImplant(implant(), [
      line({ kind: 'crown_zirconia', label: 'روکش زیرکونیا', quantity: 2 }),
      line({ kind: 'pontic', label: 'پونتیک', quantity: 1 }),
    ])
    expect(o.work_type).toBe('bridge')
    expect(o.units).toBe(3)
  })

  it('یادداشت به لابراتوار می‌گوید چه چیزی و چند تا و چه نگهداری', () => {
    const o = deriveLabOrderFromImplant(implant(), [
      line({ kind: 'crown_zirconia', label: 'روکش زیرکونیا', quantity: 2, variant: 'screw' }),
      line({ kind: 'pontic', label: 'پونتیک', quantity: 1 }),
    ])
    expect(o.notes).toContain('2 × روکش زیرکونیا')
    expect(o.notes).toContain('1 × پونتیک')
    expect(o.notes).toContain('پیچ‌شونده')
  })

  it('بدون قلم قیمت‌گذاری‌شده، سفارش همچنان می‌رود', () => {
    // لابراتوار لازمش دارد؛ جنس پیش از ارسال قابل اصلاح است.
    const o = deriveLabOrderFromImplant(implant(), [])
    expect(o.work_type).toBe('implant_crown')
    expect(o.material).toBeNull()
    expect(o.units).toBe(1)
  })

  it('قلم غیرفعال در سفارش نیست', () => {
    const o = deriveLabOrderFromImplant(implant(), [line({ kind: 'crown_zirconia', is_active: false })])
    expect(o.material).toBeNull()
  })
})

describe('🔴 فرستنده گیرنده دارد — حلقه بسته است', () => {
  it('کارت ایمپلنت دکمه‌ی ارسال دارد', () => {
    expect(implantsPage).toContain('sendToLab(c)')
    expect(implantsPage).toContain('deriveLabOrderFromImplant(')
  })

  it('صفحه‌ی لابراتوار ورودی ایمپلنت را می‌خواند', async () => {
    const lab = (await import('../pages/Laboratory.tsx?raw')).default
    expect(lab).toContain('fromImplantCaseId')
    expect(lab).toContain('pendingImplantCaseId')
  })

  it('پس از ثبت سفارش، پیوند به مورد نوشته می‌شود', async () => {
    const lab = (await import('../pages/Laboratory.tsx?raw')).default
    expect(lab).toContain('lab_order_id: created.id')
  })

  it('کارت ایمپلنت وضعیت لابراتوار را نشان می‌دهد', () => {
    // «روکش کجاست» نباید دو ماژول لازم داشته باشد.
    expect(implantsPage).toContain('labOrders.find((o) => o.id === c.lab_order_id)')
  })
})

/**
 * MOD-FIX-022 | یک ویرایشگر، نه دو — و دکمه‌های رنگی
 *
 * v1.223 دو ویرایشگر هزینه روی یک فرم داشت: چیپ‌هایی که ستون JSON را
 * می‌نوشتند، و کرکره‌ای که جدول را. هر دو مال یک نویسنده در یک روز، دو
 * طرفِ یک بازنشانی حافظه، بی‌خبر از هم. مهدی هر دو را دید و گفت فرم
 * هوشمند نیست. حق داشت.
 */
describe('🔴 یک ویرایشگر اقلام هزینه', () => {
  it('بخش JSON‌محور حذف شده', () => {
    expect(implantsPage).not.toContain('اقدامات و هزینه‌های اضافی')
    expect(implantsPage).not.toContain('implantExtras')
    expect(implantsPage).not.toContain('extras:')
  })

  it('ویرایشگر باقی‌مانده چیپ‌ها را دارد', async () => {
    const editor = (await import('../components/ImplantCostItemsEditor.tsx?raw')).default
    expect(editor).toContain('aria-pressed={on}')
    expect(editor).toContain("toggle('other')")
  })

  // The JSON module itself is gone; TypeScript refuses to compile an
  // import of it, which is a stronger lock than any runtime check.
})

describe('🔴 هر گام یک دکمه‌ی رنگی است، نه برچسب', () => {
  it('اقدام بعدی با رنگ حلقه‌اش رندر می‌شود', () => {
    expect(implantsPage).toContain('advanceImplantStep(c, next.key)')
    expect(implantsPage).toContain('IMPLANT_MILESTONE_COLORS[next.key')
  })

  it('جراحی و قالب‌گیری به نوبت‌دهی می‌روند، نه اینکه زمان اختراع کنند', () => {
    expect(implantsPage).toContain("implantStep: step")
  })

  it('نوبت‌دهی گام ایمپلنت را می‌خواند و تاریخ را برمی‌گرداند', async () => {
    const appts = (await import('../pages/Appointments.tsx?raw')).default
    expect(appts).toContain('implantCaseId')
    expect(appts).toContain('surgery_date: wizardData.date')
    expect(appts).toContain('impression_date: wizardData.date')
  })
})
