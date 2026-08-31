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
