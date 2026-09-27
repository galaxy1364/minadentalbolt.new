/**
 * MOD-FIX-028 | فیلد اجباری باید *قبل* از قفل شدن معلوم باشد
 *
 * ممیزی از دید کاربر: از ۳۳ فیلدی که ویزاردها واقعاً روی آن‌ها متوقف
 * می‌شوند، فقط ۵ تا علامت `*` داشتند. بقیه ساکت بودند و کاربر تازه
 * وقتی «بعدی» را می‌زد و پیام قرمز می‌گرفت می‌فهمید چه چیزی جا مانده —
 * در فرم سفارش لابراتوار، «لابراتوار» و «بیمار» هر دو همین‌طور بودند.
 *
 * استاندارد پروژه می‌گوید «هیچ فیلد اجباری که فقط هشدار بدهد». این تست
 * عکسش را قفل می‌کند: هر مرحله‌ای که `validate` آن با «الزامی است»
 * جلوی کاربر را می‌گیرد، باید در همان مرحله دست‌کم یک نشانه‌ی اجباری
 * بودن داشته باشد — یا `*` در برچسب، یا prop به‌نام `required`.
 *
 * این تست منبع را می‌خواند چون چیزی که می‌سنجد قرارداد نگارشِ فرم‌هاست،
 * نه رفتار زمان اجرا؛ همان الگویی که `patientFinanceOverview.test.tsx`
 * برای قفل کردن ساختار به کار می‌برد.
 */
import { describe, it, expect } from 'vitest'

const pages = import.meta.glob('../pages/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

interface Step { file: string; line: number; message: string; body: string }

/** Every wizard step whose validator blocks with an «الزامی است» message. */
function blockingSteps(): Step[] {
  const found: Step[] = []
  for (const [file, source] of Object.entries(pages)) {
    const lines = source.split('\n')
    lines.forEach((line, i) => {
      if (!line.includes('validate:') || !line.includes('الزامی است')) return
      const body: string[] = []
      for (let k = i + 1; k < Math.min(i + 80, lines.length); k++) {
        // The step object ends at its own closing brace, indented with
        // the step list rather than with the JSX inside it.
        if (/^\s{8,14}\},\s*$/.test(lines[k])) break
        body.push(lines[k])
      }
      found.push({
        file: file.replace('../pages/', ''),
        line: i + 1,
        message: /'([^']*الزامی است[^']*)'/.exec(line)?.[1] ?? line.trim(),
        body: body.join('\n'),
      })
    })
  }
  return found
}

const MARKED = [
  /label="[^"]*\*"/,      // <Input label="نام لابراتوار *" />
  /\*<\/label>/,           // <label>رویه درمانی *</label>
  /\brequired\b/,          // <PatientSelect required />
]

describe('🔴 هر فیلد اجباری، علامت اجباری دارد', () => {
  const steps = blockingSteps()

  it('چنین مرحله‌هایی اصلاً پیدا می‌شوند — وگرنه تست بی‌اثر است', () => {
    // A regex that silently stops matching turns this whole file into a
    // test that always passes.
    expect(steps.length).toBeGreaterThan(20)
  })

  it.each(steps.map((s) => [`${s.file}:${s.line} — ${s.message}`, s] as const))(
    '%s',
    (_name, step) => {
      const marked = MARKED.some((re) => re.test(step.body))
      expect(marked, `این مرحله جلوی کاربر را می‌گیرد ولی هیچ فیلدی در آن علامت اجباری ندارد`).toBe(true)
    },
  )
})
