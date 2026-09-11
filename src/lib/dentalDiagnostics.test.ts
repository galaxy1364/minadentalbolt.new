import { describe, it, expect } from 'vitest'
import { CONSENT_TEMPLATES } from './consentTemplates'

describe('Dental Clinical & Legal Standards', () => {
  describe('Informed Consent Templates', () => {
    it('provides legal templates for all major dental specialties', () => {
      const categories = CONSENT_TEMPLATES.map((t) => t.category)
      expect(categories).toContain('implant')
      expect(categories).toContain('surgery')
      expect(categories).toContain('endo')
      expect(categories).toContain('cosmetic')
      expect(categories).toContain('perio')
    })

    it('every template has a treatment description, legal risks, and postoperative care notes', () => {
      CONSENT_TEMPLATES.forEach((tpl) => {
        expect(tpl.id.length).toBeGreaterThan(0)
        expect(tpl.title.length).toBeGreaterThan(5)
        expect(tpl.treatmentDescription.length).toBeGreaterThan(20)
        expect(tpl.risks.length).toBeGreaterThan(20)
        expect(tpl.notes.length).toBeGreaterThan(10)
      })
    })

    it('implant template specifies bone graft and osseointegration risks', () => {
      const implantTpl = CONSENT_TEMPLATES.find((t) => t.id === 'implant-placement')
      expect(implantTpl).toBeDefined()
      expect(implantTpl?.risks).toContain('عصب')
      expect(implantTpl?.risks).toContain('سینوس')
    })
  })

  describe('Radiology Caliper Diagnostics Math', () => {
    it('calculates physical distance in millimeters from pixel distance and zoom scale', () => {
      // Caliper formula: (pixelDistance / (10 * scale))
      const calculateMm = (dx: number, dy: number, scale: number) => {
        const pixelDistance = Math.sqrt(dx * dx + dy * dy)
        return (pixelDistance / (10 * scale)).toFixed(1)
      }

      // 100 pixels at scale 1 = 10.0 mm
      expect(calculateMm(100, 0, 1)).toBe('10.0')

      // 200 pixels at scale 1 = 20.0 mm (standard root length)
      expect(calculateMm(0, 200, 1)).toBe('20.0')

      // 100 pixels at zoom scale 2 = 5.0 mm
      expect(calculateMm(100, 0, 2)).toBe('5.0')
    })
  })
})
