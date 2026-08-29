-- 019_tooth_notes.sql — tooth-scoped clinical notes (MOD-FEAT-003)
--
-- A note is either general (tooth_fdi IS NULL) or pinned to one tooth.
-- Sketches and voice memos are held as data URLs in `attachment_data_url`
-- so a note captured while the clinic is offline is complete on its own
-- and needs no separate Storage round-trip before it can sync.

create table if not exists public.tooth_notes (
  id                  uuid primary key default gen_random_uuid(),
  clinic_id           uuid not null,
  patient_id          uuid not null references public.patients(id) on delete restrict,
  -- FDI as text (e.g. '16'); NULL means the note is not tooth-specific.
  tooth_fdi           text,
  kind                text not null check (kind in ('text','drawing','audio')),
  body                text,
  attachment_data_url text,
  duration_sec        integer check (duration_sec is null or (duration_sec > 0 and duration_sec <= 90)),
  color               text,
  author_name         text,
  -- Soft-delete only: a clinical note is a medical record.
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  sync_version        integer not null default 1,

  -- Mirrors validateDraft() in src/lib/toothNotes.ts. Enforcing it here
  -- too means a malformed row cannot arrive through the API and bypass
  -- the client-side check.
  constraint tooth_notes_body_or_attachment check (
    (kind = 'text'  and body is not null and length(btrim(body)) > 0)
    or (kind in ('drawing','audio') and attachment_data_url is not null)
  ),
  constraint tooth_notes_audio_duration check (
    kind <> 'audio' or duration_sec is not null
  )
);

create index if not exists tooth_notes_patient_idx on public.tooth_notes (patient_id, created_at desc);
create index if not exists tooth_notes_tooth_idx   on public.tooth_notes (patient_id, tooth_fdi) where tooth_fdi is not null;
create index if not exists tooth_notes_clinic_idx  on public.tooth_notes (clinic_id);

alter table public.tooth_notes enable row level security;

-- Clinic-scoped, never USING (true).
drop policy if exists tooth_notes_select on public.tooth_notes;
create policy tooth_notes_select on public.tooth_notes
  for select using (clinic_id = current_clinic_id());

drop policy if exists tooth_notes_insert on public.tooth_notes;
create policy tooth_notes_insert on public.tooth_notes
  for insert with check (clinic_id = current_clinic_id());

drop policy if exists tooth_notes_update on public.tooth_notes;
create policy tooth_notes_update on public.tooth_notes
  for update using (clinic_id = current_clinic_id())
              with check (clinic_id = current_clinic_id());

-- Deliberately no DELETE policy: archiving flips is_active instead.
