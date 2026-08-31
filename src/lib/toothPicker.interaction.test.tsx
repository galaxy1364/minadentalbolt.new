// @vitest-environment jsdom
/**
 * MOD-FEAT-024 | تست تعاملی انتخابگر دندان
 *
 * این تست قبلاً روی `PalmerToothPicker` بود — یک ردیف دکمه‌ی عددی که
 * فقط در فرم‌ها استفاده می‌شد، در حالی که ویزیت دندان‌های تصویری چارت را
 * نشان می‌داد. دو زبان برای یک کار.
 *
 * حالا یک انتخابگر بیشتر وجود ندارد و همین‌جا تست می‌شود: رندر واقعی،
 * کلیک واقعی، بررسی DOM.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToothArchSelect } from '../components/ToothArchSelect'

afterEach(cleanup)

describe('انتخابگر دندان — تعامل واقعی', () => {
  it('هر دو فک رندر می‌شوند', () => {
    render(<ToothArchSelect value="" onChange={() => {}} />)
    expect(screen.getByText('فک بالا')).toBeDefined()
    expect(screen.getByText('فک پایین')).toBeDefined()
  })

  it('🔴 هر ۳۲ دندان دائمی قابل انتخاب‌اند', () => {
    render(<ToothArchSelect value="" onChange={() => {}} />)
    expect(screen.getAllByRole('button', { name: /^دندان (UR|UL|LL|LR)/ })).toHaveLength(32)
  })

  it('🔴 کلیک روی یک دندان، شماره‌ی FDI آن را برمی‌گرداند', () => {
    const onChange = vi.fn()
    render(<ToothArchSelect value="" onChange={onChange} />)
    screen.getByRole('button', { name: 'دندان LL۸' }).click()
    expect(onChange).toHaveBeenCalledWith('38')
  })

  it('🔴 برچسب‌ها پالمرند، نه FDI — همان چیزی که مهدی دید', () => {
    render(<ToothArchSelect value="" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'دندان UR۱' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'دندان ۱۱' })).toBeNull()
  })

  it('دندان انتخاب‌شده با کلمه و سمت اعلام می‌شود', () => {
    // روی قوسِ اسکرول‌شونده، دندان انتخابی ممکن است بیرون از دید باشد.
    render(<ToothArchSelect value="38" onChange={() => {}} />)
    expect(screen.getByText('انتخاب‌شده: LL۸ — پایین چپ بیمار')).toBeDefined()
  })

  it('🔴 ترتیب روی صفحه از راستِ بیمار به چپِ بیمار است', () => {
    // MOD-FIX-013: با dir="ltr" ترتیب DOM همان ترتیب دیداری است، پس
    // این تست واقعاً چیدمان را می‌سنجد نه فقط داده را.
    render(<ToothArchSelect value="" onChange={() => {}} />)
    const names = screen.getAllByRole('button', { name: /^دندان (UR|UL|LL|LR)/ })
      .map((b) => b.getAttribute('aria-label'))
    expect(names[0]).toBe('دندان UR۸')
    expect(names[15]).toBe('دندان UL۸')
    expect(names[16]).toBe('دندان LR۸')
    expect(names[31]).toBe('دندان LL۸')
  })

  it('🔴 هر دو نیمه با نام سمت بیمار برچسب خورده‌اند', () => {
    render(<ToothArchSelect value="" onChange={() => {}} />)
    expect(screen.getAllByText('راست بیمار')).toHaveLength(2)
    expect(screen.getAllByText('چپ بیمار')).toHaveLength(2)
  })

  it('بدون انتخاب، صریح می‌گوید چیزی انتخاب نشده', () => {
    render(<ToothArchSelect value="" onChange={() => {}} />)
    expect(screen.getByText('دندانی انتخاب نشده')).toBeDefined()
  })

  it('🔴 خط وسط دقیقاً یکی در هر فک است', () => {
    const { container } = render(<ToothArchSelect value="" onChange={() => {}} />)
    expect(container.querySelectorAll('.w-px').length).toBe(2)
  })

  it('🔴 حالت دندان شیری هم خط وسط دارد و ۲۰ دندان', async () => {
    const user = userEvent.setup()
    const { container } = render(<ToothArchSelect value="" onChange={() => {}} />)
    await user.click(screen.getByText('دندان شیری'))
    expect(container.querySelectorAll('.w-px').length).toBe(2)
    expect(screen.getAllByRole('button', { name: /^دندان (UR|UL|LL|LR)/ })).toHaveLength(20)
  })

  it('عوض کردن دائمی/شیری، انتخاب قبلی را پاک می‌کند', async () => {
    // دندان ۳۸ در قوس شیری وجود ندارد؛ نگه‌داشتنش یعنی ارجاع به چیزی
    // که روی صفحه نیست.
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<ToothArchSelect value="38" onChange={onChange} />)
    await user.click(screen.getByText('دندان شیری'))
    expect(onChange).toHaveBeenCalledWith('')
  })
})

/** قفل ساختاری: یک انتخابگر، همه‌جا. */
import treatments from '../pages/Treatments.tsx?raw'
import laboratory from '../pages/Laboratory.tsx?raw'
import implants from '../pages/Implants.tsx?raw'
import chart from '../components/DentalChart.tsx?raw'

