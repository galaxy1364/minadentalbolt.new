/**
 * MOD-FEAT-023 | تست یکسانی نام دندان
 *
 * گزارش مهدی: «من دندون یک رو انتخاب می‌کنم ولی در بخش مالی می‌زنه
 * دندون یازده.» چارت پالمر بود، بقیه‌ی برنامه FDI.
 */
import { describe, it, expect } from 'vitest'
import { toothLabel, toothLabelWithWord, toothQuadrant, palmerSymbol } from './toothLabel'

describe('🔴 همان دندانی که در چارت زده شد، همه‌جا همان نام را دارد', () => {
  it('FDI ۱۱ همان UR۱ است، نه «۱۱»', () => {
    expect(toothLabel(11)).toBe('UR۱')
    expect(toothLabel(11)).not.toContain('11')
  })

  it('FDI ۳۸ همان LL۸ است، نه «۳۸»', () => {
    expect(toothLabel(38)).toBe('LL۸')
  })

  it('رشته و عدد یک نتیجه می‌دهند', () => {
    // پایگاه داده گاهی رشته می‌دهد، گاهی عدد.
    expect(toothLabel('11')).toBe(toothLabel(11))
    expect(toothLabel(' 38 ')).toBe(toothLabel(38))
  })
})

describe('چهار ربع درست تشخیص داده می‌شوند', () => {
  it('دائمی', () => {
    expect(toothQuadrant(18)).toBe('UR')
    expect(toothQuadrant(28)).toBe('UL')
    expect(toothQuadrant(38)).toBe('LL')
    expect(toothQuadrant(48)).toBe('LR')
  })

  it('شیری همان ترتیب را دارد', () => {
    expect(toothQuadrant(55)).toBe('UR')
    expect(toothQuadrant(65)).toBe('UL')
    expect(toothQuadrant(75)).toBe('LL')
    expect(toothQuadrant(85)).toBe('LR')
  })
})

describe('نماد پالمر', () => {
  it('دائمی عدد است', () => {
    expect(palmerSymbol(11)).toBe('1')
    expect(palmerSymbol(48)).toBe('8')
  })

  it('شیری حرف است', () => {
    expect(palmerSymbol(51)).toBe('A')
    expect(palmerSymbol(65)).toBe('E')
    expect(palmerSymbol(83)).toBe('C')
  })

  it('دندان شیری با حرف نمایش داده می‌شود، نه عدد', () => {
    expect(toothLabel(51)).toBe('URA')
    expect(toothLabel(75)).toBe('LLE')
  })
})

describe('🔴 هر دندان در کل دهان نام یکتا دارد', () => {
  it('۳۲ دندان دائمی، ۳۲ نام متفاوت', () => {
    const all: string[] = []
    for (const q of [10, 20, 30, 40]) {
      for (let n = 1; n <= 8; n++) all.push(toothLabel(q + n))
    }
    expect(new Set(all).size).toBe(32)
  })

  it('۲۰ دندان شیری هم یکتا هستند', () => {
    const all: string[] = []
    for (const q of [50, 60, 70, 80]) {
      for (let n = 1; n <= 5; n++) all.push(toothLabel(q + n))
    }
    expect(new Set(all).size).toBe(20)
  })

  it('چهار «۱» چارت از هم قابل تشخیص‌اند', () => {
    // شکایت قدیمی «چرا دو تا ۱؟» — پیشوند ربع همان را حل می‌کند.
    expect(new Set([toothLabel(11), toothLabel(21), toothLabel(31), toothLabel(41)]).size).toBe(4)
  })

  it('رقم‌ها فارسی‌اند، مثل بقیه‌ی اعداد برنامه', () => {
    expect(toothLabel(17)).toBe('UR۷')
    expect(toothLabel(17)).not.toMatch(/[0-9]/)
  })
})

describe('ورودی نامعتبر دستکاری نمی‌شود', () => {
  it('مقدار غیر FDI همان‌طور که هست برمی‌گردد', () => {
    // اگر کلینیک چیز غیرمعمولی تایپ کرده، باید همان را ببیند نه حدس ما.
    expect(toothLabel('پل قدامی')).toBe('پل قدامی')
    expect(toothLabel('99')).toBe('99')
    expect(toothLabel(9)).toBe('9')
  })

  it('خالی، خالی می‌ماند', () => {
    expect(toothLabel(null)).toBe('')
    expect(toothLabel(undefined)).toBe('')
    expect(toothLabel('')).toBe('')
  })

  it('نسخه‌ی کلمه‌دار برای خالی، جایگزین می‌گذارد', () => {
    expect(toothLabelWithWord(null)).toBe('—')
    expect(toothLabelWithWord(11)).toBe('دندان UR۱')
  })
})

/**
 * قفل ساختاری: هیچ صفحه‌ای نباید دوباره عدد خام FDI را به‌عنوان نام
 * دندان چاپ کند. این دقیقاً همان چیزی است که مهدی دید.
 */
