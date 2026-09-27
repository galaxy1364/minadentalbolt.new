/**
 * MOD-TEST-011 | محافظ صفحه‌ی سفید
 *
 * ### باگ واقعی که این تست از آن محافظت می‌کند
 * فایل `.env` (به‌درستی) از مخزن حذف شد، ولی متغیر
 * `VITE_SUPABASE_ANON_KEY` در محیط استقرار تنظیم نشده بود. در نتیجه
 * `createClient` با کلید خالی صدا زده می‌شد و **در زمان بارگذاری
 * ماژول** خطا می‌داد — یعنی قبل از mount شدن React.
 *
 * نتیجه: نه پیام خطا، نه ErrorBoundary، فقط **صفحه‌ی سفید**.
 * برای کاربر هیچ سرنخی وجود نداشت که چه اتفاقی افتاده.
 *
 * این تست تضمین می‌کند که نبود کلید هرگز باعث خطای هنگام بارگذاری
 * نشود — چون یک برنامه‌ی آفلاین‌اول نباید به‌خاطر در دسترس نبودن
 * سرور بمیرد؛ داده‌های محلی Dexie همچنان کار می‌کنند.
 */
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const URL = 'https://example.supabase.co'
const PLACEHOLDER = 'missing-key-app-runs-offline'

describe('رفتار createClient با کلید نامعتبر', () => {
  /**
   * این تست خودِ علت ریشه‌ای را ثابت می‌کند: کلید خالی خطا می‌دهد.
   * اگر روزی رفتار کتابخانه عوض شود، اینجا متوجه می‌شویم.
   */
  it('کلید خالی واقعاً خطا می‌دهد — علت ریشه‌ای باگ', () => {
    expect(() => createClient(URL, '')).toThrow(/supabaseKey is required/i)
  })

  it('مقدار جایگزین باعث خطا نمی‌شود', () => {
    expect(() => createClient(URL, PLACEHOLDER)).not.toThrow()
  })
})

describe('ماژول supabase نباید هنگام بارگذاری خطا بدهد', () => {
  /**
   * مهم‌ترین تست این فایل: صرفِ import کردن ماژول — حتی وقتی هیچ
   * متغیر محیطی تنظیم نشده — نباید خطا بدهد.
   */
  it('وارد کردن ماژول بدون متغیر محیطی نباید خطا بدهد', async () => {
    await expect(import('./supabase')).resolves.toBeDefined()
  })

  it('کلاینت ساخته می‌شود حتی بدون کلید واقعی', async () => {
    const mod = await import('./supabase')
    expect(mod.supabase).toBeDefined()
    expect(typeof mod.supabase.from).toBe('function')
  })

  /**
   * پرچم صریح تا رابط کاربری بتواند وضعیت را به کاربر بگوید،
   * به‌جای اینکه فقط بی‌صدا سینک نشود.
   */
  it('پرچم hasSupabaseCredentials وجود دارد و بولین است', async () => {
    const mod = await import('./supabase')
    expect(typeof mod.hasSupabaseCredentials).toBe('boolean')
  })

  it('شناسه کلینیک همیشه در دسترس است', async () => {
    const mod = await import('./supabase')
    expect(mod.CLINIC_ID).toMatch(/^[0-9a-f-]{36}$/)
  })
})
