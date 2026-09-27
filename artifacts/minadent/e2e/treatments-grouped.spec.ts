import { test, expect } from '@playwright/test'
import { signIn, seed, CLINIC_ID } from './support/harness'
const NOW = new Date().toISOString()
const base = (id: string) => ({ id, clinic_id: CLINIC_ID, created_at: NOW, updated_at: NOW, sync_version: 1 })
const D1='d1', D2='d2', P1='pa1', P2='pa2'
test.setTimeout(90_000)
test('🔴 درمان‌های یک بیمار زیر یک پرونده جمع می‌شوند، نه ردیف‌های پراکنده', async ({ page }) => {
  await signIn(page)
  await seed(page, {
    doctors: [
      { ...base(D1), name: 'سارا رضایی', specialty: 'ترمیمی', is_active: true },
      { ...base(D2), name: 'رضا کریمی', specialty: 'جراحی', is_active: true },
    ],
    patients: [
      { ...base(P1), first_name: 'آبا', last_name: 'امیری', phone: '09120000001', national_id: '1', is_active: true, file_number: 'MD-1001' },
      { ...base(P2), first_name: 'مینا', last_name: 'کبیری', phone: '09120000002', national_id: '2', is_active: true, file_number: 'MD-1002' },
    ],
    encounters: [
      { ...base('e1'), patient_id: P1, doctor_id: D1, encounter_date: '2026-01-10', status: 'completed', total_amount: 3000000, diagnosis: 'پوسیدگی' },
      { ...base('e2'), patient_id: P1, doctor_id: D1, encounter_date: '2026-02-14', status: 'completed', total_amount: 12000000, diagnosis: 'روکش' },
      { ...base('e3'), patient_id: P1, doctor_id: D2, encounter_date: '2026-03-01', status: 'in_progress', total_amount: 5000000, diagnosis: 'جراحی لثه' },
      { ...base('e4'), patient_id: P2, doctor_id: D1, encounter_date: '2026-02-20', status: 'completed', total_amount: 2000000, diagnosis: 'معاینه' },
    ],
    treatments: [
      { ...base('t1'), encounter_id: 'e1', patient_id: P1, doctor_id: D1, tooth_number: '11', total_price: 3000000, status: 'completed', procedure_name: 'ترمیم' },
      { ...base('t2'), encounter_id: 'e2', patient_id: P1, doctor_id: D1, tooth_number: '46', total_price: 12000000, status: 'completed', procedure_name: 'روکش' },
      { ...base('t3'), encounter_id: 'e3', patient_id: P1, doctor_id: D2, tooth_number: '36', total_price: 5000000, status: 'planned', procedure_name: 'جراحی' },
      { ...base('t4'), encounter_id: 'e4', patient_id: P2, doctor_id: D1, tooth_number: '21', total_price: 2000000, status: 'completed', procedure_name: 'معاینه' },
    ],
    payments: [
      { ...base('pay1'), patient_id: P1, encounter_id: 'e1', implant_case_id: null, treatment_id: null, doctor_id: D1, amount: 8000000, payment_method: 'cash', status: 'completed', payment_date: '2026-02-14', reference: null, notes: null, created_by: null },
    ],
    cheques: [
      { ...base('chq1'), patient_id: P1, amount: 4000000, bank_name: 'ملت', branch: null, cheque_number: '123', account_number: null, issue_date: '2026-02-01', due_date: '2026-04-01', payee_name: null, status: 'pending' },
    ],
  } as Record<string, any[]>)
  await page.reload(); await page.waitForLoadState('networkidle')
  await page.goto('/#/treatments'); await page.waitForTimeout(1500)

  // 🔴 گزارش مهدی: سه ویزیتِ «آبا امیری» باید یک پرونده باشند، نه سه ردیف.
  await expect(page.getByText('آبا امیری')).toHaveCount(1)
  // پرونده‌ی جمع‌شده تصویر مالی را نشان می‌دهد
  await expect(page.getByText('۳ ویزیت').first()).toBeVisible()
  await expect(page.getByText(/۲ پزشک/).first()).toBeVisible() // تعویض پزشک دیده می‌شود

  // باز کردن پرونده → تاریخچه‌ی ویزیت‌ها با پزشکِ هر ویزیت
  await page.getByText('آبا امیری').first().click()
  await page.waitForTimeout(600)
  const txt = await page.locator('body').innerText()
  expect(txt, 'کل هزینه ۲۰م').toMatch(/۲۰[,٬]۰۰۰[,٬]۰۰۰/)
  expect(txt, 'مانده ۱۲م').toMatch(/۱۲[,٬]۰۰۰[,٬]۰۰۰/)
  expect(txt, 'چک در انتظار').toContain('چک در انتظار')
  expect(txt, 'هر دو پزشک روی ویزیت‌ها دیده شوند').toContain('رضا کریمی')
  expect(txt).toContain('سارا رضایی')
})
