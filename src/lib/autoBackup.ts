import { db, TABLE_NAMES, BackupSnapshot } from './db'

/**
 * Automatic daily backup — runs once per day when the app is opened
 * (there's no server-side cron job available for this project, so this
 * is the honest client-side equivalent: a real clinic app gets opened
 * every working day, and that's when the snapshot is taken).
 *
 * Each snapshot is a full local copy of every table, stored in IndexedDB
 * itself (not downloaded as a file) so it can be restored from within
 * Settings without the user needing to manage backup files. The last 7
 * daily snapshots are kept; older ones are pruned automatically.
 */

const LAST_RUN_KEY = 'minadent-last-auto-backup'
const KEEP_DAYS = 7

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function runAutoBackupIfNeeded(): Promise<void> {
  try {
    const today = todayStr()
    if (localStorage.getItem(LAST_RUN_KEY) === today) return // already ran today

    const data: Record<string, any[]> = {}
    let recordCount = 0
    for (const t of TABLE_NAMES) {
      try {
        const rows = await (db as any)[t].toArray()
        data[t] = rows
        recordCount += rows.length
      } catch {
        data[t] = []
      }
    }

    const snapshot: BackupSnapshot = {
      date: today,
      created_at: new Date().toISOString(),
      record_count: recordCount,
      data: JSON.stringify(data),
    }

    // Replace today's snapshot if one somehow already exists (shouldn't,
    // given the localStorage guard above, but keeps this idempotent).
    const existing = await db.backup_snapshots.where('date').equals(today).first()
    if (existing?.id) await db.backup_snapshots.delete(existing.id)
    await db.backup_snapshots.add(snapshot)

    // Prune snapshots older than KEEP_DAYS.
    const all = await db.backup_snapshots.orderBy('date').toArray()
    if (all.length > KEEP_DAYS) {
      const toDelete = all.slice(0, all.length - KEEP_DAYS)
      await db.backup_snapshots.bulkDelete(toDelete.map((s) => s.id!).filter(Boolean))
    }

    localStorage.setItem(LAST_RUN_KEY, today)
  } catch {
    // A failed backup attempt should never crash the app; it'll simply
    // retry the next time the app loads (the localStorage key wasn't set).
  }
}

export async function listBackupSnapshots(): Promise<BackupSnapshot[]> {
  return db.backup_snapshots.orderBy('date').reverse().toArray()
}

/** Restores every table from a stored snapshot, replacing current local data. */
export async function restoreFromSnapshot(snapshot: BackupSnapshot): Promise<void> {
  const data = JSON.parse(snapshot.data) as Record<string, any[]>
  for (const t of TABLE_NAMES) {
    const rows = data[t]
    if (!Array.isArray(rows)) continue
    await (db as any)[t].clear()
    if (rows.length > 0) await (db as any)[t].bulkPut(rows)
  }
}
