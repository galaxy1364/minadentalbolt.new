# ممیزی فوق استاندارد جهانی — مینادنتال (dentify-pro)
**تاریخ ممیزی:** ۱۴۰۴  
**نسخه:** 0.0.0 (react-example)  
**ممیز:** Kiro AI Audit Agent  

---

## ۱. خلاصه اجرایی — امتیازات بخش‌ها

| بخش | امتیاز از ۱۰۰ | توضیح |
|---|---|---|
| معماری و ساختار کد | ۶۵ | تفکیک لایه‌ها خوب، اما gigantic components و conflict merge |
| عملکرد (Performance) | ۶۰ | lazy loading هست، React.memo نیست، bundle split ناقص |
| کیفیت کد | ۵۵ | strict TS روشن، اما build کاملاً شکسته است |
| امنیت | ۵۰ | کلید Supabase hardcode، فاقد CSP، API key در کلاینت |
| دسترس‌پذیری (A11y) | ۷۰ | زیرساخت خوب، پیاده‌سازی ناکامل |
| تجربه کاربری (UX) | ۷۵ | RTL کامل، loading states خوب، responsive مناسب |
| مدیریت State | ۵۵ | prop-drilling عمیق در App.tsx، عدم جداسازی state |
| تست‌ها | ۶۵ | ۱۰۱ unit test، e2e ناقص، coverage اندازه‌گیری نشده |
| CI/CD | ۶۰ | workflow وجود دارد اما build شکسته است |
| مستندات | ۷۰ | DESIGN_STANDARDS مفصل، README خوب |
| پایگاه داده (Supabase) | ۶۵ | RLS وجود دارد، schema کامل، migration ناقص |
| PWA و آفلاین | ۶۵ | SW موجود، cache استراتژی بسیار ابتدایی |
| **کل** | **۶۳/۱۰۰** | |

---

## ۲. مشکلات CRITICAL — باید فوری رفع شوند

### C1 — ❌ Build کاملاً شکسته است: Git Merge Conflict در `vite.config.ts`
**فایل:** `vite.config.ts` — خط ۱  
**شواهد:**  
```
<<<<<<< Updated upstream
...
=======
...
>>>>>>> Stashed changes
```
**خروجی build:**  
```
[ERROR] Unexpected "<<"
    vite.config.ts:1:290
Error: Build failed with 1 error
```
**اثر:** هیچ deploy جدیدی ممکن نیست. پروژه اصلاً build نمی‌شود. CI/CD روی هر push شکست می‌خورد.  
**رفع:** conflict باید resolve و یکی از دو نسخه انتخاب شود.

---

### C2 — ❌ کلید واقعی Supabase Hardcode شده در کد منبع
**فایل:** `src/lib/supabase.ts` — خط ۷  
```typescript
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdreGtpaGRpYmttcHJ5b3Bia2t6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MDU2NTQsImV4cCI6MjEwMjQ4MTY1NH0...'
```
**اثر:** هر کسی که به مخزن git دسترسی دارد می‌تواند به Supabase دسترسی مستقیم داشته باشد. همچنین `src/services/supabaseService.ts` نیز یک توکن hardcode دارد. علاوه بر این، `.env` فایل (که در `.gitignore` قرار دارد) همین کلید را دارد — اما `src/lib/supabase.ts` مستقیماً fallback hardcode شده دارد که با هر `npm install` در bundle جاسازی می‌شود.  
**رفع:** کلیدها باید فقط از environment variables بیایند؛ هیچ fallback واقعی نباشد.

---

### C3 — ❌ `dexie` و `react-router-dom` در `package.json` تعریف نشده‌اند اما در کد استفاده می‌شوند
**شواهد:**
- `src/lib/db.ts`: `import Dexie, { Table } from 'dexie'`  
- `src/components/Layout.tsx`: `import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom'`  
- `src/pages/Billing.tsx`, `Appointments.tsx`, `Archive.tsx` و ۲۸ فایل دیگر از `react-router-dom` استفاده می‌کنند  
- `node_modules/dexie` وجود ندارد، `node_modules/react-router-dom` وجود ندارد  
**اثر:** هر بار که `npm install` اجرا شود (محیط CI، سرور جدید، developer جدید) کد کاملاً broken خواهد بود.  
**رفع:** `dexie`, `react-router-dom`, `dexie-react-hooks` باید به `dependencies` اضافه شوند.

---

