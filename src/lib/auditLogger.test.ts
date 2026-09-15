// src/lib/auditLogger.test.ts — Unit tests for clinical audit trail
import { describe, it, expect } from 'vitest'
import {
  formatAuditActionTitle,
  buildAuditLogObject,
  OPERATION_LABELS,
  TABLE_PERSIAN_LABELS,
} from './auditLogger'

describe('auditLogger — Clinical Audit Trail', () => {
  it('formats action titles correctly in Persian', () => {
    expect(formatAuditActionTitle('insert', 'patients')).toBe('ایجاد در پرونده بیمار')
    expect(formatAuditActionTitle('update', 'payments')).toBe('ویرایش در امور مالی و دریافت')
    expect(formatAuditActionTitle('delete', 'appointments')).toBe('حذف/لغو در نوبت‌دهی')
  })

  it('builds compliant audit log object with default actor', () => {
    const log = buildAuditLogObject({
      table_name: 'treatments',
      operation: 'insert',
      record_id: 't-123',
      summary: 'ثبت درمان ترمیم کامپوزیت دندان ۱۶',
    })

    expect(log.table_name).toBe('treatments')
    expect(log.operation).toBe('insert')
    expect(log.record_id).toBe('t-123')
    expect(log.summary).toContain('ترمیم کامپوزیت')
    expect(log.actor_name).toBe('کاربر سیستم')
    expect(log.actor_role).toBe('پرسنل')
    expect(log.created_at).toBeDefined()
  })

  it('preserves custom actor information', () => {
    const log = buildAuditLogObject({
      table_name: 'payments',
      operation: 'insert',
      record_id: 'p-999',
      summary: 'تسویه کامل صورتحساب بیمار',
      actor_name: 'دکتر مینا',
      actor_role: 'مدیر کلینیک',
    })

    expect(log.actor_name).toBe('دکتر مینا')
    expect(log.actor_role).toBe('مدیر کلینیک')
  })

  it('has comprehensive operation and table labels', () => {
    expect(OPERATION_LABELS['insert'].label).toBe('ایجاد')
    expect(OPERATION_LABELS['update'].label).toBe('ویرایش')
    expect(OPERATION_LABELS['delete'].label).toBe('حذف/لغو')
    expect(TABLE_PERSIAN_LABELS['patients']).toBe('پرونده بیمار')
    expect(TABLE_PERSIAN_LABELS['prescriptions']).toBe('نسخه‌نویسی')
  })
})
