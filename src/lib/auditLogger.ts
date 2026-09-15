// src/lib/auditLogger.ts — Clinical Audit Trail Engine for HIPAA & Legal Safety
import { db, AuditLogEntry } from './db'
export type { AuditLogEntry }

export interface RecordAuditParams {
  table_name: string
  operation: 'insert' | 'update' | 'delete'
  record_id: string
  summary: string
  actor_name?: string
  actor_role?: string | null
}

export const OPERATION_LABELS: Record<string, { label: string; color: string }> = {
  insert: { label: 'ایجاد', color: 'success' },
  update: { label: 'ویرایش', color: 'primary' },
  delete: { label: 'حذف/لغو', color: 'error' },
}

export const TABLE_PERSIAN_LABELS: Record<string, string> = {
  patients: 'پرونده بیمار',
  appointments: 'نوبت‌دهی',
  treatments: 'طرح درمان',
  payments: 'امور مالی و دریافت',
  prescriptions: 'نسخه‌نویسی',
  radiology_images: 'رادیولوژی',
  lab_orders: 'لابراتوار',
  inventory_items: 'انبارداری',
  staff: 'پرسنل',
  implant_cases: 'ایمپلنت',
}

export function formatAuditActionTitle(operation: string, table_name: string): string {
  const op = OPERATION_LABELS[operation]?.label || operation
  const tbl = TABLE_PERSIAN_LABELS[table_name] || table_name
  return `${op} در ${tbl}`
}

export function buildAuditLogObject(params: RecordAuditParams): AuditLogEntry {
  return {
    table_name: params.table_name,
    operation: params.operation,
    record_id: params.record_id,
    summary: params.summary,
    actor_name: params.actor_name || 'کاربر سیستم',
    actor_role: params.actor_role || 'پرسنل',
    created_at: new Date().toISOString(),
  }
}

/**
 * Persists an immutable audit log entry in the local database.
 */
export async function recordAuditLog(entry: RecordAuditParams): Promise<void> {
  try {
    const log = buildAuditLogObject(entry)
    await db.audit_log.add(log)
  } catch (err) {
    console.warn('Failed to write audit log:', err)
  }
}

/**
 * Fetches recent audit trail entries sorted from newest to oldest.
 */
export async function fetchAuditLogs(limit = 150): Promise<AuditLogEntry[]> {
  try {
    const logs = await db.audit_log.orderBy('id').reverse().limit(limit).toArray()
    return logs
  } catch (err) {
    console.warn('Failed to fetch audit logs:', err)
    return []
  }
}

/**
 * Prunes historical audit logs while keeping the most recent entries.
 */
export async function clearOldAuditLogs(keepCount = 500): Promise<number> {
  try {
    const total = await db.audit_log.count()
    if (total <= keepCount) return 0
    const toDelete = total - keepCount
    const oldKeys = await db.audit_log.orderBy('id').limit(toDelete).primaryKeys()
    await db.audit_log.bulkDelete(oldKeys)
    return oldKeys.length
  } catch {
    return 0
  }
}
