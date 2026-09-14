// vitaShade.ts — International Standard VITA Classical & Bleach Dental Shade Guide (ISO 22674)

export interface VitaShade {
  code: string
  name: string
  group: 'A' | 'B' | 'C' | 'D' | 'BL'
  groupName: string
  hexColor: string
  enamelHex: string
  description: string
}

export interface VitaShadeGroup {
  id: 'A' | 'B' | 'C' | 'D' | 'BL'
  name: string
  hueDescription: string
  shades: VitaShade[]
}

export const VITA_SHADES: VitaShade[] = [
  // ── Group A: Reddish-Brownish (قهوه‌ای مایل به قرمز - شایع‌ترین طیف دندان طبیعی) ──
  { code: 'A1', name: 'A1', group: 'A', groupName: 'گروه A (طیف گرم / قهوه‌ای مایل به قرمز)', hexColor: '#F7F4EA', enamelHex: '#FCFAF4', description: 'روشن‌ترین طیف طبیعی A (دندان‌های جوان)' },
  { code: 'A2', name: 'A2', group: 'A', groupName: 'گروه A (طیف گرم / قهوه‌ای مایل به قرمز)', hexColor: '#F2EAD2', enamelHex: '#FAF5E8', description: 'رنگ استاندارد و پرتکرار دندان‌های بزرگسالان' },
  { code: 'A3', name: 'A3', group: 'A', groupName: 'گروه A (طیف گرم / قهوه‌ای مایل به قرمز)', hexColor: '#E9DCBD', enamelHex: '#F4ECE0', description: 'تیره متوسط با تن زرد-قرمز ملایم' },
  { code: 'A3.5', name: 'A3.5', group: 'A', groupName: 'گروه A (طیف گرم / قهوه‌ای مایل به قرمز)', hexColor: '#DFC7A1', enamelHex: '#EBDDC7', description: 'تیره عمیق (مناسب دندان‌های کانین و مسن‌تر)' },
  { code: 'A4', name: 'A4', group: 'A', groupName: 'گروه A (طیف گرم / قهوه‌ای مایل به قرمز)', hexColor: '#CFB58B', enamelHex: '#E2CEAF', description: 'تیره‌ترین رنگ طیف A' },

  // ── Group B: Reddish-Yellowish (زرد مایل به قرمز) ──
  { code: 'B1', name: 'B1', group: 'B', groupName: 'گروه B (طیف زرد مایل به قرمز)', hexColor: '#FAF7EB', enamelHex: '#FFFCF5', description: 'روشن‌ترین رنگ طبیعی قبل از بلیچ' },
  { code: 'B2', name: 'B2', group: 'B', groupName: 'گروه B (طیف زرد مایل به قرمز)', hexColor: '#F4ECD0', enamelHex: '#FAF5E3', description: 'زرد گرم روشن' },
  { code: 'B3', name: 'B3', group: 'B', groupName: 'گروه B (طیف زرد مایل به قرمز)', hexColor: '#E8DCB8', enamelHex: '#F3ECDA', description: 'زرد با اشباع رنگی متوسط' },
  { code: 'B4', name: 'B4', group: 'B', groupName: 'گروه B (طیف زرد مایل به قرمز)', hexColor: '#DCBA8E', enamelHex: '#EBCEAC', description: 'زرد تیره با کروما بالا' },

  // ── Group C: Greyish (خاکستری مایل به زرد) ──
  { code: 'C1', name: 'C1', group: 'C', groupName: 'گروه C (طیف خاکستری / سرد)', hexColor: '#EFEFE5', enamelHex: '#F8F8F4', description: 'خاکستری روشن' },
  { code: 'C2', name: 'C2', group: 'C', groupName: 'گروه C (طیف خاکستری / سرد)', hexColor: '#E6E3D4', enamelHex: '#F2F0E6', description: 'خاکستری خنثی با ترنسلوسنسی بالا' },
  { code: 'C3', name: 'C3', group: 'C', groupName: 'گروه C (طیف خاکستری / سرد)', hexColor: '#D8D4C2', enamelHex: '#E8E5D7', description: 'خاکستری دودی متوسط' },
  { code: 'C4', name: 'C4', group: 'C', groupName: 'گروه C (طیف خاکستری / سرد)', hexColor: '#C8C1AA', enamelHex: '#DDD8C7', description: 'خاکستری تیره مایل به زیتونی' },

  // ── Group D: Reddish-Grey (خاکستری مایل به قرمز) ──
  { code: 'D2', name: 'D2', group: 'D', groupName: 'گروه D (طیف خاکستری مایل به قرمز)', hexColor: '#EFEAE0', enamelHex: '#F7F4EE', description: 'خاکستری مایل به صورتی ملایم' },
  { code: 'D3', name: 'D3', group: 'D', groupName: 'گروه D (طیف خاکستری مایل به قرمز)', hexColor: '#E2D9CB', enamelHex: '#EFEAE0', description: 'خاکستری قرمز با عمق رنگی' },
  { code: 'D4', name: 'D4', group: 'D', groupName: 'گروه D (طیف خاکستری مایل به قرمز)', hexColor: '#D7C7B0', enamelHex: '#E7DDD0', description: 'تیره‌ترین رنگ طیف D' },

  // ── Bleach Shades: Ultra White (بلیچ هالیوودی و فوق سفید) ──
  { code: 'BL1', name: 'BL1', group: 'BL', groupName: 'طیف بلیچ (Bleach Shades)', hexColor: '#FFFFFF', enamelHex: '#FFFFFF', description: 'فوق سفید یخچالی (بیشترین روشنی ممکن)' },
  { code: 'BL2', name: 'BL2', group: 'BL', groupName: 'طیف بلیچ (Bleach Shades)', hexColor: '#FAF9F4', enamelHex: '#FFFFFF', description: 'بلیچ بسیار درخشان و پرطرفدار' },
  { code: 'BL3', name: 'BL3', group: 'BL', groupName: 'طیف بلیچ (Bleach Shades)', hexColor: '#F5F4EC', enamelHex: '#FBFBFA', description: 'سفید زیبایی با حفظ طبیعی بودن' },
  { code: 'BL4', name: 'BL4', group: 'BL', groupName: 'طیف بلیچ (Bleach Shades)', hexColor: '#F0EFE7', enamelHex: '#F7F7F2', description: 'سفید طبیعی حد فاصل بلیچ و B1' },
]

