import { createClient } from '@supabase/supabase-js'

export const CLINIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gkxkihdibkmpryopbkkz.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'minadent-auth' },
})
