-- 022_lab_order_physical_tracking.sql — shelf location, chase alarm and
-- completion flags for lab cases (MOD-FEAT-009).
--
-- The app tracked a lab case digitally but not physically. When a case
-- came back from the lab, nobody could say which shelf it sat on, so
-- staff opened boxes by hand. `alarm_date` is deliberately separate from
-- `deadline`: staff must ring the lab days ahead, not learn of the miss
-- on the day it was due.
--
-- Everything is nullable / defaulted so existing rows stay valid.

alter table public.lab_orders
  add column if not exists shelf             text,
  add column if not exists shelf_number      text,
  add column if not exists shelf_space       text,
  add column if not exists alarm_date        date,
  add column if not exists work_done         boolean not null default false,
  add column if not exists delivered         boolean not null default false,
  add column if not exists material_returned boolean not null default false;

-- A partial shelf address is worse than none: "shelf A" with no number
-- still means opening every box on A. Mirrors validateShelf() in
-- src/lib/labShelf.ts.
alter table public.lab_orders
  drop constraint if exists lab_orders_shelf_complete;
alter table public.lab_orders
  add constraint lab_orders_shelf_complete check (
    (shelf is null and shelf_number is null and shelf_space is null)
    or (shelf is not null and shelf_number is not null and shelf_space is not null)
  );

-- A case cannot reach the patient before the lab has finished it.
alter table public.lab_orders
  drop constraint if exists lab_orders_delivery_after_work;
alter table public.lab_orders
  add constraint lab_orders_delivery_after_work check (
    delivered = false or work_done = true
  );

-- Drives the "ready for delivery" dashboard widget. Partial, so it stays
-- small as delivered cases accumulate.
create index if not exists lab_orders_ready_idx
  on public.lab_orders (clinic_id, alarm_date)
  where delivered = false and status <> 'cancelled';

-- RLS already enabled on public.lab_orders with clinic-scoped policies;
-- new columns inherit it.
