/**
 * MOD-FEAT-019 / REALTIME SYNC ENGINE
 *
 * Real-time cross-device sync via Supabase Realtime Broadcast & Postgres Changes,
 * plus local BroadcastChannel for multi-tab instantaneous reactivity (<50ms).
 *
 * When a patient, appointment, treatment, or payment is created or updated
 * on ANY device (doctor's phone, receptionist's PC, manager's tablet, assistant):
 *  1. Broadcast directly over Supabase Realtime WebSocket to all connected devices.
 *  2. Multi-cast locally across all browser tabs via BroadcastChannel.
 *  3. Persist incoming changes into local Dexie IndexedDB.
 *  4. Dispatch 'minadent:data_changed' event so all React pages re-render instantly
 *     without requiring manual page refreshes.
 */

import { supabase, CLINIC_ID, hasSupabaseCredentials, DEFAULT_SUPABASE_ANON_KEY } from './supabase'
import { db, TABLE_NAMES, TableName } from './db'
import { syncNow } from './sync'

let channel: ReturnType<typeof supabase.channel> | null = null
let isActive = false
let localBus: BroadcastChannel | null = null

export type RealtimeAction = 'insert' | 'update' | 'delete'

export interface DataChangePayload {
  table: TableName | string
  action: RealtimeAction
  recordId?: string
  data?: any
  senderId?: string
  timestamp: number
  clinicId?: string
}

// Generate an ephemeral device/session ID to filter out echo broadcasts
export const DEVICE_SESSION_ID = typeof crypto !== 'undefined' && crypto.randomUUID
  ? crypto.randomUUID()
  : `dev-${Math.random().toString(36).slice(2, 10)}`

// Core clinical tables where instant cross-device updates are vital
const CLINICAL_REALTIME_TABLES: TableName[] = [
  'patients', 'appointments', 'treatments', 'payments', 'encounters',
  'lab_orders', 'prescriptions', 'staff', 'doctors', 'units',
  'implant_cases', 'waiting_list', 'tooth_records', 'cash_register_sessions',
]

/**
 * Dispatches a data changed event locally in the current window.
 */
function dispatchLocalEvent(payload: DataChangePayload): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('minadent:data_changed', { detail: payload }))
  }
}

/**
 * Handles incoming data changes from either Realtime Broadcast or Postgres CDC.
 */
async function handleIncomingChange(payload: DataChangePayload): Promise<void> {
  if (!payload || !payload.table) return
  if (payload.clinicId && payload.clinicId !== CLINIC_ID) return

  const tableName = payload.table as TableName
  if (!TABLE_NAMES.includes(tableName)) return

  const table = (db as any)[tableName]
  if (!table) return

  try {
    if (payload.action === 'delete') {
      const id = payload.recordId || payload.data?.id
      if (id) await table.delete(id)
    } else if (payload.action === 'update') {
      const id = payload.recordId || payload.data?.id
      if (id) {
        const existing = await table.get(id)
        if (existing) {
          const merged = { ...existing, ...payload.data, updated_at: payload.data?.updated_at || new Date().toISOString() }
          await table.put(merged)
        } else if (payload.data && typeof payload.data === 'object' && payload.data.id) {
          await table.put(payload.data)
        }
      }
    } else if (payload.data && typeof payload.data === 'object') {
      const row = payload.data
      if (row?.clinic_id && row.clinic_id !== CLINIC_ID) return
      if (row?.id) {
        await table.put(row)
      }
    }
  } catch (err) {
    console.warn(`[realtime] failed to apply local update on ${tableName}:`, err)
  }

  // Notify active React components
  dispatchLocalEvent(payload)
}

/**
 * Broadcast a change across the clinic (all connected devices and tabs).
 * Called immediately whenever an entity is created, updated, or deleted.
 */
export function broadcastDataChange(
  table: TableName | string,
  action: RealtimeAction,
  recordId?: string,
  data?: any,
): void {
  const payload: DataChangePayload = {
    table,
    action,
    recordId,
    data,
    senderId: DEVICE_SESSION_ID,
    timestamp: Date.now(),
    clinicId: CLINIC_ID,
  }

  // 1. Dispatch locally in this window immediately
  dispatchLocalEvent(payload)

  // 2. Broadcast across local browser tabs
  try {
    if (localBus) {
      localBus.postMessage(payload)
    }
  } catch (e) {
    // Ignore BroadcastChannel errors
  }

  // 3. Broadcast over Supabase Realtime channel to other phones and computers
  try {
    if (channel && isActive) {
      channel.send({
        type: 'broadcast',
        event: 'data_changed',
        payload,
      })
    }
  } catch (e) {
    console.warn('[realtime] failed to send broadcast:', e)
  }
}

/**
 * Alias for broadcastDataChange for convenient import.
 */
