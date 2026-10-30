import { createClient } from '@supabase/supabase-js'

export const CLINIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

// These constants are kept as named exports so other files can reference
// them, but they now derive only from environment variables — no hardcoded
// secrets. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local
// (never committed to git) for local dev, and in your Vercel project
// environment variables for production.
export const DEFAULT_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''
export const DEFAULT_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

const supabaseUrl = DEFAULT_SUPABASE_URL
const supabaseAnonKey = DEFAULT_SUPABASE_ANON_KEY

export const hasSupabaseCredentials = Boolean(
  supabaseAnonKey &&
    !supabaseAnonKey.includes('missing-key') &&
    supabaseAnonKey !== 'placeholder' &&
    supabaseUrl,
)

if (!hasSupabaseCredentials) {
  console.warn('[minadent] Running in local offline mode without Supabase connection.')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'minadent-auth' },
  },
)
