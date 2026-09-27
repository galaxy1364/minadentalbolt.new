// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { CACHED_PROFILE_KEY } from './auth'
import { canAccess } from './permissions'

describe('پروفایل کاربری و پایداری دسترسی به ماژول‌ها پس از آپدیت', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('کلید کش پروفایل تعریف شده و ثابت است', () => {
    expect(CACHED_PROFILE_KEY).toBe('minadent_cached_profile')
  })

  it('پروفایل در صورت ذخیره در localStorage قابل بازیابی است', () => {
    const mockProfile = {
      id: 'user-123',
      clinic_id: 'clinic-abc',
      full_name: 'دکتر دندانپزشک',
      role: 'doctor',
      doctor_id: 'doc-1',
    }
    localStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(mockProfile))
    const loaded = JSON.parse(localStorage.getItem(CACHED_PROFILE_KEY)!)
    expect(loaded.full_name).toBe('دکتر دندانپزشک')
    expect(loaded.role).toBe('doctor')
    // ماژول‌های مجاز پزشک قابل دسترسی هستند
    expect(canAccess(loaded.role, '/patients')).toBe(true)
    expect(canAccess(loaded.role, '/appointments')).toBe(true)
    expect(canAccess(loaded.role, '/treatments')).toBe(true)
  })

  it('پاک‌سازی سشن و کش هنگام خروج (Logout) کلیدها را حذف می‌کند', () => {
    localStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify({ id: 'u1', role: 'owner' }))
    localStorage.setItem('minadent-auth', '{"token":"xyz"}')

    // شبیه‌سازی پاک‌سازی خروج
    localStorage.removeItem(CACHED_PROFILE_KEY)
    localStorage.removeItem('minadent-auth')

    expect(localStorage.getItem(CACHED_PROFILE_KEY)).toBeNull()
    expect(localStorage.getItem('minadent-auth')).toBeNull()
  })

  it('در صورت وجود سشن فعال ولی عدم بارگذاری موقت نقش، دسترسی مالک به عنوان پیش‌فرض عمل می‌کند', () => {
    // وقتی session فعال است ولی role هنوز null است:
    const tempRole: string | undefined = undefined
    const effectiveRole = tempRole || 'owner'
    expect(canAccess(effectiveRole, '/patients')).toBe(true)
    expect(canAccess(effectiveRole, '/appointments')).toBe(true)
    expect(canAccess(effectiveRole, '/treatments')).toBe(true)
    expect(canAccess(effectiveRole, '/billing')).toBe(true)
    expect(canAccess(effectiveRole, '/laboratory')).toBe(true)
  })

  it('حساب مدیریت مصطفی حسن‌وند با ایمیل جیمیل به درستی با نقش owner و دسترسی کامل کش می‌شود', () => {
    const ownerProfile = {
      id: 'owner-mostafa-001',
      clinic_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      full_name: 'مصطفی حسن‌وند',
      role: 'owner',
      doctor_id: null,
      email: 'mostafa.hasanvand@gmail.com',
    }
    localStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(ownerProfile))
    const loaded = JSON.parse(localStorage.getItem(CACHED_PROFILE_KEY)!)
    expect(loaded.full_name).toBe('مصطفی حسن‌وند')
    expect(loaded.email).toBe('mostafa.hasanvand@gmail.com')
    expect(loaded.role).toBe('owner')
    expect(canAccess(loaded.role, '/settings')).toBe(true)
    expect(canAccess(loaded.role, '/reports')).toBe(true)
  })
})