### C4 — ❌ Gemini API Key در کلاینت (VITE_) در دسترس عموم قرار می‌گیرد
**فایل:** `src/services/geminiDentalAi.ts`  
```typescript
(import.meta as any).env?.VITE_GEMINI_API_KEY
```
**اثر:** هر variable با پیشوند `VITE_` در Vite به طور کامل در bundle embed می‌شود و در مرورگر کاربر قابل مشاهده است. API key هوش مصنوعی می‌تواند توسط هر بازدیدکننده‌ای سرقت شود.  
**رفع:** Gemini API باید از طریق یک backend proxy (Express server یا Edge Function) صدا زده شود.

---

### C5 — ❌ SMS API Key در localStorage ذخیره می‌شود (cleartext)
**فایل:** `src/services/smsService.ts`  
```typescript
localStorage.setItem('minadental_sms_config_v2', JSON.stringify({ provider, apiKey, senderNumber }))
```
**اثر:** API key پیامک در localStorage به صورت plaintext ذخیره است و توسط هر script روی صفحه قابل خواندن است (XSS attack surface).  
**رفع:** کلیدها در server-side ذخیره شوند یا حداقل رمزگذاری شوند.

---

## ۳. مشکلات HIGH — مهم و باید رفع شوند

### H1 — 🔴 عدم وجود Content Security Policy (CSP)
**شواهد:** `vercel.json` هدرهای امنیتی پایه دارد اما CSP ندارد:
```json
"X-Content-Type-Options": "nosniff",
"X-Frame-Options": "DENY",
"X-XSS-Protection": "1; mode=block"
```
`X-XSS-Protection: 1; mode=block` منسوخ شده و جایگزین مناسب (CSP) وجود ندارد.  
**اثر:** در برابر XSS injection آسیب‌پذیر است، به‌ویژه چون یک کلینیک پزشکی است و PII وجود دارد.

---

### H2 — 🔴 Prop Drilling بسیار عمیق در `App.tsx` (God Component)
**فایل:** `src/App.tsx`  
**شواهد:** این فایل:
- بیش از ۵۰ state متغیر مدیریت می‌کند  
- به همه views اطلاعات پاس می‌دهد  
- تمام event handlers بین doctor-secretary-admin را هندل می‌کند  
- بیش از ۳۰ modal state جداگانه دارد  
**اثر:** هر تغییر در یک view می‌تواند تمام app را re-render کند. نگهداری بسیار دشوار است. یک Context یا Zustand store مناسب نیست.

---

### H3 — 🔴 فایل‌های بیش از حد بزرگ (God Components)
| فایل | اندازه |
|---|---|
| `src/pages/PatientDetail.tsx` | ۲۹۹ KB |
| `src/pages/Treatments.tsx` | ۱۶۷ KB |
| `src/pages/Billing.tsx` | ۱۵۱ KB |
| `src/pages/Dashboard.tsx` | ۱۵۰ KB |
| `src/components/PhaseAuditSuiteModal.tsx` | ۱۴۷ KB |
| `src/pages/Settings.tsx` | ۱۳۴ KB |
| `src/pages/Appointments.tsx` | ۱۲۰ KB |

**اثر:** `PatientDetail.tsx` با ۲۹۹ KB یکی از بزرگ‌ترین فایل‌های React در صنعت است. بارگذاری اولیه، parse time و memory usage به شدت آسیب می‌بینند.  
**رفع:** تفکیک به sub-components و استفاده از code splitting درون صفحه.

---

### H4 — 🔴 پروژه دو معماری موازی (legacy + new) دارد
**شواهد:**  
- `App.tsx` با mock data و `src/types/dental.ts` (نوع‌های قدیمی)  
- `src/lib/db.ts` با Dexie و `src/types/index.ts` (نوع‌های جدید)  
- `src/services/supabaseService.ts` (لایه قدیمی) و `src/lib/api.ts` (لایه جدید)  
- `src/pages/Dashboard.backup.tsx` به عنوان backup در مخزن باقی مانده (۱۱۷ KB)  
**اثر:** ابهام در اینکه کدام معماری active است. developers جدید سردرگم می‌شوند. هر دو باید نگهداری شوند.  
**رفع:** معماری جدید (Dexie+api.ts) انتخاب شود، لایه قدیمی حذف شود. Dashboard.backup.tsx حذف شود.

---

### H5 — 🔴 هیچ `React.memo` روی هیچ component‌ای وجود ندارد
**شواهد:** جستجوی `React.memo` در تمام `src/**/*.tsx` — نتیجه صفر  
**اثر:** هر بار که state بالای درخت (App.tsx) تغییر کند، تمام component tree re-render می‌شود. با ۵۰ state در App.tsx این مشکل مضاعف است.

---

