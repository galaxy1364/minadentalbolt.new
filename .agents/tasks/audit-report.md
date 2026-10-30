# گزارش ممیزی جامع پروژه Dentify-Pro (MinaDental)

**تاریخ بررسی:** دی ۱۴۰۳  
**نوع پروژه:** React 19 + TypeScript + Vite + Tailwind CSS v4 + Supabase  
**مسیر پروژه:** `C:\Users\mosta\Desktop\dentify-pro`  
**تعداد فایل‌های بررسی شده:** ۸۳ فایل (src + config + scripts)

---

## خلاصه اجرایی

پروژه یک اپلیکیشن مدیریت کلینیک دندانپزشکی با معماری PWA است. کدبیس دارای منطق تجاری خوبی است، اما چندین باگ حیاتی، نقص‌های امنیتی مهم، و بخش‌هایی با پیاده‌سازی شبیه‌سازی‌شده (stub) وجود دارد که برای محیط production آمادگی ندارند.

---

## ۱. باگ‌های حیاتی (CRITICAL)

### 🔴 C1 — استفاده از `runImmediateRefreshWrapper` قبل از تعریف آن (Temporal Dead Zone)

**فایل:** `src/App.tsx`، خطوط ~415 و ~430

```typescript
// استفاده در خط ~415 (داخل registerReconnectHandler)
runImmediateRefreshWrapper(() => {
  setPatients(data);
  ...
});

// اما تعریف در خط ~430 — بعد از استفاده!
const runImmediateRefreshWrapper = (fn: () => void) => {
  try { flushSync(fn); } catch { fn(); }
};
```

**مشکل:** متغیر `runImmediateRefreshWrapper` با `const` تعریف شده و در یک closure ارجاع داده می‌شود. اگر callback reconnect قبل از مقداردهی اجرا شود (race condition در بارگذاری اول)، خطای `ReferenceError` می‌دهد.

**تأثیر:** crash اپلیکیشن هنگام reconnect به Supabase.

---

### 🔴 C2 — Infinite Re-render Loop در useEffect اصلی

**فایل:** `src/App.tsx`، خط ۴۷۹

```typescript
useEffect(() => {
  // ... Supabase realtime setup ...
  const unsubscribeHardwareCall = hardwareBridgeService.onIncomingCall((event) => {
    const match = patients.find(...); // patients از closure خوانده می‌شود
    setIncomingCall(...);
  });
  return () => { ... unsubscribeHardwareCall(); };
}, [patients]); // ← وابستگی به patients
```

**مشکل:** این `useEffect` هر بار که `patients` تغییر کند دوباره اجرا می‌شود. در داخل آن `stateSyncQueue.subscribe` و `setupSupabaseRealtime` صدا زده می‌شوند. هر تغییر در `patients` باعث unsubscribe و re-subscribe به Supabase Realtime می‌شود — یک چرخه ناخواسته که:
- connection های Supabase را دوباره باز می‌کند
- callback های مربوط به Caller ID را unbind و rebind می‌کند
- `stateSyncQueue.registerReconnectHandler` را هر بار دوباره ثبت می‌کند

**تأثیر:** نشت حافظه (memory leak)، اتصال‌های تکراری، کاهش کارایی قابل توجه.

---

### 🔴 C3 — مدل Gemini نامعتبر (`gemini-3.8-flash`)

**فایل:** `src/services/geminiDentalAi.ts`، خط ۶۰

```typescript
const response = await client.models.generateContent({
  model: 'gemini-3.8-flash', // ← این مدل وجود ندارد!
  ...
});
```

**مشکل:** مدل صحیح `gemini-1.5-flash` یا `gemini-2.0-flash-exp` است. نام `gemini-3.8-flash` در هیچ نسخه‌ای از Google AI وجود ندارد. این باعث می‌شود هر درخواست به Gemini با خطای `model not found` شکست بخورد و اپ به fallback می‌رود — اما کاربر متوجه نمی‌شود.

**تأثیر:** دستیار AI همیشه offline/fallback است حتی با API Key معتبر.

---

### 🔴 C4 — SMS Service هیچ‌گاه واقعاً پیامک ارسال نمی‌کند

**فایل:** `src/services/smsService.ts`، خطوط ۱۱۲–۱۳۵

```typescript
// Network dispatch simulation
await new Promise(r => setTimeout(r, 600)); // فقط تأخیر مصنوعی!
// هیچ fetch() یا HTTP call واقعی وجود ندارد
const refId = `${this.provider.toUpperCase()}-${Math.floor(...)}`; // تولید تصادفی
```

