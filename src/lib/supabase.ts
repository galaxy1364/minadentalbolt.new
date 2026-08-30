import { createClient } from '@supabase/supabase-js'

export const CLINIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gkxkihdibkmpryopbkkz.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

/**
 * Whether this build actually has credentials to reach the server.
 *
 * This matters because createClient() throws "supabaseKey is required."
 * on an empty key. That throw happens at module load — before React
 * mounts — so it doesn't produce an error boundary or a message, it
 * produces a blank white page with no explanation.
 *
 * That is exactly what happened: .env was correctly removed from the
 * repository (a committed anon key is a real security problem), but
 * the deploy environment didn't have VITE_SUPABASE_ANON_KEY set, so
 * every build after that shipped with an empty key.
 *
 * An offline-first app has no business dying because the server is
 * unreachable — all local Dexie data still works. So instead of
 * throwing, we degrade: the app loads, works on local data, and says
 * plainly that it can't sync.
 */
export const hasSupabaseCredentials = supabaseAnonKey.length > 0

if (!hasSupabaseCredentials) {
  console.error(
    '[minadent] VITE_SUPABASE_ANON_KEY is not set. The app will run on ' +
    'local data only and cannot sync. Set it in the deployment environment.',
  )
}

// A syntactically valid placeholder keeps createClient from throwing at
// module load. Any request made with it fails at the network layer,
// which the sync loop already handles as "offline" — a path that is
// tested and safe, unlike a hard crash before first paint.
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey || 'missing-key-app-runs-offline',
  {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'minadent-auth' },
  },
)
