/**
 * MOD-FIX-030 | آیکون باید همان کاری را بگوید که دکمه می‌کند
 *
 * قانون مطلق پروژه: هیچ حذف دائمی. `api.ts` صفر فراخوانی حذف دارد و هر
 * «حذف» در رابط کاربری در واقع `is_active: false` یا
 * `status: 'cancelled'` است.
 *
 * ولی ممیزی از دید کاربر نشان داد آیکون‌ها این را نمی‌گفتند: سطل زباله‌ی
 * قرمز روی ردیف ویزیت، درمان، نوبت، بیمار، پرسنل، انبار، بیمه، چک، طرح
 * قسطی و قالب پیامک — و در سه جا حتی **واژه‌ی** «حذف» زیرش نوشته بود.
 * MOD-UI-011 این کار را برای سه صفحه انجام داده بود و بقیه جا مانده
 * بودند؛ دقیقاً همان نیمه‌کاره ماندنی که این تست جلویش را می‌گیرد.
 *
 * `Trash2` فقط جایی مجاز است که چیزی **واقعاً** از بین می‌رود: یک قلم از
 * سبد موقتِ حافظه، یا پاک کردن گزارش خطای محلی.
 */
import { describe, it, expect } from 'vitest'

const pages = import.meta.glob('../pages/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

/** دکمه‌هایی که یک handler نرم را صدا می‌زنند. */
const SOFT_HANDLER = /(?:handleDelete\w*|onDelete)\(/

describe('🔴 سطل زباله فقط برای چیزی که واقعاً پاک می‌شود', () => {
  const offenders: string[] = []
  for (const [file, source] of Object.entries(pages)) {
    source.split('\n').forEach((line, i) => {
      if (!SOFT_HANDLER.test(line)) return
      if (!/\bTrash2\b/.test(line)) return
      offenders.push(`${file.replace('../pages/', '')}:${i + 1}`)
    })
  }

  it('هیچ دکمه‌ی غیرفعال‌سازی/لغو، آیکون سطل ندارد', () => {
    expect(offenders, `این دکمه‌ها کاری جز حذف می‌کنند ولی سطل نشان می‌دهند:\n${offenders.join('\n')}`).toEqual([])
  })

  it('هیچ دکمه‌ای واژه‌ی «حذف» را روی یک عمل نرم ننوشته', () => {
    const worded: string[] = []
    for (const [file, source] of Object.entries(pages)) {
      const lines = source.split('\n')
      lines.forEach((line, i) => {
        if (!SOFT_HANDLER.test(line)) return
        // The label may sit on the same line or in the two lines that
        // follow it inside the same <button>.
        const around = lines.slice(i, i + 4).join(' ')
        if (/>\s*حذف\s*<|aria-label={?`?حذف|aria-label="حذف/.test(around)) worded.push(`${file.replace('../pages/', '')}:${i + 1}`)
      })
    }
    expect(worded, `«حذف» روی دکمه‌ای که چیزی را حذف نمی‌کند:\n${worded.join('\n')}`).toEqual([])
  })
})