**مشکل:** سرویس SMS هیچ درخواست HTTP به Kavenegar/FarazSMS/MeliPayamak ارسال نمی‌کند. فقط یک تأخیر ۶۰۰ میلی‌ثانیه اضافه می‌کند و یک refId تصادفی می‌سازد. پیامک‌های تأیید نوبت، سررسید قسط، و اخطارهای لابراتوار هرگز به بیماران نمی‌رسند.

**تأثیر:** تمام قابلیت SMS صرفاً نمایشی (mock) است.

---

### 🔴 C5 — POS Payment هیچ‌گاه با کارتخوان واقعی ارتباط برقرار نمی‌کند

**فایل:** `src/services/hardwareBridgeService.ts`، خطوط ۱۰۶–۱۲۵

```typescript
public async sendPosTransaction(req): Promise<PosTransactionResponse> {
  // Simulates ISO 8583 / Shaparak daemon
  await new Promise(r => setTimeout(r, 1800)); // تأخیر مصنوعی
  // هیچ TCP socket یا HTTP call به IP دستگاه POS نیست
  return { success: true, status: 'approved', ... }; // همیشه موفق!
}
```

**مشکل:** تراکنش POS همیشه با کد تصادفی `success: true` برمی‌گردد. ارتباط واقعی با دستگاه کارتخوان (TCP/IP به `192.168.1.150:8082`) پیاده‌سازی نشده.

**تأثیر:** کلینیک می‌تواند فکر کند پرداخت با کارت انجام شده درحالی‌که پولی دریافت نشده.

---

## ۲. باگ‌های مهم در منطق کسب‌وکار (HIGH)

### 🟠 H1 — محاسبه `balance` به‌روز نمی‌شود هنگام ثبت درمان جدید

**فایل:** `src/App.tsx`، تابع `handleSaveTreatment`

```typescript
const updatedPatients = patients.map(p => {
  if (p.id === targetPatient.id) {
    return {
      ...p,
      totalCost: p.totalCost + treatmentData.cost,
      balance: p.balance - treatmentData.cost, // ← ممکن است اشتباه باشد
      activeTreatmentsCount: p.activeTreatmentsCount + 1,
      ...
    };
  }
  return p;
});
```

**مشکل:** منطق `balance` در پروژه: مقدار منفی = بدهکار، مقدار صفر = تسویه. وقتی درمان ثبت می‌شود، `balance` کاهش می‌یابد (`balance - cost`) که صحیح است. اما وقتی پرداخت ثبت می‌شود (`handleAddPayment`)، `balance` افزایش می‌یابد (`balance + amount`). این منطق یکسان نیست — در mockData بیمار `pat-1` با `totalCost=38500000` و `paidAmount=22000000` مانده `balance=-16500000` است که منطقی به نظر می‌رسد. اما آلرت secretary (`doctorBillingAlert`) مبلغ را به صورت `costDiff > 0 ? costDiff : record.totalCost || 2500000` محاسبه می‌کند که در برخی حالت‌ها مقدار اشتباه نمایش می‌دهد.

---

### 🟠 H2 — درآمد روزانه و تعداد جراحی‌های فعال هاردکد شده

**فایل:** `src/App.tsx`، خطوط ۵۱۳–۵۱۵

```typescript
const activeSurgeriesCount = 3; // ← همیشه ۳!
const dailyRevenue = 38500000;  // ← همیشه ۳۸.۵ میلیون تومان!
```

**مشکل:** این مقادیر نباید ثابت باشند. `dailyRevenue` باید از `payments` با تاریخ امروز محاسبه شود و `activeSurgeriesCount` از appointments با status `in_chair` و `waiting`.

---

### 🟠 H3 — Sayd Check ID در mockData اعتبارسنجی نمی‌شود

**فایل:** `src/data/mockData.ts`

```typescript
sayadId: '۷۳۰۱۸۴۹۲۱۶۴۸۵۲۱۰', // ۱۸ رقم — باید ۱۶ رقم باشد!
sayadId: '۴۱۸۰۹۲۶۳۵۱۷۲۸۰۳۴', // ۱۸ رقم — باید ۱۶ رقم باشد!
sayadId: '۹۹۰۱۴۴۲۸۷۱۶۰۹۹۴۵', // ۱۸ رقم — باید ۱۶ رقم باشد!
```

