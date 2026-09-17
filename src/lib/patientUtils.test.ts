// @vitest-environment jsdom
// patientUtils.test.ts -- age-calculation engine (no fake assertions)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { calculateAge } from './patientUtils'

describe('calculateAge', () => {
  // Pin "today" so tests are deterministic
  const FIXED_TODAY = new Date('2026-09-16T12:00:00Z')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_TODAY)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── Null / invalid inputs ──────────────────────────────────

  it('returns null for null birth date', () => {
    expect(calculateAge(null)).toBeNull()
  })

  it('returns null for undefined birth date', () => {
    expect(calculateAge(undefined)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(calculateAge('')).toBeNull()
  })

  it('returns null for non-date string', () => {
    expect(calculateAge('not-a-date')).toBeNull()
  })

  it('returns null for implausible age >= 150', () => {
    expect(calculateAge('1800-01-01')).toBeNull()
  })

  // ── Correct year calculation ───────────────────────────────

  it('calculates age correctly for birthday that already passed this year', () => {
    // Born 1990-03-15; today = 2026-09-16 => age = 36
    expect(calculateAge('1990-03-15')).toBe(36)
  })

  it('calculates age correctly for birthday that has not yet occurred this year', () => {
    // Born 1990-12-01; today = 2026-09-16 => age = 35 (birthday in Dec)
    expect(calculateAge('1990-12-01')).toBe(35)
  })

  it('calculates age of 0 for a baby born this year', () => {
    // Born 2026-01-01; today = 2026-09-16 => age = 0
    expect(calculateAge('2026-01-01')).toBe(0)
  })

  // ── Exact birthday edge case ───────────────────────────────

  it('returns correct age on the exact birthday', () => {
    // Born 1990-09-16; today = 2026-09-16 => exactly 36
    expect(calculateAge('1990-09-16')).toBe(36)
  })

  it('returns age - 1 when birthday month is in the future (Oct vs Sep-16 today)', () => {
    // Born 1990-10-01; today = 2026-09-16 => birthday next month => 35
    expect(calculateAge('1990-10-01')).toBe(35)
  })

  // ── Month boundary ─────────────────────────────────────────

  it('does not add a year when birthday month already passed', () => {
    // Born 1985-05-20; today = 2026-09-16 => age = 41
    expect(calculateAge('1985-05-20')).toBe(41)
  })

  it('subtracts a year when birthday month has not arrived', () => {
    // Born 1985-11-01; today = 2026-09-16 => age = 40
    expect(calculateAge('1985-11-01')).toBe(40)
  })

  // ── Boundary values ───────────────────────────────────────

  it('returns 149 for an implausibly old but still valid entry (age < 150)', () => {
    // Born 1877-09-16; age = 149 (still < 150)
    expect(calculateAge('1877-09-16')).toBe(149)
  })

  it('returns null for a future birth date (negative age)', () => {
    expect(calculateAge('2030-01-01')).toBeNull()
  })
})
