-- MOD-FIX-022 | دو مدل برای اقلام ایمپلنت — یکی می‌ماند
-- اعمال‌شده روی دیتابیس زنده در ۱۴۰۵/۰۶/۱۳.
--
-- v1.223 دو راه‌حل برای یک مسئله در یک کامیت داشت: ستون JSON `extras`
-- روی مورد، و جدول `implant_cost_items`. هر دو مال یک نویسنده در یک روز،
-- دو طرفِ یک بازنشانی حافظه، بی‌خبر از هم. مهدی دو ویرایشگر روی یک فرم
-- دید.
--
-- جدول می‌ماند: تعداد، نوع نگهداری، و پزشکِ دستمزد را دارد و به‌عنوان
-- جدول مستقل سینک و RLS می‌شود. اقلام JSON که هنوز ردیف نشده‌اند منتقل،
-- ستون خالی ('[]' چون NOT NULL است) و منسوخ اعلام می‌شود. حذفش تصمیم
-- جدا و برگشت‌پذیر است.

insert into implant_cost_items (clinic_id, implant_case_id, kind, label, unit_price)
select c.clinic_id, c.id, e->>'key', e->>'label', coalesce((e->>'cost')::numeric, 0)
from implant_cases c, jsonb_array_elements(c.extras) e
where jsonb_typeof(c.extras) = 'array'
  and not exists (select 1 from implant_cost_items i where i.implant_case_id = c.id and i.kind = e->>'key' and i.is_active);

update implant_cases set extras = '[]'::jsonb where extras::text <> '[]';
comment on column implant_cases.extras is 'منسوخ — MOD-FIX-022. اقلام در implant_cost_items هستند.';
