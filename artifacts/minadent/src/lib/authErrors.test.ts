/**
 * MOD-FIX-010 | تست پیام‌های خطای ورود
 *
 * ورودی‌های این تست حدسی نیستند — از لاگ واقعی سرور Supabase در
 * ۱۴۰۵/۰۶/۱۰ برداشته شده‌اند، همان جلسه‌ای که مهدی گفت «ثبت می‌کنم ولی
 * وارد نمی‌شود»:
 *
 *   422: Phone logins are disabled      (phone_provider_disabled) × ۲
 *   400: Invalid login credentials      (invalid_credentials)     × ۸
 *   422: A user with this email address has already been registered
 *
 * دومی پیام درستی داشت. اولی پیام کلی می‌گرفت و کاربر را می‌فرستاد رمزی
 * را دوباره تایپ کند که اصلاً مشکل نبود — ورود با موبایل در تنظیمات
 * Supabase خاموش است و با هیچ رمزی کار نمی‌کند.
 */
import { describe, it, expect } from 'vitest'
import { mapAuthError } from './auth'

describe('پیام‌های واقعی سرور به فارسی قابل‌فهم ترجمه می‌شوند', () => {
  it('🔴 ورود با موبایل خاموش است — و همین گفته می‌شود', () => {
    const msg = mapAuthError('Phone logins are disabled', 422)
    expect(msg).toContain('موبایل')
    expect(msg).toContain('ایمیل')
  })

  it('پیام موبایل، کاربر را دنبال رمز نمی‌فرستد', () => {
    expect(mapAuthError('Phone logins are disabled', 422)).not.toContain('رمز عبور اشتباه')
  })

  it('رمز یا ایمیل اشتباه همان چیزی است که هست', () => {
    expect(mapAuthError('Invalid login credentials', 400)).toContain('اشتباه')
  })

  it('ایمیل تاییدنشده از رمز اشتباه جدا می‌ماند', () => {
    const msg = mapAuthError('Email not confirmed', 400)
    expect(msg).toContain('تایید نشده')
    expect(msg).not.toContain('رمز عبور اشتباه')
  })

  it('تلاش زیاد، دعوت به تلاش دوباره نمی‌کند', () => {
    expect(mapAuthError('Request rate limit reached', 429)).toContain('صبر')
  })

  it('قطع بودن شبکه با رمز اشتباه قاطی نمی‌شود', () => {
    const msg = mapAuthError('Failed to fetch')
    expect(msg).toContain('اتصال')
    expect(msg).not.toContain('اشتباه است')
  })

  it('هر خطایی پیام فارسی غیرخالی می‌گیرد', () => {
    for (const raw of [
      'Phone logins are disabled',
      'Invalid login credentials',
      'Email not confirmed',
      'Failed to fetch',
      'something nobody has seen before',
      '',
    ]) {
      expect(mapAuthError(raw).trim().length).toBeGreaterThan(0)
    }
  })
})
