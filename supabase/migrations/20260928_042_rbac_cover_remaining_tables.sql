-- MOD-SEC-009 | Cover the module tables the 040/041 policy audit missed
--
-- doctor_schedules and implant_cost_items still carried the same
-- public-role / unrestricted `clinic_all` policy pattern migrations 040/041
-- already fixed everywhere else, so an authenticated staff member without
-- /calendar or /implants permission could still read and write them
-- directly. (perio_exams / ortho_exams, also raised in review, are IndexedDB
-- -only tables in this app — see src/lib/api.ts — with no Supabase table or
-- policy to fix.)
--
-- Also recreates the role_permissions seed's unique index up front (it's
-- idempotent — CREATE UNIQUE INDEX IF NOT EXISTS — so this is a no-op here,
-- but keeps a from-scratch replay of the migration history self-contained
-- instead of depending on 041 running after 040's seed).
CREATE UNIQUE INDEX IF NOT EXISTS role_permissions_clinic_role_module_uidx
  ON role_permissions (clinic_id, role_key, module_path);

DO $fix$
DECLARE
  mapping TEXT[][] := ARRAY[
    ARRAY['doctor_schedules','/calendar'],
    ARRAY['implant_cost_items','/implants']
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

    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=tbl LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl);
    END LOOP;

    EXECUTE format($pol$ CREATE POLICY clinic_anon ON %I FOR SELECT TO anon USING (clinic_id = app_clinic_id()) $pol$, tbl);
    EXECUTE format($pol$ CREATE POLICY clinic_anon_write ON %I FOR INSERT TO anon WITH CHECK (clinic_id = app_clinic_id()) $pol$, tbl);
    EXECUTE format($pol$ CREATE POLICY clinic_anon_update ON %I FOR UPDATE TO anon USING (clinic_id = app_clinic_id()) WITH CHECK (clinic_id = app_clinic_id()) $pol$, tbl);

    EXECUTE format($pol$ CREATE POLICY clinic_authenticated_rbac ON %I FOR SELECT TO authenticated USING (clinic_id = app_clinic_id() AND has_module_permission(%L)) $pol$, tbl, module_path);
    EXECUTE format($pol$ CREATE POLICY clinic_authenticated_rbac_write ON %I FOR INSERT TO authenticated WITH CHECK (clinic_id = app_clinic_id() AND has_module_permission(%L)) $pol$, tbl, module_path);
    EXECUTE format($pol$ CREATE POLICY clinic_authenticated_rbac_update ON %I FOR UPDATE TO authenticated USING (clinic_id = app_clinic_id() AND has_module_permission(%L)) WITH CHECK (clinic_id = app_clinic_id() AND has_module_permission(%L)) $pol$, tbl, module_path, module_path);
  END LOOP;
END
$fix$;

SELECT tablename, policyname, roles, cmd FROM pg_policies
WHERE schemaname='public' AND tablename IN ('doctor_schedules','implant_cost_items')
ORDER BY tablename;