export const VITA_GROUPS: VitaShadeGroup[] = [
  {
    id: 'A',
    name: 'گروه A',
    hueDescription: 'قهوه‌ای مایل به قرمز (طیف گرم و شایع‌ترین)',
    shades: VITA_SHADES.filter((s) => s.group === 'A'),
  },
  {
    id: 'B',
    name: 'گروه B',
    hueDescription: 'زرد مایل به قرمز',
    shades: VITA_SHADES.filter((s) => s.group === 'B'),
  },
  {
    id: 'C',
    name: 'گروه C',
    hueDescription: 'خاکستری / سرد',
    shades: VITA_SHADES.filter((s) => s.group === 'C'),
  },
  {
    id: 'D',
    name: 'گروه D',
    hueDescription: 'خاکستری مایل به قرمز',
    shades: VITA_SHADES.filter((s) => s.group === 'D'),
  },
  {
    id: 'BL',
    name: 'بلیچ (Bleach)',
    hueDescription: 'سفید درخشان و هالیوودی',
    shades: VITA_SHADES.filter((s) => s.group === 'BL'),
  },
]

/**
 * Finds a VITA shade by code (case-insensitive, trims spaces).
 */
export function getVitaShade(code: string | null | undefined): VitaShade | undefined {
  if (!code) return undefined
  const clean = code.trim().toUpperCase()
  return VITA_SHADES.find((s) => s.code.toUpperCase() === clean)
}

/**
 * Checks whether a shade code matches the official VITA Classical / Bleach guide.
 */
export function isValidVitaShade(code: string | null | undefined): boolean {
  return Boolean(getVitaShade(code))
}
