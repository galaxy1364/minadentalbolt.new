// src/lib/useAuditLog.ts - React hook for automatic audit logging
import { useEffect, useCallback } from 'react'
import { recordAuditLog, RecordAuditParams } from './auditLogger'

/**
 * Hook for automatic audit logging in React components.
 * Automatically logs VIEW actions on mount.
 */
export function useAuditLog(
  table_name: string,
  record_id: string,
  summary: string,
  actor_name?: string,
  actor_role?: string
) {
  useEffect(() => {
    // Log VIEW action when component mounts
    const logView = async () => {
      try {
        await recordAuditLog({
          table_name,
          operation: 'insert', // Using 'insert' for VIEW to maintain existing enum
          record_id,
          summary: `مشاهده: ${summary}`,
          actor_name,
          actor_role,
        })
      } catch (err) {
        console.warn('Failed to log audit view:', err)
      }
    }

    logView()
  }, [table_name, record_id, summary, actor_name, actor_role])
}

/**
 * Utility function to log CREATE/UPDATE/DELETE operations
 */
export async function logOperation(
  params: Omit<RecordAuditParams, 'operation'> & { operation: 'insert' | 'update' | 'delete' }
): Promise<void> {
  try {
    await recordAuditLog(params)
  } catch (err) {
    console.warn('Failed to log operation:', err)
  }
}

/**
 * Helper to create audit-aware wrappers for CRUD operations
 */
export function withAudit<T extends (...args: any[]) => Promise<any>>(
  operation: 'insert' | 'update' | 'delete',
  table_name: string,
  fn: T
): (...args: Parameters<T>) => Promise<any> {
  return async (...args: Parameters<T>) => {
    const record_id = args[0]?.id || args[1]?.id || String(Date.now())
    const summary = args[0]?.summary || args[1]?.summary || `${operation} in ${table_name}`
    
    try {
      const result = await fn(...args)
      
      // Log the operation
      await recordAuditLog({
        table_name,
        operation,
        record_id: typeof record_id === 'object' ? JSON.stringify(record_id) : String(record_id),
        summary,
      })
      
      return result
    } catch (err) {
      // Still log the attempt even if it failed
      await recordAuditLog({
        table_name,
        operation,
        record_id: typeof record_id === 'object' ? JSON.stringify(record_id) : String(record_id),
        summary: `Failed: ${summary}`,
      })
      throw err
    }
  }
}
