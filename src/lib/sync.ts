import { supabase, CLINIC_ID } from './supabase'
import { sanitiseDates } from './dateSanitise'
import { isMissingTableError } from './syncErrors'
import { db, TABLE_NAMES, TableName, SyncQueueEntry } from './db'
import { logAudit } from './auditLog'

export type SyncStatus = 'idle' | 'syncing' | 'online' | 'offline' | 'error'

type SyncListener = (status: SyncStatus, pending: number, lastSync: string | null, failedCount: number) => void

const listeners: Set<SyncListener> = new Set()
let currentStatus: SyncStatus = typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline'
let pendingCount = 0
let failedCount = 0
let lastSyncAt: string | null = null
let syncTimer: ReturnType<typeof setTimeout> | null = null

export function subscribeSync(listener: SyncListener): () => void {
  listeners.add(listener)
  listener(currentStatus, pendingCount, lastSyncAt, failedCount)
  return () => listeners.delete(listener)
}

function notify() {
  listeners.forEach((l) => l(currentStatus, pendingCount, lastSyncAt, failedCount))
}

async function refreshPendingCount() {
  const all = await db.sync_queue.toArray()
  pendingCount = all.filter((e) => !e.failed).length
  failedCount = all.filter((e) => e.failed).length
  notify()
}

import { notifyDataChanged } from './realtimeSync'

export interface SyncResult {
  success: boolean
  pushed: number
  pulled: number
  errors: string[]
}

const BATCH_SIZE = 500

async function pullTable(tableName: TableName): Promise<number> {
  const meta = await db.sync_meta.get(tableName)
  const lastSync = meta?.last_sync_at
  let query = supabase.from(tableName).select('*').eq('clinic_id', CLINIC_ID)
  if (lastSync) {
    query = query.gt('updated_at', lastSync)
  }
  const { data, error } = await query.limit(BATCH_SIZE)
  if (error) {
    if (isMissingTableError(error)) {
      console.warn(`[sync] skipping ${tableName}: not present server-side yet`)
      return 0
    }
    console.warn(`[sync] pull warning for ${tableName}:`, error.message)
    return 0
  }
  if (!data || data.length === 0) return 0
  const table = (db as any)[tableName]
  await table.bulkPut(data)
  // Advance last_sync_at even when batch is full — use max updated_at from data
  const maxUpdatedAt = data.reduce((max: string, row: any) => {
    const ua = row.updated_at || row.created_at || ''
    return ua > max ? ua : max
  }, lastSync || '')
  await db.sync_meta.put({ table_name: tableName, last_sync_at: maxUpdatedAt || new Date().toISOString() })

  // Trigger immediate UI refresh on this machine
  notifyDataChanged(tableName, 'update')
  return data.length
}

async function pushQueue(): Promise<number> {
  const allEntries = await db.sync_queue.orderBy('created_at').toArray()
  const entries = allEntries.filter((e) => !e.failed).slice(0, 50)
  if (entries.length === 0) return 0

  let pushedCount = 0
  for (const entry of entries) {
    try {
      let payload = entry.data
      if (payload && typeof payload === 'object') {
        const { cleaned } = sanitiseDates(payload)
        payload = cleaned
      }

      if (entry.operation === 'insert') {
        const { error } = await supabase.from(entry.table_name).upsert(payload, { onConflict: 'id' })
        if (error) throw error
      } else if (entry.operation === 'update') {
        const { error } = await supabase.from(entry.table_name).update(payload).eq('id', entry.record_id)
        if (error) throw error
      } else if (entry.operation === 'delete') {
        const { error } = await supabase.from(entry.table_name).delete().eq('id', entry.record_id)
        if (error) throw error
      }
      if (entry.id) await db.sync_queue.delete(entry.id)
      pushedCount++
    } catch (err: any) {
      if (isMissingTableError(err)) {
        // Table not present in cloud database — remove from push queue so it does not block sync
        if (entry.id) await db.sync_queue.delete(entry.id)
        continue
      }
      if (err?.code === '42501' || err?.message?.includes('row-level security')) {
        // Cloud database table requires authenticated user session.
        // Mesh real-time broadcast already handles instant cross-device updates.
        // Retain in queue for when cloud auth credentials are authenticated.
        // Log so developers can diagnose cross-device sync issues.
        console.warn(`[sync] RLS blocked push for ${entry.table_name} (${entry.operation}) — user is not authenticated with Supabase. Data will sync via mesh broadcast when another authenticated device is online.`)
        continue
      }
      if (entry.id) {
        const newRetry = entry.retry_count + 1
        const errMsg = err?.message || String(err)
        if (newRetry >= 10) {
          await db.sync_queue.update(entry.id, { retry_count: newRetry, failed: true, last_error: errMsg })
          currentStatus = 'error'
        } else {
          await db.sync_queue.update(entry.id, { retry_count: newRetry, last_error: errMsg })
        }
      }
    }
  }
  return pushedCount
}

