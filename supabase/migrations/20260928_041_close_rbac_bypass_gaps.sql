-- MOD-SEC-008 | Close the gaps a code review found in migration 040
--
-- 1. Every module table also carried an older `<table>_no_delete_*` /
--    `<table>_cfg_*` policy set targeting Postgres role `public` (= every
--    role, anon and authenticated alike), scoped only by clinic_id. RLS
--    permissive policies are OR'd, so those older policies granted full
--    SELECT/INSERT/UPDATE regardless of has_module_permission() — the new
--    RBAC policy from migration 040 could never actually deny anything.
--    Fix: drop those older policies; clinic_anon/clinic_authenticated_rbac
--    (migration 040) now carry sole responsibility for these tables. They
--    are redefined below as SELECT/INSERT/UPDATE only (never FOR ALL), so
--    DELETE stays impossible exactly as the old no_delete_* naming intended.
-- 2. role_permissions kept an old `role_permissions_clinic_isolation`
--    policy (ALL, authenticated, clinic-scoped only) that let any signed-in
--    staff member rewrite anyone's module grants — bypassing the
--    owner/manager-only write policies migration 040 added. Dropped.
-- 3. public.users had RLS disabled entirely (from migration 037) while
--    still granted to anon, and even its own authenticated policies never
--    restricted which columns a user could change on their own row — so
--    any signed-in staff member (or anon caller) could set their own
--    `role` to 'owner' directly. Fixed with: RLS re-enabled, a narrower
--    anon/authenticated policy set, and a trigger that hard-blocks any
--    change to `role` unless the actor already has the owner role (service
--    connections, e.g. the invite-staff edge function's service_role
--    session, are exempt so legitimate admin provisioning still works).
-- 4. The role_permissions seed in migration 040 assumed a unique
--    constraint on (clinic_id, role_key, module_path) that may not exist
--    on a fresh deploy from the migration history alone. Recreated here
--    idempotently before anything relies on it.

-- ── 1. Recreate the seed's conflict target idempotently ───────────────────
DO $idx$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='role_permissions') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS role_permissions_clinic_role_module_uidx
      ON role_permissions (clinic_id, role_key, module_path);
  END IF;
END $idx$;

-- ── 2. Drop every leftover public-role / unrestricted-authenticated policy
--    on the RBAC-mapped tables, then redefine clinic_anon/clinic_authenticated_rbac
--    as SELECT/INSERT/UPDATE only (no DELETE, matching the prior no-hard-delete intent).
DO $fix$
DECLARE
  mapping TEXT[][] := ARRAY[
    ARRAY['patients','/patients'],
    ARRAY['patient_timeline','/patients'],
    ARRAY['patient_policies','/patients'],
    ARRAY['appointments','/appointments'],
    ARRAY['encounters','/treatments'],
    ARRAY['treatments','/treatments'],
    ARRAY['treatment_phases','/treatments'],
    ARRAY['treatment_packages','/treatments'],
    ARRAY['tooth_records','/treatments'],
    ARRAY['consent_forms','/treatments'],
    ARRAY['payments','/billing'],
    ARRAY['payment_plans','/billing'],
    ARRAY['installments','/billing'],
    ARRAY['cheques','/billing'],
    ARRAY['expenses','/billing'],
    ARRAY['cash_register_sessions','/billing'],
    ARRAY['laboratories','/laboratory'],
    ARRAY['lab_orders','/laboratory'],
    ARRAY['implant_cases','/implants'],
    ARRAY['implant_components','/implants'],
    ARRAY['insurance_companies','/insurance'],
    ARRAY['insurance_claims','/insurance'],
    ARRAY['prescriptions','/prescriptions'],
    ARRAY['radiology_images','/radiology'],
    ARRAY['waiting_list','/waiting-list'],
    ARRAY['staff','/staff'],
    ARRAY['inventory_items','/inventory'],
    ARRAY['inventory_categories','/inventory'],
    ARRAY['sms_templates','/sms'],
    ARRAY['personal_finance_items','/personal-finance'],
    ARRAY['manual_reminders','/reminders']
  ];
  row_ TEXT[];
  tbl TEXT;
  module_path TEXT;
  pol RECORD;
BEGIN
  FOREACH row_ SLICE 1 IN ARRAY mapping LOOP
    tbl := row_[1];
    module_path := row_[2];
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=tbl) THEN
      CONTINUE;
    END IF;

    -- Drop every policy on this table except the two we're about to (re)create,
    -- so no stray public/authenticated grant can OR its way around RBAC.
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl
        AND policyname NOT IN ('clinic_anon', 'clinic_authenticated_rbac')
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl);
    END LOOP;

    EXECUTE format('DROP POLICY IF EXISTS clinic_anon ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS clinic_authenticated_rbac ON %I', tbl);

    EXECUTE format(
      $pol$
        CREATE POLICY clinic_anon ON %I
          FOR SELECT
          TO anon
          USING (clinic_id = app_clinic_id())
      $pol$, tbl
    );
    EXECUTE format(
      $pol$
        CREATE POLICY clinic_anon_write ON %I
          FOR INSERT
          TO anon
          WITH CHECK (clinic_id = app_clinic_id())
      $pol$, tbl
    );
    EXECUTE format(
      $pol$
        CREATE POLICY clinic_anon_update ON %I
          FOR UPDATE
          TO anon
          USING      (clinic_id = app_clinic_id())
          WITH CHECK (clinic_id = app_clinic_id())
      $pol$, tbl
    );

    EXECUTE format(
      $pol$
        CREATE POLICY clinic_authenticated_rbac ON %I
          FOR SELECT
          TO authenticated
          USING (clinic_id = app_clinic_id() AND has_module_permission(%L))
      $pol$, tbl, module_path
    );
    EXECUTE format(
      $pol$
        CREATE POLICY clinic_authenticated_rbac_write ON %I
          FOR INSERT
          TO authenticated
          WITH CHECK (clinic_id = app_clinic_id() AND has_module_permission(%L))
      $pol$, tbl, module_path
    );
    EXECUTE format(
      $pol$
        CREATE POLICY clinic_authenticated_rbac_update ON %I
          FOR UPDATE
          TO authenticated
          USING      (clinic_id = app_clinic_id() AND has_module_permission(%L))
          WITH CHECK (clinic_id = app_clinic_id() AND has_module_permission(%L))
      $pol$, tbl, module_path, module_path
    );
  END LOOP;
