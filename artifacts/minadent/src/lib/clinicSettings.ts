// clinicSettings.ts — Cross-device clinic-wide preference storage
//
// WHY: localStorage is per-device; clinic-wide settings (name, file number
// format, POS config, daily goal) must be the same on every device staff use.
//
// HOW: upsert to Supabase clinic_settings table on every save; read from
// Supabase on load with localStorage as an offline fallback.
//
// Keys that stay in localStorage (per-device preferences):
//   minadent_haptics, minadent_sound, minadent-dash-range, minadent-dash-doctor
//
// Keys managed here (clinic-wide):
//   general, fileNumber, pos, appt_goal

import { supabase, CLINIC_ID } from './supabase'

// ── Types ──────────────────────────────────────────────────────────────────

export type ClinicSettingKey = 'general' | 'fileNumber' | 'pos' | 'appt_goal'

// Local fallback key prefix — we keep a copy in localStorage so the app works
// offline immediately without waiting for Supabase.
const LS_PREFIX = 'minadent_cs_'

// ── Helpers ────────────────────────────────────────────────────────────────

function lsKey(key: ClinicSettingKey): string {
  return LS_PREFIX + key
}

function readLocal<T>(key: ClinicSettingKey): T | null {
  try {
    const raw = localStorage.getItem(lsKey(key))
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeLocal(key: ClinicSettingKey, value: unknown): void {
  try {
    localStorage.setItem(lsKey(key), JSON.stringify(value))
  } catch {
    // Private/full storage — not fatal
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Read a clinic-wide setting.
 *
 * Order of precedence:
 *   1. Supabase (authoritative, cross-device)
 *   2. localStorage (offline fallback)
 *   3. null (caller should use their own default)
 */
export async function getClinicSetting<T = unknown>(key: ClinicSettingKey): Promise<T | null> {
  try {
    const { data, error } = await supabase
      .from('clinic_settings')
      .select('value')
      .eq('clinic_id', CLINIC_ID)
      .eq('key', key)
      .maybeSingle()

    if (!error && data?.value && Object.keys(data.value as object).length > 0) {
      // Keep local copy fresh for offline use
      writeLocal(key, data.value)
      return data.value as T
    }
  } catch {
    // Network error — fall through to localStorage
  }

  // Offline fallback
  return readLocal<T>(key)
}

/**
 * Persist a clinic-wide setting.
 *
 * Writes to localStorage immediately (instant UI feedback) then upserts to
 * Supabase so other devices pick it up on their next sync cycle (≤15s).
 */
export async function setClinicSetting(key: ClinicSettingKey, value: unknown): Promise<void> {
  // 1. Write locally first — zero-latency UI update
  writeLocal(key, value)

  // 2. Upsert to Supabase — cross-device sync
  try {
    const { error } = await supabase
      .from('clinic_settings')
      .upsert(
        {
          clinic_id: CLINIC_ID,
          key,
          value: value as object,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'clinic_id,key' },
      )

    if (error) {
      console.warn(`[clinicSettings] upsert failed for "${key}":`, error.message)
      // Local copy is already written — setting will work offline
    }
  } catch (err) {
    console.warn(`[clinicSettings] network error saving "${key}":`, err)
    // Not fatal — local copy persists
  }
}

/**
 * Pre-load all clinic settings at app startup.
 * Returns a map of key → value. Callers should merge with their defaults.
 */
export async function loadAllClinicSettings(): Promise<Partial<Record<ClinicSettingKey, unknown>>> {
  try {
    const { data, error } = await supabase
      .from('clinic_settings')
      .select('key, value')
      .eq('clinic_id', CLINIC_ID)

    if (!error && data) {
      const result: Partial<Record<ClinicSettingKey, unknown>> = {}
      for (const row of data) {
        const k = row.key as ClinicSettingKey
        if (row.value && Object.keys(row.value as object).length > 0) {
          result[k] = row.value
          writeLocal(k, row.value) // keep local cache fresh
        }
      }
      return result
    }
  } catch {
    // Offline — fall through
  }

  // Offline: read all keys from localStorage
  const keys: ClinicSettingKey[] = ['general', 'fileNumber', 'pos', 'appt_goal']
  const result: Partial<Record<ClinicSettingKey, unknown>> = {}
  for (const k of keys) {
    const v = readLocal(k)
    if (v !== null) result[k] = v
  }
  return result
}
