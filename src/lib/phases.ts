// phases.ts — a staged treatment plan: what is done, what it was meant
// to cost, and whether it is running late.
//
// The phases tab could create and edit rows but knew nothing about them.
// It could not say a plan was half finished, that a phase had run past
// its estimate, or that the estimates no longer matched what had
// actually been charged. Those are the three questions a patient asks.
//
// Pure, so the rules are testable. Money follows the same rule as the
// rest of the project: report a disagreement, never silently correct it.

export interface PhaseLike {
  phase_number: number
  title?: string | null
  status: string
  estimated_cost?: number | null
  actual_cost?: number | null
  estimated_duration_days?: number | null
  start_date?: string | null
  end_date?: string | null
}

const DONE = new Set(['completed', 'done'])
const VOID = new Set(['cancelled', 'void'])
const ACTIVE = new Set(['in_progress', 'active'])

/** Phases that still count toward the plan. A cancelled phase is
 * history: leaving it in would keep a plan permanently unfinishable. */
export function livePhases<T extends PhaseLike>(phases: T[]): T[] {
  return phases.filter((p) => !VOID.has(p.status))
}

export interface PhasePlanProgress {
  total: number
  completed: number
  inProgress: number
  notStarted: number
  /** 0–100, rounded. 0 when there is nothing to do. */
  percent: number
  estimatedCost: number
  /** Actual where recorded, falling back to the estimate for phases that
   * have not been costed yet — otherwise a half-done plan reads as
   * costing almost nothing. */
  projectedCost: number
  actualCost: number
}

export function phasePlanProgress(phases: PhaseLike[]): PhasePlanProgress {
  const live = livePhases(phases)
  let completed = 0
  let inProgress = 0
  let estimatedCost = 0
  let actualCost = 0
  let projectedCost = 0

  for (const p of live) {
    const est = p.estimated_cost || 0
    const act = p.actual_cost || 0
    estimatedCost += est
    actualCost += act
    projectedCost += act > 0 ? act : est
    if (DONE.has(p.status)) completed += 1
    else if (ACTIVE.has(p.status)) inProgress += 1
  }

  return {
    total: live.length,
    completed,
    inProgress,
    notStarted: live.length - completed - inProgress,
    percent: live.length > 0 ? Math.round((completed / live.length) * 100) : 0,
    estimatedCost,
    projectedCost,
    actualCost,
  }
}

export type PhaseTiming = 'not_started' | 'on_track' | 'due_today' | 'overdue' | 'finished'

export interface PhaseSchedule {
  timing: PhaseTiming
  /** Negative when the phase is past its expected end. Null when there
   * is not enough information to say. */
  daysRemaining: number | null
  expectedEnd: string | null
}

/** Whole days between two ISO dates, computed at UTC midnight so a
 * clinic near a day boundary does not see "yesterday" for today. */
export function daysBetween(fromISO: string, toISO: string): number {
  const a = Date.parse(`${fromISO.slice(0, 10)}T00:00:00Z`)
  const b = Date.parse(`${toISO.slice(0, 10)}T00:00:00Z`)
  return Math.round((b - a) / 86_400_000)
}

/**
 * Where a phase sits against its own estimate.
 *
 * A phase with no start date has not begun, whatever its status says —
 * an "in progress" row with no start date is a data-entry slip, and
 * calling it on track would hide that.
 */
export function phaseSchedule(phase: PhaseLike, todayISO: string): PhaseSchedule {
  if (DONE.has(phase.status)) {
    return { timing: 'finished', daysRemaining: null, expectedEnd: phase.end_date || null }
  }
  if (!phase.start_date) {
    return { timing: 'not_started', daysRemaining: null, expectedEnd: null }
  }

  // An explicit end date wins over the duration estimate: someone typed
  // it deliberately.
  let expectedEnd = phase.end_date || null
  if (!expectedEnd && phase.estimated_duration_days && phase.estimated_duration_days > 0) {
    const start = Date.parse(`${phase.start_date.slice(0, 10)}T00:00:00Z`)
    if (!Number.isNaN(start)) {
      expectedEnd = new Date(start + phase.estimated_duration_days * 86_400_000)
        .toISOString()
        .slice(0, 10)
    }
  }
  if (!expectedEnd) {
    return { timing: 'on_track', daysRemaining: null, expectedEnd: null }
  }

  const remaining = daysBetween(todayISO, expectedEnd)
  if (remaining < 0) return { timing: 'overdue', daysRemaining: remaining, expectedEnd }
  if (remaining === 0) return { timing: 'due_today', daysRemaining: 0, expectedEnd }
  return { timing: 'on_track', daysRemaining: remaining, expectedEnd }
}

/**
 * Validation that must BLOCK, not warn.
 *
 * The project forbids a required rule that only warns, so these are
 * returned as errors for the caller to refuse on.
 */
export function validatePhase(phase: PhaseLike, existing: PhaseLike[] = []): string[] {
  const errors: string[] = []

  if (!phase.title || !phase.title.trim()) {
    errors.push('عنوان مرحله الزامی است')
  }
  if (phase.phase_number == null || phase.phase_number < 1) {
    errors.push('شماره مرحله باید حداقل ۱ باشد')
  }
  if (existing.some((p) => p.phase_number === phase.phase_number)) {
    errors.push('شماره مرحله تکراری است')
  }
  if (phase.start_date && phase.end_date && phase.end_date < phase.start_date) {
    // A phase that ends before it starts makes every duration and every
    // overdue count downstream meaningless.
    errors.push('تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد')
  }
  if (phase.estimated_cost != null && phase.estimated_cost < 0) {
    errors.push('هزینه برآوردی نمی‌تواند منفی باشد')
  }
  if (phase.actual_cost != null && phase.actual_cost < 0) {
    errors.push('هزینه واقعی نمی‌تواند منفی باشد')
  }
  if (phase.estimated_duration_days != null && phase.estimated_duration_days < 0) {
    errors.push('مدت برآوردی نمی‌تواند منفی باشد')
  }

  return errors
}

/** The next free phase number. Uses max + 1 rather than count + 1 so a
 * cancelled or renumbered phase cannot produce a duplicate. */
export function nextPhaseNumber(phases: PhaseLike[]): number {
  if (phases.length === 0) return 1
  return Math.max(...phases.map((p) => p.phase_number || 0)) + 1
}

export interface PhaseCostCheck {
  ok: boolean
  phaseTotal: number
  treatmentTotal: number
  difference: number
  message: string | null
}

/**
 * Compares what the phases say the plan costs against what has actually
 * been charged as treatments.
 *
 * Reports the gap; corrects nothing. A plan half executed will legitimately
 * show treatments below the phase estimate, so this is information for the
 * clinic, not an error — which is why `ok` is about equality, and the
 * message describes the direction rather than accusing.
 */
export function comparePhaseCostToTreatments(
  phases: PhaseLike[],
  treatments: { total_price?: number | null; status: string }[],
): PhaseCostCheck {
  const phaseTotal = phasePlanProgress(phases).projectedCost
  const treatmentTotal = treatments
    .filter((t) => t.status !== 'cancelled')
    .reduce((s, t) => s + (t.total_price || 0), 0)
  const difference = treatmentTotal - phaseTotal

  if (difference === 0) {
    return { ok: true, phaseTotal, treatmentTotal, difference: 0, message: null }
  }
  return {
    ok: false,
    phaseTotal,
    treatmentTotal,
    difference,
    message:
      difference > 0
        ? 'درمان‌های ثبت‌شده از برآورد مراحل بیشتر است'
        : 'درمان‌های ثبت‌شده هنوز به برآورد مراحل نرسیده',
  }
}
