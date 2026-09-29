-- MOD-DATA-004 | یکسان‌سازی کلید نقش «تکنسین لابراتوار»
--
-- role_permissions had two role keys for the same job: a legacy 'lab' key
-- (5 rows, pre-existing) and the app's canonical 'lab_technician' key (from
-- ROLES in src/lib/permissions.ts, seeded with defaults by migration
-- 20260928_040). Live staff.role for both current lab staff already uses
-- 'lab_technician' (confirmed against the database), so 'lab' has no staff
-- or users rows pointing at it — it is pure dead data that would only ever
-- matter if someone typo'd it back in. Drop it so the RBAC screen has one
-- row set per real role, matching what staff records actually use.
--
-- Separately, the `users` table's role CHECK constraint still only allowed
-- 'lab', not 'lab_technician' — so if a lab technician were ever given a
-- login (a `users` row), the canonical role name from ROLES/staff.role
-- would be rejected by the constraint, and only the dead 'lab' key would
-- pass. Fix the constraint so it accepts the key the rest of the app
-- actually uses.

DELETE FROM role_permissions WHERE role_key = 'lab';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE users ADD CONSTRAINT users_role_check
      CHECK (role IN ('owner', 'doctor', 'receptionist', 'assistant', 'lab_technician', 'accountant'));
  END IF;
END
$$;
