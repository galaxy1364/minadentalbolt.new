// @vitest-environment jsdom
/**
 * MOD-FEAT-031 | تست نمای کلی مالی بیمار
 *
 * گزارش مهدی: «وقتی کلیک کنیم، کل پرداختی‌ها، تاریخش، بابت چه دندونی،
 * کدوم دکتر — همه اونا تو تاریخچه‌ی این قسمت وجود داشته باشه. نمای کلی
 * کل پرداخت‌ها و چک‌هاشون هم نشون بده.»
 *
 * قطعاتش همه وجود داشتند و هیچ‌وقت کنار هم نشان داده نمی‌شدند: مانده در
 * یک صفحه، دندان و پزشکِ هر پرداخت در جای دیگر، چک‌ها در سومی.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PatientFinanceOverview } from '../components/PatientFinanceOverview'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

afterEach(cleanup)

const treatment = {
  id: 't-11', patient_id: 'p1', procedure_name: 'بیلدآپ', tooth_number: '11',
  doctor_id: 'd1', total_price: 8_000_000, status: 'completed',
} as never

const payment = (over: Record<string, unknown> = {}) => ({
  id: 'pay1', patient_id: 'p1', amount: 3_000_000, payment_date: '2026-08-31',
  payment_method: 'نقدی', status: 'completed', treatment_id: 't-11',
  encounter_id: null, implant_case_id: null, doctor_id: null, ...over,
}) as never

const doctors = [{ id: 'd1', name: 'مینا مازندارنی' }] as never

const show = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>)

const base = {
  patientId: 'p1', patientName: 'ابا امیری',
  treatments: [treatment], doctors, implantCases: [], cheques: [],
}

describe('🔴 تاریخچه‌ی پرداخت با دندان و پزشک', () => {
  it('مبلغ هر پرداخت نشان داده می‌شود', () => {
    show(<PatientFinanceOverview {...base} payments={[payment()]} />)
    expect(screen.getByText('۳,۰۰۰,۰۰۰ ت')).toBeDefined()
  })

  it('🔴 بابت کدام دندان و کدام پزشک', () => {
    // همان resolveAttribution که فهرست پرداخت‌ها و رسید استفاده می‌کنند،
    // پس هر سه یک چیز می‌گویند.
    show(<PatientFinanceOverview {...base} payments={[payment()]} />)
    expect(screen.getByText(/بیلدآپ/)).toBeDefined()
    expect(screen.getByText(/دندان ۱┘/)).toBeDefined()
    expect(screen.getByText(/مینا مازندارنی/)).toBeDefined()
  })

  it('پرداخت بدون درمان، صریح می‌گوید مشخص نشده', () => {
    show(<PatientFinanceOverview {...base} payments={[payment({ treatment_id: null })]} />)
    expect(screen.getByText('بابت مشخص نشده')).toBeDefined()
  })

  it('پرداخت بیمار دیگر نشان داده نمی‌شود', () => {
    show(<PatientFinanceOverview {...base} payments={[payment({ patient_id: 'p2' })]} />)
    expect(screen.getByText('هنوز پرداختی ثبت نشده')).toBeDefined()
  })

  it('تازه‌ترین پرداخت اول می‌آید', () => {
    // سؤالی که پرسیده می‌شود تقریباً همیشه درباره‌ی آخرین پرداخت است.
    show(<PatientFinanceOverview {...base} payments={[
      payment({ id: 'old', amount: 1_000_000, payment_date: '2026-01-01' }),
      payment({ id: 'new', amount: 9_000_000, payment_date: '2026-08-31' }),
    ]} />)
    const amounts = screen.getAllByText(/ ت$/).map((e) => e.textContent)
    expect(amounts[0]).toContain('۹,۰۰۰,۰۰۰')
  })
})

describe('🔴 چک‌ها در همان نما', () => {
  const cheque = (over: Record<string, unknown> = {}) => ({
    id: 'c1', patient_id: 'p1', amount: 2_000_000, due_date: '2026-10-01',
    status: 'pending', purpose: 'payment', payment_plan_id: null, ...over,
  }) as never

  it('چک با مبلغ و سررسید نشان داده می‌شود', () => {
    show(<PatientFinanceOverview {...base} payments={[]} cheques={[cheque()]} />)
    expect(screen.getByText('۲,۰۰۰,۰۰۰ ت')).toBeDefined()
    expect(screen.getByText(/سررسید/)).toBeDefined()
  })

  it('چک ضمانت برچسب خودش را دارد', () => {
    show(<PatientFinanceOverview {...base} payments={[]} cheques={[cheque({ purpose: 'guarantee' })]} />)
    expect(screen.getByText('ضمانت')).toBeDefined()
  })

  it('🔴 ضمانت بدون طرح قسطی، هم روی خود چک و هم در هشدار پایین', () => {
    // دو جا عمدی است و تکرار منطق نیست: سطر می‌گوید **کدام** چک، و
    // هشدار پایین می‌گوید **چرا** مهم است. با چند چک، فقط یکی‌شان کافی
    // نیست.
    show(<PatientFinanceOverview {...base} payments={[]} cheques={[cheque({ purpose: 'guarantee' })]} />)
    expect(screen.getAllByText(/بدون طرح قسطی/)).toHaveLength(2)
    expect(screen.getByText(/برنامه‌ی وصولی ندارد/)).toBeDefined()
  })

  it('بدون چک، بخش چک‌ها اصلاً نمایش داده نمی‌شود', () => {
    show(<PatientFinanceOverview {...base} payments={[payment()]} />)
    expect(screen.queryByText(/چک‌ها \(/)).toBeNull()
  })
})

describe('هشدارها', () => {
  it('پرداخت در انتظار یادآوری می‌شود', () => {
    show(<PatientFinanceOverview {...base} payments={[payment({ status: 'pending' })]} />)
    expect(screen.getByText(/هنوز تکمیل نشده/)).toBeDefined()
  })

  it('بدون پرداخت در انتظار، هشداری نیست', () => {
    show(<PatientFinanceOverview {...base} payments={[payment()]} />)
    expect(screen.queryByText(/هنوز تکمیل نشده/)).toBeNull()
  })
})

/** قفل ساختاری: از مالی قابل باز شدن است. */
import billing from '../pages/Billing.tsx?raw'

