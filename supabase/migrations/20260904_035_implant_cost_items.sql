-- MOD-FEAT-040 | اقلام هزینه‌ی ایمپلنت
-- اعمال‌شده روی دیتابیس زنده در ۱۴۰۵/۰۶/۱۳، پیش از انتشار کد.
--
-- فهرست مهدی: کشیدن، پودر استخوان، ممبران، سینوس لیفت، جراحی لثه،
-- بازسازی استخوان، بارگذاری فوری، جراحی فک — هر کدام با قیمت خودش.
-- دستمزد جراح. پروتزکار: دستمزد، تعداد روکش، پونتیک، نوع (PFM، زیرکونیا،
-- IPS)، چسبی یا پیچ‌شونده. «و بقیه‌ی اپشن‌ها.»
--
-- شش بولی و دو ستون قیمت روی مورد نمی‌توانستند قیمت، «بقیه»، یا اینکه
-- دستمزد مال کیست را حمل کنند. یک ردیف برای هر چیز قیمت‌دار.
-- kind = واژگان برنامه؛ label = آنچه کلینیک نوشت، پس نوعی که برنامه
-- نمی‌شناسد ثبت می‌شود نه رد.

create table if not exists implant_cost_items (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null,
  implant_case_id uuid not null references implant_cases(id),
  kind text not null,
  label text not null,
  variant text,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric not null default 0 check (unit_price >= 0),
  doctor_id uuid references doctors(id),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_implant_cost_items_case on implant_cost_items(implant_case_id);
create index if not exists idx_implant_cost_items_clinic on implant_cost_items(clinic_id);

alter table implant_cost_items enable row level security;
create policy implant_cost_items_select on implant_cost_items for select using (clinic_id = current_clinic_id());
create policy implant_cost_items_insert on implant_cost_items for insert with check (clinic_id = current_clinic_id());
create policy implant_cost_items_update on implant_cost_items for update using (clinic_id = current_clinic_id());

-- دو بولیِ قیمت‌دار به ردیف تبدیل شدند تا اعداد مورد موجود حفظ شود؛
-- بولی‌های بی‌قیمت با صفر، تا واقعیت گم نشود و کلینیک قیمت را پر کند.
insert into implant_cost_items (clinic_id, implant_case_id, kind, label, unit_price)
select clinic_id, id, 'bone_graft', 'پیوند استخوان', coalesce(bone_graft_cost, 0) from implant_cases where bone_graft
union all select clinic_id, id, 'sinus_lift', 'سینوس لیفت', coalesce(sinus_lift_cost, 0) from implant_cases where sinus_lift
union all select clinic_id, id, 'membrane', 'ممبران', 0 from implant_cases where membrane_used
union all select clinic_id, id, 'gbr', 'بازسازی استخوان (GBR)', 0 from implant_cases where gbr
union all select clinic_id, id, 'extraction', 'کشیدن دندان', 0 from implant_cases where extraction_needed
union all select clinic_id, id, 'immediate_loading', 'بارگذاری فوری', 0 from implant_cases where immediate_loading;