### H6 — 🔴 Service Worker Cache Strategy بسیار ابتدایی
**فایل:** `public/sw.js`  
**مشکلات:**
- فقط ۴ فایل کش می‌شوند (index.html, manifest.json, icon.svg, /)
- فایل‌های JS/CSS bundle کش نمی‌شوند  
- هیچ cache-first/network-first strategy مناسبی وجود ندارد
- Cache version ثابت (`v1`) است و به‌روزرسانی نمی‌شود  
- Workbox استفاده نشده  
**اثر:** PWA به‌درستی offline کار نمی‌کند — JS/CSS assets بارگذاری نمی‌شوند.

---

### H7 — 🔴 `vite.config.ts` برای تست‌ها در `vitest.config.ts` موجود است اما E2E playwright به `pnpm run serve` نیاز دارد که تعریف نشده
**فایل:** `playwright.config.ts` — خط ۳۶  
```
command: `PORT=${port} BASE_PATH=${basePath} pnpm run build && PORT=${port} BASE_PATH=${basePath} pnpm run serve`
```
**مشکل:** `pnpm` در پروژه نیست (از `npm` و `bun` استفاده می‌شود)؛ script `serve` در `package.json` وجود ندارد.  
**اثر:** E2E tests اصلاً اجرا نمی‌شوند.

---

### H8 — 🔴 `Dashboard.backup.tsx` در مخزن وجود دارد
**فایل:** `src/pages/Dashboard.backup.tsx` — اندازه ۱۱۷ KB  
این فایل در production build جاسازی می‌شود (اگر import شود) یا باعث سردرگمی می‌شود. نام `.backup` در یک مخزن production-grade قابل قبول نیست.

---

## ۴. مشکلات MEDIUM — متوسط

### M1 — 🟡 هیچ input sanitization صریحی وجود ندارد
**شواهد:** جستجوی `DOMPurify`, `sanitize`, `xss` در `src/**/*.tsx` — نتیجه صفر  
اگرچه `dangerouslySetInnerHTML` استفاده نمی‌شود (که خوب است)، ورودی‌های فارسی و شناسه‌های بیمار بدون اعتبارسنجی کامل در state می‌روند. `validators.ts` برای format validation خوب است اما برای XSS/injection محافظتی ندارد.

---

### M2 — 🟡 `console.log` در production code باقی مانده
**موارد یافت شده:**
- `src/main.tsx`: `console.log('SW registration skipped or failed:', err)`
- `src/utils/syncQueue.ts`: `console.log('[StateSyncQueue]', ...args)` — همیشه active

---

### M3 — 🟡 استفاده از `any` type در مکان‌های کلیدی
**مواردی که یافت شد:**
- `src/types/dental.ts`: `treatments?: any[]` — در اصلی‌ترین type فایل
- `src/types/dental.ts`: `payload?: any`
- `src/lib/db.ts`: `data: any` در SyncQueueEntry
- `src/services/supabaseService.ts`: callback‌های `onEvent: (table: string, eventType: string, record: any)`
- `src/services/clinicalDatabase.ts`: `saveAllPatients(patients: any[])`  
با وجود strict mode روشن در tsconfig، این موارد نقض صریح استاندارد هستند.

---

### M4 — 🟡 PWA Manifest مشکلات دارد
**فایل:** `public/manifest.json`  
- یک آیکون از purpose هم `any` و هم `maskable` استفاده می‌کند: `"purpose": "any maskable"` — این اشتباه است؛ باید دو entry جداگانه باشد
- آیکون‌های `192x192` و `512x512` جداگانه تعریف نشده‌اند
- `scope` تعریف نشده

---

### M5 — 🟡 وابستگی‌های `bun.lock` با `package.json` نا‌سازگار هستند
**شواهد:** `bun.lock` نسخه `vite: "^8.3.0"` و `typescript: "^7.0.2"` دارد در حالی که `package.json` نسخه `vite: "^5.4.0"` و `typescript: "^5.5.3"` دارد. همچنین `@vitejs/plugin-react` در bun.lock `^6.1.1` است اما در package.json `^4.3.1`. این نشان می‌دهد lock file با manifest همگام نیست.

---

### M6 — 🟡 آسیب‌پذیری‌های شناخته‌شده در وابستگی‌ها
**خروجی `npm audit`:**
- `esbuild <= 0.24.2`: MODERATE — امکان ارسال request به dev server از هر website
- `vite <= 5.x`: HIGH — Path Traversal در Optimized Deps map handling  
رفع این آسیب‌پذیری‌ها نیازمند major version upgrade به Vite 8.x است.

---

