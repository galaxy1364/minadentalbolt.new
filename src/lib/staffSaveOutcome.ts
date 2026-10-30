/**
 * MOD-FIX-009 | گزارش صادقانه‌ی نتیجه‌ی ثبت پرسنل
 *
 * Saving a staff member with «ساخت حساب ورود» ticked is two writes, not
 * one: the staff row locally, then an `invite-staff` Edge Function call
 * that creates the actual Supabase Auth user. The green
 * «پرسنل با موفقیت اضافه شد» fired between them — before the second write
 * was even attempted.
 *
 * So when the Edge Function failed, the sequence the user saw was a green
 * success followed by a red error. The staff member appeared in the list,
 * which is the thing people check, and the account that was the whole
 * point of the form did not exist. Reported by Mehdi as
 * «ثبت شد ولی با همان رمز وارد نمی‌شود» — the app had told him it worked.
 *
 * One save is one outcome. Composing the message here rather than firing
 * toasts as each step completes means the two halves cannot disagree, and
 * the rule is reachable from a test.
 */

export type LoginOutcome =
  /** «ساخت حساب ورود» تیک نخورده بود. */
  | 'not_requested'
  /** حساب واقعاً در Supabase Auth ساخته شد. */
  | 'created'
  /** رکورد پرسنل ذخیره شد ولی حساب ورود ساخته نشد. */
  | 'failed'

export interface SaveOutcomeMessage {
  type: 'success' | 'error'
  text: string
}

/**
 * The single message shown after saving a staff member.
 *
 * A failed login is reported as an error even though the staff row was
 * written, because the half that failed is the half the user was asking
 * for. Calling that a success — which is what a green toast does — is how
 * a broken account looks fine for a week.
 */
export function staffSaveMessage(
  mode: 'created' | 'updated',
  outcome: LoginOutcome,
  reason?: string,
): SaveOutcomeMessage {
  const noun = mode === 'created' ? 'پرسنل ثبت شد' : 'پرسنل ویرایش شد'

  if (outcome === 'not_requested') return { type: 'success', text: noun }
  if (outcome === 'created') return { type: 'success', text: `${noun} و حساب ورود ساخته شد` }

  const detail = reason?.trim()
  return {
    type: 'error',
    text: detail
      ? `${noun} — اما حساب ورود ساخته نشد: ${detail}`
      : `${noun} — اما حساب ورود ساخته نشد. این شخص نمی‌تواند وارد شود.`,
  }
}
