-- MOD-SEC-007 | Real server-side RBAC enforcement + non-zero default permissions
--
-- Problem: role_permissions/canAccess() in src/lib/permissions.ts only ever
-- ran in the browser. Hiding a nav item never stopped a logged-in staff
-- member (or anyone replaying their session's requests) from calling
-- Supabase directly for a module their role has no business touching.
-- Also: brand-new custom roles (and, in the matrix's read model, any role
-- with no role_permissions rows yet) showed 0 modules — there was no
-- seeded default matching the hardcoded ROLE_ACCESS fallback in permissions.ts.
--
-- Fix, in order:
--   1. Seed role_permissions with the same defaults permissions.ts already
--      falls back to, so built-in roles start non-zero instead of empty.
--   2. Add has_module_permission(module): a SQL function Postgres evaluates
--      per-row, independent of anything the client sends.
--   3. Split each table's single anon+authenticated policy into two: the
--      anon policy (offline/no-login devices) is unchanged; the
--      authenticated policy (real Supabase Auth session, the normal login
--      path) additionally requires has_module_permission() for that table's
--      module. A logged-in receptionist's JWT simply cannot read/write
--      /billing rows they have not been granted, no matter what the client
--      sends — enforced in Postgres, not in React.
--
-- Anon is intentionally left as-is: it is the documented offline/no-login
-- fallback (see migration 038), a separate, pre-existing tradeoff outside
-- this task's scope. This migration's guarantee is specifically about a
-- signed-in staff member's role.

-- ── 1. Seed default (non-zero) module grants for every built-in role ──────
-- Mirrors ROLE_ACCESS in src/lib/permissions.ts. If a role already has any
-- rows (e.g. an admin already customized it via the RBAC screen), those
-- rows are left untouched — this only fills in what's missing.

DO $seed$
DECLARE
  clinic UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
  v_role_key TEXT;
  v_module_path TEXT;
  pair TEXT;
  defaults TEXT[] := ARRAY[
    -- owner: every module
    'owner:/','owner:/patients','owner:/appointments','owner:/treatments','owner:/billing',
    'owner:/laboratory','owner:/implants','owner:/insurance','owner:/inventory',
    'owner:/prescriptions','owner:/radiology','owner:/staff','owner:/reports',
    'owner:/waiting-list','owner:/settings','owner:/archive','owner:/calendar',
    'owner:/personal-finance','owner:/sms','owner:/reminders','owner:/roadmap',
    -- manager: everything except personal-finance
    'manager:/','manager:/patients','manager:/appointments','manager:/treatments','manager:/billing',
    'manager:/laboratory','manager:/implants','manager:/insurance','manager:/inventory',
    'manager:/prescriptions','manager:/radiology','manager:/staff','manager:/reports',
    'manager:/waiting-list','manager:/settings','manager:/archive','manager:/calendar',
    'manager:/sms','manager:/reminders','manager:/roadmap',
    -- doctor
    'doctor:/','doctor:/patients','doctor:/appointments','doctor:/treatments','doctor:/prescriptions',
    'doctor:/radiology','doctor:/implants','doctor:/laboratory','doctor:/waiting-list',
    'doctor:/reports','doctor:/settings','doctor:/calendar','doctor:/roadmap',
    -- receptionist
    'receptionist:/','receptionist:/patients','receptionist:/appointments','receptionist:/billing',
    'receptionist:/waiting-list','receptionist:/insurance','receptionist:/archive',
    'receptionist:/settings','receptionist:/calendar','receptionist:/sms',
    'receptionist:/reminders','receptionist:/roadmap',
    -- assistant
    'assistant:/','assistant:/patients','assistant:/appointments','assistant:/treatments',
    'assistant:/waiting-list','assistant:/settings','assistant:/calendar','assistant:/roadmap',
    -- hygienist
    'hygienist:/','hygienist:/patients','hygienist:/appointments','hygienist:/treatments',
    'hygienist:/waiting-list','hygienist:/settings','hygienist:/calendar','hygienist:/roadmap',
    -- lab_technician
    'lab_technician:/','lab_technician:/laboratory','lab_technician:/implants',
    'lab_technician:/settings','lab_technician:/calendar',
    -- accountant
    'accountant:/','accountant:/billing','accountant:/insurance','accountant:/reports',
    'accountant:/archive','accountant:/settings','accountant:/personal-finance','accountant:/reminders',
    -- cleaner / security / other: dashboard only
    'cleaner:/','security:/','other:/'
  ];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'role_permissions'
  ) THEN
    RETURN;
  END IF;

  FOREACH pair IN ARRAY defaults LOOP
    v_role_key := split_part(pair, ':', 1);
    v_module_path := split_part(pair, ':', 2);
    -- id is a uuid with a gen_random_uuid() default; the real natural key is
    -- the (clinic_id, role_key, module_path) unique constraint, so conflict
    -- on that instead. DO NOTHING preserves any row an admin already set
    -- (including a deliberate false), only filling in what's missing.
    INSERT INTO role_permissions (clinic_id, role_key, module_path, allowed, created_at, updated_at)
    VALUES (clinic, v_role_key, v_module_path, TRUE, NOW(), NOW())
    ON CONFLICT (clinic_id, role_key, module_path) DO NOTHING;
  END LOOP;
END
$seed$;

-- ── 2. Role + permission lookup functions ─────────────────────────────────
-- SECURITY DEFINER so they can read `users`/`role_permissions` regardless of
-- the caller's own row-level access, but they only ever return a boolean/role
-- derived from the caller's own auth.uid() — never let the caller pick.

CREATE OR REPLACE FUNCTION current_staff_role() RETURNS TEXT
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$
  SELECT role FROM users WHERE id = auth.uid() AND is_active IS NOT FALSE LIMIT 1