### M7 — 🟡 عدم وجود Loading Boundary برای lazy-loaded pages
**فایل:** `src/components/Layout.tsx`  
skeleton loader وجود دارد اما فقط به `<div>` ساده محدود است. هیچ Suspense boundary اختصاصی با meaningful fallback برای هر route وجود ندارد.

---

### M8 — 🟡 `initGlobalErrorLogging()` هیچ‌جا صدا زده نمی‌شود
**فایل:** `src/lib/errorLog.ts`  
```typescript
export function initGlobalErrorLogging() { ... }
```
این تابع تعریف شده اما در `main.tsx` یا `App.tsx` فراخوانی نمی‌شود. یعنی window error events و unhandled rejections ثبت نمی‌شوند.

---

### M9 — 🟡 اطلاعات شخصی مالک در source code hardcode شده
**فایل:** `src/lib/auth.ts`  
```typescript
const isOwner = normalizedIdentifier === 'mostafa.hasanvand@gmail.com'
// cached.id = 'owner-mostafa-001'
// cached.full_name = 'مصطفی حسن‌وند'
```
ایمیل و نام مالک به صورت hardcode در کد منبع وجود دارد. اگر پروژه public شود، این اطلاعات فاش می‌شود.

---

### M10 — 🟡 مشکلات PWA Icon — Dual Purpose
**فایل:** `public/manifest.json`  
آیکون `icon-512.png` هم `any` هم `maskable` purpose دارد که طبق Web App Manifest spec نادرست است.

---

## ۵. مشکلات LOW — بهبودهای جزئی

### L1 — 🔵 بدون code coverage اندازه‌گیری
هیچ اطلاعاتی از test coverage وجود ندارد. `vitest.config.ts` پیکربندی `coverage` ندارد.

### L2 — 🔵 `tailwindcss` هم در devDependencies و هم در dependencies ممکن است اضافه باشد
با Tailwind v4 که از `@tailwindcss/vite` استفاده می‌کند، پیکربندی `tailwind.config.js` ممکن است بی‌استفاده باشد.

### L3 — 🔵 Capacitor config وجود دارد اما dependency نیست
`capacitor.config.ts` در root وجود دارد اما `@capacitor/core` در package.json نیست.

### L4 — 🔵 `name: "react-example"` در `package.json`
نام پروژه هنوز placeholder اولیه است و مناسب نیست.

### L5 — 🔵 هیچ `skip-link` برای keyboard navigation در HTML وجود ندارد
CSS برای `.skip-link` در `accessibility.css` نوشته شده اما در `index.html` المان مربوطه وجود ندارد.

### L6 — 🔵 `motion-dom` به عنوان dependency جداگانه لیست شده
`motion-dom` یک peer dependency از `motion` است و نیازی به ذکر جداگانه ندارد.

### L7 — 🔵 فایل‌های script اضافی در root
`scripts/runLiveClinicalLoop.ts`, `scripts/runPhaseAuditTests.ts`, `scripts/runRealWorldProductionAudit.ts` — اگر فقط برای dev هستند، باید در `devDependencies` یا یک directory جداگانه با مستندات کافی باشند.

### L8 — 🔵 در Vercel headers نیست `Permissions-Policy`
هدر `Permissions-Policy` که دسترسی به microphone/camera را محدود می‌کند وجود ندارد. با توجه به اینکه پروژه از BarcodeScanner و Camera استفاده می‌کند، این باید صریحاً اعلام شود.

---

## ۶. نقاط قوت

### ✅ زیرساخت امنیتی احراز هویت بسیار قوی
`src/lib/auth.ts` یکی از بهترین پیاده‌سازی‌های offline-resilient auth است:
- Session refresh با exponential backoff
- تشخیص transient vs non-transient errors
- گزینه‌های graceful offline fallback
- محافظت در برابر role escalation هنگام reconnect
- OFFLINE_AUTH_KEY و REAL_REFRESH_TOKEN_KEY

### ✅ TypeScript Strict Mode فعال است
`tsconfig.json` با `"strict": true` — این کمک می‌کند بسیاری از bugs قبل از runtime گرفته شوند.

### ✅ اعتبارسنجی ایرانی کامل
`src/utils/validators.ts`:
- کدملی با الگوریتم مدولوس ۱۱
- شماره موبایل ایرانی
- شماره صیادی ۱۶ رقمی
- IBAN ایرانی
- شماره نظام پزشکی

### ✅ RTL و فارسی کامل
- `lang="fa" dir="rtl"` در `index.html`
- فونت Vazirmatn بارگذاری صحیح
- اعداد فارسی با تبدیل مناسب
- تقویم جلالی کامل

