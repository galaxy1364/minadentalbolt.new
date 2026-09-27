import { createClient } from '@supabase/supabase-js'

export const CLINIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

export const DEFAULT_SUPABASE_URL = 'https://gkxkihdibkmpryopbkkz.supabase.co'
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdreGtpaGRpYmttcHJ5b3Bia2t6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MDU2NTQsImV4cCI6MjEwMjQ4MTY1NH0.MWcT9IOmGrj25NRyZgCUmXBzcjvbCDgHbNTQPoKlAms'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY

export const hasSupabaseCredentials = Boolean(
  supabaseAnonKey && !supabaseAnonKey.includes('missing-key') && supabaseAnonKey !== 'placeholder',
)

if (!hasSupabaseCredentials) {
  console.warn('[minadent] Running in local offline mode without Supabase connection.')
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'minadent-auth' },
  },
)