**مشکل:** validator در `src/utils/validators.ts` مقدار ۱۶ رقم را الزامی می‌داند (`/^\d{16}$/`) اما مقادیر در mockData همه ۱۸ رقمی هستند. این باعث می‌شود تمام تست‌های صیاد در `liveAuditStressLoop.ts` با مقادیر واقعی شکست بخورند.

---

### 🟠 H4 — Race Condition در hydration data از IndexedDB و Supabase

**فایل:** `src/App.tsx`، useEffect اول

```typescript
// Step 0: IndexedDB hydration
indexedDbService.getAllPatients().then((stored) => {
  if (stored && stored.length > 0) {
    setPatients(stored); // setPatients با داده IndexedDB
  }
});

// Step 1: Cloud hydration
supabaseService.getPatients().then(({ data }) => {
  if (data && data.length > 0) {
    setPatients(data); // setPatients دوباره با داده Supabase
    ...
  }
});
```

**مشکل:** هر دو promise به‌صورت موازی اجرا می‌شوند بدون هیچ هماهنگی. اگر Supabase سریع‌تر پاسخ دهد، بعد از آن IndexedDB می‌تواند `setPatients` دوباره صدا زند و داده قدیمی‌تر را روی داده جدید بنویسد.

---

### 🟠 H5 — دو نمونه IndexedDB با نام‌های مختلف باز می‌شوند

**فایل‌ها:** `src/services/indexedDbService.ts` (DB: `MinaDentalClinicalDB`) و `src/services/clinicalDatabase.ts` (DB: `minadental_clinical_v2`)

**مشکل:** دو سرویس مجزا با دو IndexedDB database جداگانه داده می‌نویسند. `clinicalDatabase.ts` تمام patients را در یک کلید (`all_patients_cache`) ذخیره می‌کند (کارایی ضعیف)، در حالی که `indexedDbService.ts` هر patient را جداگانه ذخیره می‌کند. هیچ synchronization بین این دو وجود ندارد.

---

## ۳. مشکلات امنیتی (SECURITY)

### 🔴 SEC1 — پسوردهای plain-text در کد منبع

**فایل:** `src/services/syncEngine.ts`، خطوط ۱۹–۱۳۵

```typescript
password: 'amiri@dental2025',   // مدیر کلینیک
password: 'sara@dental2025',    // دندانپزشک
password: 'monshi@mina2025',    // منشی
password: 'parisa@mina2025',    // دستیار
password: 'hesab@mina2025',     // حسابدار
```

**مشکل:** پسوردهای واقعی کاربران به‌صورت plain-text در `INITIAL_USERS` ذخیره شده که مستقیماً در bundle JavaScript قرار می‌گیرد و برای همه کاربران قابل مشاهده است. این یک نقص امنیتی بحرانی است.

---

### 🔴 SEC2 — API Key واقعی SMS در کد منبع

**فایل:** `src/services/smsService.ts`، خط ۲۵

```typescript
private apiKey: string = '7A6432684B6634567A31414E737754384B617631';
```

**مشکل:** یک API Key (احتمالاً نمونه/demo Kavenegar) به‌صورت hardcode در کد منبع است. این کلید در JavaScript bundle ارسالی به مرورگر قرار می‌گیرد.

---

### 🔴 SEC3 — کنترل دسترسی فقط در UI (بدون اعتبارسنجی سمت سرور)

**فایل:** `src/services/syncEngine.ts`، `INITIAL_USERS`

**مشکل:** تمام permission checking در سطح UI React Component انجام می‌شود. هیچ middleware یا RLS (Row Level Security) در Supabase وجود ندارد که از دسترسی مستقیم به API جلوگیری کند. یک کاربر با `role: secretary` می‌تواند مستقیماً از API Supabase برای حذف records استفاده کند.

---

### 🟠 SEC4 — Caller ID بدون احراز هویت از خارج دریافت می‌شود

**فایل:** `src/services/hardwareBridgeService.ts`

**مشکل:** `triggerSimulatedCall` public است و هر کدی می‌تواند آن را با هر شماره‌ای صدا بزند. در محیط واقعی که hardwareBridgeService از یک websocket یا local daemon تغذیه می‌شود، هیچ authentication وجود ندارد.

---

## ۴. سرویس‌ها و هوک‌های ناقص / Stub

### 🟡 STUB1 — `smsService.ts` — پیاده‌سازی کامل نشده

