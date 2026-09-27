// src/lib/zipArchive.ts — Pure TypeScript PKZIP Engine & Clinical Radiology Archiver
// Implements standard PKZIP v2.0 (Store method) with CRC-32 checksum calculation.
// Designed for 100% offline, zero-dependency browser packaging of patient images,
// DICOM JSON manifests, and clinical HTML reports.

import type { Patient, RadiologyImage } from '../types'
import { generateDicomMetadataJson, generateRadiologyPortfolioHtml, parseRadiologyTeeth } from './radiologyExport'
import { toPersianDigits, toJalaliStringPretty } from './persianDate'
import { toothLabel } from './toothLabel'

// ── CRC-32 Table & Computation ────────────────────────────────

const crcTable = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
  }
  crcTable[i] = c >>> 0
}

/**
 * Calculates the IEEE 802.3 32-bit Cyclic Redundancy Check (CRC-32) of a byte array.
 */
export function calculateCrc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    const tableIndex = (crc ^ data[i]) & 0xff
    crc = (crc >>> 8) ^ crcTable[tableIndex]
  }
  return (crc ^ 0xffffffff) >>> 0
}

// ── ZIP Archive File Structure ────────────────────────────────

export interface ZipInputFile {
  name: string
  data: Uint8Array | string
  date?: Date
}

interface ProcessedZipEntry {
  nameBytes: Uint8Array
  dataBytes: Uint8Array
  crc32: number
  uncompressedSize: number
  compressedSize: number
  localHeaderOffset: number
  dosTime: number
  dosDate: number
}

function toDosDateTime(d: Date): { dosTime: number; dosDate: number } {
  const dosTime =
    ((d.getHours() & 0x1f) << 11) |
    ((d.getMinutes() & 0x3f) << 5) |
    ((Math.floor(d.getSeconds() / 2)) & 0x1f)

  const dosDate =
    (((d.getFullYear() - 1980) & 0x7f) << 9) |
    (((d.getMonth() + 1) & 0x0f) << 5) |
    (d.getDate() & 0x1f)

  return { dosTime, dosDate }
}

/**
 * Packs multiple text and binary files into an uncompressed (Store, Method 0) PKZIP byte array.
 * Method 0 is universally supported by Windows Explorer, macOS Finder, 7-Zip, WinRAR, and Linux unzip,
 * and causes zero CPU overhead or compression artifacts on already compressed images (PNG/JPEG/WebP).
 */
