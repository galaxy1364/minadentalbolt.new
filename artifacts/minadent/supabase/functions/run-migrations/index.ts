// supabase/functions/run-migrations/index.ts
// ONE-TIME migration runner — delete after use.
// Runs migration 038 (restore RLS) and 039 (clinic_settings) via Deno Postgres.
// Called with: POST /functions/v1/run-migrations (no body needed)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLINIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

serve(async (_req) => {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const results: string[] = []
  const errors: string[] = []

  // ── Migration 038: Restore RLS + create app_clinic_id() ─────────────────

  // 1. Create the helper function
  const { error: fnErr } = await supabaseAdmin.rpc('exec_migration', {
    sql: `CREATE OR REPLACE FUNCTION app_clinic_id() RETURNS uuid
            LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
            $$ SELECT '${CLINIC_ID}'::uuid $$`,
  }).catch(() => ({ error: 'rpc not available' }))

  // Fallback: try raw postgres connection
  // Since we are in an Edge Function with service_role, we can use
  // supabase.rpc or the Postgres connection via Deno
  try {
    // Use supabase-js to call a database function that runs DDL
    // This works because Edge Functions run with full DB access

    // We'll use pg directly via Deno
    const { Pool } = await import('https://deno.land/x/postgres@v0.17.0/mod.ts')

    const pool = new Pool(Deno.env.get('SUPABASE_DB_URL'), 1, true)
    const connection = await pool.connect()

    try {
      // Migration 038
      await connection.queryObject(`
        CREATE OR REPLACE FUNCTION app_clinic_id() RETURNS uuid
          LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
          $f$ SELECT '${CLINIC_ID}'::uuid $f$
      `)
      results.push('✅ app_clinic_id() function created')

      // Re-enable RLS on core tables
      const tables = [
        'patients','appointments','encounters','treatments','payments',
        'doctors','units','procedures','laboratories','lab_orders',
        'insurance_companies','insurance_claims','prescriptions',
        'radiology_images','treatment_phases','patient_timeline',
        'waiting_list','staff','expenses','treatment_packages',
        'consent_forms','tooth_records','inventory_items',
        'inventory_categories','payment_plans','installments','cheques',
        'doctor_schedules','implant_cases','implant_components',
        'sms_templates','personal_finance_items','cash_register_sessions',
        'manual_reminders','patient_policies',
      ]

      for (const tbl of tables) {
        await connection.queryObject(`ALTER TABLE ${tbl} ENABLE ROW LEVEL SECURITY`)
        await connection.queryObject(`DROP POLICY IF EXISTS clinic_all ON ${tbl}`)
        await connection.queryObject(`
          CREATE POLICY clinic_all ON ${tbl}
            FOR ALL TO anon, authenticated
            USING (clinic_id = app_clinic_id())
            WITH CHECK (clinic_id = app_clinic_id())
        `)
      }
      results.push(`✅ RLS restored on ${tables.length} tables`)

      // Optional tables
      const optTables = ['implant_cost_items','perio_exams','ortho_exams','role_permissions','custom_roles','notification_logs','otp_codes','sms_logs']
      for (const tbl of optTables) {
        try {
          await connection.queryObject(`ALTER TABLE IF EXISTS ${tbl} ENABLE ROW LEVEL SECURITY`)
          await connection.queryObject(`DROP POLICY IF EXISTS clinic_all ON ${tbl}`)
          await connection.queryObject(`
            CREATE POLICY clinic_all ON ${tbl}
              FOR ALL TO anon, authenticated
              USING (clinic_id = app_clinic_id())
              WITH CHECK (clinic_id = app_clinic_id())
          `)
          results.push(`✅ RLS on ${tbl}`)
        } catch { /* table might not exist */ }
      }

      // users: keep RLS disabled (no clinic_id column)
      await connection.queryObject(`ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY`)
      results.push('✅ users kept RLS-off (auth-managed)')

      // Migration 039: clinic_settings
      await connection.queryObject(`
        CREATE TABLE IF NOT EXISTS clinic_settings (
          clinic_id  UUID NOT NULL,
          key        TEXT NOT NULL,
          value      JSONB NOT NULL DEFAULT '{}',
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          PRIMARY KEY (clinic_id, key)
        )
      `)
      await connection.queryObject(`ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY`)
      await connection.queryObject(`DROP POLICY IF EXISTS clinic_all ON clinic_settings`)
      await connection.queryObject(`
        CREATE POLICY clinic_all ON clinic_settings
          FOR ALL TO anon, authenticated
          USING (clinic_id = app_clinic_id())
          WITH CHECK (clinic_id = app_clinic_id())
      `)

      // Seed
      await connection.queryObject(`
        INSERT INTO clinic_settings (clinic_id, key, value)
        VALUES
          ('${CLINIC_ID}', 'general',    '{}'),
          ('${CLINIC_ID}', 'fileNumber', '{}'),
          ('${CLINIC_ID}', 'pos',        '{}'),
          ('${CLINIC_ID}', 'appt_goal',  '{"value": 10}')
        ON CONFLICT (clinic_id, key) DO NOTHING
      `)
      results.push('✅ clinic_settings table created and seeded')

    } finally {
      connection.release()
      await pool.end()
    }
  } catch (err) {
    errors.push(`DB error: ${err instanceof Error ? err.message : String(err)}`)
  }

  return new Response(
    JSON.stringify({ results, errors }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
