// @vitest-environment jsdom
/**
 * MOD-FEAT-033 | تست هندسه‌ی براکت کشیده‌شده
 *
 * گزارش مهدی: «کاملاً درست، ولی شکل بزرگ‌تر و عدد عین خود عکس شود.»
 *
 * نگاشت در MOD-DOC-008 درست شد و مهدی تأییدش کرد؛ شکل هنوز یک کاراکتر
 * ترسیم‌جعبه بود — گوشه‌ای کوچک که اندازه‌اش را فونت تعیین می‌کرد و
 * بازوهایش برای رقم کوتاه بود.
 *
 * حالا دو خط کشیده می‌شود. این تست‌ها **موقعیت خط‌ها** را می‌سنجند، نه
 * ظاهر را — چون همان چیزی است که معنی پالمر را می‌سازد.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { PalmerMark } from '../components/PalmerMark'

afterEach(cleanup)

/** [افقی، عمودی] از روی خط‌های رسم‌شده. */
function lines(container: HTMLElement) {
  const all = [...container.querySelectorAll('line')]
  const horizontal = all.find((l) => l.getAttribute('y1') === l.getAttribute('y2'))!
  const vertical = all.find((l) => l.getAttribute('x1') === l.getAttribute('x2'))!
  return {
    lineY: Number(horizontal.getAttribute('y1')),
    lineX: Number(vertical.getAttribute('x1')),
    height: Number(container.querySelector('svg')!.getAttribute('height')),
    width: Number(container.querySelector('svg')!.getAttribute('width')),
  }
}

describe('🔴 خط افقی، صفحه‌ی اکلوزال است', () => {
  it('برای دندان بالا، خط زیرِ رقم است', () => {
    const { container } = render(<PalmerMark fdi={11} size={20} />)
    const { lineY, height } = lines(container)
    expect(lineY).toBeGreaterThan(height / 2)
  })

  it('برای دندان پایین، خط رویِ رقم است', () => {
    const { container } = render(<PalmerMark fdi={41} size={20} />)
    const { lineY, height } = lines(container)
    expect(lineY).toBeLessThan(height / 2)
  })

  it('خط افقی تمام عرض را می‌گیرد، نه یک تیک کوتاه', () => {
    // بازوی کوتاه مثل علامت نگارشی خوانده می‌شود، نه براکت.
    const { container } = render(<PalmerMark fdi={11} size={20} />)
    const h = [...container.querySelectorAll('line')]
      .find((l) => l.getAttribute('y1') === l.getAttribute('y2'))!
    expect(Number(h.getAttribute('x1'))).toBe(0)
    expect(Number(h.getAttribute('x2'))).toBe(Number(container.querySelector('svg')!.getAttribute('width')))
  })
})

describe('🔴 خط عمودی، خط وسط دهان است', () => {
  it('برای ربع‌های راستِ بیمار، سمت راست است', () => {
    for (const fdi of [11, 18, 41, 48]) {
      cleanup()
      const { container } = render(<PalmerMark fdi={fdi} size={20} />)
      const { lineX, width } = lines(container)
      expect(lineX, String(fdi)).toBeGreaterThan(width / 2)
    }
  })

  it('برای ربع‌های چپِ بیمار، سمت چپ است', () => {
    for (const fdi of [21, 28, 31, 38]) {
      cleanup()
      const { container } = render(<PalmerMark fdi={fdi} size={20} />)
      const { lineX, width } = lines(container)
      expect(lineX, String(fdi)).toBeLessThan(width / 2)
    }
  })
})

describe('رقم', () => {
  it('فقط شماره‌ی پالمر است، بدون پیشوند ربع', () => {
    render(<PalmerMark fdi={38} size={20} />)
    expect(screen.getByText('۸')).toBeDefined()
  })

  it('دندان شیری حرف می‌گیرد', () => {
    render(<PalmerMark fdi={51} size={20} />)
    expect(screen.getByText('A')).toBeDefined()
  })

  it('اندازه‌پذیر است', () => {
    const { container } = render(<PalmerMark fdi={11} size={40} />)
    expect(Number(container.querySelector('svg')!.getAttribute('height'))).toBe(40)
  })
})

describe('دسترس‌پذیری و ورودی نامعتبر', () => {
  it('برچسب خوانا برای صفحه‌خوان دارد', () => {
    render(<PalmerMark fdi={11} size={20} />)
    expect(screen.getByRole('img', { name: 'دندان UR۱' })).toBeDefined()
  })

  it('مقدار غیر FDI همان‌طور که هست نشان داده می‌شود', () => {
    // براکت دور چیزی که دندان نیست، معنی ندارد.
    render(<PalmerMark fdi={'پل قدامی'} size={20} />)
    expect(screen.getByText('پل قدامی')).toBeDefined()
  })
})

/** قفل ساختاری: گلیف دندان دیگر کاراکتر تایپ‌شده نمی‌گذارد. */
import glyph from '../components/ToothGlyph.tsx?raw'

describe('🔴 گلیف دندان براکت را می‌کشد', () => {
  it('برچسب از خط ساخته می‌شود، نه از کاراکتر', () => {
    expect(glyph).toContain('PalmerLabel')
    expect(glyph).not.toContain('labelOverride')
  })
})