export function createZipArchive(files: ZipInputFile[]): Uint8Array {
  const encoder = new TextEncoder()
  const entries: ProcessedZipEntry[] = []

  let currentOffset = 0
  const parts: Uint8Array[] = []

  // 1. Write Local File Headers + Data
  for (const file of files) {
    const nameBytes = encoder.encode(file.name.replace(/\\/g, '/'))
    const dataBytes = typeof file.data === 'string' ? encoder.encode(file.data) : file.data
    const crc = calculateCrc32(dataBytes)
    const { dosTime, dosDate } = toDosDateTime(file.date || new Date())

    const localHeaderOffset = currentOffset
    const headerSize = 30 + nameBytes.length
    const localHeader = new Uint8Array(headerSize)
    const view = new DataView(localHeader.buffer)

    // Local file header signature = 0x04034b50
    view.setUint32(0, 0x04034b50, true)
    view.setUint16(4, 20, true) // Version needed to extract (2.0)
    view.setUint16(6, 0x0800, true) // General purpose bit flag (UTF-8 filename bit 11)
    view.setUint16(8, 0, true) // Compression method: 0 = Store
    view.setUint16(10, dosTime, true)
    view.setUint16(12, dosDate, true)
    view.setUint32(14, crc, true)
    view.setUint32(18, dataBytes.length, true) // Compressed size
    view.setUint32(22, dataBytes.length, true) // Uncompressed size
    view.setUint16(26, nameBytes.length, true) // File name length
    view.setUint16(28, 0, true) // Extra field length

    localHeader.set(nameBytes, 30)

    parts.push(localHeader)
    parts.push(dataBytes)
    currentOffset += headerSize + dataBytes.length

    entries.push({
      nameBytes,
      dataBytes,
      crc32: crc,
      uncompressedSize: dataBytes.length,
      compressedSize: dataBytes.length,
      localHeaderOffset,
      dosTime,
      dosDate,
    })
  }

  // 2. Write Central Directory Headers
  const centralDirectoryOffset = currentOffset
  let centralDirectorySize = 0

  for (const entry of entries) {
    const cdHeaderSize = 46 + entry.nameBytes.length
    const cdHeader = new Uint8Array(cdHeaderSize)
    const view = new DataView(cdHeader.buffer)

    // Central directory header signature = 0x02014b50
    view.setUint32(0, 0x02014b50, true)
    view.setUint16(4, 20, true) // Version made by
    view.setUint16(6, 20, true) // Version needed to extract
    view.setUint16(8, 0x0800, true) // General purpose bit flag (UTF-8)
    view.setUint16(10, 0, true) // Compression method: 0 = Store
    view.setUint16(12, entry.dosTime, true)
    view.setUint16(14, entry.dosDate, true)
    view.setUint32(16, entry.crc32, true)
    view.setUint32(20, entry.compressedSize, true)
    view.setUint32(24, entry.uncompressedSize, true)
    view.setUint16(28, entry.nameBytes.length, true)
    view.setUint16(30, 0, true) // Extra field length
    view.setUint16(32, 0, true) // File comment length
    view.setUint16(34, 0, true) // Disk number start
    view.setUint16(36, 0, true) // Internal file attributes
    view.setUint32(38, 0, true) // External file attributes
    view.setUint32(42, entry.localHeaderOffset, true) // Relative offset of local header

    cdHeader.set(entry.nameBytes, 46)

    parts.push(cdHeader)
    centralDirectorySize += cdHeaderSize
    currentOffset += cdHeaderSize
  }

  // 3. Write End of Central Directory Record (EOCD)
  const eocd = new Uint8Array(22)
  const eocdView = new DataView(eocd.buffer)

  // EOCD signature = 0x06054b50
  eocdView.setUint32(0, 0x06054b50, true)
  eocdView.setUint16(4, 0, true) // Number of this disk
  eocdView.setUint16(6, 0, true) // Disk where central directory starts
  eocdView.setUint16(8, entries.length, true) // Number of central directory records on this disk
  eocdView.setUint16(10, entries.length, true) // Total number of central directory records
  eocdView.setUint32(12, centralDirectorySize, true) // Size of central directory
  eocdView.setUint32(16, centralDirectoryOffset, true) // Offset of start of central directory
  eocdView.setUint16(20, 0, true) // Comment length

  parts.push(eocd)

  // 4. Combine all slices into a single contiguous Uint8Array
  const totalLength = parts.reduce((acc, p) => acc + p.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }

  return result
}

// ── Helpers for Binary Conversion ─────────────────────────────

/**
 * Converts a base64 or data URL string to a Uint8Array.
 */
export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64Index = dataUrl.indexOf('base64,')
  const base64 = base64Index >= 0 ? dataUrl.slice(base64Index + 7) : dataUrl
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

/**
 * Resolves an image URL (data URL, blob, or fetchable path) to a Uint8Array.
 */
export async function resolveImageBinary(url: string): Promise<Uint8Array | null> {
  try {
    if (url.startsWith('data:')) {
      return dataUrlToUint8Array(url)
    }
    const response = await fetch(url)
    if (!response.ok) return null
    const arrayBuffer = await response.arrayBuffer()
    return new Uint8Array(arrayBuffer)
  } catch (err) {
    console.warn('Could not resolve image binary for ZIP export:', err)
    return null
  }
}

// ── High-Level Clinical Radiology Patient Archive Exporter ────

export interface PatientRadiologyZipOptions {
  patient: Patient
  images: RadiologyImage[]
  clinicName?: string
  includeDicomJson?: boolean
  includeHtmlPortfolio?: boolean
  onProgress?: (current: number, total: number, message: string) => void
}

/**
 * Creates a comprehensive, downloadable ZIP package of all selected radiology images of a patient.
 * Includes clean human-readable filenames, DICOM metadata JSON, offline printable HTML report, and manifest.
 */
