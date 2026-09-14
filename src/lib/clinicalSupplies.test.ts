// src/lib/clinicalSupplies.test.ts
import { describe, it, expect } from 'vitest'
import {
  getTemplateForProcedure,
  matchSuppliesToInventory,
  buildMaterialsUsedPayload,
  CLINICAL_SUPPLY_TEMPLATES,
} from './clinicalSupplies'
import type { InventoryItem } from '../types'

describe('clinicalSupplies', () => {
  it('identifies templates for restorative, endo, surgery, implant, and perio', () => {
    expect(getTemplateForProcedure('ترمیم کامپوزیت خلفی')?.procedureCategory).toBe('restorative')
    expect(getTemplateForProcedure('عصب‌کشی ۳ کانال')?.procedureCategory).toBe('endo')
    expect(getTemplateForProcedure('کشیدن دندان عقل نهفته')?.procedureCategory).toBe('surgery')
    expect(getTemplateForProcedure('کاشت فیکسچر ایمپلنت')?.procedureCategory).toBe('implant')
    expect(getTemplateForProcedure('جرم‌گیری دو فک')?.procedureCategory).toBe('periodontics')
    expect(getTemplateForProcedure('روکش تمام سرامیک')?.procedureCategory).toBe('prosthodontics')
  })

  it('falls back to null for unknown procedures', () => {
    expect(getTemplateForProcedure('مشاوره و ویزیت')).toBeNull()
  })

  it('matches inventory items against template keywords correctly', () => {
    const mockInventory = [
      {
        id: 'inv-1',
        clinic_id: 'default',
        name: 'کارپول بی‌حسی لیدوکائین ۲٪ داروپخش',
        quantity: 50,
        unit: 'کارپول',
        min_quantity: 10,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'inv-2',
        clinic_id: 'default',
        name: 'سرسوزن تزریق گیج ۲۷',
        quantity: 100,
        unit: 'عدد',
        min_quantity: 20,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'inv-3',
        clinic_id: 'default',
        name: 'تیغ بیستوری شماره ۱۵ موریس',
        quantity: 0,
        unit: 'عدد',
        min_quantity: 5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ] as unknown as InventoryItem[]

    const matches = matchSuppliesToInventory('جراحی دندان عقل', mockInventory)
    expect(matches.length).toBeGreaterThan(0)

    const lidocaineMatch = matches.find((m) => m.templateSupplyName.includes('بی‌حسی'))
    expect(lidocaineMatch).toBeDefined()
    expect(lidocaineMatch?.matchedInventoryItem?.id).toBe('inv-1')
    expect(lidocaineMatch?.inStock).toBe(true)

    const bladeMatch = matches.find((m) => m.templateSupplyName.includes('بیستوری'))
    expect(bladeMatch).toBeDefined()
    expect(bladeMatch?.matchedInventoryItem?.id).toBe('inv-3')
    expect(bladeMatch?.inStock).toBe(false) // quantity is 0

    const payload = buildMaterialsUsedPayload(matches)
    expect(payload).toEqual([
      { item_id: 'inv-1', quantity: 2 },
      { item_id: 'inv-2', quantity: 2 },
      { item_id: 'inv-3', quantity: 1 },
    ])
  })
})
