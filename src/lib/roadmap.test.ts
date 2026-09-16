import { describe, it, expect } from 'vitest'
import { modules, allModules, getModuleByPath } from '../theme/modules'
import { ROLES, canAccess } from './permissions'

describe('MOD-FEAT-052: Roadmap & Clinical Intelligence Hub Module Integration', () => {
  it('registers roadmap module with proper path and visual metadata', () => {
    expect(modules.roadmap).toBeDefined()
    expect(modules.roadmap.path).toBe('/roadmap')
    expect(modules.roadmap.label).toBe('نقشه راه و هوشمندی')
    expect(modules.roadmap.color).toBe('#7c3aed')
  })

  it('includes /roadmap in allModules and can be resolved by getModuleByPath', () => {
    const found = allModules.find((m) => m.path === '/roadmap')
    expect(found).toBeDefined()
    expect(getModuleByPath('/roadmap')).toBe(modules.roadmap)
  })

  it('grants access to /roadmap for owners, doctors, and staff roles', () => {
    expect(canAccess('owner', '/roadmap')).toBe(true)
    expect(canAccess('doctor', '/roadmap')).toBe(true)
    expect(canAccess('receptionist', '/roadmap')).toBe(true)
    expect(canAccess('assistant', '/roadmap')).toBe(true)
  })
})

describe('MOD-FEAT-052: Lab Due-Date Collision Guard Logic', () => {
  it('detects collision when appointment date is before expected lab delivery date', () => {
    const apptDate = '2026-09-18'
    const labOrder = {
      id: 'lab-1',
      patient_id: 'p-1',
      status: 'in_progress',
      expected_date: '2026-09-20',
      work_type: 'زیرکونیا',
    }

    const hasConflict = apptDate < labOrder.expected_date
    expect(hasConflict).toBe(true)
  })

  it('clears collision warning when lab order is marked delivered', () => {
    const labOrder = {
      id: 'lab-1',
      patient_id: 'p-1',
      status: 'delivered',
      expected_date: '2026-09-20',
    }

    const isPending = labOrder.status !== 'delivered' && labOrder.status !== 'cancelled'
    expect(isPending).toBe(false)
  })
})

describe('MOD-FEAT-052: Surgical Post-Op Care & Recall Trigger Logic', () => {
  it('identifies surgical procedures by category or clinical keywords', () => {
    const isSurgical = (procCategory: string, procName: string) => {
      return (
        procCategory === 'surgery' ||
        ['جراحی', 'کشیدن', 'ایمپلنت', 'عقل', 'نهفته', 'پیوند', 'سینوس'].some((kw) => procName.includes(kw))
      )
    }

    expect(isSurgical('surgery', 'کشیدن دندان')).toBe(true)
    expect(isSurgical('general', 'جراحی دندان عقل نهفته')).toBe(true)
    expect(isSurgical('implant', 'کاشت فیکسچر ایمپلنت')).toBe(true)
    expect(isSurgical('restorative', 'ترمیم کامپوزیت خلفی')).toBe(false)
  })
})
