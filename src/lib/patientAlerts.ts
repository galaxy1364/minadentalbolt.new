// patientAlerts.ts — what must be shouted at whoever opens a patient file.
//
// Two unrelated things have to interrupt: a clinical fact that changes
// how the patient may be treated, and money owed. They are derived here,
// as pure functions, so the rules can be tested without a browser.
//
// Competitor reference: COMP-33 (debtor) and COMP-34 (clinical), seen as
// stacked dismissible red cards pinned to the top of the file.

export type PatientAlertKind = 'allergy' | 'condition' | 'medication' | 'debt'

export interface PatientAlert {
  kind: PatientAlertKind
  /** Stable within a patient, so a dismissal can be remembered per alert. */
  id: string
  title: string
  /** The specific items, already split out of the free-text field. */
  items: string[]
  /** 0 is most urgent. Drives both sort order and colour. */
  severity: number
}

/** Free-text clinical fields are typed by humans with whatever separator
 * is at hand. Splitting on all of them turns one blob into chips, which
 * is what makes "قلبی · وارفارین" readable at a glance. */
const SEPARATORS = /[,،;؛\n\r/|]+/

/**
 * Values that mean "nothing to report".
 *
 * This list is the whole reason the module is worth testing. Clinics fill
 * required-looking fields with "ندارد" rather than leaving them blank. A
 * red alert reading «حساسیت: ندارد» is worse than no alert: staff learn
 * that the red card is usually noise and stop reading it, so the one time
 * it says «پنی‌سیلین» it gets dismissed with the rest.
 */
const NEGATIVE_VALUES = new Set([
  '-', '_', '.', '،', 'ندارد', 'نداره', 'نداری', 'نداریم', 'هیچ', 'هیچی', 'خیر', 'نه',
  'بدون', 'موردی ندارد', 'مورد ندارد', 'فاقد', 'منفی', 'سالم', 'عادی', 'طبیعی',
  'مشکلی ندارد', 'چیزی ندارد', 'بدون مورد', 'بدون سابقه', 'سابقه ای ندارد',
  'none', 'no', 'nil', 'n/a', 'na', 'nothing', 'negative', 'normal', 'healthy',
])

/** Arabic/Persian character variants and digits, so "نداره " and "نداري"
 * both land on the same key as "ندارد". */
export function normalizeClinicalText(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\s+/g, ' ')
}

/** True when the text carries no clinical information. */
export function isNegativeValue(input: string | null | undefined): boolean {
  if (!input) return true
  const n = normalizeClinicalText(input)
  if (!n) return true
  return NEGATIVE_VALUES.has(n)
}

/**
 * Splits one free-text field into displayable items, dropping the
 * "nothing to report" fillers. Returns an empty array when the field
 * carries nothing — the caller then raises no alert at all.
 */
export function splitClinicalField(input: string | null | undefined): string[] {
  if (isNegativeValue(input)) return []
  const parts = String(input)
    .split(SEPARATORS)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !isNegativeValue(p))
  // A field with no separator is a single item; keep it whole rather
  // than chopping a sentence into words.
  return parts.length > 0 ? parts : []
}

export interface AlertPatientFields {
  id: string
  allergies?: string | null
  medical_conditions?: string | null
  medical_history?: string | null
  medications?: string | null
  credit_limit?: number | null
}

export interface AlertBalance {
  /** Positive means the patient owes the clinic. */
  balance: number
}

/**
 * Severity order, and why:
 *
 *  0 allergies    — can kill within minutes of an injection.
 *  1 conditions   — changes what is safe to do in the chair.
 *  2 medications  — mostly bleeding risk; matters, but is slower.
 *  3 debt         — money. Never above a clinical fact.
 *
 * Putting the debtor card above the anticoagulant card would be a real
 * patient-safety error, so the ordering is pinned by a test rather than
 * left to whatever order the JSX happens to render in.
 */
const SEVERITY: Record<PatientAlertKind, number> = {
  allergy: 0,
  condition: 1,
  medication: 2,
  debt: 3,
}

const TITLES: Record<PatientAlertKind, string> = {
  allergy: 'حساسیت دارویی',
  condition: 'بیماری زمینه‌ای',
  medication: 'داروی مصرفی',
  debt: 'بیمار بدهکار',
}

/** Formats a debt line. Kept out of the component so the wording is
 * covered by tests along with the threshold logic. */
export function debtItems(balance: number, creditLimit: number | null | undefined): string[] {
  const items = [`مانده حساب: ${Math.round(balance).toLocaleString('en-US')} تومان`]
  if (creditLimit != null && creditLimit > 0 && balance > creditLimit) {
    items.push(`از سقف اعتبار (${Math.round(creditLimit).toLocaleString('en-US')}) عبور کرده`)
  }
  return items
}

/**
 * Builds every alert that applies to a patient, most urgent first.
 *
 * Clinical text is read from three separate fields because clinics do not
 * agree on which one to use: some record "وارفارین" under medications,
 * others under medical_history. Reading only the tidy field would mean
 * missing the alert on half the files.
 */
export function buildPatientAlerts(
  patient: AlertPatientFields,
  balance: AlertBalance | null,
): PatientAlert[] {
  const alerts: PatientAlert[] = []

  const push = (kind: PatientAlertKind, items: string[]) => {
    if (items.length === 0) return
    alerts.push({
      kind,
      id: `${patient.id}:${kind}`,
      title: TITLES[kind],
      items,
      severity: SEVERITY[kind],
    })
  }

  push('allergy', splitClinicalField(patient.allergies))

  // medical_conditions and medical_history are merged: they are the same
  // idea recorded in two places, and duplicates are removed so a fact
  // written in both does not appear twice on screen.
  const conditions = [
    ...splitClinicalField(patient.medical_conditions),
    ...splitClinicalField(patient.medical_history),
  ]
  const seen = new Set<string>()
  const uniqueConditions = conditions.filter((c) => {
    const key = normalizeClinicalText(c)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  push('condition', uniqueConditions)

  push('medication', splitClinicalField(patient.medications))

  // Only a real debt raises the card. A zero or credit balance is not a
  // warning, and a negative balance means the clinic owes the patient.
  if (balance && balance.balance > 0) {
    push('debt', debtItems(balance.balance, patient.credit_limit))
  }

  return alerts.sort((a, b) => a.severity - b.severity)
}

/** Short chips for the file header — the same facts, compressed.
 * Debt is excluded: the header chip row describes the person, and the
 * money warning has its own card. */
export function alertChips(alerts: PatientAlert[], maxPerKind = 3): string[] {
  return alerts
    .filter((a) => a.kind !== 'debt')
    .flatMap((a) => a.items.slice(0, maxPerKind))
}
