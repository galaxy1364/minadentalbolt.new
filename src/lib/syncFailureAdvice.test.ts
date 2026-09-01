/**
 * MOD-FIX-020 | راهنمای درست برای هر نوع شکست سینک
 *
 * پنل «همگام‌سازی‌های ناموفق» به همه یک جمله می‌گفت: «معمولاً با اتصال
 * اینترنت بهتر و تلاش مجدد حل می‌شود». برای دو رکورد واقعی که با
 * `date/time field value out of range: "2-00-02"` گیر کرده بودند، این
 * حرف هرگز درست نمی‌شد — و کاربر را به حلقه‌ی بی‌پایان «تلاش مجدد»
 * می‌فرستاد.
 */
import { describe, it, expect } from 'vitest'
import { classifySyncFailure } from './syncErrors'

describe('خطای داده — تلاش مجدد جواب نمی‌دهد', () => {
  it('همان خطای واقعیِ دو رکورد گیرکرده', () => {
    const a = classifySyncFailure({ message: 'date/time field value out of range: "2-00-02"' })
    expect(a.kind).toBe('data')
    expect(a.retryable).toBe(false)
  })

  it('راهنمایش به اصلاح داده اشاره می‌کند، نه به اینترنت', () => {
    const a = classifySyncFailure({ message: 'date/time field value out of range: "2-00-02"' })
    expect(a.advice).not.toMatch(/اینترنت/)
    expect(a.advice).toMatch(/اصلاح/)
  })

  it('کدهای ۲۲xxx و ۲۳xxx پستگرس خطای داده‌اند', () => {
    for (const code of ['22008', '22007', '23502', '23505', '23503']) {
      expect(classifySyncFailure({ code, message: 'x' }).retryable, code).toBe(false)
    }
  })

  it('نقض قید و مقدار نامعتبر هم داده‌اند', () => {
    expect(classifySyncFailure({ message: 'invalid input syntax for type date' }).kind).toBe('data')
    expect(classifySyncFailure({ message: 'null value violates not-null constraint' }).kind).toBe('data')
    expect(classifySyncFailure({ message: 'duplicate key value violates unique constraint' }).kind).toBe('data')
  })
})

describe('خطای شبکه — تلاش مجدد منطقی است', () => {
  it('نرسیدن به سرور، قابل تلاش مجدد است', () => {
    for (const message of ['Failed to fetch', 'network error', 'Load failed', 'request timed out']) {
      const a = classifySyncFailure({ message })
      expect(a.kind, message).toBe('network')
      expect(a.retryable, message).toBe(true)
    }
  })

  it('راهنمای شبکه از اینترنت می‌گوید', () => {
    expect(classifySyncFailure({ message: 'Failed to fetch' }).advice).toMatch(/اینترنت/)
  })

  it('خطای خالی هم شبکه فرض می‌شود — نه داده', () => {
    // محافظه‌کارانه: نگفتن «داده‌ات خراب است» وقتی مطمئن نیستیم.
    expect(classifySyncFailure({}).kind).toBe('network')
    expect(classifySyncFailure(null).kind).toBe('network')
  })
})

describe('خطای دسترسی', () => {
  it('RLS و مجوز، با تلاش مجدد حل نمی‌شوند', () => {
    for (const message of ['new row violates row-level security policy', 'permission denied for table', 'JWT expired']) {
      const a = classifySyncFailure({ message })
      expect(a.kind, message).toBe('permission')
      expect(a.retryable, message).toBe(false)
    }
  })
})

describe('هر شکست، راهنمای غیرتهی دارد', () => {
  it('هیچ حالتی بدون عنوان و توضیح نمی‌ماند', () => {
    for (const err of [{ message: 'x' }, {}, null, 'رشته', { code: '22008' }]) {
      const a = classifySyncFailure(err)
      expect(a.title.length).toBeGreaterThan(0)
      expect(a.advice.length).toBeGreaterThan(0)
    }
  })
})