export const notifyDataChanged = broadcastDataChange

/**
 * Start the realtime subscription.
 * Safe to call multiple times — only one channel is created.
 * Returns a cleanup function.
 */
export function initRealtimeSync(): () => void {
  // Init local browser bus if available
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window && !localBus) {
    try {
      localBus = new BroadcastChannel('minadent_local_bus')
      localBus.onmessage = (event) => {
        if (event.data && event.data.senderId !== DEVICE_SESSION_ID) {
          handleIncomingChange(event.data)
        }
      }
    } catch {
      localBus = null
    }
  }

  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY
  const isDummyKey = !anonKey || anonKey.includes('placeholder') || anonKey.includes('missing-key')
  if (!hasSupabaseCredentials || isDummyKey) {
    return () => stopRealtimeSync()
  }

  if (isActive && channel) return () => stopRealtimeSync()

  isActive = true

  // Single multiplexed WebSocket channel for both Broadcasts and Postgres CDC
  channel = supabase.channel('minadent-realtime', {
    config: {
      broadcast: { self: false },
      presence: { key: DEVICE_SESSION_ID },
    },
  })

  // 1. Instant cross-device Broadcast listener (<50ms)
  channel.on('broadcast', { event: 'data_changed' }, async ({ payload }) => {
    if (!payload || payload.senderId === DEVICE_SESSION_ID) return
    await handleIncomingChange(payload as DataChangePayload)
  })

  // 2. Postgres CDC listener on public clinical tables
  for (const tableName of CLINICAL_REALTIME_TABLES) {
    channel.on(
      'postgres_changes' as any,
      {
        event: '*',
        schema: 'public',
        table: tableName,
      },
      async (payload: any) => {
        const action: RealtimeAction =
          payload.eventType === 'DELETE' ? 'delete' : payload.eventType === 'INSERT' ? 'insert' : 'update'
        const data = payload.new && Object.keys(payload.new).length > 0 ? payload.new : payload.old

        await handleIncomingChange({
          table: tableName,
          action,
          recordId: (data as any)?.id,
          data,
          senderId: 'server-cdc',
          timestamp: Date.now(),
          clinicId: (data as any)?.clinic_id || CLINIC_ID,
        })
      },
    )
  }

  // 3. Connect channel
  channel
    .subscribe(async (status: string, err?: Error) => {
      if (status === 'SUBSCRIBED') {
        console.info('[realtime] live sync active across all clinic devices')
        // Sync any pending items or pull server changes
        await syncNow()
      } else if (status === 'CHANNEL_ERROR') {
        console.warn('[realtime] channel error — falling back to polling/local bus', err)
      } else if (status === 'CLOSED') {
        isActive = false
      }
    })

  return () => stopRealtimeSync()
}

export function stopRealtimeSync(): void {
  if (channel) {
    try {
      supabase.removeChannel(channel)
    } catch {}
    channel = null
  }
  if (localBus) {
    try {
      localBus.close()
    } catch {}
    localBus = null
  }
  isActive = false
}

/** Returns whether the realtime channel is currently active */
export function isRealtimeActive(): boolean {
  return isActive
}

import { useEffect, useRef } from 'react'

/**
 * React hook to automatically re-fetch data whenever any of the specified tables
 * are updated locally, across tabs, or via Supabase Realtime from other devices.
 */
export function useDataRefresh(
  tables: (TableName | string)[],
  onRefresh: () => void | Promise<void>,
): void {
  const refreshRef = useRef(onRefresh)
  refreshRef.current = onRefresh

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<DataChangePayload>).detail
      if (!detail || !detail.table || tables.includes(detail.table as TableName)) {
        refreshRef.current()
      }
    }

    window.addEventListener('minadent:data_changed', handler)
    return () => {
      window.removeEventListener('minadent:data_changed', handler)
    }
  }, [tables.join(',')])
}

/**
 * Diagnostic ping test: broadcasts a ping packet over Supabase Realtime channel
 * and checks if channel is open and ready.
 */
export async function pingRealtime(): Promise<{ ok: boolean; status: string; latencyMs?: number }> {
  if (!channel || !isActive) {
    initRealtimeSync()
  }
  const start = Date.now()
  try {
    if (!channel) return { ok: false, status: 'کانال برقرار نیست' }
    const res = await channel.send({
      type: 'broadcast',
      event: 'ping_test',
      payload: { timestamp: start, senderId: DEVICE_SESSION_ID },
    })
    const latencyMs = Date.now() - start
    if (res === 'ok') {
      return { ok: true, status: 'متصل و آماده تبادل آنی', latencyMs }
    }
    return { ok: false, status: `وضعیت وب‌سوکت: ${res}`, latencyMs }
  } catch (err: any) {
    return { ok: false, status: err?.message || 'خطا در ارسال پیام' }
  }
}

