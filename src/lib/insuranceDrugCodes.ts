/**
 * insuranceDrugCodes.ts - Iranian Insurance Drug Codes (IRC)
 * 
 * This module provides IRC (Iranian Reference Code) codes for drugs
 * used in dental prescriptions, for integration with Iranian health
 * insurance systems (Salamat, Tamino Ejtemai, etc.)
 */

// Common dental drug IRC codes
// Source: Iranian Ministry of Health and Medical Education
// Note: These are example codes - actual codes should be obtained from official sources
export interface DrugInfo {
  name: string
  genericName: string
  ircCode: string
  category: string
  unit: string
  insuranceCoverage: boolean
}

// Antibiotics
export const ANTIBIOTICS: DrugInfo[] = [
  {
    name: 'آموکسی‌سیلین 500mg',
    genericName: 'Amoxicillin',
    ircCode: 'IRC-ANT-001',
    category: 'Antibiotic',
    unit: 'کپسول',
    insuranceCoverage: true
  },
  {
    name: 'آموکسی‌سیلین + اسید کلاولانیک 625mg',
    genericName: 'Amoxicillin + Clavulanic Acid',
    ircCode: 'IRC-ANT-002',
    category: 'Antibiotic',
    unit: 'قرص',
    insuranceCoverage: true
  },
  {
    name: 'سیفالکسین 500mg',
    genericName: 'Cefalexin',
    ircCode: 'IRC-ANT-003',
    category: 'Antibiotic',
    unit: 'کپسول',
    insuranceCoverage: true
  },
  {
    name: 'مترونیدازول 250mg',
    genericName: 'Metronidazole',
    ircCode: 'IRC-ANT-004',
    category: 'Antibiotic',
    unit: 'قرص',
    insuranceCoverage: true
  },
  {
    name: 'آزیترومایسین 500mg',
    genericName: 'Azithromycin',
    ircCode: 'IRC-ANT-005',
    category: 'Antibiotic',
    unit: 'قرص',
    insuranceCoverage: true
  }
]

// Pain Management
export const PAIN_MANAGEMENT: DrugInfo[] = [
  {
    name: 'ایبوپروفن 400mg',
    genericName: 'Ibuprofen',
    ircCode: 'IRC-ANL-001',
    category: 'Analgesic',
    unit: 'قرص',
    insuranceCoverage: true
  },
  {
    name: 'ایبوپروفن 600mg',
    genericName: 'Ibuprofen',
    ircCode: 'IRC-ANL-002',
    category: 'Analgesic',
    unit: 'قرص',
    insuranceCoverage: true
  },
  {
    name: 'استامینوفن 500mg',
    genericName: 'Acetaminophen',
    ircCode: 'IRC-ANL-003',
    category: 'Analgesic',
    unit: 'قرص',
    insuranceCoverage: true
  },
  {
    name: 'استامینوفن کدئین 325mg',
    genericName: 'Acetaminophen + Codeine',
    ircCode: 'IRC-ANL-004',
    category: 'Analgesic',
    unit: 'قرص',
    insuranceCoverage: true
  },
  {
    name: 'دیکلوفناک سدیم 50mg',
    genericName: 'Diclofenac Sodium',
    ircCode: 'IRC-ANL-005',
    category: 'NSAID',
    unit: 'قرص',
    insuranceCoverage: true
  },
  {
    name: 'دیکلوفناک سدیم 100mg',
    genericName: 'Diclofenac Sodium',
    ircCode: 'IRC-ANL-006',
    category: 'NSAID',
    unit: 'قرص',
    insuranceCoverage: true
  }
]

// Anti-inflammatory (Steroids)
export const STEROIDS: DrugInfo[] = [
  {
    name: 'دگزامتازون 0.5mg',
    genericName: 'Dexamethasone',
    ircCode: 'IRC-STD-001',
    category: 'Corticosteroid',
    unit: 'قرص',
    insuranceCoverage: true
  },
  {
    name: 'دگزامتازون 4mg',
    genericName: 'Dexamethasone',
    ircCode: 'IRC-STD-002',
    category: 'Corticosteroid',
    unit: 'آمپول',
    insuranceCoverage: true
  },
  {
    name: 'پردنیزون 5mg',
    genericName: 'Prednisone',
    ircCode: 'IRC-STD-003',
    category: 'Corticosteroid',
    unit: 'قرص',
    insuranceCoverage: true
  }
]

