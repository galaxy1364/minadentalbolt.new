/**
 * MOD-FEAT-019 | real-time cross-device sync via Supabase Realtime
 *
 * The existing polling loop in sync.ts fires every 60 seconds — fine
 * for background robustness, but not for a shared-computer clinic
 * where two sessions (front desk + doctor room) must see each other's
 * changes immediately.
 *
 * This module opens a single multiplexed Supabase Realtime channel that
 * subscribes to postgres_changes for every table in TABLE_NAMES.
 * On INSERT/UPDATE/DELETE from ANY other session, the new row is
 * immediately written into the local Dexie database and the sync loop
 * is notified — no polling, no waiting.
 *
 * Design constraints:
 *  - Must not interfere with the existing push-queue: a row arriving via
 *    Realtime has already been committed on the server, so we only do a
 *    local bulkPut — never re-queue.
 *  - A deleted row removes from Dexie only its id (the full payload is
 *    not always available in postgres_changes DELETE events).
 *  - Tables that do not yet exist server-side (migrated later) are
 *    skipped silently — same pattern as sync.ts pullTable.
 *  - The channel is removed on cleanup (React StrictMode fires effects
 *    twice; guard with a module-level flag).
 */

import { supabase, CLINIC_ID, hasSupabaseCredentials } from './supabase'
import { db, TABLE_NAMES, TableName } from './db'
import { syncNow } from './sync'

let channel: ReturnType<typeof supabase.channel> | null = null
let isActive = false

type RealtimePayload = {
  schema: string
  table: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Record<string, unknown>
  old: Record<string, unknown>
  errors: null | unknown[]
}

async function handleChange(payload: RealtimePayload): Promise<void> {
  const tableName = payload.table as TableName
  // Only handle tables we manage and that belong to this clinic
  if (!TABLE_NAMES.includes(tableName)) return

  const table = (db as any)[tableName]
  if (!table) return

  try {
    if (payload.eventType === 'DELETE') {
      const id = (payload.old as any)?.id
      if (id) await table.delete(id)
    } else {
      // INSERT or UPDATE — write the authoritative server copy locally
      const row = payload.new as any
      // Filter out rows from other clinics (should never happen with RLS,
      // but belt-and-suspenders for safety)
      if (row?.clinic_id && row.clinic_id !== CLINIC_ID) return
      await table.put(row)
    }
  } catch (err) {
    // A missing table or schema mismatch is non-fatal — just log it
    console.warn(`[realtime] failed to apply ${payload.eventType} on ${tableName}:`, err)
  }
}

/**
 * Start the realtime subscription.
 * Safe to call multiple times — only one channel is created.
 * Returns a cleanup function (call it in useEffect return / unmount).
 */
export function initRealtimeSync(): () => void {
  if (!hasSupabaseCredentials) {
    // No credentials → no server to subscribe to. The polling loop in
    // sync.ts still handles the offline-first path correctly.
    return () => {}
  }

  if (isActive) return () => stopRealtimeSync()

  isActive = true

  // One channel, all tables — Supabase multiplexes over a single WebSocket
  channel = supabase.channel('minadent-realtime')

  for (const tableName of TABLE_NAMES) {
    channel.on(
      'postgres_changes' as any,
      {
        event: '*',
        schema: 'public',
        table: tableName,
        filter: `clinic_id=eq.${CLINIC_ID}`,
      },
      (payload: any) => {
        handleChange(payload as RealtimePayload)
      },
    )
  }

  channel
    .on('presence', { event: 'sync' }, () => {})
    .subscribe(async (status: string, err?: Error) => {
      if (status === 'SUBSCRIBED') {
        console.info('[realtime] connected — live sync active')
        // Pull any changes that happened while we were offline / not subscribed
        await syncNow()
      } else if (status === 'CHANNEL_ERROR') {
        console.warn('[realtime] channel error — will retry via polling', err)
      } else if (status === 'CLOSED') {
        console.info('[realtime] channel closed')
        isActive = false
      }
    })

  return () => stopRealtimeSync()
}

export function stopRealtimeSync(): void {
  if (channel) {
    supabase.removeChannel(channel)
    channel = null
  }
  isActive = false
}

/** Returns whether the realtime channel is currently active */
export function isRealtimeActive(): boolean {
  return isActive
}
