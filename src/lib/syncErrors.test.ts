import { describe, it, expect } from 'vitest'
import { isMissingTableError } from './syncErrors'

// Regression guard for the incident on ۱۴۰۵/۰۶/۰۷: the app shipped with
// tooth_notes / patient_policies / lab_order columns before their
// migrations had been applied. pullTable threw on the first missing
// table, which broke the whole sync loop — every table after it was
// never pulled, so the app looked dead rather than merely out of date.

describe('isMissingTableError', () => {
  it('recognises the Postgres undefined_table code', () => {
    expect(isMissingTableError({ code: '42P01', message: 'relation does not exist' })).toBe(true)
  })

  it('recognises the PostgREST schema-cache code', () => {
    expect(isMissingTableError({ code: 'PGRST205', message: 'Could not find the table' })).toBe(true)
  })

  it('recognises the message even when no code is supplied', () => {
    expect(isMissingTableError({ message: 'relation "tooth_notes" does not exist' })).toBe(true)
    expect(isMissingTableError({ message: "Could not find the table 'public.patient_policies'" })).toBe(true)
  })

  it('is case-insensitive on the message', () => {
    expect(isMissingTableError({ message: 'RELATION DOES NOT EXIST' })).toBe(true)
  })

  it('does NOT swallow a permission error', () => {
    // An RLS denial means the policy is wrong. Silently skipping it
    // would hide a real security misconfiguration behind a warning.
    expect(isMissingTableError({ code: '42501', message: 'permission denied for table patients' })).toBe(false)
  })

  it('does NOT swallow a network failure', () => {
    expect(isMissingTableError({ message: 'Failed to fetch' })).toBe(false)
  })

  it('does NOT swallow a constraint violation', () => {
    expect(isMissingTableError({ code: '23505', message: 'duplicate key value' })).toBe(false)
  })

  it('tolerates a malformed error object rather than throwing', () => {
    expect(isMissingTableError(null)).toBe(false)
    expect(isMissingTableError(undefined)).toBe(false)
    expect(isMissingTableError({})).toBe(false)
    expect(isMissingTableError('boom')).toBe(false)
  })

  it('does not treat a missing *column* as a missing table', () => {
    // A missing column is a genuine schema mismatch that should surface,
    // not be skipped silently.
    expect(isMissingTableError({ code: '42703', message: 'column "shelf" does not exist' })).toBe(false)
  })
})
