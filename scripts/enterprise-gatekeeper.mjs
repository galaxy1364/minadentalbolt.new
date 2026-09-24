// scripts/enterprise-gatekeeper.mjs
// MinaDent Enterprise Quality Gatekeeper & 0-to-100 Linter
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const srcDir = path.join(rootDir, 'src')

console.log('🛡️  در حال اجرای گیت بازرسی و ممیزی فوق‌جهانی مینادنت (MinaDent Enterprise Gatekeeper)...')

let totalViolations = 0
const violations = []

function addViolation(file, line, message) {
  totalViolations++
  violations.push({ file: path.relative(rootDir, file), line, message })
}

// 1. Recursive file scanner
function scanDir(dir, extFilter = ['.ts', '.tsx']) {
  let results = []
  if (!fs.existsSync(dir)) return results
  const list = fs.readdirSync(dir)
  for (const item of list) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      results = results.concat(scanDir(fullPath, extFilter))
    } else if (extFilter.some(ext => item.endsWith(ext))) {
      results.push(fullPath)
    }
  }
  return results
}

// 2. Scan for Zero Dummy Placeholders
console.log('🔍 ۱. بررسی عدم وجود دکمه‌های مرده و کدهای پلیس‌هولدر (Zero Placeholders)...')
const srcFiles = scanDir(srcDir, ['.ts', '.tsx'])
const dummyPatterns = [
  { pattern: /onClick\s*=\s*\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/g, desc: 'دکمه یا المان کلیک با تابع خالی و غیرفعال: onClick={() => {}}' },
  { pattern: /onClick\s*=\s*\{\s*\(\)\s*=>\s*undefined\s*\}/g, desc: 'تابع کلیک بازگرداننده undefined' },
  { pattern: /alert\(\s*['"][^'"]*TODO/i, desc: 'استفاده از الرت موقت یا TODO' }
]

for (const file of srcFiles) {
  // Ignore test files for placeholder scanning since tests might test empty handlers
  if (file.includes('.test.') || file.includes('__tests__')) continue

  const content = fs.readFileSync(file, 'utf8')
  const lines = content.split('\n')

  lines.forEach((lineText, idx) => {
    for (const { pattern, desc } of dummyPatterns) {
      if (pattern.test(lineText)) {
        addViolation(file, idx + 1, desc)
      }
    }
  })
}

// 3. Scan for Mobile Viewport & PWA Readiness (Apple iOS & Android APK/PWA)
console.log('📱 ۲. بررسی استانداردهای موبایل، PWA و حاشیه امن (iOS & Android Viewport)...')
const indexHtmlPath = path.join(rootDir, 'index.html')
if (fs.existsSync(indexHtmlPath)) {
  const htmlContent = fs.readFileSync(indexHtmlPath, 'utf8')
  if (!htmlContent.includes('viewport-fit=cover')) {
    addViolation(indexHtmlPath, 7, 'تگ viewport فاقد viewport-fit=cover برای بریدگی صفحه‌نمایش (Notch/Dynamic Island) آیفون و اندروید است.')
  }
  if (!htmlContent.includes('apple-mobile-web-app-capable')) {
    addViolation(indexHtmlPath, 1, 'عدم وجود تگ apple-mobile-web-app-capable برای اجرای فول‌اسکرین PWA در آیفون')
  }
  if (!htmlContent.includes('manifest.json')) {
    addViolation(indexHtmlPath, 1, 'عدم اتصال manifest.json برای نصب روی اندروید و آیفون')
  }
} else {
  addViolation(indexHtmlPath, 0, 'فایل index.html در ریشه پروژه یافت نشد!')
}

// 4. Scan for ISO-27001 Data Security (No Hard Delete SQL in mutations)
console.log('🔒 ۳. بررسی امنیت داده‌های بالینی و عدم حذف فیزیکی (ISO 27001 Soft-Delete)...')
const sqlFiles = scanDir(path.join(rootDir, 'supabase'), ['.sql'])
for (const file of sqlFiles) {
  const content = fs.readFileSync(file, 'utf8')
  const lines = content.split('\n')
  lines.forEach((lineText, idx) => {
    // Flag un-commented raw DELETE without soft delete
    if (/^\s*DELETE\s+FROM\s+(patients|treatments|payments|prescriptions|lab_orders)/i.test(lineText)) {
      addViolation(file, idx + 1, 'دستور DELETE مستقیم روی جداول حساس پزشکی/مالی بدون استفاده از deleted_at شناسایی شد.')
    }
  })
}

// 5. Output Results
if (totalViolations > 0) {
  console.error('\n❌ خطاهای ممیزی استانداردهای فوق‌جهانی مینادنت شناسایی شد:')
  violations.forEach(v => {
    console.error(`   [خطا] ${v.file}:${v.line} -> ${v.message}`)
  })
  console.error(`\n🚫 عملیات متوقف شد! تعداد ${totalViolations} مغایرت با استانداردهای پروژه وجود دارد. لطفاً ابتدا آن‌ها را رفع کنید.\n`)
  process.exit(1)
} else {
  console.log('✅ ۱۰۰٪ فایل‌ها و استانداردهای جهانی (PWA، لمس موبایل، عدم پلیس‌هولدر و امنیت) با موفقیت تأیید شدند!')
  process.exit(0)
}
