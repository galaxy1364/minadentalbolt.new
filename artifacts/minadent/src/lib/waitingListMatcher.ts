// src/lib/waitingListMatcher.ts — Intelligent waiting list auto-matcher for cancelled appointments
import { WaitingListEntryWithRelations } from '../types'

export interface MatchCandidate {
  entry: WaitingListEntryWithRelations
  score: number
  matchReason: string
}

export interface SlotInfo {
  date: string
  start_time: string
  doctor_id?: string | null
  unit_id?: string | null
}

/**
 * Finds and ranks patients on the waiting list who can backfill a freed/cancelled appointment slot.
 */
export function matchWaitingListForCancelledSlot(
  slot: SlotInfo,
  waitingEntries: WaitingListEntryWithRelations[]
): MatchCandidate[] {
  const activeEntries = waitingEntries.filter(
    (e) => e.status === 'waiting' && (e as any).is_active !== false
  )

  const candidates: MatchCandidate[] = []

  for (const entry of activeEntries) {
    let score = 0
    const reasons: string[] = []

    const prio = entry.priority ?? 2
    score += prio * 10

    const sameDoc = Boolean(slot.doctor_id && entry.doctor_id && slot.doctor_id === entry.doctor_id)
    const sameDate = Boolean(slot.date && entry.preferred_date && slot.date === entry.preferred_date)

    if (sameDoc && sameDate) {
      score += 100
      reasons.push('تطابق کامل تاریخ و پزشک درخواستی')
    } else if (sameDate) {
      score += 70
      reasons.push('تطابق تاریخ درخواستی')
    } else if (sameDoc) {
      score += 50
      reasons.push('تطابق پزشک معالج')
    } else {
      reasons.push('در نوبت عمومی بر اساس اولویت')
    }

    if (prio === 4) {
      reasons.unshift('⚡ اولویت فوری')
    } else if (prio === 3) {
      reasons.unshift('اولویت بالا')
    }

    candidates.push({
      entry,
      score,
      matchReason: reasons.join(' · '),
    })
  }

  // Sort by highest score first
  return candidates.sort((a, b) => b.score - a.score)
}
