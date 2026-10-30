// src/lib/clinicalSupplies.ts — Dental Procedure Consumables & Smart Inventory Deduction
import type { InventoryItem } from '../types'

export interface ConsumableTemplateItem {
  name: string
  keywords: string[]
  defaultQuantity: number
  unit: string
  optional?: boolean
}

export interface ProcedureSupplyTemplate {
  procedureCategory: string
  procedureKeywords: string[]
  supplies: ConsumableTemplateItem[]
}

/**
 * Standard clinical consumable templates matching everyday Iranian dental clinic workflows.
 */
export const CLINICAL_SUPPLY_TEMPLATES: ProcedureSupplyTemplate[] = [
  {
    procedureCategory: 'restorative',
    procedureKeywords: ['ترمیم', 'کامپوزیت', 'آمالگام', 'بیلداپ', 'composite', 'filling'],
    supplies: [
      { name: 'کارپول بی‌حسی ۲٪', keywords: ['بی‌حسی', 'کارپول', 'لیدوکائین'], defaultQuantity: 1, unit: 'کارپول' },
      { name: 'سرسوزن تزریق استریل', keywords: ['سرسوزن', 'سوزن', 'needle'], defaultQuantity: 1, unit: 'عدد' },
      { name: 'کامپوزیت دندانپزشکی', keywords: ['کامپوزیت', 'composite'], defaultQuantity: 0.2, unit: 'سرنگ' },
      { name: 'ژل اسید اچ ۳۷٪', keywords: ['اسید اچ', 'اچینگ', 'etch'], defaultQuantity: 0.1, unit: 'سرنگ' },
      { name: 'باندینگ عاج و مینا', keywords: ['باندینگ', 'bond'], defaultQuantity: 1, unit: 'قطره' },
      { name: 'نوار ماتریکس یا وج دندانی', keywords: ['ماتریکس', 'وج', 'wedge', 'matrix'], defaultQuantity: 1, unit: 'عدد' },
    ],
  },
  {
    procedureCategory: 'endo',
    procedureKeywords: ['عصب‌کشی', 'اندو', 'درمان ریشه', 'rct', 'root canal', 'پالپوتومی'],
    supplies: [
      { name: 'کارپول بی‌حسی لیدوکائین', keywords: ['بی‌حسی', 'کارپول', 'لیدوکائین'], defaultQuantity: 2, unit: 'کارپول' },
      { name: 'سرسوزن تزریق استریل', keywords: ['سرسوزن', 'سوزن'], defaultQuantity: 2, unit: 'عدد' },
      { name: 'فایل روتاری یا دستی اندو', keywords: ['فایل', 'روتاری', 'file'], defaultQuantity: 1, unit: 'عدد' },
      { name: 'سرم شستشو / هیپوکلریت', keywords: ['هیپوکلریت', 'سرم', 'شستشو', 'irrigation'], defaultQuantity: 1, unit: 'واحد' },
      { name: 'گوتاپرکا و کن کاغذی', keywords: ['گوتا', 'گوتاپرکا', 'gutta', 'paper point'], defaultQuantity: 1, unit: 'پک' },
      { name: 'سیلر دندانپزشکی', keywords: ['سیلر', 'sealer'], defaultQuantity: 1, unit: 'واحد' },
      { name: 'پانسمان موقت (کلتوزول/زونالین)', keywords: ['پانسمان', 'کلتوزول', 'زونالین', 'cavity'], defaultQuantity: 1, unit: 'واحد' },
    ],
  },
  {
    procedureCategory: 'surgery',
    procedureKeywords: ['جراحی', 'کشیدن', 'عقل', 'بیوپسی', 'نهفته', 'surgery', 'extraction'],
    supplies: [
      { name: 'کارپول بی‌حسی دندانپزشکی', keywords: ['بی‌حسی', 'کارپول', 'لیدوکائین', 'آرتیکائین'], defaultQuantity: 2, unit: 'کارپول' },
      { name: 'سرسوزن تزریق استریل', keywords: ['سرسوزن', 'سوزن'], defaultQuantity: 2, unit: 'عدد' },
      { name: 'تیغ بیستوری جراحی', keywords: ['بیستوری', 'تیغ', 'blade'], defaultQuantity: 1, unit: 'عدد' },
      { name: 'نخ بخیه جراحی', keywords: ['بخیه', 'نخ بخیه', 'suture'], defaultQuantity: 1, unit: 'عدد' },
      { name: 'اسفنج ژلاتینی ژلفوم', keywords: ['ژلفوم', 'gelfoam', 'اسفنج'], defaultQuantity: 1, unit: 'عدد', optional: true },
      { name: 'گاز استریل جراحی', keywords: ['گاز', 'گاز استریل', 'gauze'], defaultQuantity: 3, unit: 'پد' },
    ],
  },
  {
    procedureCategory: 'implant',
    procedureKeywords: ['ایمپلنت', 'فیکسچر', 'کاشت دندان', 'implant', 'fixture', 'سینوس'],
    supplies: [
      { name: 'شان و گان استریل جراحی', keywords: ['شان', 'گان', 'پک جراحی', 'gown'], defaultQuantity: 2, unit: 'دست' },
      { name: 'کارپول بی‌حسی آرتیکائین/لیدوکائین', keywords: ['آرتیکائین', 'لیدوکائین', 'بی‌حسی', 'کارپول'], defaultQuantity: 2, unit: 'کارپول' },
      { name: 'سرم فیزیولوژی شستشوی جراحی', keywords: ['سرم', 'نرمال سالین', 'saline'], defaultQuantity: 1, unit: 'باتل' },
      { name: 'تیغ بیستوری جراحی شماره ۱۵', keywords: ['بیستوری', 'تیغ'], defaultQuantity: 1, unit: 'عدد' },
      { name: 'نخ بخیه مونوکریل یا سیلک', keywords: ['بخیه', 'سوتور', 'suture'], defaultQuantity: 1, unit: 'عدد' },
      { name: 'گاز استریل جراحی', keywords: ['گاز', 'استریل'], defaultQuantity: 4, unit: 'پد' },
    ],
  },
  {
    procedureCategory: 'periodontics',
    procedureKeywords: ['جرم‌گیری', 'بروساژ', 'پریو', 'فلپ', 'scaling', 'perio', 'کورتاژ'],
    supplies: [
      { name: 'خمیر پروفیلاکسی و بروساژ', keywords: ['خمیر بروساژ', 'پروفیلاکسی', 'paste'], defaultQuantity: 1, unit: 'واحد' },
      { name: 'برس یا کاپ بروساژ', keywords: ['برس بروساژ', 'کاپ', 'brush'], defaultQuantity: 1, unit: 'عدد' },
      { name: 'دهان‌شویه کلرهگزیدین', keywords: ['کلرهگزیدین', 'دهان‌شویه'], defaultQuantity: 1, unit: 'واحد', optional: true },
    ],
  },
  {
    procedureCategory: 'prosthodontics',
    procedureKeywords: ['روکش', 'پروتز', 'قالب‌گیری', 'لمینیت', 'crown', 'bridge', 'ونیر'],
    supplies: [
      { name: 'ماده قالب‌گیری سیلیکونی (پوتی/واش)', keywords: ['قالب‌گیری', 'پوتی', 'واش', 'putty', 'alginate'], defaultQuantity: 1, unit: 'ست' },
      { name: 'نخ زیرلثه‌ای رترکشن', keywords: ['رترکشن', 'retraction'], defaultQuantity: 1, unit: 'عدد', optional: true },
      { name: 'سمان موقت یا دائم', keywords: ['سمان', 'cement', 'تمپ‌باند'], defaultQuantity: 1, unit: 'واحد' },
    ],
  },
]

