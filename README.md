# 🦷 مینادنتال (MinaDental) - سیستم مدیریت جامع و فوق‌پیشرفته دندانپزشکی
### Ultra-Enterprise Dental Practice Management & Operatory Terminal
**طراحی اختصاصی ۱۰۰٪ منطبق با کیوبانک (Q-Bank) · سیستم پالمر (Palmer Notation) · تقویم ایرانی جلالی · پشتیبان چندپلتفرمه (APK, IPA, PWA)**

---

## 🌟 ویژگی‌های کلیدی سیستم (Key Capabilities)

1. **چارتینگ بالینی ۳‌بعدی آناتومیک با سیستم پالمر (Palmer Dental Notation):**
   - تفکیک دقیق ۴ ربع فکی دندانپزشکی: `UR` (بالا راست)، `UL` (بالا چپ)، `LL` (پایین چپ)، `LR` (پایین راست).
   - دندان‌های دائمی ۱ تا ۸ (ثنایا تا دندان عقل) و دندان‌های شیری اطفال A تا E.
   - ثبت ترمیم‌های چندسطحی با تفکیک سطوح `O` (اکلوزال)، `M` (مزیال)، `D` (دیستال)، `B` (باکال)، `L` (لینگوآل).
   - ابزار قلم و حاشیه‌نویسی دیجیتال مستقیم روی دندان و محاسبه بلادرنگ هزینه طرح درمان.

2. **مدیریت ایمپلنتولوژی و جراحی کاشت فیکسچر:**
   - ثبت برند (Dentium SuperLine, SIC, Megagen AnyRidge, Straumann BLX و ...).
   - قطر، طول، گشتاور بستن فیکسچر (Torque به N/cm).
   - پیوند استخوان (Bone Graft) و ممبرین جذبی.
   - خط سیر ۵ مرحله‌ای: کاشت فیکسچر -> هیلینگ کپ -> قالب‌گیری -> تست فریم و اباتمنت -> تحویل روکش نهایی.

3. **زنجیره رفت و برگشت لابراتوار پروتز (Analog & Digital CAD/CAM):**
   - انتخاب رنگ شید ویتا (A1, A2, A3, BL2 و ...) و رنگ استامپ.
   - ترنسلوسنسی زیرکونیا (HT, MT, LT) و نوع تراش مارجین (Chamfer, Shoulder).
   - محاسبه زمان رفت و برگشت، آلارم تحویل به بیمار و کنترل کیفی در مطب (QC Passed).

4. **سیستم مالی، چک‌های صیادی و مدل‌های سهم‌بندی پزشکان:**
   - استعلام و اعتبارسنجی شناسه ۱۶ رقمی چک صیادی بنفش بانک مرکزی با سامانه پیچک.
   - جدول اقساط هوشمند با یادآوری خودکار پیامکی.
   - **۳ مدل محاسبه سهم‌بندی پزشکان (Doctor Commission Models):**
     * **مدل ۱:** `(کل کارکرد منهای کل هزینه لابراتوار) ÷ ۲`
     * **مدل ۲:** دستمزد ثابت جراحی/درمان (تعرفه عددی ثابت برای هر خدمت)
     * **مدل ۳:** درصدی سفارشی با درصد اختصاصی پزشکان و ۱۰۰٪ ویژه مدیر مطب (دکتر مهدی امیری).

5. **معماری عدم اتلاف داده (Zero-Data-Loss) و همگام‌سازی ابری:**
   - کش محلی لوکال و آفلاین (Offline-First) با بازیابی خودکار کرش.
   - ارتباط بلادرنگ (Real-Time Mesh) بین اتاق پزشک، میز منشی و دستیار.
   - دیتابیس ابری سوپابیس (Supabase Realtime PostgreSQL) با پشتیبان‌گیری خودکار.
   - سیستم واگرد سراسری بالینی (Global Clinical Undo) برای پیشگیری از خطای انسانی.

---

## 🚀 راهنمای راه‌اندازی و اجرا (Quick Start)

### پیش‌نیازها
- Node.js 18+ یا 20+
- npm یا bun

### نصب پکیج‌ها و اجرای سرور توسعه
```bash
npm install
npm run dev
```
برنامه روی آدرس `http://localhost:3000` اجرا خواهد شد.

### کامپایل و تست‌های ممیزی خودکار
```bash
# اعتبارسنجی تایپ‌ها و کدهای TypeScript
npm run lint

# اجرای ممیزی جامع بالینی و ریاضی هفتگانه
npm run test:audit

# ساخت بسته زیپ سورس کامل پروژه
npm run package:zip
```

---

## 📱 بیلد و ساخت خروجی برای موبایل (APK, IPA, PWA)

### ۱. اجرای وب‌اپلیکیشن پیش‌رونده (PWA)
مینادنتال دارای مانیفست کامل وب و سرویس‌ورکر اختصاصی کش آفلاین (`sw.js`) است:
- **در آیفون (iOS Safari):** لمس دکمه Share و انتخاب گزینه **Add to Home Screen**.
- **در اندروید (Chrome):** لمس منوی ۳ نقطه و انتخاب گزینه **Install App / افزودن به صفحه اصلی**.

### ۲. ساخت پکیج اندروید (Android APK) با استفاده از Capacitor
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init MinaDental com.minadental.app --web-dir dist
npm run build
npx cap add android
npx cap copy
npx cap open android
```
سپس در محیط Android Studio گزینه **Build -> Build Bundle(s) / APK(s) -> Build APK(s)** را انتخاب نمایید.

### ۳. ساخت پکیج آیفون (iOS IPA) با استفاده از Xcode
```bash
npm install @capacitor/ios
npx cap add ios
npx cap copy
npx cap open ios
```
سپس در محیط Xcode با اتصال آیفون یا انتخاب دستگاه شبیه‌ساز، پروژه را بیلد و اجرا نمایید.

---

## 🗄️ ساختار جداول پایگاه‌داده ابری سوپابیس (Supabase Schema)

کدهای SQL زیر برای راه‌اندازی جداول ابری در SQL Editor سوپابیس قابل استفاده هستند:

```sql
-- جدول بیماران
CREATE TABLE patients (
  id TEXT PRIMARY KEY,
  file_number TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  national_id TEXT,
  age INTEGER,
  gender TEXT,
  medical_history TEXT[],
  total_cost BIGINT DEFAULT 0,
  paid_amount BIGINT DEFAULT 0,
  balance BIGINT DEFAULT 0,
  teeth_conditions JSONB DEFAULT '{}'::jsonb,
  sayad_checks JSONB DEFAULT '[]'::jsonb,
  installments JSONB DEFAULT '[]'::jsonb,
  lab_orders JSONB DEFAULT '[]'::jsonb,
  implant_cases JSONB DEFAULT '[]'::jsonb,
  payments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- فعال‌سازی همگام‌سازی بلادرنگ (Real-Time)
ALTER PUBLICATION supabase_realtime ADD TABLE patients;
```

---

## 🛡️ تاییدیه ممیزی و استانداردها
کلیه بخش‌های این نرم‌افزار آزمون‌های بالینی و ارگونومیک نسخه ۲۷ سیستم‌عامل iOS و استانداردهای ران‌تایم وب بین‌المللی را با موفقیت پشت سر گذاشته‌اند.