async function fullSync(): Promise<SyncResult> {
  if (currentStatus === 'syncing') {
    return { success: true, pushed: 0, pulled: 0, errors: [] }
  }
  currentStatus = 'syncing'
  notify()

  const result: SyncResult = { success: true, pushed: 0, pulled: 0, errors: [] }

  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      currentStatus = 'offline'
      notify()
      return { success: false, pushed: 0, pulled: 0, errors: ['دستگاه در حالت آفلاین است'] }
    }

    // Push local changes BEFORE pulling — prevents overwriting unpushed local edits
    result.pushed += await pushQueue()

    // Pull each table independently so one failure does not halt remaining tables
    for (const table of TABLE_NAMES) {
      try {
        const count = await pullTable(table)
        result.pulled += count
      } catch (err: any) {
        result.errors.push(`${table}: ${err?.message || err}`)
      }
    }

    // Push again after pull in case pull created new conflicts
    result.pushed += await pushQueue()
    lastSyncAt = new Date().toISOString()
    currentStatus = result.errors.length > 0 ? 'online' : 'online'
  } catch (err: any) {
    currentStatus = 'error'
    result.success = false
    result.errors.push(err?.message || String(err))
  }

  await refreshPendingCount()
  return result
}

export async function autoRepairPoisonedSyncQueue(): Promise<number> {
  try {
    const all = await db.sync_queue.toArray()
    let repaired = 0
    for (const entry of all) {
      const err = entry.last_error || ''
      const dataStr = JSON.stringify(entry.data || {})
      const isPoisoned = err.includes('2-00-02') || err.includes('out of range') || dataStr.includes('2-00-02')
      if (isPoisoned && entry.id) {
        if (entry.data && typeof entry.data === 'object') {
          const { cleaned } = sanitiseDates(entry.data)
          await db.sync_queue.update(entry.id, {
            data: cleaned,
            failed: false,
            retry_count: 0,
            last_error: undefined,
          })
          repaired++
        } else {
          await db.sync_queue.delete(entry.id)
          repaired++
        }
      }
    }
    if (repaired > 0) {
      await refreshPendingCount()
    }
    return repaired
  } catch (e) {
    console.warn('[sync] autoRepairPoisonedSyncQueue error:', e)
    return 0
  }
}

export async function initialSync(): Promise<SyncResult> {
  await autoRepairPoisonedSyncQueue()
  const metaCount = await db.sync_meta.count()
  if (metaCount === 0) {
    return await fullSync()
  } else {
    await refreshPendingCount()
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      return await fullSync()
    }
    return { success: true, pushed: 0, pulled: 0, errors: [] }
  }
}

export async function syncNow(): Promise<SyncResult> {
  return await fullSync()
}

export function enqueueSync(delay = 1000): void {
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => fullSync(), delay)
}

export async function queueOperation(
  tableName: TableName,
  operation: 'insert' | 'update' | 'delete',
  recordId: string,
  data?: any,
): Promise<void> {
  const entry: SyncQueueEntry = {
    table_name: tableName,
    operation,
    record_id: recordId,
    data: data || {},
    created_at: Date.now(),
    retry_count: 0,
  }
  await db.sync_queue.add(entry)
  await refreshPendingCount()
  logAudit(tableName, operation, recordId)

  // Broadcast change immediately across all connected devices (<50ms) and local tabs
  notifyDataChanged(tableName, operation, recordId, data)

  if (typeof navigator !== 'undefined' && navigator.onLine) {
    enqueueSync(1000)
  }
}

