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

/**
 * MOD-FEAT-033 (v1.211) | برچسب بزرگ‌تر، و فضای اختصاصی خودش
 *
 * «شکل بزرگ‌تر و عدد عین خود عکس شود.»
 *
 * برچسب پیش از این روی همان بومِ ۵۶ واحدی کشیده می‌شد و **روی ریشه‌ی
 * دندان** می‌افتاد — ایرادی که ماه‌ها در فهرست دیده‌نشده‌ها بود. بوم به
 * ۶۸ واحد رسید تا برچسب نوار خودش را داشته باشد، و همان تغییر جا برای
 * بزرگ‌تر شدنش باز کرد.
 */
import { ToothGlyph } from '../components/ToothGlyph'

describe('🔴 برچسب داخل گلیف، نوار اختصاصی دارد', () => {
  const glyphLines = (fdi: number) => {
    cleanup()
    const { container } = render(
      <ToothGlyph number={fdi} condition="healthy" surfaces={[]} size={40} />,
    )
    const all = [...container.querySelectorAll('line')].slice(-2)
    return {
      hy: Number(all[0].getAttribute('y1')),
      vx: Number(all[1].getAttribute('x1')),
      digitY: Number(container.querySelector('text')!.getAttribute('y')),
      viewBox: container.querySelector('svg')!.getAttribute('viewBox'),
    }
  }

  it('بوم بلندتر شد تا برچسب روی ریشه نیفتد', () => {
    expect(glyphLines(11).viewBox).toBe('0 0 48 68')
  })

  it('🔴 هیچ خطی از بوم بیرون نمی‌زند', () => {
    // خطی که روی لبه بیفتد بریده می‌شود و براکت ناقص دیده می‌شود.
    for (const fdi of [11, 21, 31, 41, 18, 28, 38, 48]) {
      const { hy, vx, digitY } = glyphLines(fdi)
      expect(hy, `${fdi} افقی`).toBeGreaterThan(0)
      expect(hy, `${fdi} افقی`).toBeLessThan(68)
      expect(vx, `${fdi} عمودی`).toBeGreaterThan(0)
      expect(vx, `${fdi} عمودی`).toBeLessThan(48)
      expect(digitY, `${fdi} رقم`).toBeLessThan(68)
    }
  })

  it('دندان بالا خطش پایین‌تر از دندان پایین است', () => {
    // چون خط، صفحه‌ی اکلوزال است: زیر بالایی‌ها، روی پایینی‌ها.
    expect(glyphLines(11).hy).toBeGreaterThan(glyphLines(41).hy)
  })

  it('رقم داخل گلیف دیده می‌شود', () => {
    cleanup()
    const { container } = render(
      <ToothGlyph number={38} condition="healthy" surfaces={[]} size={40} />,
    )
    expect(container.querySelector('text')!.textContent).toBe('۸')
  })
})
