import { supabase, CLINIC_ID } from './supabase'
import { db, TABLE_NAMES, TableName, SyncQueueEntry } from './db'

export type SyncStatus = 'idle' | 'syncing' | 'online' | 'offline' | 'error'

type SyncListener = (status: SyncStatus, pending: number, lastSync: string | null) => void

const listeners: Set<SyncListener> = new Set()
let currentStatus: SyncStatus = typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline'
let pendingCount = 0
let lastSyncAt: string | null = null
let syncTimer: ReturnType<typeof setTimeout> | null = null

export function subscribeSync(listener: SyncListener): () => void {
  listeners.add(listener)
  listener(currentStatus, pendingCount, lastSyncAt)
  return () => listeners.delete(listener)
}

function notify() {
  listeners.forEach((l) => l(currentStatus, pendingCount, lastSyncAt))
}

async function refreshPendingCount() {
  pendingCount = await db.sync_queue.count()
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
  if (error) throw new Error(`Pull ${tableName}: ${error.message}`)
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
  const entries = await db.sync_queue.orderBy('created_at').limit(50).toArray()
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
      if (entry.id) {
        const newRetry = entry.retry_count + 1
        await db.sync_queue.update(entry.id, { retry_count: newRetry })
        if (newRetry >= 10) {
          await db.sync_queue.delete(entry.id)
          // Notify user of data loss
          listeners.forEach((l) => l('error', pendingCount, lastSyncAt))
          if (typeof window !== 'undefined') {
            console.error(`Sync op dropped after 10 retries: ${entry.operation} on ${entry.table_name}`)
          }
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
