// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  DEVICE_SESSION_ID,
  CLINICAL_REALTIME_TABLES,
  broadcastDataChange,
  broadcastMeshSyncRequest,
  isRealtimeActive,
  stopRealtimeSync,
} from './realtimeSync'

describe('realtimeSync — Bulletproof Dual Mesh & Cloud Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stopRealtimeSync()
  })

  it('generates a unique and valid device session ID', () => {
    expect(DEVICE_SESSION_ID).toBeDefined()
    expect(typeof DEVICE_SESSION_ID).toBe('string')
    expect(DEVICE_SESSION_ID.length).toBeGreaterThan(5)
  })

  it('includes all critical clinical tables in CLINICAL_REALTIME_TABLES', () => {
    expect(CLINICAL_REALTIME_TABLES).toContain('patients')
    expect(CLINICAL_REALTIME_TABLES).toContain('appointments')
    expect(CLINICAL_REALTIME_TABLES).toContain('treatments')
    expect(CLINICAL_REALTIME_TABLES).toContain('payments')
    expect(CLINICAL_REALTIME_TABLES).toContain('encounters')
    expect(CLINICAL_REALTIME_TABLES).toContain('doctor_schedules')
    expect(CLINICAL_REALTIME_TABLES).toContain('tooth_records')
  })

  it('dispatches local minadent:data_changed CustomEvent immediately upon broadcastDataChange', () => {
    const listener = vi.fn()
    window.addEventListener('minadent:data_changed', listener)

    broadcastDataChange('appointments', 'insert', 'test-appt-123', {
      id: 'test-appt-123',
      patient_id: 'p-1',
      date: '2026-09-17',
    })

    expect(listener).toHaveBeenCalledTimes(1)
    const event = listener.mock.calls[0][0] as CustomEvent
    expect(event.detail.table).toBe('appointments')
    expect(event.detail.action).toBe('insert')
    expect(event.detail.recordId).toBe('test-appt-123')
    expect(event.detail.senderId).toBe(DEVICE_SESSION_ID)

    window.removeEventListener('minadent:data_changed', listener)
  })

  it('correctly handles mesh sync request broadcast', () => {
    // Calling broadcastMeshSyncRequest when not yet subscribed must not throw
    expect(() => broadcastMeshSyncRequest()).not.toThrow()
  })

  it('reports inactive state cleanly after stopRealtimeSync', () => {
    stopRealtimeSync()
    expect(isRealtimeActive()).toBe(false)
  })
})
