// src/lib/patientMedicationGuide.ts — Patient Medication Leaflet & Post-Op Care Guide for MinaDent
import { buildPrintDocument, escapeHtml } from './printDocument'
import { toPersianDigits, toJalaliStringPretty } from './persianDate'

export interface MedicationInstruction {
  name: string
  dose?: string
  frequency?: string
  instructions?: string
}

export interface DrugAdvice {
  matchedKey: string
  category: 'antibiotic' | 'analgesic' | 'mouthwash' | 'corticosteroid' | 'other'
  categoryLabel: string
  warning: string
  tips: string[]
}

/**
 * Clinical layperson guidelines for commonly prescribed dental medications.
 * Standardized according to ADA/FDA and Iran Ministry of Health clinical safety norms.
 */
export const DENTAL_DRUG_ADVICES: DrugAdvice[] = [
  {
    matchedKey: 'آموکسی',
    category: 'antibiotic',
    categoryLabel: 'آنتی‌بیوتیک (ضد باکتری)',
    warning: 'دوره درمان را حتی در صورت قطع کامل درد و ورم حتماً تا آخرین کپسول مصرف نمایید تا از عود عفونت و مقاومت باکتریایی جلوگیری شود.',
    tips: [
      'همراه با یک لیوان آب کامل میل شود.',
      'سر ساعت مقرر مصرف گردد (مثلاً هر ۸ ساعت دقیق).',
      'در صورت بروز بثورات پوستی یا خارش شدید، مصرف را متوقف کرده و سریعاً به مطب اطلاع دهید.',
    ],
  },
  {
    matchedKey: 'کلاو',
    category: 'antibiotic',
    categoryLabel: 'آنتی‌بیوتیک ترکیبی (کوآموکسی‌کلاو)',
    warning: 'برای جذب بهتر و جلوگیری از ناراحتی گوارشی، در ابتدای وعده غذایی میل شود.',
    tips: [
      'طول دوره تجویز شده را تا انتها ادامه دهید.',
      'مصرف همزمان ماست پروبیوتیک به حفظ سلامت باکتری‌های مفید گوارشی کمک می‌کند.',
    ],
  },
  {
    matchedKey: 'مترونیدازول',
    category: 'antibiotic',
    categoryLabel: 'آنتی‌بیوتیک بی‌هوازی',
    warning: 'در طول دوره مصرف و تا ۴۸ ساعت بعد از آن، از مصرف هرگونه نوشیدنی یا داروی حاوی الکل اکیداً خودداری فرمایید (تداخل شدید دارویی).',
    tips: [
      'بهتر است همراه یا بلافاصله پس از غذا مصرف شود تا احساس طعم فلزی یا تهوع کاهش یابد.',
      'ممکن است باعث تیرگی موقت رنگ ادرار شود که جای نگرانی ندارد.',
    ],
  },
  {
    matchedKey: 'کلیندامایسین',
    category: 'antibiotic',
    categoryLabel: 'آنتی‌بیوتیک نفوذپذیر در استخوان',
    warning: 'با یک لیوان بزرگ آب میل شود و حداقل ۳۰ دقیقه پس از مصرف از دراز کشیدن خودداری فرمایید تا از تحریک مری پیشگیری گردد.',
    tips: [
      'در صورت بروز اسهال شدید و مداوم فوراً به پزشک اطلاع دهید.',
    ],
  },
  {
    matchedKey: 'ایبوپروفن',
    category: 'analgesic',
    categoryLabel: 'مسکن و ضد التهاب (ژلوفن / بروفن)',
    warning: 'حتماً بعد از غذا یا با یک لیوان شیر/آب کامل میل شود. مصرف با معده خالی ممنوع است.',
    tips: [
      'از مصرف همزمان دو مسکن غیراستروئیدی (مانند همزمان ژلوفن با ناپروکسن یا ایندومتاسین) پرهیز کنید.',
      'در صورت داشتن سابقه زخم معده یا آسم، به پزشک اطلاع دهید.',
    ],
  },
  {
    matchedKey: 'ژلوفن',
    category: 'analgesic',
    categoryLabel: 'مسکن و ضد التهاب (ژلوفن)',
    warning: 'حتماً بعد از غذا میل شود تا مخاط معده آسیب نبیند.',
    tips: [
      'کپسول نرم ژلاتینی را نجوید و با یک لیوان کامل آب ببلعید.',
    ],
  },
  {
    matchedKey: 'ناپروکسن',
    category: 'analgesic',
    categoryLabel: 'مسکن و ضد التهاب طولانی‌اثر',
    warning: 'اثر ضدالتهابی این دارو تا ۱۲ ساعت ماندگار است؛ دوزها را زودتر از موعد تکرار نکنید.',
    tips: [
      'همراه با وعده غذایی مصرف شود.',
    ],
  },
  {
    matchedKey: 'مفنامیک',
    category: 'analgesic',
    categoryLabel: 'مسکن ضد التهاب',
    warning: 'صرفاً برای تسکین کوتاه‌مدت درد تجویز شده است و مصرف طولانی‌مدت توصیه نمی‌شود.',
    tips: [
      'بعد از غذا با آب میل شود.',
    ],
  },
  {
    matchedKey: 'استامینوفن',
    category: 'analgesic',
    categoryLabel: 'مسکن و تب‌بر',
    warning: 'از مصرف همزمان با سایر داروهای سرماخوردگی که استامینوفن دارند پرهیز شود (حداکثر دوز مجاز روزانه ۴ گرم).',
    tips: [
      'اگر نوع کدئین‌دار است، ممکن است باعث خواب‌آلودگی شود؛ از رانندگی و کارهای دقیق بلافاصله پس از مصرف پرهیز فرمایید.',
    ],
  },
  {
    matchedKey: 'کلرهگزیدین',
    category: 'mouthwash',
    categoryLabel: 'دهانشویه ضدعفونی‌کننده',
    warning: 'شروع مصرف از ۲۴ ساعت پس از جراحی دندان یا کشیدن آغاز شود (روز اول فقط استراحت بدون قرقره).',
    tips: [
      'حداقل ۳۰ دقیقه پس از مسواک زدن دهانشویه کنید تا خمیردندان اثر آن را خنثی نکند.',
      'به مدت ۱ دقیقه در دهان بچرخانید و خارج کنید؛ تا ۳۰ دقیقه بعد دهان را با آب نشویید و چیزی میل نکنید.',
      'مصرف بیش از ۲ هفته متوالی ممکن است تغییر رنگ موقت روی دندان‌ها ایجاد کند که با بروساژ در مطب پاک می‌شود.',
    ],
  },
  {
    matchedKey: 'دگزامتازون',
    category: 'corticosteroid',
    categoryLabel: 'کورتیکواستروئید ضد ورم شدید',
    warning: 'جهت جلوگیری از تورم و درد شدید ناشی از تروما جراحی است؛ ترجیحاً صبح‌ها مصرف شود.',
    tips: [
      'در صورت داشتن دیابت یا فشار خون کنترل‌نشده، قند و فشار خون خود را دقیق‌تر پایش فرمایید.',
    ],
  },
]

