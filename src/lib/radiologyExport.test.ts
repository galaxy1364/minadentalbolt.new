// src/lib/radiologyExport.test.ts
import { describe, it, expect } from 'vitest'
import {
  parseRadiologyTeeth,
  matchesRadiologyTooth,
  generateRadiologyPortfolioHtml,
  generateDicomMetadataJson,
} from './radiologyExport'
import type { Patient, RadiologyImage } from '../types'

describe('radiologyExport & multi-tooth tagging', () => {
  it('parses single and multiple tooth strings correctly', () => {
    expect(parseRadiologyTeeth('16')).toEqual(['16'])
    expect(parseRadiologyTeeth('14, 15, 16')).toEqual(['14', '15', '16'])
    expect(parseRadiologyTeeth(' 26 ,  27 ')).toEqual(['26', '27'])
    expect(parseRadiologyTeeth(null)).toEqual([])
    expect(parseRadiologyTeeth('')).toEqual([])
  })

  it('matches target tooth against single or multiple tagged teeth', () => {
    expect(matchesRadiologyTooth('16', 'all')).toBe(true)
    expect(matchesRadiologyTooth('14, 15, 16', '15')).toBe(true)
    expect(matchesRadiologyTooth('14, 15, 16', '16')).toBe(true)
    expect(matchesRadiologyTooth('14, 15, 16', '18')).toBe(false)
    expect(matchesRadiologyTooth(null, '16')).toBe(false)
    expect(matchesRadiologyTooth(null, 'all')).toBe(true)
  })

  it('generates DICOM-compatible clinical metadata json', () => {
    const mockPatient = {
      id: 'p-1',
      first_name: 'سارا',
      last_name: 'محمدی',
      national_id: '0012345678',
      file_number: 'FN-900',
      birth_date: '1990-05-15',
      gender: 'female',
      is_active: true,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    } as unknown as Patient

    const mockImages = [
      {
        id: 'rad-1',
        patient_id: 'p-1',
        image_type: 'PA',
        tooth_number: '16, 17',
        image_url: 'https://example.com/xray1.jpg',
        taken_at: '2026-09-01',
        description: 'پری‌آپیکال ریشه دیستال',
        created_at: '2026-09-01',
      },
    ] as unknown as RadiologyImage[]

    const dicomMeta = generateDicomMetadataJson({ patient: mockPatient, images: mockImages })
    expect(dicomMeta.PatientID).toBe('FN-900')
    expect(dicomMeta.PatientName).toBe('سارا محمدی')
    expect(dicomMeta.Modality).toBe('DX')
    expect(dicomMeta.Studies.length).toBe(1)
    expect(dicomMeta.Studies[0].Teeth).toEqual(['16', '17'])
    expect(dicomMeta.Studies[0].Description).toBe('پری‌آپیکال ریشه دیستال')
  })

  it('generates printable portfolio html containing patient and image details', () => {
    const mockPatient = {
      id: 'p-1',
      first_name: 'سارا',
      last_name: 'محمدی',
      national_id: '0012345678',
      file_number: 'FN-900',
      is_active: true,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    } as unknown as Patient

    const mockImages = [
      {
        id: 'rad-1',
        patient_id: 'p-1',
        image_type: 'Bitewing',
        tooth_number: '46',
        image_url: 'https://example.com/bw.jpg',
        taken_at: '2026-09-10',
        description: 'بررسی پوسیدگی پروگزیمال',
        created_at: '2026-09-10',
      },
    ] as unknown as RadiologyImage[]

    const html = generateRadiologyPortfolioHtml({ patient: mockPatient, images: mockImages })
    expect(html).toContain('کلینیک دندانپزشکی مینا')
    expect(html).toContain('سارا محمدی')
    expect(html).toContain('Bitewing')
    expect(html).toContain('بررسی پوسیدگی پروگزیمال')
    expect(html).toContain('https://example.com/bw.jpg')
  })
})
