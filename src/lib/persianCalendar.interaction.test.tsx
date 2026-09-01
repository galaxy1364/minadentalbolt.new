// @vitest-environment jsdom
/**
 * MOD-FIX-020 | تاریخی که از تقویم بیرون می‌آید باید تاریخ باشد
 *
 * دو رکورد واقعی در صف سینک گیر کردند و ۱۰ بار شکست خوردند:
 *
 *   ثبت سفارش لابراتوار · ثبت فاز درمان
 *   date/time field value out of range: "2-00-02"
 *
 * `"2-00-02"` تصادفی نیست. `jalaliToGregorian` یک **رشته‌ی** `"YYYY-MM-DD"`
 * برمی‌گرداند، ولی `PersianCalendar.getGregorianForDay` آن را مثل **آرایه**
 * باز می‌کرد:
 *
 *   const [gy, gm, gd] = jalaliToGregorian(...)   // '2', '0', '2'
 *   `${gy}-${String(gm).padStart(2,'0')}-...`     // "2-00-02"
 *
 * سه کاراکتر اولِ رشته. برای هر روزِ سالِ ۲۰۲۶ هم **یک** مقدار — پس هر
 * روزی که کاربر می‌زد، همین رشته بیرون می‌آمد.
 *
 * TypeScript ساکت ماند چون باز کردن یک `string` به `[a, b, c]` مجاز است
 * (رشته iterable است) و هر سه `string` می‌شوند؛ `String(gm).padStart()`
 * هم روی رشته کار می‌کند. هیچ نوعی نقض نشد.
 *
 * محافظ `isValidDate` در همان فایل وجود داشت ولی فقط **رندر** را می‌پایید
 * (کدام خانه انتخاب‌شده دیده شود). خروجی `onDateSelect` از کنارش رد می‌شد.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PersianCalendar } from '../components/PersianCalendar'
import { PersianDateInput } from '../components/PersianDateInput'
import { toJalaliString } from './persianDate'

afterEach(cleanup)

const ISO = /^\d{4}-\d{2}-\d{2}$/

describe('تقویم شمسی — تاریخِ بیرون‌آمده', () => {
  it('کلیک روی یک روز، تاریخ میلادی معتبر می‌دهد', async () => {
    const onDateSelect = vi.fn()
    render(<PersianCalendar selectedDate="2026-08-31" onDateSelect={onDateSelect} />)

    await userEvent.click(screen.getByText('۱۵'))

    expect(onDateSelect).toHaveBeenCalledTimes(1)
    const emitted = onDateSelect.mock.calls[0][0]
    expect(emitted, `تقویم رشته‌ی خراب داد: "${emitted}"`).toMatch(ISO)
  })

  it('روزهای مختلف، تاریخ‌های مختلف می‌دهند', async () => {
    // نشانه‌ی همان باگ: چون خروجی فقط به سه کاراکتر اولِ رشته وابسته بود،
    // پانزدهم و بیستم **دقیقاً یک مقدار** می‌دادند.
    const onDateSelect = vi.fn()
    render(<PersianCalendar selectedDate="2026-08-31" onDateSelect={onDateSelect} />)

    await userEvent.click(screen.getByText('۱۵'))
    await userEvent.click(screen.getByText('۲۰'))

    const [first] = onDateSelect.mock.calls[0]
    const [second] = onDateSelect.mock.calls[1]
    expect(first).not.toBe(second)
  })

  it('روزِ انتخاب‌شده همان روزی است که کلیک شد', async () => {
    const onDateSelect = vi.fn()
    render(<PersianCalendar selectedDate="2026-08-31" onDateSelect={onDateSelect} />)

    await userEvent.click(screen.getByText('۱۵'))

    // ۱۵ شهریور ۱۴۰۵ — برگشت به شمسی باید همان روز را بدهد.
    expect(toJalaliString(onDateSelect.mock.calls[0][0])).toBe('1405/06/15')
  })

  it('همه‌ی روزهای ماه تاریخ معتبر می‌دهند', async () => {
    // یک روز درست بودن کافی نیست: باگ قبلی برای **همه‌ی** روزها یکسان
    // خراب بود، پس تستِ تک‌روزه هم می‌توانست گولمان بزند.
    const onDateSelect = vi.fn()
    render(<PersianCalendar selectedDate="2026-08-31" onDateSelect={onDateSelect} />)

    for (const day of ['۱', '۹', '۱۷', '۲۵', '۳۱']) {
      const cell = screen.queryByText(day)
      if (cell) await userEvent.click(cell)
    }
    const emitted = onDateSelect.mock.calls.map((c) => c[0])
    expect(emitted.length).toBeGreaterThan(0)
    for (const d of emitted) expect(d, `"${d}" تاریخ معتبر نیست`).toMatch(ISO)
    expect(new Set(emitted).size, 'روزهای مختلف یک تاریخ دادند').toBe(emitted.length)
  })
})

describe('PersianDateInput — دروازه‌ی فرم‌ها', () => {
  it('فقط تاریخ معتبر را به فرم می‌دهد', async () => {
    // این کامپوننت ورودی تاریخِ لابراتوار، فاز درمان و هشت صفحه‌ی دیگر
    // است. هرچه از اینجا رد شود، مستقیم به ستون `date` پستگرس می‌رسد.
    const onChange = vi.fn()
    render(<PersianDateInput value="2026-08-31" onChange={onChange} />)

    await userEvent.click(screen.getByRole('button'))
    await userEvent.click(screen.getByText('۱۵'))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0]).toMatch(ISO)
  })
})
