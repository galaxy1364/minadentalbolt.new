-- MOD-FEAT-020 | پرداخت بابت کدام درمان، کدام دندان، کدام پزشک
-- اعمال‌شده روی دیتابیس زنده در ۱۴۰۵/۰۶/۱۰، پیش از انتشار کد.
--
-- `payments` could say who paid, how much, and on what date — but never
-- what the money was for. No treatment_id, no doctor_id, no tooth. In a
-- clinic with two doctors and a patient with six teeth under treatment,
-- "which tooth did this 8 million settle, and whose work was it?" had no
-- answer. That second question decides the doctor's share of income.
--
-- treatment_id is the anchor rather than copying tooth/doctor onto the
-- payment: the treatment already carries both, and a copy would drift the
-- moment the treatment is edited — the same failure as MOD-FIX-008.
-- doctor_id is kept only for money that belongs to no single treatment.
--
-- ON DELETE is deliberately omitted; nothing in this schema deletes.

alter table payments
  add column if not exists treatment_id uuid references treatments(id),
  add column if not exists doctor_id uuid references doctors(id);

create index if not exists idx_payments_treatment on payments(treatment_id);
create index if not exists idx_payments_doctor on payments(doctor_id);

comment on column payments.treatment_id is 'درمانی که این پرداخت بابت آن است — دندان و پزشک از همین‌جا خوانده می‌شود';
comment on column payments.doctor_id is 'پزشک مرتبط، برای پرداخت‌هایی که به یک درمان مشخص وصل نیستند';