/**
 * Standard post-operative dental care rules (دستورات مراقبت عمومی پس از جراحی و درمان دندانپزشکی)
 */
export const POST_OP_CARE_RULES: string[] = [
  'گاز استریل قرار داده شده روی زخم را تا ۲ ساعت با فشار ملایم دندان‌ها نگه دارید و از تعویض زودهنگام آن بپرهیزید.',
  'آب دهان خود را به آرامی قورت دهید؛ تف کردن مکرر باعث ایجاد مکش منفی در دهان، کنده شدن لخته خون، خونریزی مجدد و ایجاد عارضه بسیار دردناک حفره خشک (Dry Socket) می‌شود.',
  'تا ۲۴ ساعت از مصرف غذاها و نوشیدنی‌های داغ پرهیز کرده و از نی برای نوشیدن استفاده نکنید.',
  'تا ۴۸ ساعت اول پس از جراحی از استعمال هرگونه دخانیات (سیگار و قلیان) اکیداً خودداری فرمایید.',
  'در ۲۴ ساعت اول از کمپرس یخ (۱۰ دقیقه روی صورت، ۱۰ دقیقه استراحت) در سمت جراحی استفاده کنید تا تورم کاهش یابد.',
  'شستشوی ملایم دهان با محلول سرم نمکی ولرم را از روز دوم (۲۴ ساعت پس از جراحی) آغاز کنید.',
  'در صورت ادامه‌دار شدن خونریزی شدید با گاز استریل تمیز یا چای کیسه‌ای مرطوب به مدت ۴۵ دقیقه موضع را فشار دهید و با مطب تماس بگیرید.',
]

/**
 * Matches a prescribed drug string to its clinical patient advice.
 */
export function matchDrugAdvice(drugName: string): DrugAdvice | null {
  if (!drugName) return null
  const normalized = drugName.toLowerCase()
  for (const advice of DENTAL_DRUG_ADVICES) {
    if (normalized.includes(advice.matchedKey.toLowerCase())) {
      return advice
    }
  }
  return null
}

