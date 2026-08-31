// @vitest-environment jsdom
/**
 * MOD-TEST-001 | اولین تست تعاملی واقعی
 *
 * تا امروز هر تستی در این پروژه منطق خالص را می‌سنجید. هیچ‌کدام کامپوننت
 * را رندر نمی‌کرد و روی چیزی کلیک نمی‌کرد — و دقیقاً به همین دلیل بود که
 * هر رفع UI در CHANGELOG با «تأیید بصری انجام نشده» تمام می‌شد.
 *
 * این فایل ثابت می‌کند بخشی از آن شکاف قابل بستن است: کامپوننت واقعاً در
 * jsdom رندر می‌شود، کلیک واقعی رخ می‌دهد، و نتیجه بررسی می‌شود.
 *
 * آنچه این روش می‌گیرد: ساختار، برچسب‌ها، رفتار کلیک، شرطی‌ها.
 * آنچه نمی‌گیرد: چیدمان، تداخل عناصر، رنگ، اسکرول، لمس روی صفحه‌ی واقعی.
 * jsdom چیزی را «نمایش» نمی‌دهد؛ فقط DOM را می‌سازد.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach } from 'vitest'
import { PalmerToothPicker } from '../components/PalmerToothPicker'

afterEach(cleanup)

describe('انتخابگر دندان پالمر — تعامل واقعی', () => {
  it('هر دو قوس دائمی رندر می‌شوند', () => {
    render(<PalmerToothPicker value="" onChange={() => {}} />)
    expect(screen.getByText('فک بالا')).toBeDefined()
    expect(screen.getByText('فک پایین')).toBeDefined()
  })

  it('🔴 کلیک روی یک دندان، شماره‌ی FDI درست را برمی‌گرداند', () => {
    const onChange = vi.fn()
    render(<PalmerToothPicker value="" onChange={onChange} />)
    // ⚠️ برچسب‌ها با رقم لاتین رندر می‌شوند، نه فارسی. این تست همان‌طور
    // که هست واقعیت را ثبت می‌کند؛ ناهماهنگی‌اش در CHANGELOG ثبت شد.
    const eights = screen.getAllByText('8')
    expect(eights.length).toBeGreaterThan(0)
    eights[0].click()
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(['18', '28', '38', '48']).toContain(onChange.mock.calls[0][0])
  })

  it('دندان انتخاب‌شده در DOM قابل تشخیص است', () => {
    const { container } = render(<PalmerToothPicker value="18" onChange={() => {}} />)
    const selected = container.querySelectorAll('.bg-primary-600, [class*="bg-primary-6"]')
    expect(selected.length).toBeGreaterThan(0)
  })

  it('🔴 خط وسط دقیقاً یکی است — همان باگ MOD-FIX-006 روی DOM واقعی', async () => {
    // تست منطقی قبلاً این را ثابت کرده بود؛ این بار روی خروجی رندرشده.
    const { container } = render(<PalmerToothPicker value="" onChange={() => {}} />)
    const dividers = container.querySelectorAll('.w-px')
    // یک خط برای فک بالا، یک خط برای فک پایین.
    expect(dividers.length).toBe(2)
  })

  it('🔴 در حالت دندان شیری هم خط وسط هست', async () => {
    const user = userEvent.setup()
    const { container } = render(<PalmerToothPicker value="" onChange={() => {}} />)
    await user.click(screen.getByText('دندان شیری'))
    expect(container.querySelectorAll('.w-px').length).toBe(2)
  })
})