تمام منطق ارسال پیامک stub است (خط ۱۱۲). باید API call واقعی به Kavenegar یا FarazSMS پیاده‌سازی شود.

### 🟡 STUB2 — `hardwareBridgeService.ts` — POS و Caller ID stub است

`sendPosTransaction` همیشه `approved` برمی‌گرداند. هیچ TCP socket برای اتصال به `192.168.1.150:8082` وجود ندارد.

### 🟡 STUB3 — `geminiDentalAi.ts` — مدل اشتباه (ر. باگ C3)

مدل `gemini-3.8-flash` وجود ندارد. سرویس همیشه به fallback می‌رود.

### 🟡 STUB4 — `downloader.ts` — فایل ZIP وجود ندارد

```typescript
return `${window.location.origin}/minadental-source-full.zip`;
```
فایل `minadental-source-full.zip` در مسیر `public/` پروژه وجود ندارد. دکمه دانلود پروژه همیشه با خطای ۴۰۴ شکست می‌خورد.

### 🟡 STUB5 — `clinicalSafety.ts` — توابع import شده اما پیاده‌سازی ناقص

در `src/services/liveAuditStressLoop.ts` این توابع import می‌شوند:
- `calculateInterpolDviMatch`
- `calculatePerioBoneLossToAgeRatio`
- `calculateIadtAvulsionProtocol`
- `calculateHelkimoTmdScore`
- `classifyFranklBehaviorScale`
- `determinePediatricSpaceMaintainer`

بررسی `clinicalSafety.ts` نشان می‌دهد فایل truncate شده و احتمال ناقص بودن برخی توابع وجود دارد.

### 🟡 STUB6 — Caller ID واقعی وجود ندارد

`hardwareBridgeService` فقط `triggerSimulatedCall` دارد. هیچ serial port، websocket، یا local daemon listener برای کالر آیدی واقعی پیاده‌سازی نشده.

---

## ۵. مشکلات TypeScript و Build

### 🔵 TS1 — `node_modules` نصب نشده

پروژه از `bun.lock` استفاده می‌کند (Bun package manager) اما `node_modules` وجود ندارد. برای نصب باید از `bun install` استفاده شود نه `npm install`. بدون `node_modules` هیچ‌کدام از اسکریپت‌های `package.json` قابل اجرا نیستند.

### 🔵 TS2 — `tsconfig.json` فاقد `strict` mode

```json
// tsconfig.json
{
  "compilerOptions": {
    // strict: true وجود ندارد!
    "skipLibCheck": true,
    ...
  }
}
```

بدون `strict: true` بسیاری از خطاهای type اساسی catch نمی‌شوند مانند: `null` checks، `undefined` values، implicit `any`.

### 🔵 TS3 — استفاده از `any` در type‌های بحرانی

**فایل‌های متأثر:** `src/types/dental.ts`، `src/services/clinicalDatabase.ts`

```typescript
// در dental.ts
treatments?: any[];  // ← نباید any باشد

// در clinicalDatabase.ts
public async saveAllPatients(patients: any[]): Promise<boolean> // ← نباید any باشد
public async getAllPatients(): Promise<any[] | null> // ← نباید any باشد
```

### 🔵 TS4 — `capacitor.config.ts` بدون Capacitor نصب شده

**فایل:** `capacitor.config.ts` در root پروژه وجود دارد اما `@capacitor/core` در `package.json` نیست. این فایل orphan است.

---

## ۶. مشکلات داده (mockData) و اعتبارسنجی

### 🟡 DATA1 — شناسه‌های صیاد در mockData اشتباه هستند (۱۸ رقم به‌جای ۱۶)

تمام `sayadId` های موجود در `mockData.ts` دارای ۱۸ رقم هستند درحالی که validator `validateSayadCheckId` دقیقاً ۱۶ رقم می‌خواهد.

### 🟡 DATA2 — کدهای ملی در mockData به صورت Persian digits هستند

```typescript
nationalId: '۰۰۱۲۸۴۷۵۹۱', // ارقام فارسی
```

`validateIranianNationalCode` قبل از اعتبارسنجی `toEnglishDigits` صدا می‌زند پس این مشکل ساز نیست، اما ناسازگاری با SQL schema که `national_id TEXT` را ذخیره می‌کند وجود دارد.

### 🟡 DATA3 — `INITIAL_PATIENTS` در دو مکان import می‌شود

