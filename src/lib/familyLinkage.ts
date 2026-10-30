// src/lib/familyLinkage.ts - Family & Household linkage helper for MinaDent
import { Patient } from '../types'

export type FamilyRelationship = 'head' | 'spouse' | 'child' | 'parent' | 'sibling' | 'other'

export const FAMILY_RELATIONSHIPS: { value: FamilyRelationship; label: string }[] = [
  { value: 'head', label: 'سرپرست خانواده' },
  { value: 'spouse', label: 'همسر' },
  { value: 'child', label: 'فرزند' },
  { value: 'parent', label: 'والدین (پدر/مادر)' },
  { value: 'sibling', label: 'خواهر / برادر' },
  { value: 'other', label: 'سایر بستگان' },
]

export function getFamilyRelationshipLabel(relationship?: string | null): string {
  if (!relationship) return 'عضو خانواده'
  const match = FAMILY_RELATIONSHIPS.find((r) => r.value === relationship)
  return match ? match.label : relationship
}

export interface FamilyMemberItem {
  patient: Patient
  relationshipLabel: string
}

export interface FamilyHouseholdInfo {
  isHead: boolean
  headPatient: Patient | null
  members: FamilyMemberItem[]
  totalMembersCount: number
}

/**
 * Resolves the family and household relationships for a given patient.
 * Handles both directions:
 * 1. Current patient is the head (either marked as 'head' or has dependents pointing to them).
 * 2. Current patient is a dependent linked to a head (includes head + peer dependents).
 * 3. Standalone patient (no family link yet).
 */
export function resolveFamilyHousehold(
  currentPatient: Patient,
  allPatients: Patient[]
): FamilyHouseholdInfo {
  if (!currentPatient) {
    return {
      isHead: false,
      headPatient: null,
      members: [],
      totalMembersCount: 0,
    }
  }

  const isExplicitHead = currentPatient.family_relationship === 'head'
  const dependentsOfCurrent = allPatients.filter(
    (p) => p.family_head_id === currentPatient.id && p.id !== currentPatient.id
  )
  const isHead = isExplicitHead || dependentsOfCurrent.length > 0

  if (isHead) {
    const members = dependentsOfCurrent.map((p) => ({
      patient: p,
      relationshipLabel: getFamilyRelationshipLabel(p.family_relationship),
    }))
    return {
      isHead: true,
      headPatient: currentPatient,
      members,
      totalMembersCount: members.length + 1,
    }
  }

  if (currentPatient.family_head_id) {
    const head = allPatients.find((p) => p.id === currentPatient.family_head_id) || null
    const peerMembers = allPatients.filter(
      (p) => p.family_head_id === currentPatient.family_head_id && p.id !== currentPatient.id
    )

    const members: FamilyMemberItem[] = []
    if (head) {
      members.push({
        patient: head,
        relationshipLabel: 'سرپرست خانواده',
      })
    }
    for (const peer of peerMembers) {
      members.push({
        patient: peer,
        relationshipLabel: getFamilyRelationshipLabel(peer.family_relationship),
      })
    }

    return {
      isHead: false,
      headPatient: head,
      members,
      totalMembersCount: members.length + 1,
    }
  }

  return {
    isHead: false,
    headPatient: null,
    members: [],
    totalMembersCount: 1,
  }
}

/**
 * Validates a proposed family linkage before committing to database.
 */
export function validateFamilyLinkage(
  targetPatientId: string,
  proposedHeadId: string | null | undefined,
  relationship?: string | null
): { valid: boolean; error?: string } {
  if (!targetPatientId) {
    return { valid: false, error: 'شناسه بیمار نامعتبر است' }
  }

  if (proposedHeadId && proposedHeadId === targetPatientId) {
    return { valid: false, error: 'بیمار نمی‌تواند به خودش به عنوان سرپرست متصل شود' }
  }

  if (relationship === 'head' && proposedHeadId) {
    return { valid: false, error: 'سرپرست خانواده نمی‌تواند زیرمجموعه سرپرست دیگری باشد' }
  }

  return { valid: true }
}
