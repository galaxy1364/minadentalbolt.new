import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkForUpdate } from './updateCheck'
import { APP_VERSION } from './appVersion'

describe('Interactive Data Badges & Deep-Link Navigation Routing', () => {
  it('correctly maps debt status to direct payment settlement flow state', () => {
    const buildPatientDebtNav = (patientId: string, balance: number) => {
      if (balance > 0) {
        return {
          path: `/patients/${patientId}`,
          state: { initialTab: 'payments', openPaymentModal: true },
        }
      }
      return {
        path: `/patients/${patientId}`,
        state: { initialTab: 'payments', focusSection: 'section-payments-ledger' },
      }
    }

    const debtorNav = buildPatientDebtNav('patient-123', 500000)
    expect(debtorNav.path).toBe('/patients/patient-123')
    expect(debtorNav.state.initialTab).toBe('payments')
    expect(debtorNav.state.openPaymentModal).toBe(true)

    const settledNav = buildPatientDebtNav('patient-456', 0)
    expect(settledNav.path).toBe('/patients/patient-456')
    expect(settledNav.state.initialTab).toBe('payments')
    expect(settledNav.state.focusSection).toBe('section-payments-ledger')
  })

  it('correctly maps active cheques badge to cheques ledger focus', () => {
    const buildChequeNav = (patientId: string) => ({
      path: `/patients/${patientId}`,
      state: { initialTab: 'payments', focusSection: 'section-cheques' },
    })

    const nav = buildChequeNav('pat-789')
    expect(nav.path).toBe('/patients/pat-789')
    expect(nav.state.initialTab).toBe('payments')
    expect(nav.state.focusSection).toBe('section-cheques')
  })

  it('correctly maps installment plans badge to installment plans section focus', () => {
    const buildPlanNav = (patientId: string) => ({
      path: `/patients/${patientId}`,
      state: { initialTab: 'payments', focusSection: 'section-payment-plans' },
    })

    const nav = buildPlanNav('pat-999')
    expect(nav.path).toBe('/patients/pat-999')
    expect(nav.state.initialTab).toBe('payments')
    expect(nav.state.focusSection).toBe('section-payment-plans')
  })

  it('correctly returns native APK and IPA package URLs from version.json', async () => {
    const mockVersionJson = {
      version: APP_VERSION,
      buildDate: '2026-09-19',
      buildTimestamp: Date.now(),
      apkUrl: '/downloads/minadent.apk',
      ipaUrl: '/downloads/minadent.ipa',
      description: 'Enterprise dental build',
    }

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockVersionJson,
    } as Response)

    const result = await checkForUpdate()
    expect(result.apkUrl).toBe('/downloads/minadent.apk')
    expect(result.ipaUrl).toBe('/downloads/minadent.ipa')
    expect(result.description).toBe('Enterprise dental build')
  })
})
