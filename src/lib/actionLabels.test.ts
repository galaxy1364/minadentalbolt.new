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
import treatments from '../pages/Treatments.tsx?raw'

/** هر صفحه‌ای که پنجره‌ی تأیید نشان می‌دهد. */
const PAGES: [string, string][] = [
  ['Implants', implants], ['Inventory', inventory], ['WaitingList', waitingList],
  ['PersonalFinance', personalFinance], ['Billing', billing], ['Settings', settings],
  ['Laboratory', laboratory], ['Insurance', insurance], ['Prescriptions', prescriptions],
  ['Appointments', appointments], ['PatientDetail', patientDetail],
  // MOD-FIX-019: Treatments was missing from this list, which is the only
  // reason MOD-UI-011 could fix twelve pages and leave two red bins behind
  // on the thirteenth. A guard that does not cover a file cannot defend it.
  ['Treatments', treatments],
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

describe('MOD-FIX-019 | آیکون هم مثل متن باید راست بگوید', () => {
  /**
   * تست MOD-UI-011 فقط `type: 'delete'` و متن‌ها را می‌پایید. آیکون را نه —
   * پس `Treatments` می‌توانست پنجره‌ی درست «لغو ویزیت» را باز کند و روی
   * ردیف هنوز سطل زباله‌ی قرمز نشان بدهد. کاربر آیکون را زودتر از عنوان
   * پنجره می‌بیند.
   */
  const CANCEL_HANDLERS = ['handleCancelEncounter', 'handleCancelTreatment']

  /** The whole <button…>…</button>, icon included — not just its opening tag. */
  const buttonsFor = (handler: string) => {
    const re = new RegExp(`<button[^>]*onClick=\\{\\(\\) => ${handler}\\([^)]*\\)\\}[\\s\\S]*?</button>`, 'g')
    return [...treatments.matchAll(re)].map((m) => m[0])
  }

  it('دکمه‌های لغو در Treatments سطل زباله نشان نمی‌دهند', () => {
    for (const handler of CANCEL_HANDLERS) {
      const buttons = buttonsFor(handler)
      expect(buttons.length, `${handler} هیچ دکمه‌ای ندارد — نام عوض شده؟`).toBeGreaterThan(0)
      for (const b of buttons) {
        expect(b, `${handler} هنوز سطل زباله دارد`).not.toContain('Trash2')
      }
    }
  })

  it('هر دکمه‌ی لغو نام قابل خواندن دارد', () => {
    // بدون برچسب، دکمه فقط یک آیکون است: نه صفحه‌خوان می‌فهمد نه تست.
    for (const handler of CANCEL_HANDLERS) {
      const buttons = buttonsFor(handler)
      expect(buttons.length, `${handler} هیچ دکمه‌ای ندارد`).toBeGreaterThan(0)
      for (const b of buttons) {
        expect(b, `${handler} بدون aria-label است`).toContain('aria-label')
      }
    }
  })

  it('هیچ هندلری در Treatments اسم «Delete» ندارد', () => {
    // اسم داخلی هم بخشی از همان دروغ است: هرکس بعداً این تابع را ببیند
    // فکر می‌کند واقعاً حذف می‌کند و رفتار را به همان سمت می‌برد.
    expect(treatments).not.toContain('handleDeleteEncounter')
    expect(treatments).not.toContain('handleDeleteTreatment')
  })
})