describe('🔴 از فهرست پرداخت‌ها باز می‌شود', () => {
  it('نام بیمار روی کارت قابل کلیک است', () => {
    expect(billing).toContain('setFinanceOverviewPatientId')
  })

  it('نما از کامپوننت مشترک می‌آید، نه نسخه‌ی درون‌خطی', () => {
    expect(billing).toContain('<PatientFinanceOverview')
  })
})

/**
 * MOD-FEAT-038 | تاریخچه‌ی کامل بیمار
 *
 * گزارش مهدی: «تاریخچه کارهای بیمار به همراه دیتیل دقیق شماره دندان و
 * تاریخ و قیمت و نام پزشک کامل شود و تاریخچه همیشه همه را نشان دهد.»
 */
import patientDetail from '../pages/PatientDetail.tsx?raw'

describe('🔴 ردیف درمان، تاریخ و پزشک و سطح را می‌گوید', () => {
  it('تاریخ درمان نشان داده می‌شود', () => {
    // ردیف پیش از این فقط رویه، وضعیت و قیمت داشت.
    expect(patientDetail).toContain("toJalaliStringPretty(String(t.created_at).slice(0, 10))")
  })

  it('نام پزشک نشان داده می‌شود', () => {
    expect(patientDetail).toContain('getDoctorName(t.doctor_id)')
  })

  it('سطوح با نماد استاندارد نشان داده می‌شوند', () => {
    expect(patientDetail).toContain('formatSurfaces(t.tooth_surface)')
  })
})

describe('🔴 تاریخچه چیزی را برای همیشه پنهان نمی‌کند', () => {
  it('همه‌ی تغییرات بارگذاری می‌شوند، نه فقط هشت‌تا', () => {
    expect(patientDetail).not.toContain('setRecordHistory(entries.slice(0, 8))')
    expect(patientDetail).toContain('setRecordHistory(entries)')
  })

  it('بقیه با یک لمس قابل دیدن است', () => {
    expect(patientDetail).toContain('نمایش همه‌ی')
  })
})

describe('🔴 یک تاریخچه‌ی پرداخت، نه دو', () => {
  it('تب پرداخت‌ها از نمای مشترک استفاده می‌کند', () => {
    // MOD-FEAT-031 عمداً اینجا نایستاد تا دو نما نسازد. راه درست حذف
    // فهرست دستی بود، نه اضافه کردن سومی.
    expect(patientDetail).toContain('<PatientFinanceOverview')
  })

  it('دفتر پزشکان — چیزی که فقط این تب داشت — مانده', () => {
    expect(patientDetail).toContain('{renderDoctorLedger()}')
  })

  it('کارت‌های خلاصه‌ی تکراری حذف شدند', () => {
    // نوار مانده داخل نمای مشترک همان سه عدد را دارد.
    expect(patientDetail).not.toContain('<p className="text-xs text-slate-500 mb-1">کل هزینه درمان</p>')
  })
})
