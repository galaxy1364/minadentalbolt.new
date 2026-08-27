/**
 * MOD-UI-004 | محاسبه‌ی کنتراست WCAG 2.2
 *
 * چرا این ماژول در یک نرم‌افزار پزشکی حیاتی است:
 * متنی که خوانده نشود، اطلاعاتی است که به بیمار داده نمی‌شود.
 * مبلغ کم‌رنگ یا هشدار محو، خطای واقعی می‌سازد.
 *
 * مبنای انتخابی (جستجوشده، ۱۴۰۵/۰۶):
 * - **WCAG 2.2 AA** معیار قانونی است (ADA آمریکا، EAA اروپا از خرداد
 *   ۱۴۰۵). آستانه‌ها: ۴.۵:۱ متن معمولی، ۳:۱ متن بزرگ و اجزای رابط.
 * - **APCA** دقیق‌تر است ولی هنوز الزام قانونی نیست و در WCAG 3.0
 *   می‌آید؛ منابع صراحتاً می‌گویند فعلاً جایگزین WCAG نشود.
 *   بنابراین اینجا WCAG 2.2 پیاده شده، نه APCA — انتخاب عمدی.
 */

/** آستانه‌های رسمی WCAG 2.2 */
export const WCAG = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3,
  /** اجزای رابط و گرافیک — معیار موفقیت ۱.۴.۱۱ */
  AA_UI: 3,
  /** ظاهر فوکوس — معیار ۲.۴.۱۱، تازه در WCAG 2.2 */
  AA_FOCUS: 3,
  AAA_NORMAL: 7,
  AAA_LARGE: 4.5,
} as const

/** hex را به سه مؤلفه‌ی ۰..۲۵۵ تبدیل می‌کند */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '').trim()
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`رنگ نامعتبر: ${hex}`)
  }
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

/**
 * روشنایی نسبی طبق تعریف رسمی W3C.
 * ضرایب ۰.۲۱۲۶/۰.۷۱۵۲/۰.۰۷۲۲ وزن حساسیت چشم انسان به هر کانال است —
 * چشم به سبز بسیار حساس‌تر از آبی است، به همین دلیل متن آبی روی
 * پس‌زمینه‌ی تیره بدتر از سبز خوانده می‌شود.
 */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const channel = (v: number): number => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/**
 * نسبت کنتراست بین دو رنگ — عددی بین ۱:۱ (یکسان) تا ۲۱:۱
 * (سیاه خالص روی سفید خالص).
 */
export function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg)
  const l2 = relativeLuminance(bg)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2))
}

export type TextSize = 'normal' | 'large'

/** آیا این ترکیب استاندارد AA را برای متن پاس می‌کند؟ */
export function passesAA(fg: string, bg: string, size: TextSize = 'normal'): boolean {
  const ratio = contrastRatio(fg, bg)
  return ratio >= (size === 'large' ? WCAG.AA_LARGE : WCAG.AA_NORMAL)
}

/** آیا برای اجزای رابط (آیکون، حاشیه، فوکوس) کافی است؟ */
export function passesUI(fg: string, bg: string): boolean {
  return contrastRatio(fg, bg) >= WCAG.AA_UI
}

/**
 * کم‌ترین وزن قابل قبول را برمی‌گرداند — برای پیام خطای مفید در تست.
 * به‌جای «رد شد»، می‌گوید چقدر کم آورده.
 */
export function contrastReport(fg: string, bg: string): {
  ratio: number
  aaNormal: boolean
  aaLarge: boolean
  aaUI: boolean
} {
  const ratio = contrastRatio(fg, bg)
  return {
    ratio,
    aaNormal: ratio >= WCAG.AA_NORMAL,
    aaLarge: ratio >= WCAG.AA_LARGE,
    aaUI: ratio >= WCAG.AA_UI,
  }
}

/** پالت واقعی برنامه — همتای دقیق tailwind.config.js */
export const PALETTE = {
  primary: { 50: '#f0fdfa', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59' },
  slate:   { 50: '#f8fafc', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a' },
  success: { 50: '#f0fdf4', 600: '#16a34a', 700: '#15803d' },
  warning: { 50: '#fffbeb', 600: '#d97706', 700: '#b45309' },
  error:   { 50: '#fef2f2', 600: '#dc2626', 700: '#b91c1c' },
  white: '#ffffff',
} as const
