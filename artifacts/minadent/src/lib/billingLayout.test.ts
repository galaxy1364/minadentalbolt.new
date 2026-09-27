/**
 * MOD-UI-012 | تست چیدمان صفحه‌ی مالی
 *
 * گزارش مهدی: «این دو تا نمودار رو می‌خوام حالت جمع‌شونده بگذاری… در حالت
 * عادی باید جمع باشه که ما اون نوار سرچ و چیپ و پرداختی‌ها رو اول ببینیم.»
 *
 * دو نمودار ۲۲۰ پیکسلی بالای نوار جستجو، تب‌ها و فهرست پرداخت‌ها نشسته
 * بودند — یعنی روی گوشی، کارِ روزانه‌ی این صفحه زیر خط دید شروع می‌شد.
 *
 * jsdom چیدمان را نمی‌سنجد، پس این تست ساختار را قفل می‌کند: نمودار پشت
 * یک شرط باشد، آن شرط پیش‌فرض بسته باشد، و ترتیب عناصر عوض نشود.
 */
import { describe, it, expect } from 'vitest'
import billing from '../pages/Billing.tsx?raw'

describe('🔴 نمودارها پیش‌فرض جمع‌اند', () => {
  it('حالت باز/بسته وجود دارد', () => {
    expect(billing).toContain('chartsOpen')
  })

  it('پیش‌فرض بسته است', () => {
    // useState(true) یعنی همان مشکل قبلی با یک دکمه‌ی اضافه.
    expect(billing).toContain('useState(false)')
    expect(billing).toMatch(/const \[chartsOpen, setChartsOpen\] = useState\(false\)/)
  })

  it('بدنه‌ی نمودار پشت شرط است، نه همیشه رندر', () => {
    expect(billing).toMatch(/\{chartsOpen && \(/)
  })

  it('دکمه‌ی باز و بسته کردن، وضعیتش را اعلام می‌کند', () => {
    // بدون aria-expanded، صفحه‌خوان نمی‌داند باز است یا بسته.
    expect(billing).toContain('aria-expanded={chartsOpen}')
  })
})

describe('ترتیب صفحه', () => {
  it('نمودارها پیش از تب‌ها و فهرست می‌آیند، ولی جمع‌شده', () => {
    const charts = billing.indexOf('{renderCharts()}')
    const tabs = billing.indexOf('<Tabs tabs={tabs}')
    expect(charts).toBeGreaterThan(-1)
    expect(tabs).toBeGreaterThan(-1)
    expect(charts).toBeLessThan(tabs)
  })

  it('هر دو نمودار هنوز وجود دارند — پنهان، نه حذف', () => {
    // نمودار واقعاً مفید است، فقط نه در هر بازدید.
    expect(billing).toContain('درآمد ۶ ماه اخیر')
    expect(billing).toContain('روش‌های پرداخت')
  })
})
