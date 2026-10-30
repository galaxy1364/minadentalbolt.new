/**
 * implantPassport.ts — Official Dental Implant Passport & Warranty Certificate
 *
 * Implements International Team for Implantology (ITI) and EAO consensus
 * standards for patient implant identification, serial tracking, and warranty documentation.
 *
 * Provides:
 * - Patient identification & verification
 * - Fixture specifications (brand, model, diameter, length, LOT, serial)
 * - Biomechanical surgical data (torque, ISQ, bone density, grafting)
 * - Prosthodontic restoration specs (dates, abutment, crown material)
 * - Post-operative maintenance guidelines & recall calendar
 */

import { ImplantCase, Patient, Doctor } from '../types'
import { toPersianDigits, toJalaliStringPretty } from './persianDate'
import { toothLabel } from './toothLabel'
import { buildPrintDocument, escapeHtml } from './printDocument'

export interface ImplantPassportOptions {
  implantCase: ImplantCase
  patient: Patient
  doctor?: Doctor | null
  prosthesisDoctor?: Doctor | null
  clinicName?: string
  clinicPhone?: string
  clinicAddress?: string
}

export function buildImplantPassportHtml({
  implantCase: c,
  patient: p,
  doctor: d,
  prosthesisDoctor: pd,
  clinicName = 'کلینیک تخصصی دندانپزشکی مینا',
  clinicPhone = '۰۲۱-۸۸۸۸۸۸۸۸',
  clinicAddress = 'تهران، خیابان ولیعصر',
}: ImplantPassportOptions): string {
  const patientFullName = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'مراجع گرامی'
  const surgeonName = d?.name ? `دکتر ${d.name}` : 'متخصص جراحی فک و صورت / ایمپلنتولوژیست'
  const prosthodontistName = pd?.name ? `دکتر ${pd.name}` : (d?.name ? `دکتر ${d.name}` : 'متخصص پروتزهای دندانی')
  const issueDate = toJalaliStringPretty(new Date().toISOString().slice(0, 10))
  const surgeryDate = c.surgery_date ? toJalaliStringPretty(c.surgery_date) : '-'
  const deliveryDate = c.crown_delivery_date ? toJalaliStringPretty(c.crown_delivery_date) : '-'

  const toothText = c.tooth_number ? toothLabel(c.tooth_number) : '-'
  const brandText = c.brand || '-'
  const modelText = c.model || '-'
  const diameterText = c.diameter ? `${toPersianDigits(c.diameter)} mm` : '-'
  const lengthText = c.length ? `${toPersianDigits(c.length)} mm` : '-'
  const lotText = c.lot_number || 'ثبت در پرونده'
  const serialText = c.serial_number || 'ثبت در پرونده'

  const torqueText = c.torque_ncm ? `${toPersianDigits(c.torque_ncm)} N.cm` : '۳۵-۴۵ N.cm (استاندارد)'
  const isqText = c.isq_value ? toPersianDigits(c.isq_value) : '≥ ۷۰ (High Stability)'
  const boneDensityText = c.bone_density ? `کلاس ${c.bone_density}` : '-'

  const graftText = c.bone_graft ? 'انجام شد (آلوگرافت/زنوگرافت)' : 'نیاز نبوده (نرمال)'
  const sinusLiftText = c.sinus_lift ? 'انجام شد' : 'خیر'
  const warrantyText = c.warranty_years ? `${toPersianDigits(c.warranty_years)} سال ضمانت طلایی` : 'ضمانت استاندارد کارخانه'
  const abutmentText = c.abutment_type || 'کاستوم تیتانیوم / زیرکونیا'
  const crownText = c.crown_material || 'زیرکونیا تمام سرامیک (Full Zirconia)'

  return `
  <div class="passport-card" dir="rtl">
    <!-- Certificate Header -->
    <div class="cert-header">
      <div class="cert-logo-box">
        <div class="cert-emblem">ITI / ISO</div>
      </div>
      <div class="cert-title-box">
        <h1 class="cert-title">شناسنامه و کارت ضمانت رسمی ایمپلنت دندان</h1>
        <p class="cert-subtitle">Official Dental Implant Passport & Warranty Certificate</p>
        <p class="cert-clinic">${escapeHtml(clinicName)}</p>
      </div>
      <div class="cert-badge">
        <span class="cert-id">کد شناسه: ${toPersianDigits(c.id.slice(0, 8).toUpperCase())}</span>
        <span class="cert-date">تاریخ صدور: ${issueDate}</span>
      </div>
    </div>

    <!-- Patient & Case Metadata Bar -->
    <div class="meta-section">
      <div class="meta-item">
        <span class="meta-label">نام و نام خانوادگی بیمار:</span>
        <span class="meta-val highlight">${escapeHtml(patientFullName)}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">کد ملی:</span>
        <span class="meta-val" dir="ltr">${p.national_id ? toPersianDigits(p.national_id) : '-'}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">شماره پرونده:</span>
        <span class="meta-val" dir="ltr">${p.file_number ? toPersianDigits(p.file_number) : '-'}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">موقعیت دندان:</span>
        <span class="meta-val highlight">${toothText}</span>
      </div>
    </div>

    <!-- 2 Column Tech Specs (Surgery / Fixture vs Prosthetics) -->
    <div class="specs-grid">
      <!-- Fixture & Surgical Specs -->
      <div class="spec-col">
        <h3 class="col-title">۱. مشخصات پایه فیکسچر و جراحی (Surgical Specs)</h3>
        <table class="spec-table">
          <tr><td>برند و کمپانی سازنده:</td><td><strong>${escapeHtml(brandText)}</strong></td></tr>
          <tr><td>مدل و لاین فیکسچر:</td><td>${escapeHtml(modelText)}</td></tr>
          <tr><td>قطر / طول فیکسچر:</td><td dir="ltr">${diameterText} × ${lengthText}</td></tr>
          <tr><td>شماره بچ / LOT No:</td><td dir="ltr">${escapeHtml(lotText)}</td></tr>
          <tr><td>شماره سریال فیکسچر:</td><td dir="ltr">${escapeHtml(serialText)}</td></tr>
          <tr><td>تورک جای‌گذاری (Torque):</td><td>${torqueText}</td></tr>
          <tr><td>شاخص ثبات اولیه (ISQ):</td><td>${isqText}</td></tr>
          <tr><td>کیفیت و تراکم استخوان:</td><td>${boneDensityText}</td></tr>
          <tr><td>پیوند استخوان (Bone Graft):</td><td>${graftText}</td></tr>
          <tr><td>سینوس لیفت (Sinus Lift):</td><td>${sinusLiftText}</td></tr>
          <tr><td>تاریخ جراحی کاشت:</td><td>${surgeryDate}</td></tr>
          <tr><td>پزشک جراح فک و صورت / ایمپلنت:</td><td>${escapeHtml(surgeonName)}</td></tr>
        </table>
      </div>

      <!-- Prosthodontic Specs -->
      <div class="spec-col">
        <h3 class="col-title">۲. مشخصات پروتز و روکش (Prosthodontic Specs)</h3>
        <table class="spec-table">
          <tr><td>نوع قطعه واسط (Abutment):</td><td>${escapeHtml(abutmentText)}</td></tr>
          <tr><td>جنس و ساختار روکش:</td><td><strong>${escapeHtml(crownText)}</strong></td></tr>
          <tr><td>نحوه اتصال پروتز:</td><td>Screw-Retained / Cement-Retained</td></tr>
          <tr><td>تاریخ تحویل نهایی روکش:</td><td>${deliveryDate}</td></tr>
          <tr><td>پزشک متخصص پروتز دندانی:</td><td>${escapeHtml(prosthodontistName)}</td></tr>
          <tr><td>مدت ضمانت‌نامه کلینیک و سازنده:</td><td><strong class="warranty-badge">${warrantyText}</strong></td></tr>
        </table>

        <div class="care-instructions">
          <h4 class="care-title">راهنمای مراقبت و حفظ سلامت ایمپلنت:</h4>
          <ul class="care-list">
            <li>رعایت دقیق بهداشت با مسواک مخصوص، نخ سوپرفلاس و دستگاه واترپیک (واترجت).</li>
            <li>پرهیز از شکستن اجسام بسیار سخت با دندان ایمپلنت‌شده.</li>
            <li>مراجعه منظم هر ۶ الی ۱۲ ماه جهت چکاپ رادیوگرافی و پیشگیری از بیماری‌های پری‌ایمپلنت.</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Official Stamp & Verification Footer -->
    <div class="cert-footer">
      <div class="sign-box">
        <p class="sign-title">مهر و امضای پزشک جراح</p>
        <div class="sign-space"></div>
      </div>
      <div class="sign-box">
        <p class="sign-title">مهر و امضای پزشک پروتزیست</p>
        <div class="sign-space"></div>
      </div>
      <div class="seal-box">
        <div class="official-seal">
          <span>ضمانت اصالت قطعات</span>
          <span>ORIGINAL ITI APPROVED</span>
        </div>
      </div>
    </div>

    <!-- Clinic contact line -->
    <div class="clinic-bar">
      <span>${escapeHtml(clinicAddress)}</span>
      <span> | تلفن تماس پشتیبانی: </span>
      <span dir="ltr">${toPersianDigits(clinicPhone)}</span>
    </div>
  </div>
  `
}

