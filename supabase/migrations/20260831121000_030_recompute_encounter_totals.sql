-- MOD-DATA-002 | بازمحاسبه‌ی جمع ویزیت‌های قدیمی
-- اعمال‌شده روی دیتابیس زنده در ۱۴۰۵/۰۶/۱۰
--
-- MOD-FIX-008 made every code path recompute encounters.total_amount
-- from its treatments, but rows written before that shipped still carry
-- whatever number was last stored. The revenue report sums this column,
-- so a stale figure overstates clinic income — not cosmetic.
--
-- The filter matches calcEncounterTotal() and calcPatientBalance()
-- exactly: a cancelled treatment is not billable and must not count.
--
-- Deliberately does NOT touch paid_amount. Where a visit was paid and
-- its treatment later cancelled, the resulting overpayment is a real
-- financial situation for a human to resolve, not a number to quietly
-- adjust away.

update encounters e
set total_amount = coalesce((
      select sum(t.total_price) from treatments t
      where t.encounter_id = e.id and t.status <> 'cancelled'), 0),
    updated_at = now()
where coalesce(e.total_amount, 0) <> coalesce((
      select sum(t.total_price) from treatments t
      where t.encounter_id = e.id and t.status <> 'cancelled'), 0);