export async function createPatientRadiologyZip(
  options: PatientRadiologyZipOptions
): Promise<Blob> {
  const {
    patient,
    images,
    clinicName = 'کلینیک دندانپزشکی مینا',
    includeDicomJson = true,
    includeHtmlPortfolio = true,
    onProgress,
  } = options

  const zipFiles: ZipInputFile[] = []
  const patientFolder = `Radiology_${patient.file_number || patient.id}_${patient.last_name || 'Patient'}`

  // 1. Add images
  const total = images.length
  for (let idx = 0; idx < images.length; idx++) {
    const img = images[idx]
    onProgress?.(idx + 1, total, `آماده‌سازی تصویر ${idx + 1} از ${total}...`)

    let ext = 'jpg'
    if (img.image_url) {
      if (img.image_url.includes('image/png')) ext = 'png'
      else if (img.image_url.includes('image/webp')) ext = 'webp'
      else if (img.image_url.endsWith('.png')) ext = 'png'
    }

    const teethStr = img.tooth_number ? `Tooth_${img.tooth_number.replace(/[,،\s]+/g, '-')}` : 'General'
    const typeStr = (img.image_type || 'image').replace(/\s+/g, '_')
    const dateStr = (img.taken_at || img.created_at || '').slice(0, 10) || 'undated'
    const filename = `${patientFolder}/images/${idx + 1}_${teethStr}_${typeStr}_${dateStr}.${ext}`

    if (img.image_url) {
      const binary = await resolveImageBinary(img.image_url)
      if (binary) {
        zipFiles.push({
          name: filename,
          data: binary,
          date: img.taken_at ? new Date(img.taken_at) : new Date(),
        })
      }
    }
  }

  // 2. Add DICOM Metadata JSON
  if (includeDicomJson) {
    const dicomMeta = generateDicomMetadataJson({ patient, images, clinicName })
    zipFiles.push({
      name: `${patientFolder}/dicom_metadata.json`,
      data: JSON.stringify(dicomMeta, null, 2),
      date: new Date(),
    })
  }

  // 3. Add Clinical HTML Portfolio
  if (includeHtmlPortfolio) {
    const htmlPortfolio = generateRadiologyPortfolioHtml({ patient, images, clinicName })
    zipFiles.push({
      name: `${patientFolder}/radiology_portfolio.html`,
      data: htmlPortfolio,
      date: new Date(),
    })
  }

  // 4. Add Text Manifest
  const manifestText = [
    `================================================================`,
    `شناسنامه رسمی آرشیو تصاویر رادیولوژی و دندانپزشکی — ${clinicName}`,
    `================================================================`,
    `نام بیمار: ${patient.first_name} ${patient.last_name}`,
    `شماره پرونده: ${patient.file_number || '-'}`,
    `کد ملی: ${patient.national_id || '-'}`,
    `تعداد تصاویر خروجی: ${toPersianDigits(images.length)}`,
    `تاریخ صدور آرشیو: ${toJalaliStringPretty(new Date().toISOString())}`,
    ``,
    `لیست تصاویر:`,
    ...images.map((img, i) => {
      const teeth = parseRadiologyTeeth(img.tooth_number)
      const teethLabel = teeth.length > 0 ? teeth.map((t) => toothLabel(t)).join('، ') : 'عمومی / نامشخص'
      const exposure = img.taken_at ? toJalaliStringPretty(img.taken_at) : '-'
      return `${i + 1}. [${img.image_type || 'رادیولوژی'}] — دندان‌های: ${teethLabel} — تاریخ: ${exposure} ${img.description ? `(${img.description})` : ''}`
    }),
    ``,
    `توجه: فایل radiology_portfolio.html را می‌توانید در هر مرورگری بدون نیاز به اینترنت جهت چاپ رسمی باز فرمایید.`,
    `فایل dicom_metadata.json ساختار استاندارد تشخیصی جهت تبادل با سامانه‌های رادیولوژی است.`,
  ].join('\n')

  zipFiles.push({
    name: `${patientFolder}/README_MANIFEST.txt`,
    data: manifestText,
    date: new Date(),
  })

  // 5. Build ZIP
  onProgress?.(total, total, 'تولید نهایی بسته فشرده ZIP...')
  const zipBytes = createZipArchive(zipFiles)
  return new Blob([zipBytes.buffer as ArrayBuffer], { type: 'application/zip' })
}

/**
 * Triggers a browser download of a generated Blob file.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
