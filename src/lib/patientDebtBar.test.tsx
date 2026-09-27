// @vitest-environment jsdom
/**
 * MOD-FEAT-027 | تست میان‌بر پرداخت
 *
 * گزارش مهدی: «هرجا مانده بدهی رو نشون می‌ده، همون بالا گزینه داشته باشه
 * که میان‌بر بشه راحت پرداختش کرد.»
 *
 * بدهی در سه جا دیده می‌شد — فهرست بیماران، پرونده‌ی بیمار، دفتر مالی —
 * و از هیچ‌کدام قابل پرداخت نبود. دیدن اینکه کسی پنج میلیون بدهکار است و
 * بعد رفتن به ماژول دیگر، پیدا کردنش در یک کرکره و تایپ دوباره‌ی مبلغ،
 * یعنی سه فرصت برای انتخاب بیمار یا عدد اشتباه.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PatientDebtBar } from '../components/PatientDebtBar'

const navigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigate }
})

afterEach(() => { cleanup(); navigate.mockClear() })

const bal = (balance: number, paid = 0, totalCost = balance) => ({ balance, paid, totalCost })

const show = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('🔴 بدهکار — مبلغ دیده می‌شود و قابل پرداخت است', () => {
  it('مبلغ مانده نوشته می‌شود، نه فقط کلمه‌ی بدهکار', () => {
    // مبالغ متفاوت داده شده تا تست واقعاً «مانده» را بسنجد نه هر عددی.
    show(<PatientDebtBar patientId="p1" balance={bal(5_000_000, 3_000_000, 8_000_000)} />)
    expect(screen.getByText('۵,۰۰۰,۰۰۰ تومان')).toBeDefined()
  })

  it('دکمه‌ی ثبت پرداخت هست', () => {
    show(<PatientDebtBar patientId="p1" balance={bal(5_000_000)} />)
    expect(screen.getByRole('button', { name: /ثبت پرداخت/ })).toBeDefined()
  })

  it('🔴 کلیک، مستقیم به فرم پرداخت با بیمار و مبلغ پرشده می‌رود', () => {
    // Billing از MOD-FIX-008 این حالت را می‌پذیرد و تا امروز هیچ‌کس
    // صدایش نمی‌زد.
    show(<PatientDebtBar patientId="p1" balance={bal(5_000_000)} />)
    screen.getByRole('button', { name: /ثبت پرداخت/ }).click()
    expect(navigate).toHaveBeenCalledWith('/billing', {
      state: { openPaymentForPatientId: 'p1', suggestedAmount: 5_000_000 },
    })
  })

  it('هزینه و پرداختی هم نشان داده می‌شوند', () => {
    // تا عددِ بالا قابل بررسی باشد، نه فقط قابل اعتماد.
    show(<PatientDebtBar patientId="p1" balance={bal(3_000_000, 7_000_000, 10_000_000)} />)
    expect(screen.getByText(/هزینه/)).toBeDefined()
    expect(screen.getByText(/پرداختی/)).toBeDefined()
  })
})

describe('بیمار تسویه', () => {
  it('دکمه‌ی پرداخت نمی‌گیرد', () => {
    // دکمه‌ای که کاری ندارد، دعوت به پرداختی است که کسی بدهکارش نیست.
    show(<PatientDebtBar patientId="p1" balance={bal(0, 5_000_000, 5_000_000)} />)
    expect(screen.queryByRole('button', { name: /ثبت پرداخت/ })).toBeNull()
    expect(screen.getByText(/تسویه/)).toBeDefined()
  })

  it('اضافه‌پرداخت هم دکمه نمی‌گیرد', () => {
    show(<PatientDebtBar patientId="p1" balance={bal(-2_000_000)} />)
    expect(screen.queryByRole('button', { name: /ثبت پرداخت/ })).toBeNull()
  })

  it('در حالت فشرده، بیمار تسویه چیزی نشان نمی‌دهد', () => {
    const { container } = show(<PatientDebtBar patientId="p1" balance={bal(0)} variant="compact" />)
    expect(container.textContent).toBe('')
  })
})

describe('حالت فشرده برای سطر فهرست', () => {
  it('مبلغ روی خود دکمه است', () => {
    show(<PatientDebtBar patientId="p1" balance={bal(5_000_000)} variant="compact" />)
    expect(screen.getByRole('button', { name: /مانده ۵,۰۰۰,۰۰۰/ })).toBeDefined()
  })

  it('🔴 کلیک روی میان‌بر، سطر را هم باز نمی‌کند', () => {
    // بدون stopPropagation یک لمس دو کار انجام می‌داد.
    const rowClick = vi.fn()
    show(
      <div onClick={rowClick}>
        <PatientDebtBar patientId="p1" balance={bal(5_000_000)} variant="compact" />
      </div>,
    )
    screen.getByRole('button', { name: /مانده/ }).click()
    expect(navigate).toHaveBeenCalled()
    expect(rowClick).not.toHaveBeenCalled()
  })
})

describe('بدون داده‌ی مالی', () => {
  it('نبود مانده، برنامه را نمی‌شکند', () => {
    show(<PatientDebtBar patientId="p1" balance={undefined} />)
    expect(screen.getByText(/تسویه/)).toBeDefined()
  })
})

/** قفل ساختاری: هر سه جا از همان کامپوننت استفاده کنند. */
import patients from '../pages/Patients.tsx?raw'
import patientDetail from '../pages/PatientDetail.tsx?raw'
import billing from '../pages/Billing.tsx?raw'

describe('🔴 بدهی هرجا دیده می‌شود، از همان‌جا قابل پرداخت است', () => {
  it('فهرست بیماران و پرونده‌ی بیمار از کامپوننت مشترک استفاده می‌کنند', () => {
    expect(patients).toContain('PatientDebtBar')
    expect(patientDetail).toContain('PatientDebtBar')
  })

  it('چیپ «بدهکار» بدون مبلغ دیگر وجود ندارد', () => {
    expect(patients).not.toContain('>بدهکار</span>')
  })

  it('فهرست پرداخت‌ها مانده‌حساب بیمار را هم نشان می‌دهد', () => {
    expect(billing).toContain('مانده‌حساب این بیمار')
  })
})