### ✅ Accessibility Infrastructure مناسب
- `aria-label` در اکثر interactive elements
- `accessibility.css` با touch targets، reduced motion، skip-link
- `role="dialog" aria-modal="true"` روی modals
- Focus trap در modals

### ✅ Offline-First Architecture طراحی‌شده
- IndexedDB (Dexie) به عنوان primary store
- Supabase به عنوان cloud sync
- Sync queue با retry logic
- Multi-tab safety با `versionchange` event

### ✅ Error Boundary و Error Logging
- `ErrorBoundary` component در Layout
- Error log با حداکثر ۵۰ entry
- نمایش مناسب خطا به کاربر فارسی‌زبان

### ✅ Lazy Loading صفحات
`Layout.tsx` از `React.lazy()` برای تمام pages استفاده می‌کند که bundle اولیه را کوچک نگه می‌دارد.

### ✅ Audit Log محلی
`src/lib/auditLog.ts` — تمام عملیات CRUD در IndexedDB ثبت می‌شود. برای کلینیک‌های پزشکی این الزامی است.

### ✅ RBAC کامل
`src/lib/permissions.ts` با ۱۱ نقش، per-settings-section access control، و database-backed overrides.

### ✅ Pull-to-Refresh و Haptic Feedback
پیاده‌سازی‌های مناسب برای تجربه mobile-first.

---

## ۷. توصیه‌های اولویت‌بندی‌شده (برنامه عملی)

### فاز ۱ — فوری (هفته ۱)
1. **رفع merge conflict در `vite.config.ts`** — بدون این هیچ چیزی deploy نمی‌شود
2. **اضافه کردن `dexie`, `react-router-dom`, `dexie-react-hooks` به `package.json`**
3. **حذف hardcoded Supabase key از `src/lib/supabase.ts`** — استفاده صرف از env variable
4. **حذف Gemini API key از client code و ساخت proxy endpoint**

### فاز ۲ — کوتاه‌مدت (هفته ۲-۴)
5. **تفکیک `App.tsx`** — state های مشترک به Context یا Zustand منتقل شوند
6. **اضافه کردن `React.memo` به پرکاربردترین component‌ها** (DashboardView, PatientCard, AppointmentCard)
7. **رفع Service Worker** — استفاده از Workbox یا cache strategy مناسب برای JS/CSS bundles
8. **رفع E2E playwright config** — تغییر `pnpm` به `npm` و اضافه کردن `serve` script
9. **اضافه کردن CSP header در `vercel.json`**
10. **فراخوانی `initGlobalErrorLogging()` در `main.tsx`**

### فاز ۳ — میان‌مدت (ماه ۲)
11. **تفکیک `PatientDetail.tsx` (299 KB)** — هر tab یک کامپوننت lazy-loaded جداگانه
12. **حذف معماری قدیمی** — یکی از دو path (legacy vs new) انتخاب و دیگری حذف شود
13. **حذف `Dashboard.backup.tsx`** از مخزن
14. **رفع Manifest icon** — `any` و `maskable` باید entry جداگانه داشته باشند
15. **اضافه کردن coverage به vitest config**
16. **ارتقاء Vite به نسخه ۸** برای رفع آسیب‌پذیری HIGH

### فاز ۴ — بلندمدت
17. **نوشتن integration tests** برای auth flows
18. **اضافه کردن skip-link به HTML**
19. **رفع نام پروژه** در `package.json`
20. **خارج کردن SMS API key از localStorage** و ذخیره server-side

---

## ضمیمه — جزئیات فنی

### ساختار وابستگی‌ها (ناسازگاری‌های critical)
```
package.json دارد:         bun.lock دارد:
vite: ^5.4.0               vite: ^8.3.0
typescript: ^5.5.3         typescript: ^7.0.2
@vitejs/plugin-react: 4.x  @vitejs/plugin-react: 6.x

در package.json نیستند اما در کد استفاده می‌شوند:
- dexie (استفاده در src/lib/db.ts، src/lib/api.ts)
- react-router-dom (استفاده در 30+ فایل)
- dexie-react-hooks (در vite.config.ts ذکر شده در manualChunks)
```

### وضعیت Build
```
npm run build → FAILED
خطا: vite.config.ts:1:290: ERROR: Unexpected "<<"
علت: unresolved git merge conflict
```

### خلاصه npm audit
```
2 vulnerabilities (1 moderate, 1 high)
- esbuild <=0.24.2: CWE-346 (dev server CORS bypass)
- vite <=5.x: Path traversal in .map handling
```
