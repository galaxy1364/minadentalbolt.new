import type { Page, Route } from '@playwright/test'

/**
 * MOD-TEST-003 | یک مطب ساختگی، برای دیدن برنامه با چشم
 *
 * `clinic-flow.spec.ts` تا امروز همیشه skip می‌شد، چون بدون
 * `E2E_EMAIL`/`E2E_PASSWORD` نمی‌شد وارد شد — و آن دو در CI و در هیچ
 * محیط بی‌دسترسی‌ای وجود ندارند. نتیجه این بود که **هیچ‌کدام** از
 * تست‌های چیدمان هرگز اجرا نشدند، و همان لایه‌ای که قرار بود «قوس آینه»
 * و «قوس نصف‌عرض» را بگیرد، عملاً خاموش بود.
 *
 * This harness removes that dependency: it stubs the Supabase HTTP
 * surface (auth + PostgREST) and seeds the app's own IndexedDB, which is
 * where every read in `api.ts` already comes from. Nothing in `src/`
 * changes, no real credentials are needed, and the pages under test are
 * the real pages with real data in them.
 */

export const CLINIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

export const OWNER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'owner@minadent.test',
  password: 'e2e-password',
  full_name: 'مهدی (مدیر)',
  role: 'owner',
}

function session() {
  return {
    access_token: 'e2e-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'e2e-refresh-token',
    user: {
      id: OWNER.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: OWNER.email,
      app_metadata: { provider: 'email' },
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  }
}

const OWNER_ROW = {
  id: OWNER.id,
  clinic_id: CLINIC_ID,
  full_name: OWNER.full_name,
  role: OWNER.role,
  doctor_id: null,
  is_active: true,
}

/**
 * Answers every Supabase call locally. PostgREST reads return an empty
 * set so the sync loop is a no-op — the data under test is the seeded
 * IndexedDB, not a fixture the server could silently overwrite.
 */
export async function stubSupabase(page: Page) {
  await page.route('**://*.supabase.co/**', async (route: Route) => {
    const url = route.request().url()
    const method = route.request().method()
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

    if (url.includes('/auth/v1/token')) return json(session())
    if (url.includes('/auth/v1/user')) return json(session().user)
    if (url.includes('/auth/v1/logout')) return json({}, 204)

    if (url.includes('/rest/v1/users')) {
      // maybeSingle()/single() ask for a bare object rather than an array.
      const accept = route.request().headers()['accept'] || ''
      return json(accept.includes('pgrst.object') ? OWNER_ROW : [OWNER_ROW])
    }

    // Writes are accepted and dropped: the queue must drain, or a growing
    // "pending" badge would be read as a bug that isn't one.
    if (method !== 'GET') return json([], 201)
    return json([])
  })
}

/**
 * The Persian typeface comes from a public CDN. A machine that cannot
 * reach that CDN — CI behind a proxy, and routinely this clinic's own
 * network — logs a failed request, which turned the "no console errors"
 * smoke test red for a reason that has nothing to do with the app. The
 * stub answers with an empty stylesheet: the page then exercises the
 * fallback font stack, which is what those users see anyway.
 */
export async function stubFontCdn(page: Page) {
  await page.route('**://cdn.jsdelivr.net/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }))
}

/** Everything this app talks to that is not the app itself. */
export async function stubNetwork(page: Page) {
  await stubSupabase(page)
  await stubFontCdn(page)
}

/** Signs in through the real login form, so that path is exercised too. */
export async function signIn(page: Page) {
  await stubNetwork(page)
  await page.goto('/')
  await page.locator('input[type="email"]').fill(OWNER.email)
  await page.locator('input[type="password"]').fill(OWNER.password)
  await page.locator('button[type="submit"]').click()
  await page.waitForSelector('input[type="password"]', { state: 'detached', timeout: 20_000 })
}

/**
 * Writes rows straight into the Dexie stores. Dexie has already created
 * the object stores by the time the app has mounted once, so this opens
 * the existing database rather than declaring a schema that could drift
 * from `db.ts`.
 */
export async function seed(page: Page, rows: Record<string, any[]>) {
  await page.evaluate(async (data) => {
    const opened: IDBDatabase = await new Promise((resolve, reject) => {
      const req = indexedDB.open('minadent')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    const names = Object.keys(data).filter((t) => opened.objectStoreNames.contains(t))
    if (names.length === 0) { opened.close(); return }
    await new Promise<void>((resolve, reject) => {
      const tx = opened.transaction(names, 'readwrite')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      for (const name of names) {
        const store = tx.objectStore(name)
        for (const row of data[name]) store.put(row)
      }
    })
    opened.close()
  }, rows)
}

/**
 * Dates are relative to the run, never hard-coded: half of what the app
 * shows is "today", "this month", "overdue", so a fixture pinned to a
 * past date makes every dashboard read zero and hides whatever those
 * screens do when they actually have something to draw.
 */
const TODAY = new Date()
const iso = (d: Date) => d.toISOString()
const ymd = (d: Date) => d.toISOString().slice(0, 10)
const plusDays = (n: number) => new Date(TODAY.getTime() + n * 86_400_000)
const NOW = iso(TODAY)
export const TODAY_YMD = ymd(TODAY)

function base(id: string) {
  return { id, clinic_id: CLINIC_ID, created_at: NOW, updated_at: NOW, sync_version: 1 }
}

/**
 * One patient with a full trail behind them — appointment, encounter,
 * treatments on real teeth, a lab order, a payment that leaves a
 * balance. Enough for every module to have something to draw, which is
 * the point: an empty page hides layout bugs.
 */
export function demoData() {
  const doctorId = '22222222-2222-4222-8222-222222222222'
  const patientId = '33333333-3333-4333-8333-333333333333'
  const encounterId = '44444444-4444-4444-8444-444444444444'
  const labId = '55555555-5555-4555-8555-555555555555'
  const unitId = '66666666-6666-4666-8666-666666666666'

  return {
    ids: { doctorId, patientId, encounterId, labId, unitId },
    rows: {
      doctors: [{ ...base(doctorId), user_id: null, staff_id: null, name: 'دکتر سارا رضایی', specialty: 'ترمیمی', license_number: 'D-1001', color: '#7c3aed', is_active: true }],
      units: [{ ...base(unitId), name: 'یونیت ۱', number: 1, is_active: true }],
      patients: [{
        ...base(patientId), national_id: '0012345678', first_name: 'علی', last_name: 'محمدی',
        phone: '09121234567', phone2: null, email: null, birth_date: '1990-05-20', gender: 'male',
        address: 'تهران', medical_history: null, allergies: 'پنی‌سیلین', insurance_info: null,
        notes: null, avatar_url: null, is_active: true, file_number: 'MD-1000',
        file_number_manual: false, file_number_assigned_at: NOW, blood_type: 'O+',
        medications: null, medical_conditions: null, credit_limit: null, referral_source: null,
        vip_level: 0, tags: null, city: 'تهران', province: 'تهران', postal_code: null,
        insurance_number: null, primary_doctor_id: doctorId,
      }],
      procedures: [
        { ...base('77777777-7777-4777-8777-777777777771'), code: 'D2140', name: 'ترمیم یک سطحی', category: 'restorative', default_price: 3_000_000, description: null, is_active: true },
        { ...base('77777777-7777-4777-8777-777777777772'), code: 'D2750', name: 'روکش', category: 'prosthetic', default_price: 12_000_000, description: null, is_active: true },
      ],
      appointments: [{
        ...base('88888888-8888-4888-8888-888888888881'), patient_id: patientId, doctor_id: doctorId,
        unit_id: unitId, date: ymd(TODAY), start_time: '10:00', end_time: '10:30', status: 'scheduled',
        type: 'treatment', notes: null, duration_minutes: 30, reminder_sent: false, created_by: null,
        last_reminder_sent: null, reminder_count: 0, reminder_enabled: true, booking_source: 'clinic',
        confirmed_at: null, confirmed_by: null, estimated_fee: 3_000_000,
      }],
      encounters: [{
        ...base(encounterId), patient_id: patientId, doctor_id: doctorId, appointment_id: null,
        encounter_date: ymd(TODAY), chief_complaint: 'درد دندان', diagnosis: 'پوسیدگی',
        treatment_plan: null, notes: null, status: 'in_progress', total_amount: 15_000_000,
        paid_amount: 5_000_000, discount_amount: 0, created_by: null,
      }],
      treatments: [
        { ...base('99999999-9999-4999-8999-999999999991'), encounter_id: encounterId, patient_id: patientId, doctor_id: doctorId, tooth_number: '11', tooth_surface: 'M', procedure_code: 'D2140', procedure_name: 'ترمیم یک سطحی', description: null, quantity: 1, unit_price: 3_000_000, discount: 0, total_price: 3_000_000, lab_id: null, lab_cost: null, status: 'completed', notes: null, procedure_category: 'restorative', doctor_share: null, doctor_share_calculated: false },
        { ...base('99999999-9999-4999-8999-999999999992'), encounter_id: encounterId, patient_id: patientId, doctor_id: doctorId, tooth_number: '46', tooth_surface: null, procedure_code: 'D2750', procedure_name: 'روکش', description: null, quantity: 1, unit_price: 12_000_000, discount: 0, total_price: 12_000_000, lab_id: labId, lab_cost: 2_000_000, status: 'planned', notes: null, procedure_category: 'prosthetic', doctor_share: null, doctor_share_calculated: false },
      ],
      payments: [{
        ...base('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'), patient_id: patientId, encounter_id: encounterId,
        implant_case_id: null, treatment_id: null, doctor_id: doctorId, amount: 5_000_000,
        payment_method: 'cash', reference: null, notes: null, status: 'completed',
        payment_date: ymd(TODAY), created_by: null,
      }],
      staff: [{
        ...base('dddddddd-dddd-4ddd-8ddd-ddddddddddd1'), full_name: 'دکتر سارا رضایی', role: 'doctor',
        phone: '09120000000', email: null, hire_date: ymd(plusDays(-400)), salary: null, is_active: true,
        is_doctor: true, share_percentage: 40, share_type: 'percentage', fixed_share_amount: null,
        specialty: 'ترمیمی', license_number: 'D-1001', is_clinic_owner: false,
      }],
      laboratories: [{ ...base(labId), name: 'لابراتوار پارس', phone: '02188888888', address: null, contact_person: null, notes: null, is_active: true }],
      lab_orders: [{
        ...base('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'), lab_id: labId, patient_id: patientId,
        doctor_id: doctorId, order_type: 'crown', tooth_numbers: ['46'], shade: 'A2',
        material: 'زیرکونیا', notes: null, status: 'sent', sent_date: ymd(plusDays(-3)),
        deadline: ymd(plusDays(4)), received_date: null, cost: 2_000_000, quality_check: null,
      }],
      tooth_records: [
        { ...base('cccccccc-cccc-4ccc-8ccc-ccccccccccc1'), patient_id: patientId, tooth_number: '11', condition: 'filled', surfaces: ['M'], notes: null, recorded_by: null, recorded_at: NOW },
        { ...base('cccccccc-cccc-4ccc-8ccc-ccccccccccc2'), patient_id: patientId, tooth_number: '46', condition: 'decayed', surfaces: ['O'], notes: null, recorded_by: null, recorded_at: NOW },
      ],
    } as Record<string, any[]>,
  }
}

/** Signs in, seeds the demo clinic, and reloads so pages read it. */
export async function signInWithDemoData(page: Page) {
  await signIn(page)
  const demo = demoData()
  await seed(page, demo.rows)
  await page.reload()
  await page.waitForLoadState('networkidle')
  return demo
}
