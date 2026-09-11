// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  checkForUpdate,
  isAutoCheckEnabled,
  setAutoCheckEnabled,
  isAutoApplyEnabled,
  setAutoApplyEnabled,
  AUTO_CHECK_KEY,
  AUTO_APPLY_KEY,
} from './updateCheck'
import { APP_VERSION } from './appVersion'

describe('Automatic Version Update Engine', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('defaults to auto-check enabled and auto-apply enabled', () => {
    expect(isAutoCheckEnabled()).toBe(true)
    expect(isAutoApplyEnabled()).toBe(true)
  })

  it('allows toggling auto-check and auto-apply settings in localStorage', () => {
    setAutoCheckEnabled(false)
    expect(localStorage.getItem(AUTO_CHECK_KEY)).toBe('false')
    expect(isAutoCheckEnabled()).toBe(false)

    setAutoCheckEnabled(true)
    expect(localStorage.getItem(AUTO_CHECK_KEY)).toBe('true')
    expect(isAutoCheckEnabled()).toBe(true)

    setAutoApplyEnabled(false)
    expect(localStorage.getItem(AUTO_APPLY_KEY)).toBe('false')
    expect(isAutoApplyEnabled()).toBe(false)

    setAutoApplyEnabled(true)
    expect(localStorage.getItem(AUTO_APPLY_KEY)).toBe('true')
    expect(isAutoApplyEnabled()).toBe(true)
  })

  it('detects an update when remote version is newer than running APP_VERSION', async () => {
    const mockVersionJson = {
      version: '99.99.99',
      buildDate: '2026-10-01',
      buildTimestamp: 1800000000000,
    }

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockVersionJson,
    } as Response)

    const result = await checkForUpdate()
    expect(result.updateAvailable).toBe(true)
    expect(result.remoteVersion).toBe('99.99.99')
    expect(result.remoteBuildDate).toBe('2026-10-01')
    expect(result.remoteTimestamp).toBe(1800000000000)
  })

  it('reports no update when remote version matches APP_VERSION', async () => {
    const mockVersionJson = {
      version: APP_VERSION,
      buildDate: '2026-09-11',
      buildTimestamp: 1789150000000,
    }

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockVersionJson,
    } as Response)

    const result = await checkForUpdate()
    expect(result.updateAvailable).toBe(false)
    expect(result.remoteVersion).toBe(APP_VERSION)
  })

  it('gracefully handles network or fetch errors without crashing', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const result = await checkForUpdate()
    expect(result.updateAvailable).toBe(false)
    expect(result.remoteVersion).toBeNull()
  })
})
