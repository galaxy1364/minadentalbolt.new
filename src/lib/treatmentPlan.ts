/**
 * MOD-FEAT-001 | پیشرفت طرح درمان
 *
 * ### مشکل واقعی (درخواست مستقیم کاربر)
 * «بیمار یک بار می‌آید، ۴۰ تا کار دارد. همه را یک‌جا ثبت کنیم و
 * جلسه‌به‌جلسه تیک بزنیم و بدانیم چه کاری انجام شده، چه کاری مانده.»
 *
 * برنامه از قبل می‌توانست درمان‌ها را با وضعیت «برنامه‌ریزی‌شده»
 * ثبت کند و بعداً «تکمیل‌شده» کند — یعنی زیرساخت داده موجود بود.
 * کمبود واقعی **نمایش** بود: پرونده‌ی بیمار فقط یک فهرست صاف نشان
 * می‌داد. هیچ‌جا نمی‌شد در یک نگاه فهمید چند درصد کار تمام شده،
 * چقدر هزینه باقی مانده، یا روی کدام دندان چه چیزی مانده.
 *
 * این ماژول همان محاسبه است — جدا از UI تا قابل تست باشد.
 */
import type { Treatment } from '../types'

export interface PlanProgress {
  /** کل مواردی که لغو نشده‌اند */
  total: number
  completed: number
  inProgress: number
  planned: number
  /** درصد تکمیل بر اساس تعداد، ۰ تا ۱۰۰ */
  percent: number
  /** ارزش کارهای تکمیل‌شده */
  completedValue: number
  /** ارزش کارهای باقی‌مانده — همان چیزی که بیمار هنوز بدهکار خواهد شد */
  remainingValue: number
  totalValue: number
}

/** موارد لغوشده در هیچ محاسبه‌ای نباید بیایند */
const isActive = (t: Treatment): boolean => t.status !== 'cancelled'

/**
 * پیشرفت کلی طرح درمان بیمار.
 *
 * درصد بر اساس **تعداد** محاسبه می‌شود نه ارزش ریالی: از دید بیمار
 * «۸ تا از ۱۰ کار انجام شده» معنادارتر از «۷۳٪ ارزش» است، و یک
 * ایمپلنت گران نباید ده ترمیم کوچک را در نمودار محو کند.
 */
export function calcPlanProgress(treatments: Treatment[]): PlanProgress {
  const active = treatments.filter(isActive)
  const completed = active.filter((t) => t.status === 'completed')
  const inProgress = active.filter((t) => t.status === 'in_progress')
  const planned = active.filter((t) => t.status === 'planned')

  const sum = (list: Treatment[]) =>
    list.reduce((s, t) => s + (Number(t.total_price) || 0), 0)

  const completedValue = sum(completed)
  const totalValue = sum(active)

  return {
    total: active.length,
    completed: completed.length,
    inProgress: inProgress.length,
    planned: planned.length,
    percent: active.length === 0 ? 0 : Math.round((completed.length / active.length) * 100),
    completedValue,
    remainingValue: totalValue - completedValue,
    totalValue,
  }
}

export interface ToothGroup {
  tooth: string
  treatments: Treatment[]
  allDone: boolean
  remainingCount: number
}

/**
 * درمان‌ها را بر اساس دندان گروه‌بندی می‌کند — چون دندانپزشک
 * «دندان ۱۶» را واحد کار می‌بیند، نه یک ردیف در فهرست.
 *
 * مواردی که شماره‌ی دندان ندارند (مثل جرم‌گیری کل دهان) در گروه
 * جداگانه‌ی «عمومی» می‌آیند تا گم نشوند.
 */
export function groupByTooth(treatments: Treatment[]): ToothGroup[] {
  const map = new Map<string, Treatment[]>()
  for (const t of treatments.filter(isActive)) {
    const key = t.tooth_number?.trim() || 'عمومی'
    const list = map.get(key) ?? []
    list.push(t)
    map.set(key, list)
  }

  return Array.from(map.entries())
    .map(([tooth, list]) => ({
      tooth,
      treatments: list,
      allDone: list.every((t) => t.status === 'completed'),
      remainingCount: list.filter((t) => t.status !== 'completed').length,
    }))
    .sort((a, b) => {
      // دندان‌های ناتمام اول — کاری که مانده مهم‌تر از کاری است که تمام شده
      if (a.allDone !== b.allDone) return a.allDone ? 1 : -1
      // «عمومی» همیشه آخر
      if (a.tooth === 'عمومی') return 1
      if (b.tooth === 'عمومی') return -1
      return Number(a.tooth) - Number(b.tooth)
    })
}

/**
 * وضعیت بعدی منطقی برای یک درمان — برای دکمه‌ی تیک یک‌ضربه‌ای.
 * برنامه‌ریزی‌شده ← در حال انجام ← تکمیل‌شده، و تکمیل‌شده بدون تغییر.
 */
export function nextStatus(current: string): string {
  if (current === 'planned') return 'in_progress'
  if (current === 'in_progress') return 'completed'
  return current
}