END
$fix$;

-- ── 3. role_permissions / custom_roles: drop the old blanket-authenticated
--    policy that bypassed the owner/manager write restriction from migration 040.
DO $rbac_cleanup$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='role_permissions') THEN
    EXECUTE 'DROP POLICY IF EXISTS role_permissions_clinic_isolation ON role_permissions';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='custom_roles') THEN
    EXECUTE 'DROP POLICY IF EXISTS custom_roles_cfg_insert ON custom_roles';
    EXECUTE 'DROP POLICY IF EXISTS custom_roles_cfg_select ON custom_roles';
    EXECUTE 'DROP POLICY IF EXISTS custom_roles_cfg_update ON custom_roles';
  END IF;
END
$rbac_cleanup$;

-- ── 4. Lock down public.users: re-enable RLS, narrow policies, and block
--    self-service role escalation with a trigger (belt-and-braces — this
--    holds even if a future policy change accidentally reopens role writes).
DO $users_fix$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users') THEN
    RETURN;
  END IF;

  ALTER TABLE users ENABLE ROW LEVEL SECURITY;

  EXECUTE 'DROP POLICY IF EXISTS users_clinic_isolation ON users';
  EXECUTE 'DROP POLICY IF EXISTS users_select_own ON users';
  EXECUTE 'DROP POLICY IF EXISTS users_select_same_clinic ON users';
  EXECUTE 'DROP POLICY IF EXISTS users_update_own ON users';
  EXECUTE 'DROP POLICY IF EXISTS clinic_anon ON users';
  EXECUTE 'DROP POLICY IF EXISTS clinic_authenticated_read ON users';
  EXECUTE 'DROP POLICY IF EXISTS clinic_authenticated_update_own ON users';

  -- Anon (offline/no-login devices): read-only roster within the clinic.
  -- Writing a user record from an unauthenticated session is never legitimate —
  -- real provisioning goes through the invite-staff edge function (service_role).
  EXECUTE $sql$
    CREATE POLICY clinic_anon ON users
      FOR SELECT TO anon
      USING (clinic_id = app_clinic_id())
  $sql$;

  -- Authenticated: read the clinic roster, update only your own row (role
  -- changes on that row are still blocked below by the trigger).
  EXECUTE $sql$
    CREATE POLICY clinic_authenticated_read ON users
      FOR SELECT TO authenticated
      USING (clinic_id = app_clinic_id())
  $sql$;
  EXECUTE $sql$
    CREATE POLICY clinic_authenticated_update_own ON users
      FOR UPDATE TO authenticated
      USING      (id = auth.uid() AND clinic_id = app_clinic_id())
      WITH CHECK (id = auth.uid() AND clinic_id = app_clinic_id())
  $sql$;
END
$users_fix$;

-- Deliberately NOT SECURITY DEFINER: a security-definer function's
-- current_user is the function owner for its whole execution, which would
-- make any current_user-based exemption check here always true and
-- defeat itself. auth.role() instead reads the actual JWT context of the
-- calling session, which is unaffected by SECURITY DEFINER.
CREATE OR REPLACE FUNCTION prevent_unauthorized_role_change() RETURNS TRIGGER
  LANGUAGE plpgsql SET search_path = public AS
$$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Server-side/admin connections (edge functions using the service_role
    -- key, direct postgres sessions such as migrations, or any other
    -- connection with no Supabase JWT context at all) provision roles
    -- directly and are exempt; every other caller must already be the
    -- clinic owner.
    IF auth.role() IS DISTINCT FROM 'authenticated' AND auth.role() IS DISTINCT FROM 'anon' THEN
      RETURN NEW;
    END IF;
    IF current_staff_role() IS DISTINCT FROM 'owner' THEN
      RAISE EXCEPTION 'Only the clinic owner can change a staff member''s role';
    END IF;
  END IF;
  RETURN NEW;
END
$$;

DO $trig$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users') THEN
    DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON users;
    CREATE TRIGGER trg_prevent_role_escalation
      BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION prevent_unauthorized_role_change();
  END IF;
END $trig$;

-- ── Verify: no permissive `public`-role policy should remain on any mapped table ──
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public' AND roles = '{public}'
ORDER BY tablename;