import treatments from '../pages/Treatments.tsx?raw'
import billing from '../pages/Billing.tsx?raw'
import laboratory from '../pages/Laboratory.tsx?raw'
import implants from '../pages/Implants.tsx?raw'
import patientDetail from '../pages/PatientDetail.tsx?raw'
import dentalChart from '../components/DentalChart.tsx?raw'

describe('🔴 هیچ صفحه‌ای عدد خام دندان چاپ نمی‌کند', () => {
  const PAGES: [string, string][] = [
    ['Treatments', treatments], ['Billing', billing], ['Laboratory', laboratory],
    ['Implants', implants], ['PatientDetail', patientDetail], ['DentalChart', dentalChart],
  ]

  it('همه از برچسب مشترک استفاده می‌کنند', () => {
    for (const [name, src] of PAGES) {
      expect(src, `${name} از toothLabel استفاده نمی‌کند`).toMatch(/toothLabel|toothLabelWithWord/)
    }
  })

  it('الگوی «دندان {toPersianDigits(...)}» جایی نمانده', () => {
    for (const [name, src] of PAGES) {
      expect(src, name).not.toMatch(/دندان \{toPersianDigits\(/)
      expect(src, name).not.toMatch(/دندان \$\{toPersianDigits\(/)
    }
  })
})

/**
 * MOD-FIX-013 | سمت بیمار
 *
 * گزارش مهدی: «بالایی میشه بالا راست بیمار، پایینی میشه پایین چپ بیمار.»
 * او دندانی را زد که در چارت سمت چپِ صفحه بود و انتظار «راست بیمار» داشت؛
 * برنامه گفت UL. کل قوس آینه بود.
 */
import { toothSideLabel, toothFullLabel, toothQuadrantOf } from './toothLabel'
import { upperRow, lowerRow } from './palmerArch'
import archSource from '../components/ToothArchSelect.tsx?raw'
import chartSource from '../components/DentalChart.tsx?raw'

describe('🔴 راست و چپ همیشه مالِ بیمار است', () => {
  it('ربع بالا راست، «بالا راست بیمار» خوانده می‌شود', () => {
    expect(toothSideLabel(11)).toBe('بالا راست بیمار')
  })

  it('ربع بالا چپ', () => {
    expect(toothSideLabel(21)).toBe('بالا چپ بیمار')
  })

  it('ربع پایین چپ — همان که مهدی زد', () => {
    expect(toothSideLabel(31)).toBe('پایین چپ بیمار')
  })

  it('ربع پایین راست', () => {
    expect(toothSideLabel(41)).toBe('پایین راست بیمار')
  })

  it('کلمه‌ی «بیمار» همیشه هست — راست و چپ هرگز مالِ بیننده نیست', () => {
    for (const fdi of [18, 28, 38, 48]) {
      expect(toothSideLabel(fdi)).toContain('بیمار')
    }
  })

  it('برچسب کامل، کد و سمت را با هم می‌دهد', () => {
    expect(toothFullLabel(11)).toBe('UR۱ — بالا راست بیمار')
  })

  it('دندان شیری هم سمت دارد', () => {
    expect(toothSideLabel(51)).toBe('بالا راست بیمار')
    expect(toothSideLabel(71)).toBe('پایین چپ بیمار')
  })

  it('مقدار نامعتبر سمت جعلی نمی‌سازد', () => {
    expect(toothSideLabel('پل')).toBe('')
    expect(toothQuadrantOf(null)).toBeNull()
    expect(toothFullLabel('')).toBe('')
  })
})

describe('🔴 قوس آینه نمی‌شود', () => {
  it('ردیف بالا از راستِ بیمار شروع می‌شود و به چپِ بیمار می‌رسد', () => {
    // چارت طوری کشیده می‌شود که انگار روبه‌روی بیمار ایستاده‌ای، پس
    // راستِ بیمار در سمت چپِ صفحه است — همان قراردادی که رقیب هم دارد.
    const first = toothQuadrantOf(upperRow[0].fdi)
    const last = toothQuadrantOf(upperRow[upperRow.length - 1].fdi)
    expect(first).toBe('UR')
    expect(last).toBe('UL')
  })

  it('ردیف پایین هم همین‌طور', () => {
    expect(toothQuadrantOf(lowerRow[0].fdi)).toBe('LR')
    expect(toothQuadrantOf(lowerRow[lowerRow.length - 1].fdi)).toBe('LL')
  })

  it('ردیف‌های قوس با dir="ltr" رندر می‌شوند', () => {
    // بدون این، flex در پوسته‌ی RTL برنامه آیتم اول را سمت راست می‌گذارد
    // و کل دهان برعکس می‌شود — علت دقیق همان باگ.
    expect(archSource).toContain('dir="ltr"')
    expect(chartSource.match(/dir="ltr" className="flex items-center gap-1/g)?.length).toBe(4)
  })
})
