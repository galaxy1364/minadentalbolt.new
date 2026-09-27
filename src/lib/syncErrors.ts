// syncErrors.ts — error classification for the sync loop.
//
// Kept in its own module, free of the Supabase client, so the rules can
// be unit-tested without constructing a real connection.

/**
 * Whether an error means "this table does not exist server-side yet".
 *
 * Both pull and push consult this, so the rule lives in exactly one
 * place — two copies would inevitably drift apart.
 *
 * Deliberately narrow. A permission error or a missing *column* is a
 * real problem that must surface; only a wholly absent table is treated
 * as "the app is simply ahead of its migrations".
 */
export function isMissingTableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { code?: string; message?: string }
  if (e.code === '42P01' || e.code === 'PGRST205') return true
  // 42703 is undefined_column — a genuine schema mismatch, not this case.
  if (e.code === '42703') return false
  const msg = e.message || ''
  return /relation .*does not exist|could not find the table/i.test(msg)
}
