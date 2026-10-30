/*
# Seed Dental Procedures

Populates the `procedures` table with the full catalog of common dental
treatments: diagnostic, preventive, restorative, endodontics, prosthetics,
surgery, cosmetic, implant, periodontics, pediatric, orthodontics, and other.

Each row has a short code, a Persian name, a category, and a default price
in Tomans. Uses gen_random_uuid() for IDs.

Idempotent: ON CONFLICT (clinic_id, code) DO NOTHING.
*/

INSERT INTO procedures (id, clinic_id, code, name, category, default_price, description, is_active)
VALUES
  -- Diagnostic
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'D001', 'معاینه و تشخیص', 'diagnostic', 50000, 'معاینه اولیه و تشخیص', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'D002', 'رادیوگرافی پری‌اپیکال', 'diagnostic', 80000, 'عکس رادیولوژی تک دندانی', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'D003', 'رادیوگرافی پانورامیک', 'diagnostic', 350000, 'عکس پانورامیک فک', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'D004', 'رادیوگرافی بایت‌وینگ', 'diagnostic', 100000, 'عکس بایت‌وینگ', true),

  -- Preventive
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'P001', 'جرم‌گیری و پولیش', 'preventive', 600000, 'حذف جرم و پولیش', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'P002', 'فلورایدتراپی', 'preventive', 250000, 'اپلیکیشن فلوراید موضعی', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'P003', 'سیلنت فیشور', 'preventive', 300000, 'پوشش شیار دندان', true),

  -- Restorative (ترمیمی)
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'R001', 'ترمیم آمالگام', 'restorative', 500000, 'پر کردن دندان با آمالگام', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'R002', 'ترمیم کامپوزیت (اکلوزال)', 'restorative', 700000, 'ترمیم کامپوزیت سطح جونده', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'R003', 'ترمیم کامپوزیت (پروگزیمال)', 'restorative', 900000, 'ترمیم کامپوزیت بین دندانی', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'R004', 'ترمیم کامپوزیت آنتریمور', 'restorative', 1200000, 'ترمیم کامپوزیت دندان‌های جلو', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'R005', 'ترمیم اینله', 'restorative', 1500000, 'ترمیم اینله سرامیکی یا فلزی', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'R006', 'ترمیم آنله', 'restorative', 1800000, 'ترمیم آنله', true),

  -- Endodontics (عصب‌کشی)
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'E001', 'عصب‌کشی تک کاناله', 'endodontics', 1200000, 'درمان ریشه تک کاناله', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'E002', 'عصب‌کشی دو کاناله', 'endodontics', 1800000, 'درمان ریشه دو کاناله', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'E003', 'عصب‌کشی سه کاناله', 'endodontics', 2500000, 'درمان ریشه سه کاناله', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'E004', 'عصب‌کشی چهار کاناله', 'endodontics', 3000000, 'درمان ریشه چهار کاناله', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'E005', 'درمان مجدد ریشه (رتیمنت)', 'endodontics', 3500000, 'درمان مجدد ریشه قبلی', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'E006', 'آپیکوکتومی', 'endodontics', 4000000, 'جراحی انتهای ریشه', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'E007', 'پالپوتومی', 'endodontics', 800000, 'حذف بخشی از پالپ', true),

  -- Prosthetics (پروتز - روکش، دست دندان، پست)
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'PR01', 'روکش تمام سرامیک (زیرکونیا)', 'prosthetics', 4500000, 'روکش سرامیکی زیرکونیا', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'PR02', 'روکش PFM (فلز-سرامیک)', 'prosthetics', 3000000, 'روکش فلز-سرامیک', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'PR03', 'روکش تمام فلزی', 'prosthetics', 2000000, 'روکش فلزی کامل', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'PR04', 'پست و کور ریخته‌گری', 'prosthetics', 1500000, 'پست و کور فلزی', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'PR05', 'پست فایبر و کور کامپوزیت', 'prosthetics', 1800000, 'پست فایبر با کور کامپوزیتی', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'PR06', 'دست دندان پارسیل (یک طرفه)', 'prosthetics', 5000000, 'پروتز پارسیل تک طرفه', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'PR07', 'دست دندان پارسیل (دو طرفه)', 'prosthetics', 7000000, 'پروتز پارسیل دو طرفه', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'PR08', 'دست دندان کامل (یک فک)', 'prosthetics', 12000000, 'پروتز کامل یک فک', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'PR09', 'دست دندان کامل (دو فک)', 'prosthetics', 22000000, 'پروتز کامل دو فک', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'PR10', 'بریج سه واحدی', 'prosthetics', 12000000, 'پروتز ثابت سه واحدی', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'PR11', 'بریج چهار واحدی', 'prosthetics', 16000000, 'پروتز ثابت چهار واحدی', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'PR12', 'بریج پنج واحدی', 'prosthetics', 20000000, 'پروتز ثابت پنج واحدی', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'PR13', 'اودنتور فوری', 'prosthetics', 8000000, 'پروتز فوری پس از کشیدن', true),

  -- Cosmetic (زیبایی - لمینیت، ونیر)
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'C001', 'لمینیت سرامیکی (هر واحد)', 'cosmetic', 6000000, 'ونیر سرامیکی نازک', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'C002', 'ونیر کامپوزیت (هر واحد)', 'cosmetic', 3500000, 'ونیر کامپوزیتی مستقیم', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'C003', 'بلیچینگ دندان (اکسپرت)', 'cosmetic', 2500000, 'سفید کردن دندان در مطب', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'C004', 'بلیچینگ خانگی', 'cosmetic', 1500000, 'سفید کردن دندان در خانه', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'C005', 'جواهر دندان', 'cosmetic', 500000, 'نصب جواهر روی دندان', true),

  -- Surgery (جراحی)
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'S001', 'کشیدن دندان ساده', 'surgery', 400000, 'اکسترکشن ساده', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'S002', 'کشیدن دندان جراحی', 'surgery', 1200000, 'اکسترکشن جراحی', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'S003', 'کشیدن دندان عقل نهفته', 'surgery', 2500000, 'جراحی دندان عقل نهفته', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'S004', 'کشیدن دندان شیری', 'surgery', 300000, 'اکسترکشن دندان شیری', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'S005', 'فرنکتومی', 'surgery', 800000, 'بریدن فرنوم لب یا زبان', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'S006', 'الیکتومی', 'surgery', 700000, 'حذف بافت اضافه لثه', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'S007', 'بیوپسی دهان', 'surgery', 1500000, 'برداشت نمونه بافتی', true),

  -- Implant (ایمپلنت)
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'I001', 'ایمپلنت دندان (فیکسچر)', 'implant', 18000000, 'کاشت ایمپلنت', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'I002', 'ایمپلنت با سینوس لفت', 'implant', 25000000, 'ایمپلنت با لیفت سینوس', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'I003', 'بون گرافت (پیوند استخوان)', 'implant', 8000000, 'پیوند استخوان', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'I004', 'اباتمنت + روکش ایمپلنت', 'implant', 9000000, 'اباتمنت و روکش ایمپلنت', true),

  -- Periodontics (لثه)
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'PE01', 'درمان لثه (کیوراژ عمیق)', 'periodontics', 1500000, 'جرم‌گیری عمیق و درمان لثه', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'PE02', 'فلپ جراحی لثه', 'periodontics', 4000000, 'جراحی فلپ لثه', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'PE03', 'گرافت لثه', 'periodontics', 5000000, 'پیوند لثه', true),

  -- Pediatric (اطفال)
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'K001', 'ترمیم دندان شیری (کامپوزیت)', 'pediatric', 400000, 'ترمیم کامپوزیت دندان شیری', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'K002', 'ترمیم دندان شیری (آمالگام)', 'pediatric', 300000, 'ترمیم آمالگام دندان شیری', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'K003', 'پالپوتومی دندان شیری', 'pediatric', 600000, 'درمان پالپ دندان شیری', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'K004', 'فضا نگهدارنده', 'pediatric', 1500000, 'نگهدارنده فضا دندان شیری', true),

  -- Orthodontics (ارتودنسی)
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'O001', 'ارتودنسی ثابت فلزی (یک فک)', 'orthodontics', 25000000, 'ارتودنسی فلزی یک فک', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'O002', 'ارتودنسی ثابت فلزی (دو فک)', 'orthodontics', 45000000, 'ارتودنسی فلزی دو فک', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'O003', 'ارتودنسی ثابت سرامیکی (دو فک)', 'orthodontics', 55000000, 'ارتودنسی سرامیکی دو فک', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'O004', 'ارتودنسی متحرک (پلاک)', 'orthodontics', 8000000, 'ارتودنسی متحرک', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'O005', 'ارتودنسی نامرئی (Invisalign)', 'orthodontics', 80000000, 'ارتودنسی با الاینر شفاف', true),

  -- Other
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'X001', 'محافظت دهان (Night Guard)', 'other', 2500000, 'محافظ دهان شبانه', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'X002', 'محافظت ورزشی (Sport Guard)', 'other', 2000000, 'محافظ دهان ورزشی', true),
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'X003', 'سایر خدمات دندانی', 'other', 0, 'متفرقه', true)

ON CONFLICT (clinic_id, code) DO NOTHING;
