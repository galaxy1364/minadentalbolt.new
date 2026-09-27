-- MOD-FEAT-026 | سطوح دندان به صورت کد ترکیبی استاندارد
-- اعمال‌شده روی دیتابیس زنده در ۱۴۰۵/۰۶/۱۰، پیش از انتشار کد.
--
-- Two problems, one column shape.
--
-- 1. `lab_orders` had no surface at all, so an inlay sent to the lab
--    could not say which surfaces it covered — the single most important
--    fact about an inlay after the tooth itself.
--
-- 2. `treatments.tooth_surface` held ONE surface as a long English word
--    ('occlusal'). A restoration is routinely a COMBINATION — MOD is
--    mesio-occluso-distal and is among the commonest restorations there
--    is. A single-valued column cannot express it, so the clinic had no
--    way to record what was actually done.
--
-- The international convention writes the combination as letters in a
-- fixed order: M, O, D, B, L. Compact, readable straight out of the
-- database, and the same notation a dentist writes on paper.
--
-- Existing rows are converted in place, so the column holds one format
-- rather than two — which is how a parser ends up guessing.

alter table lab_orders add column if not exists tooth_surface text;

comment on column lab_orders.tooth_surface is 'کد ترکیبی سطوح به ترتیب M,O,D,B,L — مثل MOD';
comment on column treatments.tooth_surface is 'کد ترکیبی سطوح به ترتیب M,O,D,B,L — مثل MOD';

update treatments set tooth_surface = case tooth_surface
    when 'mesial'   then 'M'
    when 'occlusal' then 'O'
    when 'distal'   then 'D'
    when 'buccal'   then 'B'
    when 'lingual'  then 'L'
    else tooth_surface
  end
where tooth_surface in ('mesial', 'occlusal', 'distal', 'buccal', 'lingual');
