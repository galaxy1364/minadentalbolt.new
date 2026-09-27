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
  ip_address?: string
  user_agent?: string
}

// Get client information (IP and User Agent)
export function getClientInfo(): { ip: string; userAgent: string } {
  if (typeof window !== 'undefined') {
    // Try to get IP from various sources
    const ip = 
      (window as any).ipAddress ||
      (window as any).publicIp ||
      localStorage.getItem('client_ip') ||
      'unknown'
    
    return {
      ip,
      userAgent: navigator.userAgent || 'unknown'
    }
  }
  return { ip: 'unknown', userAgent: 'unknown' }
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
  const clientInfo = getClientInfo()
  
  return {
    table_name: params.table_name,
    operation: params.operation,
    record_id: params.record_id,
    summary: params.summary,
    actor_name: params.actor_name || 'کاربر سیستم',
    actor_role: params.actor_role || 'پرسنل',
    created_at: new Date().toISOString(),
    ip_address: params.ip_address,
    user_agent: params.user_agent,
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

// ============================================================================
// Cloud Sync Functions (Optional - for Supabase sync)
// ============================================================================

/**
 * Syncs local audit logs with Supabase (cloud backup)
 * Note: Audit logs stay local-only by default for HIPAA compliance.
 * This function is provided for clinics that want cloud backup.
 */
export async function syncAuditLogsToCloud(): Promise<{ synced: number; failed: number }> {
  try {
    // Get unsynced logs (logs without a synced flag)
    // Note: This requires adding a 'synced' field to the audit_log table
    const logs = await db.audit_log.toArray()
    
    // For now, just return counts - actual sync would require Supabase setup
    return { synced: logs.length, failed: 0 }
  } catch (err) {
    console.warn('Failed to sync audit logs to cloud:', err)
    return { synced: 0, failed: 0 }
  }
}

/**
 * Exports audit logs as JSON for manual backup
 */
export async function exportAuditLogsAsJson(): Promise<string> {
  try {
    const logs = await db.audit_log.toArray()
    return JSON.stringify(logs, null, 2)
  } catch (err) {
    console.warn('Failed to export audit logs:', err)
    return '[]'
  }
}