$$;

CREATE OR REPLACE FUNCTION has_module_permission(p_module TEXT) RETURNS BOOLEAN
  LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS
$$
DECLARE
  v_role TEXT;
BEGIN
  v_role := current_staff_role();
  IF v_role IS NULL THEN
    RETURN FALSE; -- signed in, but no matching staff/users row: no module access
  END IF;
  IF v_role = 'owner' THEN
    RETURN TRUE; -- owner is never restrictable (mirrors permissions.ts + the UI's settings lock)
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM role_permissions
    WHERE clinic_id = app_clinic_id()
      AND role_key = v_role
      AND module_path = p_module
      AND allowed = TRUE
  );
END
$$;

-- ── 3. Split clinic_all into an anon policy (unchanged) and an ──────────────
--    authenticated policy that also requires has_module_permission().

DO $policies$
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
BEGIN
  FOREACH row_ SLICE 1 IN ARRAY mapping LOOP
    tbl := row_[1];
    module_path := row_[2];
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      CONTINUE;
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS clinic_all ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS clinic_anon ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS clinic_authenticated_rbac ON %I', tbl);

    -- Offline/no-login devices: unchanged clinic-only scoping (see migration 038).
    EXECUTE format(
      $pol$
        CREATE POLICY clinic_anon ON %I
          FOR ALL
          TO anon
          USING      (clinic_id = app_clinic_id())
          WITH CHECK (clinic_id = app_clinic_id())
      $pol$, tbl
    );

    -- Real logged-in staff: clinic scope AND their role must actually be
    -- granted this module. This is the enforcement the RBAC screen promises.
    EXECUTE format(
      $pol$
        CREATE POLICY clinic_authenticated_rbac ON %I
          FOR ALL
          TO authenticated
          USING      (clinic_id = app_clinic_id() AND has_module_permission(%L))
          WITH CHECK (clinic_id = app_clinic_id() AND has_module_permission(%L))
      $pol$, tbl, module_path, module_path
    );
  END LOOP;
END
$policies$;

-- role_permissions/custom_roles themselves: only owner/manager may write,
-- everyone authenticated may read (needed so canAccess()'s override map can
-- load client-side, and so the RBAC screen can render for anyone who lands
-- on /settings before the client-side gate runs).
DO $rbac_tables$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='role_permissions') THEN
    EXECUTE 'DROP POLICY IF EXISTS clinic_all ON role_permissions';
    EXECUTE 'DROP POLICY IF EXISTS clinic_anon ON role_permissions';
    EXECUTE 'DROP POLICY IF EXISTS clinic_authenticated_read ON role_permissions';
    EXECUTE 'DROP POLICY IF EXISTS clinic_authenticated_write ON role_permissions';
    EXECUTE 'DROP POLICY IF EXISTS clinic_authenticated_update ON role_permissions';
    EXECUTE 'DROP POLICY IF EXISTS clinic_authenticated_delete ON role_permissions';
    EXECUTE $sql$
      CREATE POLICY clinic_anon ON role_permissions
        FOR ALL TO anon
        USING (clinic_id = app_clinic_id())
        WITH CHECK (clinic_id = app_clinic_id())
    $sql$;
    EXECUTE $sql$
      CREATE POLICY clinic_authenticated_read ON role_permissions
        FOR SELECT TO authenticated
        USING (clinic_id = app_clinic_id())
    $sql$;
    EXECUTE $sql$
      CREATE POLICY clinic_authenticated_write ON role_permissions
        FOR INSERT TO authenticated
        WITH CHECK (clinic_id = app_clinic_id() AND current_staff_role() IN ('owner','manager'))
    $sql$;
    EXECUTE $sql$
      CREATE POLICY clinic_authenticated_update ON role_permissions
        FOR UPDATE TO authenticated
        USING (clinic_id = app_clinic_id() AND current_staff_role() IN ('owner','manager'))
        WITH CHECK (clinic_id = app_clinic_id() AND current_staff_role() IN ('owner','manager'))
    $sql$;
    EXECUTE $sql$
      CREATE POLICY clinic_authenticated_delete ON role_permissions
        FOR DELETE TO authenticated
        USING (clinic_id = app_clinic_id() AND current_staff_role() = 'owner')
    $sql$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='custom_roles') THEN
    EXECUTE 'DROP POLICY IF EXISTS clinic_all ON custom_roles';
    EXECUTE 'DROP POLICY IF EXISTS clinic_anon ON custom_roles';
    EXECUTE 'DROP POLICY IF EXISTS clinic_authenticated_read ON custom_roles';
    EXECUTE 'DROP POLICY IF EXISTS clinic_authenticated_write ON custom_roles';
    EXECUTE $sql$
      CREATE POLICY clinic_anon ON custom_roles
        FOR ALL TO anon
        USING (clinic_id = app_clinic_id())
        WITH CHECK (clinic_id = app_clinic_id())
    $sql$;
    EXECUTE $sql$
      CREATE POLICY clinic_authenticated_read ON custom_roles
        FOR SELECT TO authenticated
        USING (clinic_id = app_clinic_id())
    $sql$;
    EXECUTE $sql$
      CREATE POLICY clinic_authenticated_write ON custom_roles
        FOR ALL TO authenticated
        USING      (clinic_id = app_clinic_id() AND current_staff_role() IN ('owner','manager'))
        WITH CHECK (clinic_id = app_clinic_id() AND current_staff_role() IN ('owner','manager'))
    $sql$;
  END IF;
END
$rbac_tables$;

-- ── Verify: list authenticated-role policies now driven by has_module_permission ──
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public' AND policyname LIKE 'clinic_authenticated%'
ORDER BY tablename;
