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

  it('دندان انتخاب‌شده با کلمه هم اعلام می‌شود', () => {
    // روی قوسِ اسکرول‌شونده، دندان انتخابی ممکن است بیرون از دید باشد.
    render(<ToothArchSelect value="38" onChange={() => {}} />)
    expect(screen.getByText('انتخاب‌شده: LL۸')).toBeDefined()
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