`supabaseService.ts` مستقیماً از `mockData.ts` import می‌کند و در `mockDb.patients` قرار می‌دهد. این باعث می‌شود وقتی Supabase در دسترس نیست، داده mock ممکن است با داده localStorage تداخل پیدا کند.

### 🟡 DATA4 — مانده بیمار pat-1 ناسازگار است

```typescript
totalCost: 38500000,
paidAmount: 22000000,
balance: -16500000, // ← باید -16500000 باشد ✓
```

مقادیر نوشتاری صحیح هستند اما `payments` جمعاً ۲۲ میلیون است (`16M + 6M`) که با `paidAmount` مطابقت دارد. این درست است.

---

## ۷. مشکلات UI/UX کمپوننت‌ها

### 🟡 UI1 — دو IndexedDB race condition در لود اولیه

کاربر ممکن است در ابتدای باز کردن اپ (در زمان kicking off هر دو promise) یک flash of empty content ببیند.

### 🟡 UI2 — `syncEpoch` بدون هیچ استفاده مستقیمی در JSX

**فایل:** `src/App.tsx`

```typescript
const [syncEpoch, setSyncEpoch] = useState<number>(0);
```

این state فقط افزایش می‌یابد اما جایی در JSX به آن ارجاع داده نمی‌شود. هدف آن "force re-render" بوده اما با React 18+ و flushSync این روش نه لازم است و نه مؤثر.

### 🟡 UI3 — هیچ test file در کل پروژه وجود ندارد

پروژه فاقد هر نوع unit test، integration test، یا E2E test است. اسکریپت‌های `test:audit` و `test:loop` موجود در `package.json` اسکریپت‌های شبیه‌سازی هستند نه test واقعی.

### 🟡 UI4 — `DentalSkeletonLoader` import نشده در App.tsx

**فایل:** `src/components/DentalSkeletonLoader.tsx` موجود است اما هیچ‌جا import نشده. کاربر loading skeleton نمی‌بیند.

### 🟡 UI5 — `GlobalCommandPalette` import نشده در App.tsx

**فایل:** `src/components/GlobalCommandPalette.tsx` موجود است اما در App.tsx import نشده و هرگز render نمی‌شود.

### 🟡 UI6 — `ConsentSignatureModal` import نشده در App.tsx

**فایل:** `src/components/ConsentSignatureModal.tsx` موجود است اما در App.tsx render نمی‌شود.

---

## ۸. مشکلات استانداردسازی کد

### 🔵 STD1 — نام‌گذاری ناسازگار برای متدهای یکسان

```typescript
// supabaseService.ts
public resetToDefault(): void { ... }
public resetToDefaultConfig(): void { this.resetToDefault(); } // کپی کار ← Duplicate
public updateConfig(...): void { this.setConfig(...); }       // Alias ← Duplicate
```

سه متد `resetToDefault`، `resetToDefaultConfig`، و `updateConfig` همه کار مشابه انجام می‌دهند.

### 🔵 STD2 — `Merkle hash` با DJB2 string hash پیاده‌سازی شده (ضعیف)

**فایل:** `src/utils/clinicalSafety.ts`، تابع `calculateSimpleMerkleRoot`

```typescript
let hash = 0;
const combined = left + right;
for (let j = 0; j < combined.length; j++) {
  hash = ((hash << 5) - hash) + combined.charCodeAt(j);
  hash |= 0;
}
const hex = Math.abs(hash).toString(16).padStart(64, 'e'); // فقط ۸ hex character واقعی!
```

هش تولید شده فقط ۸ کاراکتر هگزادسیمال واقعی دارد و بقیه `e` است. برای یک audit log که ادعای Merkle integrity دارد، این کاملاً ناکافی است.

### 🔵 STD3 — `generateAuditChainHash` هم همین مشکل را دارد

هش HIPAA/ISO 27001 ادعایی با DJB2 ساده پیاده‌سازی شده که قابلیت collision بالایی دارد.

### 🔵 STD4 — `medications` در `prescriptions` لیست نشده اما `welcome` SMS pattern موجود است

در `smsService.ts` یک `patternType: 'welcome'` در interface تعریف شده اما هیچ‌جا handler برای آن وجود ندارد (`messageText` خالی می‌ماند).

### 🔵 STD5 — `supabaseService.mockDb.appointments` همیشه خالی شروع می‌شود

```typescript
private mockDb = {
  patients: [...INITIAL_PATIENTS],
  appointments: [] as Appointment[], // ← خالی! بدون INITIAL_APPOINTMENTS
  inventory: [] as InventoryItem[],  // ← خالی!
  ...
};
```

