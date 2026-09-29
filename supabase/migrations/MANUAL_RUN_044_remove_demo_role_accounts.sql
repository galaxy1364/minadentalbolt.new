-- ════════════════════════════════════════════════════════════════════════
-- MinaDent — MIGRATION 044 (remove demo role accounts)
-- اجرا در: https://supabase.com/dashboard/project/gkxkihdibkmpryopbkkz/sql/new
-- ════════════════════════════════════════════════════════════════════════

-- MOD-SEC-011 | Undo migration 20260928_043 — remove seeded demo accounts
--
-- Migration 043 seeded real Supabase Auth accounts (including a full
-- `owner` account) with a fixed, published password so the Login page's
-- "quick login" buttons could authenticate for real. That was rejected in
-- review: a real, permanently-valid, publicly-known `owner` credential
-- (and others) baked into the shipped client is itself a critical
-- access-control hole — anyone reading the app bundle gets a genuine,
-- server-verifiable privileged session against the live clinic, which is
-- worse than the local-only fake session it replaced. The one-tap
-- quick-login buttons that used these accounts have been removed from
-- src/pages/Login.tsx; this migration removes the accounts themselves so
-- the credential no longer exists anywhere.

DO $cleanup$
DECLARE
  demo_ids UUID[] := ARRAY[
    '11111111-1111-4111-8111-111111111101'::uuid,
    '11111111-1111-4111-8111-111111111102'::uuid,
    '11111111-1111-4111-8111-111111111103'::uuid,
    '11111111-1111-4111-8111-111111111104'::uuid
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    DELETE FROM public.users WHERE id = ANY(demo_ids);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    DELETE FROM auth.users WHERE id = ANY(demo_ids);
  END IF;
END
$cleanup$;
