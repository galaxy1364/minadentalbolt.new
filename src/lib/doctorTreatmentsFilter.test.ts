import { describe, it, expect } from 'vitest'
import { groupPatientTreatments } from './patientTreatmentGroups'
import type { EncounterWithRelations, Treatment, Payment, ImplantCaseWithRelations, Cheque, Installment } from '../types'

describe('Doctor Filter & Deep Search Matching for Treatments', () => {
  const dummyEncounters: EncounterWithRelations[] = [
    {
      id: 'enc-1',
      patient_id: 'pat-1',
      doctor_id: 'doc-1',
      encounter_date: '2026-09-20',
      status: 'completed',
      diagnosis: 'پوسیدگی کلاس ۲',
      total_amount: 1500000,
      doctor: { id: 'doc-1', name: 'دکتر امین پوریا', specialty: 'پریودنتیست' } as any,
      patient: { id: 'pat-1', first_name: 'رضا', last_name: 'محمدی', file_number: '1042' } as any,
    } as EncounterWithRelations,
    {
      id: 'enc-2',
      patient_id: 'pat-2',
      doctor_id: 'doc-2',
      encounter_date: '2026-09-20',
      status: 'in_progress',
      diagnosis: 'جراحی ایمپلنت',
      total_amount: 8000000,
      doctor: { id: 'doc-2', name: 'دکتر سارا حسینی', specialty: 'جراح فک و صورت' } as any,
      patient: { id: 'pat-2', first_name: 'مهدی', last_name: 'کرمی', file_number: '1043' } as any,
    } as EncounterWithRelations,
  ]

  it('filters encounters matching doctor name', () => {
    const q = 'امین پوریا'
    const matched = dummyEncounters.filter((e) => {
      const name = e.patient ? `${e.patient.first_name} ${e.patient.last_name}` : ''
      const diag = e.diagnosis || ''
      const docName = e.doctor?.name || ''
      return name.includes(q) || diag.includes(q) || docName.includes(q)
    })
    expect(matched).toHaveLength(1)
    expect(matched[0].id).toBe('enc-1')
    expect(matched[0].doctor?.name).toBe('دکتر امین پوریا')
  })

  it('filters patient groups matching doctor name', () => {
    const groups = groupPatientTreatments({
      encounters: dummyEncounters,
      treatments: [],
      payments: [],
      implantCases: [],
      cheques: [],
      installments: [],
    })
    expect(groups).toHaveLength(2)

    const q = 'سارا حسینی'
    const filteredGroups = groups.filter((g) => {
      const docMatch = g.encounters.some((e) => {
        const enc = e as EncounterWithRelations
        return (enc.doctor?.name || '').includes(q)
      })
      return docMatch
    })

    expect(filteredGroups).toHaveLength(1)
    expect(filteredGroups[0].patientId).toBe('pat-2')
  })

  it('handles partial doctor name matching case-insensitively', () => {
    const q = 'حسینی'
    const matched = dummyEncounters.filter((e) => {
      const docName = e.doctor?.name || ''
      return docName.toLowerCase().includes(q.toLowerCase())
    })
    expect(matched).toHaveLength(1)
    expect(matched[0].patient_id).toBe('pat-2')
  })
})
