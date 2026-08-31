-- MOD-DATA-001 | بازسازی تایم‌لاین بیمار از رکوردهای موجود
-- اعمال‌شده روی دیتابیس زنده در ۱۴۰۵/۰۶/۱۰
--
-- MOD-FEAT-019 wired the timeline into record creation, but only new
-- records leave a trace. Everything created before that shipped is still
-- invisible on the one screen meant to be the patient's history.
--
-- event_date comes from each record's own date, never now(), so the
-- rebuilt history reads in the order things actually happened rather
-- than collapsing onto the day of the backfill.
--
-- Idempotent: every insert is guarded by NOT EXISTS on reference_id.
-- Nothing is deleted.

insert into patient_timeline (id, clinic_id, patient_id, event_type, title, description, reference_id, event_date, created_at)
select gen_random_uuid(), a.clinic_id, a.patient_id, 'appointment_created', 'نوبت جدید',
       'نوبت ' || a.date::text || coalesce(' ساعت ' || a.start_time::text, ''),
       a.id, coalesce(a.created_at, a.date::timestamptz), now()
from appointments a
where a.patient_id is not null
  and not exists (select 1 from patient_timeline pt where pt.reference_id = a.id);

insert into patient_timeline (id, clinic_id, patient_id, event_type, title, description, reference_id, event_date, created_at)
select gen_random_uuid(), e.clinic_id, e.patient_id, 'encounter_created', 'ویزیت',
       coalesce('ویزیت باز شد — ' || e.chief_complaint, 'ویزیت باز شد'),
       e.id, coalesce(e.created_at, e.encounter_date::timestamptz), now()
from encounters e
where e.patient_id is not null
  and not exists (select 1 from patient_timeline pt where pt.reference_id = e.id);

insert into patient_timeline (id, clinic_id, patient_id, event_type, title, description, reference_id, event_date, created_at)
select gen_random_uuid(), t.clinic_id, t.patient_id, 'treatment_created', 'درمان ثبت شد',
       coalesce(t.procedure_name, 'رویه') || coalesce(' — دندان ' || t.tooth_number, ''),
       t.id, coalesce(t.created_at, now()), now()
from treatments t
where t.patient_id is not null
  and not exists (select 1 from patient_timeline pt where pt.reference_id = t.id);

insert into patient_timeline (id, clinic_id, patient_id, event_type, title, description, reference_id, event_date, created_at)
select gen_random_uuid(), o.clinic_id, o.patient_id, 'lab_order_created', 'سفارش لابراتوار',
       coalesce(o.work_type, 'سفارش') || coalesce(' — دندان ' || o.tooth_number, ''),
       o.id, coalesce(o.created_at, now()), now()
from lab_orders o
where o.patient_id is not null
  and not exists (select 1 from patient_timeline pt where pt.reference_id = o.id);

insert into patient_timeline (id, clinic_id, patient_id, event_type, title, description, reference_id, event_date, created_at)
select gen_random_uuid(), c.clinic_id, c.patient_id, 'implant_case_created', 'مورد ایمپلنت',
       'ایمپلنت' || coalesce(' دندان ' || c.tooth_number, '') || ' ثبت شد',
       c.id, coalesce(c.created_at, now()), now()
from implant_cases c
where c.patient_id is not null
  and not exists (select 1 from patient_timeline pt where pt.reference_id = c.id);