// Local Anesthetics
export const ANESTHETICS: DrugInfo[] = [
  {
    name: 'لیدوکائین 2% با اپی‌نفرین 1:80000',
    genericName: 'Lidocaine + Epinephrine',
    ircCode: 'IRC-ANE-001',
    category: 'Local Anesthetic',
    unit: 'کارپول',
    insuranceCoverage: true
  },
  {
    name: 'لیدوکائین 2% بدون اپی‌نفرین',
    genericName: 'Lidocaine',
    ircCode: 'IRC-ANE-002',
    category: 'Local Anesthetic',
    unit: 'کارپول',
    insuranceCoverage: true
  },
  {
    name: 'آرتی‌کائین 4% با اپی‌نفرین 1:100000',
    genericName: 'Articaine + Epinephrine',
    ircCode: 'IRC-ANE-003',
    category: 'Local Anesthetic',
    unit: 'کارپول',
    insuranceCoverage: true
  }
]

// Antifungals
export const ANTIFUNGALS: DrugInfo[] = [
  {
    name: 'نِیستاتین 500000IU',
    genericName: 'Nystatin',
    ircCode: 'IRC-AFG-001',
    category: 'Antifungal',
    unit: 'قرص',
    insuranceCoverage: true
  },
  {
    name: 'فلوکونازول 150mg',
    genericName: 'Fluconazole',
    ircCode: 'IRC-AFG-002',
    category: 'Antifungal',
    unit: 'کپسول',
    insuranceCoverage: true
  }
]

// All drugs combined
export const ALL_DRUGS: DrugInfo[] = [
  ...ANTIBIOTICS,
  ...PAIN_MANAGEMENT,
  ...STEROIDS,
  ...ANESTHETICS,
  ...ANTIFUNGALS
]

/**
 * Find drug by name (case-insensitive, partial match)
 */
export function findDrugByName(search: string): DrugInfo[] {
  const query = search.toLowerCase().trim()
  if (!query) return []
  
  return ALL_DRUGS.filter(drug => 
    drug.name.toLowerCase().includes(query) ||
    drug.genericName.toLowerCase().includes(query) ||
    drug.ircCode.toLowerCase().includes(query)
  )
}

/**
 * Find drug by IRC code
 */
export function findDrugByIrcCode(code: string): DrugInfo | null {
  const cleanedCode = code?.trim().toUpperCase()
  if (!cleanedCode) return null
  
  return ALL_DRUGS.find(drug => 
    drug.ircCode === cleanedCode ||
    drug.ircCode === code
  ) || null
}

/**
 * Get IRC code for a drug by name
 */
export function getIrcCode(drugName: string): string | null {
  const drug = ALL_DRUGS.find(d => 
    d.name.toLowerCase() === drugName.toLowerCase() ||
    d.genericName.toLowerCase() === drugName.toLowerCase()
  )
  return drug?.ircCode || null
}

/**
 * Check if a drug is covered by insurance
 */
export function isDrugCovered(drugName: string): boolean {
  const drug = ALL_DRUGS.find(d => 
    d.name.toLowerCase() === drugName.toLowerCase() ||
    d.genericName.toLowerCase() === drugName.toLowerCase()
  )
  return drug?.insuranceCoverage || false
}

/**
 * Get all drugs in a category
 */
export function getDrugsByCategory(category: string): DrugInfo[] {
  return ALL_DRUGS.filter(drug => 
    drug.category.toLowerCase() === category.toLowerCase()
  )
}

/**
 * Get categories list
 */
export function getDrugCategories(): string[] {
  return Array.from(new Set(ALL_DRUGS.map(drug => drug.category)))
}