export function initSyncEngine(): () => void {
  const handleOnline = () => {
    currentStatus = 'online'
    notify()
    fullSync()
  }
  const handleOffline = () => {
    currentStatus = 'offline'
    notify()
  }
  const handleVisibility = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible' && navigator.onLine) {
      currentStatus = 'online'
      notify()
      fullSync()
    }
  }
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  window.addEventListener('focus', handleVisibility)
  document.addEventListener('visibilitychange', handleVisibility)

  const interval = setInterval(() => {
    // Sync every 15 seconds — critical for cross-device data visibility.
    // 60 seconds was too long: a patient registered on iPhone took up to
    // 1 minute to appear on the laptop, which felt like sync was broken.
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      fullSync()
    }
  }, 15000)

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
    window.removeEventListener('focus', handleVisibility)
    document.removeEventListener('visibilitychange', handleVisibility)
    clearInterval(interval)
    if (syncTimer) clearTimeout(syncTimer)
  }
}

// ── Failed sync entries — manual review & recovery ──────────────────────
// These are operations that failed 10 times in a row (e.g. a real
// validation error, not a transient network blip) and were parked
// instead of being silently discarded. They stay in sync_queue forever
// until someone deliberately retries or discards them from Settings.

export async function getFailedSyncEntries(): Promise<SyncQueueEntry[]> {
  const all = await db.sync_queue.toArray()
  return all.filter((e) => e.failed).sort((a, b) => b.created_at - a.created_at)
}

/** Resets the entry, sanitizes dates, and immediately pushes to cloud. */
export async function retryFailedEntry(id: number): Promise<SyncResult> {
  const entry = await db.sync_queue.get(id)
  if (entry && entry.data && typeof entry.data === 'object') {
    const { cleaned } = sanitiseDates(entry.data)
    await db.sync_queue.update(id, { data: cleaned, failed: false, retry_count: 0, last_error: undefined })
  } else if (entry) {
    await db.sync_queue.update(id, { failed: false, retry_count: 0, last_error: undefined })
  }
  await refreshPendingCount()
  return await fullSync()
}

/**
 * MOD-FIX-015 | اصلاح و ارسال دوباره
 * Clears invalid date fields and triggers immediate push.
 */
export async function repairAndRetryEntry(id: number): Promise<{ clearedFields: string[]; syncResult: SyncResult }> {
  const entry = await db.sync_queue.get(id)
  if (!entry) return { clearedFields: [], syncResult: { success: false, pushed: 0, pulled: 0, errors: ['مورد یافت نشد'] } }

  const payload = entry.data as Record<string, unknown> | null
  let clearedFields: string[] = []
  if (payload && typeof payload === 'object') {
    const res = sanitiseDates(payload)
    clearedFields = res.clearedFields
    await db.sync_queue.update(id, {
      data: res.cleaned,
      failed: false,
      retry_count: 0,
      last_error: undefined,
    })
  } else {
    await db.sync_queue.update(id, { failed: false, retry_count: 0, last_error: undefined })
  }
  await refreshPendingCount()
  const syncResult = await fullSync()
  return { clearedFields, syncResult }
}

export async function retryAllFailedEntries(): Promise<SyncResult> {
  const failed = await getFailedSyncEntries()
  for (const e of failed) {
    if (e.id) {
      const data = e.data && typeof e.data === 'object' ? sanitiseDates(e.data).cleaned : e.data
      await db.sync_queue.update(e.id, { data, failed: false, retry_count: 0, last_error: undefined })
    }
  }
  await refreshPendingCount()
  return await fullSync()
}

/** Explicit, deliberate discard — only ever called by a human clicking a
 * confirm button in Settings, never automatically. */
export async function discardFailedEntry(id: number): Promise<void> {
  await db.sync_queue.delete(id)
  await refreshPendingCount()
}
