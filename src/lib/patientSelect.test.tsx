// @vitest-environment jsdom
/**
 * MOD-FEAT-025 | تست انتخابگر مشترک بیمار
 *
 * ممیزی مورد ۱: شش صفحه هرکدام فهرست بیماران خودشان را می‌ساختند، با
 * سه قالب متفاوت برچسب، و هیچ‌کدام نمی‌گفتند بیمار بدهکار است. در فرم
 * پرداخت بیماری را انتخاب می‌کردی بدون اینکه ببینی بدهکار است — همان
 * اطلاعاتی که دو لمس آن‌طرف‌تر با چیپ قرمز نشان داده می‌شد.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { PatientSelect, patientLabel } from '../components/PatientSelect'
import type { Patient } from '../types'

afterEach(cleanup)

const patient = (over: Partial<Patient>): Patient =>
  ({ id: 'p1', first_name: 'مهدی', last_name: 'امیری', file_number: 'MD-1000', is_active: true, ...over } as Patient)

const balances = (entries: [string, number][]) =>
  new Map(entries.map(([id, balance]) => [id, { balance, paid: 0, totalCost: balance }]))

describe('قالب برچسب — یکی برای همه', () => {
  it('نام و شماره‌ی پرونده با هم', () => {
    expect(patientLabel(patient({}))).toBe('مهدی امیری — MD-1000')
  })

  it('بدون شماره‌ی پرونده فقط نام', () => {
    expect(patientLabel(patient({ file_number: null as never }))).toBe('مهدی امیری')
  })
})

describe('🔴 بدهکاری هنگام انتخاب بیمار دیده می‌شود', () => {
  it('مبلغ بدهی کنار نام می‌آید', () => {
    render(
      <PatientSelect value="" onChange={() => {}} patients={[patient({})]}
        balances={balances([['p1', 5_000_000]])} />,
    )
    expect(screen.getByRole('option', { name: /بدهکار/ })).toBeDefined()
  })

  it('بیمار تسویه نشان بدهکاری نمی‌گیرد', () => {
    render(
      <PatientSelect value="" onChange={() => {}} patients={[patient({})]}
        balances={balances([['p1', 0]])} />,
    )
    expect(screen.queryByRole('option', { name: /بدهکار/ })).toBeNull()
  })

  it('اضافه‌پرداخت هم بدهکار حساب نمی‌شود', () => {
    // مانده‌ی منفی یعنی کلینیک به بیمار بدهکار است، نه برعکس.
    render(
      <PatientSelect value="" onChange={() => {}} patients={[patient({})]}
        balances={balances([['p1', -2_000_000]])} />,
    )
    expect(screen.queryByRole('option', { name: /بدهکار/ })).toBeNull()
  })

  it('بدون داده‌ی مالی، انتخابگر همچنان کار می‌کند', () => {
    // پنج صفحه از شش صفحه دفتر مالی را بارگذاری نمی‌کنند.
    render(<PatientSelect value="" onChange={() => {}} patients={[patient({})]} />)
    expect(screen.getByRole('option', { name: 'مهدی امیری — MD-1000' })).toBeDefined()
  })
})

describe('بیمار غیرفعال', () => {
  it('در فهرست انتخاب نمی‌آید', () => {
    render(<PatientSelect value="" onChange={() => {}} patients={[patient({ is_active: false })]} />)
    expect(screen.queryByRole('option', { name: /مهدی/ })).toBeNull()
  })

  it('🔴 اگر همان بیمارِ انتخاب‌شده باشد، حذف نمی‌شود', () => {
    // باز کردن یک رکورد قدیمی نباید بیمار خودش را بی‌صدا بیندازد.
    render(<PatientSelect value="p1" onChange={() => {}} patients={[patient({ is_active: false })]} />)
    expect(screen.getByRole('option', { name: /مهدی/ })).toBeDefined()
  })
})

describe('گزینه‌ی خالی', () => {
  it('برای یادآورها گزینه‌ی «بدون بیمار» هست', () => {
    render(<PatientSelect allowEmpty value="" onChange={() => {}} patients={[patient({})]} />)
    expect(screen.getByRole('option', { name: 'بدون بیمار مشخص' })).toBeDefined()
  })

  it('در حالت عادی چنین گزینه‌ای نیست', () => {
    render(<PatientSelect value="" onChange={() => {}} patients={[patient({})]} />)
    expect(screen.queryByRole('option', { name: 'بدون بیمار مشخص' })).toBeNull()
  })
})

describe('جستجو فقط وقتی لازم است', () => {
  const many = Array.from({ length: 12 }, (_, i) =>
    patient({ id: `p${i}`, first_name: `بیمار${i}`, file_number: `MD-${1000 + i}` }))

  it('با فهرست بلند، جعبه‌ی جستجو ظاهر می‌شود', () => {
    render(<PatientSelect value="" onChange={() => {}} patients={many} />)
    expect(screen.getByPlaceholderText(/جستجو در/)).toBeDefined()
  })

  it('با فهرست کوتاه، جعبه‌ی جستجو نیست', () => {
    // زیر این تعداد، جعبه فقط یک چیز اضافه برای رد شدن است.
    render(<PatientSelect value="" onChange={() => {}} patients={[patient({})]} />)
    expect(screen.queryByPlaceholderText(/جستجو در/)).toBeNull()
  })
})

/** قفل ساختاری: هیچ صفحه‌ای فهرست بیمار خودش را نسازد. */
import billing from '../pages/Billing.tsx?raw'
import implants from '../pages/Implants.tsx?raw'
import prescriptions from '../pages/Prescriptions.tsx?raw'
import waitingList from '../pages/WaitingList.tsx?raw'
import reminders from '../pages/Reminders.tsx?raw'
import laboratory from '../pages/Laboratory.tsx?raw'

describe('🔴 یک انتخابگر بیمار در تمام برنامه', () => {
  const PAGES: [string, string][] = [
    ['Billing', billing], ['Implants', implants], ['Prescriptions', prescriptions],
    ['WaitingList', waitingList], ['Reminders', reminders], ['Laboratory', laboratory],
  ]

  it('همه از کامپوننت مشترک استفاده می‌کنند', () => {
    for (const [name, src] of PAGES) {
      expect(src, name).toContain('PatientSelect')
    }
  })

  it('هیچ صفحه‌ای patientOptions خودش را نمی‌سازد', () => {
    for (const [name, src] of PAGES) {
      expect(src, `${name} هنوز فهرست بیمار خودش را می‌سازد`).not.toContain('const patientOptions')
    }
  })
})