وقتی Supabase در دسترس نیست، `getAppointments()` آرایه خالی برمی‌گرداند.

---

## ۹. کانفیگ‌های ناقص (.env)

**فایل:** `.env.example`

| متغیر | وضعیت | مشکل |
|-------|--------|-------|
| `GEMINI_API_KEY` | ناقص | در `geminiDentalAi.ts` از `process.env.GEMINI_API_KEY` و `VITE_GEMINI_API_KEY` هر دو چک می‌شود اما .env.example فقط `GEMINI_API_KEY` دارد |
| `VITE_SUPABASE_URL` | موجود | فقط placeholder |
| `VITE_SUPABASE_ANON_KEY` | موجود | فقط placeholder |
| SMS API Key | غایب | کلید SMS در `.env.example` نیست اما در کد hardcode است |
| `VITE_GEMINI_API_KEY` | غایب | نام صحیح برای Vite باید `VITE_GEMINI_API_KEY` باشد |

---

## ۱۰. وابستگی‌های غیرمعمول

**فایل:** `package.json`

| وابستگی | نسخه | مشکل |
|---------|-------|-------|
| `typescript` | `^7.0.2` | TypeScript 7 هنوز release نشده! نسخه stable 5.x است |
| `vite` | `^8.3.0` | Vite 8 هنوز release نشده! نسخه stable 5.x است |
| `@vitejs/plugin-react` | `^6.1.1` | نسخه stable 4.x است |
| `motion` | `^12.23.24` | نسخه بالا — باید تأیید شود `framer-motion` نیست |
| `dotenv` | در dependencies | نه devDependencies — برای یک Vite app باید در devDependencies باشد |
| `express` | در dependencies | اگر فقط frontend است، Express نباید در dependencies باشد |

**نکته:** عدم وجود `node_modules` نشان می‌دهد احتمالاً این بسته‌ها هنوز نصب نشده‌اند.

---

## اولویت‌بندی کلی مشکلات

| اولویت | تعداد | موارد |
|--------|--------|-------|
| 🔴 حیاتی (Critical) | ۵ | C1-C5 + SEC1-SEC3 |
| 🟠 بالا (High) | ۵ | H1-H5 |
| 🟡 متوسط (Medium) | ۱۰ | STUB1-6 + DATA1-4 |
| 🔵 پایین (Low) | ۸ | TS1-TS4 + STD1-STD5 |

---

## توصیه‌های اصلاح اولویت‌بندی شده

### فوری (پیش از هر deployment):

1. **پسوردها را از کد بردارید** — از Supabase Auth استفاده کنید و رمزهای plain-text را حذف کنید (SEC1)
2. **API Key SMS را به .env منتقل کنید** (SEC2)
3. **مدل Gemini را اصلاح کنید** — `'gemini-1.5-flash'` یا `'gemini-2.0-flash-exp'` (C3)
4. **useEffect dependency را اصلاح کنید** — `patients` را از dependency array حذف کنید و از `useRef` برای نگه داشتن callback استفاده کنید (C2)
5. **`runImmediateRefreshWrapper` را به بالا منتقل کنید** (C1)

### کوتاه‌مدت:

6. **SMS Service را پیاده‌سازی واقعی کنید** — با `fetch()` به API Kavenegar (STUB1)
7. **Sayd Check ID های mockData را اصلاح کنید** — ۱۶ رقمی کنید (DATA1)
8. **`dailyRevenue` و `activeSurgeriesCount` را از داده واقعی محاسبه کنید** (H2)
9. **Race condition در hydration را با sequence کردن promises حل کنید** (H4)
10. **دو IndexedDB را یکپارچه کنید** (H5)

### میان‌مدت:

11. **TypeScript `strict: true`** را به tsconfig اضافه کنید
12. **Unit tests** با Vitest برای services اضافه کنید
13. **Supabase RLS policies** برای کنترل دسترسی واقعی تنظیم کنید
14. **mockDb در supabaseService** را با `INITIAL_APPOINTMENTS` و `INITIAL_INVENTORY` پر کنید
15. **`GlobalCommandPalette`، `DentalSkeletonLoader`، `ConsentSignatureModal`** را به App.tsx اضافه کنید

---

*گزارش تهیه‌شده توسط Kiro AI Audit Agent — بر اساس بررسی مستقیم کد منبع*
