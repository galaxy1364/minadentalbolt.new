/**
 * MOD-UI-011 | تست صداقت برچسب دکمه‌ها
 *
 * این تست از جنس `recordSafety.test.ts` است: ادعای سطح-سورس، نه رفتاری.
 * دلیلش هم همان است — رفتار واقعی در Postgres و در `deactivate*` هاست و
 * از تست واحد قابل رسیدن نیست، ولی چیزی که **می‌تواند برگردد** این است
 * که یک نفر دوباره دکمه‌ای بگذارد که «حذف» می‌گوید و در واقع غیرفعال
 * می‌کند. همان چیزی که در v1.171 در ۱۳ جا وجود داشت:
 *
 *   • «حذف قطعی» روی دکمه‌ای که فقط `is_active: false` می‌زد (انبار، لیست انتظار)
 *   • توست «حذف شد» بعد از `cancelPersonalFinanceItem`
 *   • توست «کامپوننت حذف شد» بعد از `deactivateImplantComponent`
 *
 * ضرر واقعی‌اش دوطرفه است: یا کاربر فکر می‌کند داده رفته و دنبالش
 * نمی‌گردد، یا از ترس «قطعی» بودن اصلاً دکمه را نمی‌زند.
 */
import { describe, it, expect } from 'vitest'
import confirmAction from '../components/ConfirmAction.tsx?raw'
import implants from '../pages/Implants.tsx?raw'
import inventory from '../pages/Inventory.tsx?raw'
import waitingList from '../pages/WaitingList.tsx?raw'
import personalFinance from '../pages/PersonalFinance.tsx?raw'
import billing from '../pages/Billing.tsx?raw'
import settings from '../pages/Settings.tsx?raw'
import laboratory from '../pages/Laboratory.tsx?raw'
import insurance from '../pages/Insurance.tsx?raw'
import prescriptions from '../pages/Prescriptions.tsx?raw'
import appointments from '../pages/Appointments.tsx?raw'
import patientDetail from '../pages/PatientDetail.tsx?raw'

/** هر صفحه‌ای که پنجره‌ی تأیید نشان می‌دهد. */
const PAGES: [string, string][] = [
  ['Implants', implants], ['Inventory', inventory], ['WaitingList', waitingList],
  ['PersonalFinance', personalFinance], ['Billing', billing], ['Settings', settings],
  ['Laboratory', laboratory], ['Insurance', insurance], ['Prescriptions', prescriptions],
  ['Appointments', appointments], ['PatientDetail', patientDetail],
]

describe('پنجره‌ی تأیید نوع «حذف» ندارد', () => {
  it("نوع 'delete' از ConfirmAction برداشته شده", () => {
    expect(confirmAction).not.toContain("'create' | 'edit' | 'delete' | 'status'")
    expect(confirmAction).toContain("'create' | 'edit' | 'status'")
  })

  it('هیچ صفحه‌ای پنجره‌ی حذف باز نمی‌کند', () => {
    for (const [name, src] of PAGES) {
      expect(src, `${name} هنوز type: 'delete' دارد`).not.toContain("type: 'delete'")
    }
  })

  it('متن «اجرای قطعی» دیگر جایی گفته نمی‌شود', () => {
    expect(confirmAction).not.toContain('اجرای قطعی این عملیات')
  })
})

describe('برچسب دکمه با کاری که می‌کند می‌خواند', () => {
  it('هیچ دکمه‌ای «حذف قطعی» نمی‌گوید', () => {
    for (const [name, src] of PAGES) {
      expect(src, `${name}`).not.toContain('حذف قطعی')
    }
  })

  it('هیچ توست موفقیتی خبر از حذف نمی‌دهد', () => {
    for (const [name, src] of PAGES) {
      expect(src, `${name}`).not.toContain("showToast('success', 'حذف شد')")
      expect(src, `${name}`).not.toContain('کامپوننت حذف شد')
    }
  })

  it('عملی که غیرفعال می‌کند، عنوانش هم «حذف» نیست', () => {
    // هر عنوان پنجره‌ای که کلمه‌ی «حذف» دارد باید واقعاً حذف کند — و
    // چون در کل api.ts هیچ حذفی نیست، پس هیچ عنوانی نباید «حذف» را به
    // عنوان کارِ همین دکمه اعلام کند.
    //
    // استثنا فقط جمله‌های **منفی** است: «این شرکت بیمه قابل حذف نیست»
    // دقیقاً همان صداقتی است که این تست دنبالش است، نه نقض آن.
    for (const [name, src] of PAGES) {
      const titles = [...src.matchAll(/title: '([^']*)'/g)].map((m) => m[1])
      const lying = titles.filter((t) => t.includes('حذف') && !t.includes('نیست'))
      expect(lying, `${name} عنوان حذف‌دار دارد`).toEqual([])
    }
  })
})
