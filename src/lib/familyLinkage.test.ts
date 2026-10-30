// src/lib/familyLinkage.test.ts
import { describe, it, expect } from 'vitest'
import {
  getFamilyRelationshipLabel,
  resolveFamilyHousehold,
  validateFamilyLinkage,
} from './familyLinkage'
import { Patient } from '../types'

function makeMockPatient(id: string, firstName: string, lastName: string, familyHeadId?: string | null, rel?: any): Patient {
  return {
    id,
    clinic_id: 'test-clinic',
    first_name: firstName,
    last_name: lastName,
    file_number: `MD-${id}`,
    is_active: true,
    created_at: '2026-01-01T10:00:00Z',
    updated_at: '2026-01-01T10:00:00Z',
    family_head_id: familyHeadId ?? null,
    family_relationship: rel ?? null,
  } as unknown as Patient
}

describe('familyLinkage helper', () => {
  it('correctly maps relationship keys to Persian labels', () => {
    expect(getFamilyRelationshipLabel('head')).toBe('سرپرست خانواده')
    expect(getFamilyRelationshipLabel('spouse')).toBe('همسر')
    expect(getFamilyRelationshipLabel('child')).toBe('فرزند')
    expect(getFamilyRelationshipLabel('parent')).toBe('والدین (پدر/مادر)')
    expect(getFamilyRelationshipLabel('sibling')).toBe('خواهر / برادر')
    expect(getFamilyRelationshipLabel('other')).toBe('سایر بستگان')
    expect(getFamilyRelationshipLabel(null)).toBe('عضو خانواده')
  })

  it('resolves standalone patient without family linkages', () => {
    const p1 = makeMockPatient('1', 'علی', 'رضایی')
    const res = resolveFamilyHousehold(p1, [p1])

    expect(res.isHead).toBe(false)
    expect(res.headPatient).toBeNull()
    expect(res.members).toHaveLength(0)
    expect(res.totalMembersCount).toBe(1)
  })

  it('resolves household when current patient is the explicit head', () => {
    const father = makeMockPatient('f1', 'محمد', 'احمدی', null, 'head')
    const mother = makeMockPatient('m1', 'مریم', 'کاظمی', 'f1', 'spouse')
    const son = makeMockPatient('s1', 'سینا', 'احمدی', 'f1', 'child')
    const all = [father, mother, son]

    const res = resolveFamilyHousehold(father, all)
    expect(res.isHead).toBe(true)
    expect(res.headPatient?.id).toBe('f1')
    expect(res.members).toHaveLength(2)
    expect(res.members[0].patient.id).toBe('m1')
    expect(res.members[0].relationshipLabel).toBe('همسر')
    expect(res.members[1].patient.id).toBe('s1')
    expect(res.members[1].relationshipLabel).toBe('فرزند')
    expect(res.totalMembersCount).toBe(3)
  })

  it('resolves household from perspective of a dependent child', () => {
    const father = makeMockPatient('f1', 'محمد', 'احمدی', null, 'head')
    const mother = makeMockPatient('m1', 'مریم', 'کاظمی', 'f1', 'spouse')
    const son = makeMockPatient('s1', 'سینا', 'احمدی', 'f1', 'child')
    const all = [father, mother, son]

    const res = resolveFamilyHousehold(son, all)
    expect(res.isHead).toBe(false)
    expect(res.headPatient?.id).toBe('f1')
    expect(res.members).toHaveLength(2) // father + mother
    expect(res.members.map((m) => m.patient.id)).toContain('f1')
    expect(res.members.map((m) => m.patient.id)).toContain('m1')
    expect(res.totalMembersCount).toBe(3)
  })

  it('validates linkage inputs preventing loops and conflicts', () => {
    expect(validateFamilyLinkage('p1', 'p1').valid).toBe(false)
    expect(validateFamilyLinkage('p1', 'p1').error).toContain('نمی‌تواند به خودش')

    expect(validateFamilyLinkage('p1', 'head1', 'head').valid).toBe(false)
    expect(validateFamilyLinkage('p1', 'head1', 'head').error).toContain('سرپرست دیگری')

    expect(validateFamilyLinkage('p1', 'head1', 'child').valid).toBe(true)
    expect(validateFamilyLinkage('p1', null, 'head').valid).toBe(true)
  })
})
