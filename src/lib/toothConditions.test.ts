import { describe, it, expect } from 'vitest'
import { deriveToothConditions } from './toothConditions'

describe('deriveToothConditions', () => {
  it('returns empty object when records and treatments are empty', () => {
    const result = deriveToothConditions([], [])
    expect(result).toEqual({})
  })

  it('correctly maps missing tooth from record', () => {
    const records = [{ tooth_number: '16', is_missing: true }]
    const result = deriveToothConditions(records, [])
    expect(result[16]?.condition).toBe('missing')
  })

  it('correctly maps implant from record', () => {
    const records = [{ tooth_number: '21', is_implant: true }]
    const result = deriveToothConditions(records, [])
    expect(result[21]?.condition).toBe('implant')
  })

  it('derives RCT condition from treatment procedure name', () => {
    const treatments = [{ tooth_number: '36', procedure_name: 'درمان ریشه (عصب‌کشی) ۳ کانال' }]
    const result = deriveToothConditions([], treatments)
    expect(result[36]?.condition).toBe('rct')
  })

  it('derives crown condition from treatment procedure name', () => {
    const treatments = [{ tooth_number: '46', procedure_name: 'روکش زیرکونیا' }]
    const result = deriveToothConditions([], treatments)
    expect(result[46]?.condition).toBe('crown')
  })

  it('derives restoration condition from treatment procedure name', () => {
    const treatments = [{ tooth_number: '14', procedure_name: 'ترمیم کامپوزیت ۲ سطحی' }]
    const result = deriveToothConditions([], treatments)
    expect(result[14]?.condition).toBe('restored')
  })

  it('parses saved surface conditions from record', () => {
    const records = [
      {
        tooth_number: '16',
        condition: 'restored',
        surfaces: JSON.stringify([{ surface: 'occlusal', condition: 'restored' }]),
      },
    ]
    const result = deriveToothConditions(records, [])
    expect(result[16]?.condition).toBe('restored')
    expect(result[16]?.surfaces).toEqual([{ surface: 'occlusal', condition: 'restored' }])
  })
})
