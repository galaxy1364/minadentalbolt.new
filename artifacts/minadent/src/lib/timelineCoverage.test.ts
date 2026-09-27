/**
 * MOD-FEAT-019 | تست پوشش تایم‌لاین بیمار
 *
 * باگ واقعی: `addTimelineEntry` دقیقاً **یک** فراخوان داشت — ثبت بیمار.
 * پس تایم‌لاین هر بیمار یک خط داشت و بعد از آن تا ابد خالی می‌ماند.
 * نوبت، ویزیت، درمان، سفارش لابراتوار و ایمپلنت هیچ‌کدام رد پایی
 * نمی‌گذاشتند — روی همان صفحه‌ای که قرار است تاریخچه‌ی بیمار باشد.
 *
 * این تست از جنس سطح-سورس است (مثل `recordSafety` و `actionLabels`):
 * رفتار واقعی نیاز به IndexedDB دارد، ولی چیزی که **می‌تواند برگردد**
 * این است که یک نوع رویداد نوشته شود و صفحه‌ی تایم‌لاین نشناسدش، یا
 * قلاب یک رکورد حیاتی برداشته شود.
 */
import { describe, it, expect } from 'vitest'
import api from './api.ts?raw'
import patientDetail from '../pages/PatientDetail.tsx?raw'

/** رکوردهایی که نبودشان روی تایم‌لاین یعنی پرونده ناقص است. */
const REQUIRED_EVENTS = [
  'patient_created',
  'appointment_created',
  'encounter_created',
  'treatment_created',
  'lab_order_created',
  'implant_case_created',
]

/** نوع رویدادهایی که api.ts واقعاً می‌نویسد. */
function writtenEventTypes(): string[] {
  const fromHooks = [...api.matchAll(/logToTimeline\(\s*[^,]+,\s*'([^']+)'/g)].map((m) => m[1])
  const direct = [...api.matchAll(/addTimelineEntry\([^,]+,\s*'([^']+)'/g)].map((m) => m[1])
  return [...new Set([...fromHooks, ...direct])]
}

/** کلیدهای نقشه‌ی آیکون در صفحه‌ی بیمار. */
function renderableEventTypes(): string[] {
  const block = /const timelineIcons: Record<string, React\.ReactNode> = \{([\s\S]*?)\n\}/.exec(patientDetail)
  if (!block) return []
  return [...block[1].matchAll(/^\s{2}([a-z_]+):/gm)].map((m) => m[1])
}

describe('رویدادهای حیاتی روی تایم‌لاین ثبت می‌شوند', () => {
  it('هر شش رکورد اصلی قلاب تایم‌لاین دارند', () => {
    const written = writtenEventTypes()
    for (const ev of REQUIRED_EVENTS) {
      expect(written, `${ev} روی تایم‌لاین نوشته نمی‌شود`).toContain(ev)
    }
  })

  it('🔴 تایم‌لاین بیش از یک نویسنده دارد', () => {
    // نقطه‌ی شروع باگ: تنها نویسنده، ثبت بیمار بود.
    expect(writtenEventTypes().length).toBeGreaterThan(1)
  })

  it('نوشتن روی تایم‌لاین هیچ‌وقت رکورد اصلی را نمی‌اندازد', () => {
    // یک خط تاریخچه هرگز نباید باعث شکست ثبت درمان یا پرداخت شود.
    expect(api).toMatch(/async function logToTimeline[\s\S]*?try \{[\s\S]*?\} catch \{/)
  })

  it('هر رویداد به رکورد مبدأ خودش ارجاع می‌دهد', () => {
    // reference_id همیشه null بود؛ بدون آن تایم‌لاین قابل دنبال کردن نیست.
    expect(api).toContain('reference_id: referenceId ?? null')
  })
})

describe('صفحه‌ی بیمار همه‌ی رویدادها را می‌شناسد', () => {
  it('برای هر رویدادِ نوشته‌شده آیکون هست', () => {
    const renderable = renderableEventTypes()
    for (const ev of writtenEventTypes()) {
      expect(renderable, `${ev} آیکون ندارد و با آیکون پیش‌فرض می‌افتد`).toContain(ev)
    }
  })

  it('نقشه‌ی آیکون کلید مرده ندارد', () => {
    const written = writtenEventTypes()
    const dead = renderableEventTypes().filter((k) => k !== 'default' && !written.includes(k))
    expect(dead, 'کلیدهایی که هیچ‌وقت نوشته نمی‌شوند').toEqual([])
  })

  it('حالت پیش‌فرض حذف نشده', () => {
    expect(renderableEventTypes().length).toBeGreaterThan(0)
    expect(patientDetail).toContain('timelineIcons.default')
  })
})
