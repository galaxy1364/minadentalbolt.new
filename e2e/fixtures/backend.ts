import { test as base, expect, type BrowserContext, type Page } from '@playwright/test'

/**
 * MOD-TEST-004 | یک سرور ساختگی، تا روند مطب واقعاً تست شود
 *
 * تا امروز `clinic-flow.spec.ts` به `E2E_EMAIL` و `E2E_PASSWORD` نیاز داشت و
 * بدون آن‌ها **رد** می‌شد. یعنی در CI و روی هر لپ‌تاپی که رمز نداشت، هیچ‌کدام
 * از تست‌های روند مطب هرگز اجرا نمی‌شدند — و `E2E-SETUP.md` خودش این را
 * «آنچه هنوز پوشش ندارد» نامیده بود.
 *
 * راه‌حل: مرز شبکه را می‌بندیم، نه برنامه را. این فایل فقط دو نقطه‌ی تماس با
 * سوپابیس را جواب می‌دهد (auth و REST). همه‌چیز بعد از آن — React، مسیریابی،
 * Dexie، چیدمان، چارت — همان کد واقعی است. برنامه آفلاین‌اول است و داده‌اش را
 * از Dexie می‌خواند، پس بستنِ شبکه چیزی را ساختگی نمی‌کند؛ فقط در را باز
 * می‌کند.
 *
 * ⚠️ این جای تست با سرور واقعی را نمی‌گیرد. RLS، مهاجرت‌ها و همگام‌سازی
 * واقعی این‌جا سنجیده نمی‌شوند.
 */

const USER_ID = '11111111-1111-4111-8111-111111111111'
export const CLINIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

function fakeJwt(): string {
  const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const exp = Math.floor(Date.now() / 1000) + 3600
  return `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc({ sub: USER_ID, role: 'authenticated', exp })}.not-a-real-signature`
}

function fakeSession() {
  return {
    access_token: fakeJwt(),
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'e2e-refresh',
    user: {
      id: USER_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'e2e@minadent.local',
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  }
}

const NOW = new Date().toISOString()
const row = <T extends object>(extra: T) => ({
  clinic_id: CLINIC_ID,
  is_active: true,
  created_at: NOW,
  updated_at: NOW,
  sync_version: 1,
  ...extra,
})

/**
 * A clinic that has actually been set up. START-HERE.md records that the
 * live database has zero doctor schedules and zero priced procedures, which
 * means a test running against empty tables can't reach the treatment or
 * lab steps at all. These rows are served over the same REST shape the real
 * server uses, so the app's own sync pulls them in through the real code
 * path rather than being hand-written into Dexie.
 */
export const SEED = {
  doctors: [row({ id: 'd0000000-0000-4000-8000-000000000001', user_id: null, staff_id: null, name: 'سارا احمدی', specialty: 'ترمیمی', license_number: '12345', color: '#0d9488' })],
  units: [row({ id: 'u0000000-0000-4000-8000-000000000001', name: 'یونیت ۱', number: 1 })],
  procedures: [
    row({ id: 'p0000000-0000-4000-8000-000000000001', code: 'D2140', name: 'ترمیم آمالگام یک سطحی', category: 'ترمیمی', default_price: 3_500_000, description: null }),
    row({ id: 'p0000000-0000-4000-8000-000000000002', code: 'D2750', name: 'روکش PFM', category: 'پروتز', default_price: 12_000_000, description: null }),
  ],
  laboratories: [row({ id: 'l0000000-0000-4000-8000-000000000001', name: 'لابراتوار پارس', type: 'پروتز', contact_person: 'آقای رضایی', phone: '02188889999', email: null, address: null, default_for: null, notes: null })],
} as Record<string, unknown[]>

export async function mockSupabase(ctx: BrowserContext): Promise<void> {
  await ctx.route('**/auth/v1/**', (route) => {
    const url = route.request().url()
    if (url.includes('/logout')) return route.fulfill({ status: 204, body: '' })
    const body = url.includes('/user') ? fakeSession().user : fakeSession()
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })

  await ctx.route('**/rest/v1/**', (route) => {
    const req = route.request()
    const table = new URL(req.url()).pathname.split('/').pop() || ''

    // The staff profile decides which routes canAccess() opens. A role the
    // app doesn't know falls back to dashboard-only, which silently sends
    // every navigation back to '/' — so this must be a real role.
    if (table === 'users') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: USER_ID, clinic_id: CLINIC_ID, full_name: 'کاربر آزمایشی', role: 'owner', doctor_id: null, is_active: true }]),
      })
    }

    // Writes are accepted and discarded: Dexie is the source of truth the
    // UI reads back from, and the push queue tolerates whatever it gets.
    if (req.method() !== 'GET') {
      return route.fulfill({ status: 201, contentType: 'application/json', body: '[]' })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SEED[table] || []) })
  })

  // The Vazirmatn CDN is unreachable from a sandboxed runner. Failing fast
  // beats hanging every navigation until the load timeout.
  await ctx.route('**/cdn.jsdelivr.net/**', (route) => route.abort())
}

/** Signs in and lands on the dashboard. */
export async function signIn(page: Page): Promise<void> {
  await page.goto('/')
  const email = page.getByRole('textbox').first()
  await email.waitFor({ state: 'visible', timeout: 15_000 })
  await email.fill('e2e@minadent.local')
  await page.locator('input[type="password"]').fill('e2e-password')
  await page.getByRole('button', { name: /ورود/ }).click()
  await expect(page.getByText(/داشبورد/).first()).toBeVisible({ timeout: 20_000 })
  // First boot pulls the seed above into Dexie through the real sync loop.
  await expect.poll(async () => page.evaluate(() => new Promise<number>((res) => {
    const req = indexedDB.open('minadent')
    req.onsuccess = () => {
      const store = req.result.transaction('procedures').objectStore('procedures').count()
      store.onsuccess = () => res(store.result)
    }
    req.onerror = () => res(0)
  })), { timeout: 15_000 }).toBeGreaterThan(0)
}

/**
 * The app uses HashRouter, so a route is `/#/patients`. `page.goto('/patients')`
 * hits the dev server's SPA fallback, arrives with an empty hash, and renders
 * the **dashboard** — which is why the old clinic-flow assertions were
 * inspecting the wrong screen entirely.
 */
export async function gotoRoute(page: Page, route: string): Promise<void> {
  await page.goto(`/#${route}`)
  await page.waitForLoadState('networkidle')
}

/**
 * ConfirmAction commits on a press-and-hold, not a click: 25 ticks of 22ms.
 * A plain click leaves the dialog open and nothing is ever saved.
 */
export async function holdToConfirm(page: Page): Promise<void> {
  await page.getByRole('button', { name: /ادامه و تایید/ }).click()
  const fill = page.locator('[data-testid="hold-progress"]')
  await fill.waitFor({ state: 'visible', timeout: 10_000 })
  const button = page.locator('button').filter({ has: fill }).first()
  const box = await button.boundingBox()
  if (!box) throw new Error('دکمه‌ی نگه‌داشتن پیدا نشد')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(900)
  await page.mouse.up()
}

export const test = base.extend<{ clinic: Page }>({
  clinic: async ({ context, page }, use) => {
    await mockSupabase(context)
    await signIn(page)
    await use(page)
  },
})

export { expect }