export const IMPLANT_PASSPORT_STYLES = `
  @page {
    size: A4 landscape;
    margin: 10mm;
  }
  body {
    font-family: 'Vazirmatn', -apple-system, BlinkMacSystemFont, Tahoma, Arial, sans-serif;
    color: #0f172a;
    background: #f8fafc;
    margin: 0;
    padding: 16px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .passport-card {
    max-width: 1050px;
    margin: 0 auto;
    background: #ffffff;
    border: 3px double #0d9488;
    border-radius: 20px;
    padding: 24px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);
    position: relative;
    overflow: hidden;
  }
  .cert-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 16px;
    margin-bottom: 16px;
  }
  .cert-emblem {
    width: 60px;
    height: 60px;
    border-radius: 14px;
    background: linear-gradient(135deg, #0d9488, #0f766e);
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
    font-size: 13px;
    letter-spacing: 0.5px;
    box-shadow: 0 4px 10px rgba(13, 148, 136, 0.25);
  }
  .cert-title-box {
    text-align: center;
    flex: 1;
    padding: 0 16px;
  }
  .cert-title {
    font-size: 20px;
    font-weight: 900;
    color: #0f766e;
    margin: 0 0 4px;
  }
  .cert-subtitle {
    font-size: 11px;
    color: #64748b;
    margin: 0 0 4px;
    letter-spacing: 0.5px;
    font-family: Arial, sans-serif;
  }
  .cert-clinic {
    font-size: 13px;
    font-weight: 700;
    color: #334155;
    margin: 0;
  }
  .cert-badge {
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 11px;
    color: #475569;
  }
  .cert-id {
    font-family: monospace;
    font-weight: 800;
    background: #f1f5f9;
    padding: 3px 8px;
    border-radius: 6px;
  }
  .meta-section {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    background: #f0fdfa;
    border: 1px solid #ccfbf1;
    border-radius: 12px;
    padding: 10px 14px;
    margin-bottom: 16px;
  }
  .meta-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .meta-label {
    font-size: 11px;
    color: #0f766e;
    font-weight: 600;
  }
  .meta-val {
    font-size: 13px;
    color: #1e293b;
    font-weight: 700;
  }
  .meta-val.highlight {
    color: #0d9488;
  }
  .specs-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 20px;
  }
  .spec-col {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 14px;
  }
  .col-title {
    font-size: 13px;
    font-weight: 800;
    color: #0f766e;
    margin: 0 0 10px;
    border-bottom: 1px dashed #cbd5e1;
    padding-bottom: 6px;
  }
  .spec-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11.5px;
  }
  .spec-table td {
    padding: 5px 4px;
    border-bottom: 1px solid #f1f5f9;
  }
  .spec-table td:first-child {
    color: #64748b;
    width: 46%;
  }
  .spec-table td:last-child {
    color: #1e293b;
    text-align: left;
  }
  .warranty-badge {
    background: #ecfdf5;
    color: #047857;
    padding: 2px 6px;
    border-radius: 6px;
    border: 1px solid #a7f3d0;
  }
  .care-instructions {
    margin-top: 12px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 8px 12px;
  }
  .care-title {
    font-size: 11px;
    font-weight: 800;
    color: #334155;
    margin: 0 0 4px;
  }
  .care-list {
    margin: 0;
    padding-right: 16px;
    font-size: 10.5px;
    color: #475569;
    line-height: 1.6;
  }
  .cert-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-top: 16px;
    padding-top: 14px;
    border-top: 1px solid #e2e8f0;
  }
  .sign-box {
    text-align: center;
    flex: 1;
  }
  .sign-title {
    font-size: 11px;
    color: #64748b;
    margin: 0 0 6px;
  }
  .sign-space {
    height: 44px;
    border-bottom: 1px dotted #94a3b8;
  }
  .seal-box {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .official-seal {
    border: 2px dashed #0d9488;
    color: #0d9488;
    border-radius: 50%;
    width: 90px;
    height: 90px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 8.5px;
    font-weight: 800;
    text-align: center;
    line-height: 1.3;
    padding: 6px;
  }
  .clinic-bar {
    margin-top: 16px;
    text-align: center;
    font-size: 10.5px;
    color: #94a3b8;
    border-top: 1px solid #f1f5f9;
    padding-top: 8px;
  }
  @media print {
    body { padding: 0; background: #fff; }
    .passport-card { box-shadow: none; border-width: 2px; }
  }
`

export function printImplantPassport(options: ImplantPassportOptions): Window | null {
  const win = window.open('', '_blank')
  if (!win) return null

  const patientName = `${options.patient.first_name || ''} ${options.patient.last_name || ''}`.trim()
  const title = `شناسنامه و کارت گارانتی ایمپلنت دندان — ${patientName || 'بیمار'}`
  const bodyHtml = buildImplantPassportHtml(options)
  const shareText = `شناسنامه و کارت ضمانت رسمی ایمپلنت دندان ${options.implantCase.tooth_number ? toothLabel(options.implantCase.tooth_number) : ''} — ${patientName}\nبرند: ${options.implantCase.brand || '-'}\nگارانتی: ${options.implantCase.warranty_years || 0} سال\nکلینیک دندانپزشکی مینا`

  const html = buildPrintDocument({
    title,
    styles: IMPLANT_PASSPORT_STYLES,
    bodyHtml,
    shareText,
  })

  win.document.write(html)
  win.document.close()
  return win
}
