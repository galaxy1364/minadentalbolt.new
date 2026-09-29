-- MOD-SEC-010 | Close the offline/demo-login gap that bypasses RBAC
--
-- Problem: signInOffline() in src/lib/auth.ts (used by the Login page's
-- "quick login" demo-role buttons and by the offline/no-login-network
-- fallback in signIn()) never authenticates with Supabase Auth. It only
-- fabricates a local session object and sets it in React state. Because
-- supabase-js's own auth client never receives a real session, every
-- subsequent request from that "logged in" tab goes out with just the
-- anon apikey — and per migration 20260918_038's documented single-clinic
-- tradeoff, anon has full clinic access regardless of role. A receptionist
-- clicking "quick login" today is blocked only by the UI (canAccess() in
-- permissions.ts), not by Postgres.
--
-- Fix: give each demo role a REAL Supabase Auth account (seeded here,
-- directly in auth.users, the same way self-hosted/CI seed scripts create
-- test users — bcrypt via pgcrypto's crypt(), which is exactly the hash
-- GoTrue itself uses to verify passwords). src/lib/auth.ts is changed
-- alongside this migration to call supabase.auth.signInWithPassword()
-- against these accounts for the quick-login buttons and the
-- network-error fallback, instead of fabricating a session. That produces
-- a real JWT, so the clinic_authenticated_rbac policies from migration
-- 20260928_040 (has_module_permission()) actually apply: a demo
-- receptionist session genuinely cannot read/write /billing-restricted
-- tables etc. Genuine device offline (no network at all, nothing can
-- reach Postgres regardless) is a separate, narrower fallback left as-is
-- in auth.ts — there is no way to present a Postgres-verifiable session
-- without a network to verify it over.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $seed$
DECLARE
  clinic UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
  -- Fixed, publicly-documented demo credentials — these accounts exist
  -- solely to exercise the RBAC policies for the in-app "quick login"
  -- buttons, so being non-secret is intentional, not an oversight.
  demo_password TEXT := 'MinadentDemo-2026!';
  accounts TEXT[][] := ARRAY[
    ARRAY['11111111-1111-4111-8111-111111111101', 'demo-owner@minadent.local', 'owner', 'مصطفی حسن‌وند (دمو)'],
    ARRAY['11111111-1111-4111-8111-111111111102', 'demo-doctor@minadent.local', 'doctor', 'پزشک کلینیک (دمو)'],
    ARRAY['11111111-1111-4111-8111-111111111103', 'demo-receptionist@minadent.local', 'receptionist', 'پذیرش و منشی (دمو)'],
    ARRAY['11111111-1111-4111-8111-111111111104', 'demo-assistant@minadent.local', 'assistant', 'دستیار دندانپزشک (دمو)']
  ];
  acc TEXT[];
  v_id UUID;
  v_email TEXT;
  v_role TEXT;
  v_name TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    RETURN;
  END IF;

  FOREACH acc SLICE 1 IN ARRAY accounts LOOP
    v_id := acc[1]::uuid;
    v_email := acc[2];
    v_role := acc[3];
    v_name := acc[4];

    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    )
    VALUES (
      v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      v_email, crypt(demo_password, gen_salt('bf')),
      NOW(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name', v_name),
      NOW(), NOW(), '', '', '', ''
    )
    ON CONFLICT (id) DO UPDATE SET
      encrypted_password = EXCLUDED.encrypted_password,
      email_confirmed_at = COALESCE(auth.users.email_confirmed_at, NOW());

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
      INSERT INTO public.users (id, clinic_id, full_name, role, is_active)
      VALUES (v_id, clinic, v_name, v_role, TRUE)
      ON CONFLICT (id) DO UPDATE SET
        clinic_id = EXCLUDED.clinic_id,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        is_active = TRUE;
    END IF;
  END LOOP;
END
$seed$;
