import { supabase, CLINIC_ID } from './supabase'
import { db, TABLE_NAMES, TableName, SyncQueueEntry } from './db'
import { logAudit } from './auditLog'
import { isMissingTableError } from './syncErrors'

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
    // A table that does not exist server-side must not take the whole
    // sync down with it. This happens whenever the app ships ahead of
    // its migrations: every table after the missing one would otherwise
    // never be pulled, and the app looks broken rather than merely
    // out of date. Postgres 42P01 = undefined_table, PostgREST PGRST205
    // = table not found in schema cache.
    if (isMissingTableError(error)) {
      console.warn(`[sync] skipping ${tableName}: not present server-side yet`)
      return 0
    }
    throw new Error(`Pull ${tableName}: ${error.message}`)
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
  return data.length
}


async function pushQueue(): Promise<void> {
  const allEntries = await db.sync_queue.orderBy('created_at').toArray()
  const entries = allEntries.filter((e) => !e.failed).slice(0, 50)
  if (entries.length === 0) return

  for (const entry of entries) {
    try {
      if (entry.operation === 'insert') {
        const { error } = await supabase.from(entry.table_name).insert(entry.data)
        if (error) throw error
      } else if (entry.operation === 'update') {
        const { error } = await supabase.from(entry.table_name).update(entry.data).eq('id', entry.record_id)
        if (error) throw error
      } else if (entry.operation === 'delete') {
        const { error } = await supabase.from(entry.table_name).delete().eq('id', entry.record_id)
        if (error) throw error
      }
      if (entry.id) await db.sync_queue.delete(entry.id)
    } catch (err: any) {
      // Same reasoning as pullTable: when the table has not been created
      // server-side yet, the entry is not *wrong*, it is merely early.
      // Burning its retry budget would park a perfectly good record as
      // permanently failed once the migration finally lands.
      if (isMissingTableError(err)) continue
      if (entry.id) {
        const newRetry = entry.retry_count + 1
        if (newRetry >= 10) {
          // NEVER delete the data on repeated failure — park it for manual
          // review instead (see Settings → همگام‌سازی‌های ناموفق). Losing a
          // patient/payment/appointment record silently is unacceptable for
          // a clinic's real operational data.
          await db.sync_queue.update(entry.id, { retry_count: newRetry, failed: true, last_error: err?.message || String(err) })
          currentStatus = 'error'
        } else {
          await db.sync_queue.update(entry.id, { retry_count: newRetry, last_error: err?.message || String(err) })
        }
      }
    }
  }
}

async function fullSync(): Promise<void> {
  if (currentStatus === 'syncing') return
  currentStatus = 'syncing'
  notify()

  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      currentStatus = 'offline'
      notify()
      return
    }

    // Push local changes BEFORE pulling — prevents overwriting unpushed local edits
    await pushQueue()
    for (const table of TABLE_NAMES) {
      await pullTable(table)
    }
    // Push again after pull in case pull created new conflicts
    await pushQueue()
    lastSyncAt = new Date().toISOString()
    currentStatus = 'online'
  } catch (err) {
    currentStatus = 'error'
  }
  await refreshPendingCount()
}

export async function initialSync(): Promise<void> {
  const metaCount = await db.sync_meta.count()
  if (metaCount === 0) {
    await fullSync()
  } else {
    await refreshPendingCount()
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      fullSync()
    }
  }
}

export async function syncNow(): Promise<void> {
  await fullSync()
}

export function enqueueSync(delay = 3000): void {
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
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    enqueueSync(2000)
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
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  const interval = setInterval(() => {
    // Sync periodically regardless of pending count — pulls server-side changes too
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      fullSync()
    }
  }, 60000)

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
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

/** Resets the entry so the normal push loop picks it up again on the next sync. */
export async function retryFailedEntry(id: number): Promise<void> {
  await db.sync_queue.update(id, { failed: false, retry_count: 0, last_error: undefined })
  await refreshPendingCount()
  if (typeof navigator !== 'undefined' && navigator.onLine) enqueueSync(500)
}

export async function retryAllFailedEntries(): Promise<void> {
  const failed = await getFailedSyncEntries()
  for (const e of failed) {
    if (e.id) await db.sync_queue.update(e.id, { failed: false, retry_count: 0, last_error: undefined })
  }
  await refreshPendingCount()
  if (typeof navigator !== 'undefined' && navigator.onLine) enqueueSync(500)
}

/** Explicit, deliberate discard — only ever called by a human clicking a
 * confirm button in Settings, never automatically. */
export async function discardFailedEntry(id: number): Promise<void> {
  await db.sync_queue.delete(id)
  await refreshPendingCount()
}