export interface MatchedSupplyResult {
  templateSupplyName: string
  defaultQuantity: number
  unit: string
  matchedInventoryItem?: InventoryItem
  inStock: boolean
  availableQuantity: number
}

/**
 * Normalizes text for matching Persian/English inventory and procedure names.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ي]/g, 'ی')
    .replace(/[ك]/g, 'ک')
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .trim()
}

/**
 * Detects appropriate template for a given procedure name or category.
 */
export function getTemplateForProcedure(procedureName: string, procedureCategory?: string): ProcedureSupplyTemplate | null {
  const normName = normalizeText(procedureName || '')
  const normCat = normalizeText(procedureCategory || '')

  for (const tmpl of CLINICAL_SUPPLY_TEMPLATES) {
    if (normCat && (normCat === tmpl.procedureCategory || tmpl.procedureKeywords.some((k) => normCat.includes(k)))) {
      return tmpl
    }
    if (tmpl.procedureKeywords.some((k) => normName.includes(k))) {
      return tmpl
    }
  }

  return null
}

/**
 * Matches items in clinic inventory against the clinical consumable supplies template.
 */
export function matchSuppliesToInventory(
  procedureName: string,
  inventoryItems: InventoryItem[],
  procedureCategory?: string
): MatchedSupplyResult[] {
  const template = getTemplateForProcedure(procedureName, procedureCategory)
  if (!template) return []

  const activeInventory = inventoryItems.filter((i) => i.is_active !== false)

  return template.supplies.map((supply) => {
    // Find closest inventory item matching any keyword
    let bestMatch: InventoryItem | undefined

    for (const inv of activeInventory) {
      const normInvName = normalizeText(inv.name || '')
      const normBrand = normalizeText(inv.brand || '')

      const hasKeyword = supply.keywords.some(
        (kw) => normInvName.includes(normalizeText(kw)) || normBrand.includes(normalizeText(kw))
      )

      if (hasKeyword) {
        bestMatch = inv
        break
      }
    }

    const available = bestMatch?.quantity ?? 0
    return {
      templateSupplyName: supply.name,
      defaultQuantity: supply.defaultQuantity,
      unit: bestMatch?.unit || supply.unit,
      matchedInventoryItem: bestMatch,
      inStock: available >= supply.defaultQuantity,
      availableQuantity: available,
    }
  })
}

/**
 * Converts matched supplies into the exact `materials_used` array required by `TreatmentInput`.
 */
export function buildMaterialsUsedPayload(
  matchedSupplies: MatchedSupplyResult[]
): { item_id: string; quantity: number }[] {
  return matchedSupplies
    .filter((s) => s.matchedInventoryItem && s.matchedInventoryItem.id)
    .map((s) => ({
      item_id: s.matchedInventoryItem!.id,
      quantity: s.defaultQuantity,
    }))
}
