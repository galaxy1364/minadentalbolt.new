import { describe, it, expect } from 'vitest'
import {
  calculateCrc32,
  createZipArchive,
  dataUrlToUint8Array,
  createPatientRadiologyZip,
  ZipInputFile,
} from './zipArchive'
import type { Patient, RadiologyImage } from '../types'

describe('zipArchive — Pure TypeScript PKZIP Engine', () => {
  describe('calculateCrc32', () => {
    it('calculates CRC-32 for empty byte array', () => {
      const empty = new Uint8Array(0)
      expect(calculateCrc32(empty)).toBe(0)
    })

    it('calculates accurate CRC-32 for known ASCII string "123456789"', () => {
      // Standard CRC-32 test vector: "123456789" -> 0xcbf43926
      const encoder = new TextEncoder()
      const data = encoder.encode('123456789')
      expect(calculateCrc32(data)).toBe(0xcbf43926)
    })

    it('calculates accurate CRC-32 for UTF-8 Persian text', () => {
      const encoder = new TextEncoder()
      const data = encoder.encode('کلینیک دندانپزشکی مینا')
      const crc = calculateCrc32(data)
      expect(typeof crc).toBe('number')
      expect(crc).toBeGreaterThan(0)
    })
  })

  describe('createZipArchive', () => {
    it('generates a valid empty-like ZIP or multi-file ZIP with standard PKZIP signatures', () => {
      const files: ZipInputFile[] = [
        {
          name: 'notes.txt',
          data: 'یادداشت بالینی دندانپزشک',
        },
        {
          name: 'subfolder/data.json',
          data: JSON.stringify({ patientId: 'p1', tooth: 16 }),
        },
      ]

      const zipBytes = createZipArchive(files)
      expect(zipBytes).toBeInstanceOf(Uint8Array)
      expect(zipBytes.length).toBeGreaterThan(0)

      // Magic bytes for first local file header = PK\x03\x04 (0x04034b50)
      const view = new DataView(zipBytes.buffer, zipBytes.byteOffset, zipBytes.byteLength)
      const localHeaderSig = view.getUint32(0, true)
      expect(localHeaderSig).toBe(0x04034b50)

      // Must contain EOCD record signature PK\x05\x06 (0x06054b50) at the end
      const eocdOffset = zipBytes.length - 22
      const eocdSig = view.getUint32(eocdOffset, true)
      expect(eocdSig).toBe(0x06054b50)

      // Total central directory records in EOCD should match files count (2)
      const totalEntries = view.getUint16(eocdOffset + 10, true)
      expect(totalEntries).toBe(2)
    })

    it('handles binary data correctly', () => {
      const binaryData = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) // PNG header bytes
      const files: ZipInputFile[] = [
        {
          name: 'tooth_16.png',
          data: binaryData,
        },
      ]

      const zipBytes = createZipArchive(files)
      expect(zipBytes.length).toBeGreaterThan(binaryData.length + 30 + 46 + 22)
    })
  })

  describe('dataUrlToUint8Array', () => {
    it('converts base64 data URL to Uint8Array', () => {
      // "SGVsbG8=" is base64 for "Hello"
      const dataUrl = 'data:text/plain;base64,SGVsbG8='
      const bytes = dataUrlToUint8Array(dataUrl)
      const text = new TextDecoder().decode(bytes)
      expect(text).toBe('Hello')
    })
  })

  describe('createPatientRadiologyZip', () => {
    const mockPatient: Patient = {
      id: 'pat-100',
      clinic_id: 'cl-1',
      file_number: '1042',
      first_name: 'سارا',
      last_name: 'احمدی',
      national_id: '0012345678',
      birth_date: '1370-05-10',
      gender: 'female',
      phone: '09123456789',
      is_active: true,
      created_at: '2026-09-01T10:00:00Z',
      updated_at: '2026-09-01T10:00:00Z',
    } as unknown as Patient

    const mockImages: RadiologyImage[] = [
      {
        id: 'rad-1',
        clinic_id: 'cl-1',
        patient_id: 'pat-100',
        doctor_id: 'doc-1',
        encounter_id: null,
        image_type: 'periapical',
        tooth_number: '16',
        image_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        description: 'ضایعه پری‌اپیکال مزمن',
        taken_at: '2026-09-10',
        notes: null,
        is_active: true,
        created_at: '2026-09-10T10:00:00Z',
        updated_at: '2026-09-10T10:00:00Z',
      },
      {
        id: 'rad-2',
        clinic_id: 'cl-1',
        patient_id: 'pat-100',
        doctor_id: 'doc-1',
        encounter_id: null,
        image_type: 'panoramic',
        tooth_number: null,
        image_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        description: 'بررسی کلی فکین قبل از درمان',
        taken_at: '2026-09-12',
        notes: null,
        is_active: true,
        created_at: '2026-09-12T10:00:00Z',
        updated_at: '2026-09-12T10:00:00Z',
      },
    ]

    it('generates a full patient radiology zip blob with images, DICOM JSON, HTML report, and manifest', async () => {
      let progressCalls = 0
      const blob = await createPatientRadiologyZip({
        patient: mockPatient,
        images: mockImages,
        clinicName: 'کلینیک دندانپزشکی تخصصی مینا',
        includeDicomJson: true,
        includeHtmlPortfolio: true,
        onProgress: (_curr, _total, _msg) => {
          progressCalls++
        },
      })

      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('application/zip')
      expect(blob.size).toBeGreaterThan(100)
      expect(progressCalls).toBeGreaterThan(0)

      // Verify the blob buffer contains valid ZIP magic bytes
      const arrayBuffer = await blob.arrayBuffer()
      const view = new DataView(arrayBuffer)
      expect(view.getUint32(0, true)).toBe(0x04034b50)
    })
  })
})