describe('🔴 یک انتخابگر دندان در تمام برنامه', () => {
  const PAGES: [string, string][] = [
    ['Treatments', treatments], ['Laboratory', laboratory], ['Implants', implants],
  ]

  it('هر سه فرم از قوس مشترک استفاده می‌کنند', () => {
    for (const [name, src] of PAGES) {
      expect(src, name).toContain('ToothArchSelect')
    }
  })

  it('انتخابگر عددی جداگانه دیگر وجود ندارد', () => {
    for (const [name, src] of PAGES) {
      expect(src, `${name} هنوز PalmerToothPicker دارد`).not.toContain('<PalmerToothPicker')
    }
  })

  it('چارت و فرم‌ها یک تصویر دندان دارند', () => {
    expect(chart).toContain("from './ToothGlyph'")
  })
})

/**
 * MOD-FIX-012 | قوس دندان نباید در ستون باریک بنشیند
 *
 * گزارش مهدی روی فرم لابراتوار: «یه نصف صفحه واسه چارت گذاشته که اشتباهه
 * — چارت باید همون جای رنگ رو برداره و کلا بشه چارت مثل همون چارت اصلی.»
 *
 * قوس در `grid grid-cols-2` کنار فیلد «رنگ» بود و نصف عرض گوشی می‌گرفت؛
 * انتخاب یکی از شانزده دندان در آن عرض عملاً ممکن نبود. ایمپلنت هم همین
 * ایراد را داشت (کنار «تاریخ جراحی»).
 *
 * jsdom عرض واقعی را نمی‌سنجد، پس این تست به‌جای اندازه، **ساختار** را
 * قفل می‌کند: قوس نباید فرزند مستقیم یک ردیف چندستونی باشد.
 */
import laboratoryRaw from '../pages/Laboratory.tsx?raw'
import implantsRaw from '../pages/Implants.tsx?raw'
import treatmentsRaw from '../pages/Treatments.tsx?raw'

describe('🔴 قوس دندان تمام عرض می‌گیرد', () => {
  const PAGES: [string, string][] = [
    ['Laboratory', laboratoryRaw], ['Implants', implantsRaw], ['Treatments', treatmentsRaw],
  ]

  /** آیا خط قبلِ قوس، یک ردیف چندستونی باز کرده است؟ */
  function archInsideGrid(src: string): boolean {
    const lines = src.split('\n')
    return lines.some((line, i) => {
      if (!line.includes('<ToothArchSelect')) return false
      const before = lines.slice(Math.max(0, i - 2), i).join(' ')
      return /grid-cols-[2-9]/.test(before)
    })
  }

  it('در هیچ صفحه‌ای داخل ردیف چندستونی نیست', () => {
    for (const [name, src] of PAGES) {
      expect(archInsideGrid(src), `${name}: قوس در ستون باریک است`).toBe(false)
    }
  })

  it('فرم لابراتوار همچنان رنگ و جنس را دارد', () => {
    // جابه‌جایی نباید فیلدی را از قلم بیندازد.
    expect(laboratoryRaw).toContain('label="رنگ"')
    expect(laboratoryRaw).toContain('label="جنس"')
  })

  it('فرم ایمپلنت همچنان تاریخ جراحی را دارد', () => {
    expect(implantsRaw).toContain('label="تاریخ جراحی"')
  })
})