export interface PatientMedicationGuideData {
  patientName: string
  doctorName: string
  createdDate: string
  medications: MedicationInstruction[]
  notes?: string
}

/**
 * Generates the full patient medication & care guide printable HTML.
 */
export function buildPatientMedicationGuideDocument(data: PatientMedicationGuideData): string {
  const { patientName, doctorName, createdDate, medications, notes } = data

  const styles = `
    body { font-family: Tahoma, Arial, sans-serif; color: #1e293b; padding: 24px; line-height: 1.8; font-size: 13px; }
    .header { text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 12px; margin-bottom: 20px; }
    .header h1 { color: #0d9488; font-size: 20px; margin: 0 0 4px; }
    .header p { color: #64748b; font-size: 12px; margin: 0; }
    .meta-box { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 16px; margin-bottom: 20px; font-size: 12px; }
    .meta-box span { color: #334155; }
    .section-title { font-size: 14px; font-weight: bold; color: #0f766e; margin: 16px 0 8px; border-right: 3px solid #0d9488; padding-right: 8px; }
    .med-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 12px; background: #ffffff; }
    .med-name { font-weight: bold; font-size: 13px; color: #0f172a; margin-bottom: 4px; }
    .med-badge { display: inline-block; background: #ccfbf1; color: #0f766e; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-bottom: 6px; font-weight: 500; }
    .med-warning { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 8px 12px; border-radius: 6px; margin: 6px 0; font-size: 12px; }
    .med-tips { margin: 6px 0 0; padding-right: 20px; color: #475569; font-size: 12px; }
    .post-op-box { background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 14px; margin-top: 20px; }
    .post-op-list { margin: 8px 0 0; padding-right: 20px; color: #134e4a; font-size: 12px; }
    .post-op-list li { margin-bottom: 6px; }
    .footer { margin-top: 32px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px; }
    @media print { body { padding: 10px; } }
  `

  let medsHtml = ''
  medications.forEach((m, idx) => {
    const advice = matchDrugAdvice(m.name)
    medsHtml += `
      <div class="med-card">
        <div class="med-name">${toPersianDigits(idx + 1)}. ${escapeHtml(m.name)} ${m.dose ? `(${escapeHtml(m.dose)})` : ''}</div>
        ${advice ? `<div class="med-badge">${advice.categoryLabel}</div>` : ''}
        ${m.frequency ? `<div><strong>دستور مصرف:</strong> ${escapeHtml(m.frequency)} ${m.instructions ? `— ${escapeHtml(m.instructions)}` : ''}</div>` : ''}
        ${advice ? `
          <div class="med-warning"><strong>⚠️ احتیاط مهم:</strong> ${advice.warning}</div>
          <ul class="med-tips">
            ${advice.tips.map((t) => `<li>${t}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    `
  })

  const bodyHtml = `
    <div class="header">
      <h1>کلینیک دندانپزشکی مینا</h1>
      <p>راهنمای جامع مصرف داروها و مراقبت‌های پس از درمان (Patient Care & Medication Guide)</p>
    </div>

    <div class="meta-box">
      <span><strong>بیمار گرامی:</strong> ${escapeHtml(patientName)}</span>
      <span><strong>پزشک معالج:</strong> ${escapeHtml(doctorName)}</span>
      <span><strong>تاریخ نسخه:</strong> ${toJalaliStringPretty(createdDate)}</span>
    </div>

    <div class="section-title">داروهای تجویزی و نحوه صحیح مصرف</div>
    ${medsHtml}

    ${notes ? `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; margin-top: 12px; font-size: 12px;">
        <strong>توصیه اختصاصی دندانپزشک:</strong> ${escapeHtml(notes)}
      </div>
    ` : ''}

    <div class="post-op-box">
      <strong style="color: #0f766e; font-size: 13px;">📌 دستورات طلایی مراقبت پس از درمان و جراحی:</strong>
      <ol class="post-op-list">
        ${POST_OP_CARE_RULES.map((rule) => `<li>${rule}</li>`).join('')}
      </ol>
    </div>

    <div class="footer">
      <span>سلامتی و لبخند شما آرزوی ماست — در صورت بروز درد نامتعارف یا سوال با مطب تماس بگیرید.</span>
      <span>کلینیک دندانپزشکی مینا</span>
    </div>
  `

  const shareText = `راهنمای مصرف داروهای دندانپزشکی و مراقبت پس از درمان - بیمار: ${patientName}`

  return buildPrintDocument({
    title: `راهنمای مصرف داروی ${patientName}`,
    styles,
    bodyHtml,
    shareText,
  })
}
