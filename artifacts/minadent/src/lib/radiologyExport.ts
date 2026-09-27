// src/lib/radiologyExport.ts — Dental Radiology Multi-Tooth Support & Clinical Archive Export
import type { Patient, RadiologyImage } from '../types'
import { toPersianDigits, toJalaliStringPretty } from './persianDate'
import { toothLabel } from './toothLabel'

/**
 * Splits a tooth_number string into individual tooth identifiers.
 * Handles comma-separated values, spaces, or single teeth (e.g. "14, 15, 16" -> ["14", "15", "16"]).
 */
export function parseRadiologyTeeth(toothNumber?: string | null): string[] {
  if (!toothNumber) return []
  return toothNumber
    .split(/[,،\s]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
}

/**
 * Checks if a target tooth matches the image's tagged teeth.
 * If targetTooth is 'all', always returns true.
 */
export function matchesRadiologyTooth(imgTooth?: string | null, targetTooth = 'all'): boolean {
  if (targetTooth === 'all') return true
  if (!imgTooth) return false
  const teeth = parseRadiologyTeeth(imgTooth)
  return teeth.includes(String(targetTooth))
}

/**
 * Generates a DICOM-compatible clinical summary object for integration or export.
 */
export function generateDicomMetadataJson(params: {
  patient: Patient
  images: RadiologyImage[]
  clinicName?: string
}) {
  const { patient, images, clinicName = 'Mina Dental Clinic' } = params
  const now = new Date().toISOString()

  return {
    ExportVersion: '1.0',
    ExportDate: now,
    InstitutionName: clinicName,
    Modality: 'DX', // Digital Radiography
    BodyPartExamined: 'TEETH',
    PatientID: patient.file_number || patient.id,
    PatientName: `${patient.first_name} ${patient.last_name}`,
    PatientNationalID: patient.national_id || undefined,
    PatientBirthDate: patient.birth_date || undefined,
    PatientGender: patient.gender || undefined,
    TotalImages: images.length,
    Studies: images.map((img, index) => ({
      Index: index + 1,
      ImageID: img.id,
      ImageType: img.image_type || 'Dental Radiograph',
      Teeth: parseRadiologyTeeth(img.tooth_number),
      ExposureDate: img.taken_at || img.created_at,
      Description: img.description || undefined,
      FileUrl: img.image_url,
    })),
  }
}

/**
 * Generates printable HTML for a Patient Dental Radiology Portfolio.
 */
export function generateRadiologyPortfolioHtml(params: {
  patient: Patient
  images: RadiologyImage[]
  clinicName?: string
}): string {
  const { patient, images, clinicName = 'کلینیک دندانپزشکی مینا' } = params
  const fullName = `${patient.first_name} ${patient.last_name}`
  const nowPersian = toJalaliStringPretty(new Date().toISOString())

  const imageCardsHtml = images
    .map((img, idx) => {
      const teeth = parseRadiologyTeeth(img.tooth_number)
      const teethFormatted = teeth.length > 0
        ? teeth.map((t) => toothLabel(t)).join('، ')
        : 'مشخص نشده'
      const exposureDate = img.taken_at ? toJalaliStringPretty(img.taken_at) : '-'

      return `
        <div style="border: 1px solid #cbd5e1; border-radius: 12px; padding: 14px; background: #ffffff; break-inside: avoid; display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
            <span style="font-weight: bold; font-size: 13px; color: #0f172a;">تصویر #${toPersianDigits(idx + 1)} — ${img.image_type || 'رادیولوژی'}</span>
            <span style="font-size: 11px; color: #64748b;">تاریخ: ${exposureDate}</span>
          </div>
          <div style="width: 100%; height: 220px; border-radius: 8px; overflow: hidden; background: #000000; display: flex; align-items: center; justify-content: center;">
            ${img.image_url ? `<img src="${img.image_url}" alt="${img.description || 'گرافی'}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />` : '<span style="color: #94a3b8; font-size: 12px;">بدون فایل تصویری</span>'}
          </div>
          <div style="font-size: 12px; color: #334155; line-height: 1.8;">
            <div><strong>دندان‌های مرتبط:</strong> ${teethFormatted}</div>
            ${img.description ? `<div><strong>یادداشت و یافته‌های تشخیصی:</strong> ${img.description}</div>` : ''}
          </div>
        </div>
      `
    })
    .join('')

  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="fa">
    <head>
      <meta charset="utf-8" />
      <title>آرشیو گرافی و رادیولوژی — ${fullName}</title>
      <style>
        body {
          font-family: Tahoma, 'Vazirmatn', sans-serif;
          margin: 0;
          padding: 24px;
          background: #f8fafc;
          color: #0f172a;
        }
        @media print {
          body { background: #ffffff; padding: 0; }
          .no-print { display: none !important; }
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #0d9488;
          padding-bottom: 14px;
          margin-bottom: 20px;
        }
        .title {
          font-size: 20px;
          font-weight: bold;
          color: #0d9488;
        }
        .patient-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 24px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          font-size: 13px;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        @media (max-width: 768px) {
          .grid { grid-template-columns: 1fr; }
          .patient-card { grid-template-columns: 1fr; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="title">شناسنامه و آرشیو رادیولوژی دندانپزشکی</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">${clinicName}</div>
        </div>
        <div style="text-align: left; font-size: 12px; color: #64748b;">
          تاریخ صدور: ${nowPersian}
        </div>
      </div>

      <div class="patient-card">
        <div><strong>نام و نام خانوادگی:</strong> ${fullName}</div>
        <div><strong>شماره پرونده:</strong> ${patient.file_number ? toPersianDigits(patient.file_number) : '-'}</div>
        <div><strong>کد ملی:</strong> ${patient.national_id ? toPersianDigits(patient.national_id) : '-'}</div>
        <div><strong>تلفن تماس:</strong> ${patient.phone ? toPersianDigits(patient.phone) : '-'}</div>
        <div><strong>تعداد کل گرافی‌ها:</strong> ${toPersianDigits(images.length)} مورد</div>
        <div><strong>وضعیت پرونده:</strong> فعال</div>
      </div>

      <div class="grid">
        ${imageCardsHtml}
      </div>

      <div style="margin-top: 32px; padding: 14px; background: #f1f5f9; border-radius: 8px; font-size: 11px; color: #475569; text-align: justify; line-height: 1.8;">
        <strong>تذکر بالینی و حفاظت پرتوی:</strong> این گزارش شامل تصاویر رادیوگرافی تشخیصی دندانپزشکی است که با رعایت اصول حفاظتی آلارا (ALARA) تهیه شده است. نسخه حاضر برای مشاوره و ادامه درمان در سایر مراکز تخصصی دارای اعتبار بالینی است.
      </div>
    </body>
    </html>
  `
}
