import { createClient } from '@supabase/supabase-js'

let _supabase = null

export function getSupabase() {
  if (_supabase) return _supabase

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
  }

  _supabase = createClient(supabaseUrl, supabaseAnonKey)
  return _supabase
}
