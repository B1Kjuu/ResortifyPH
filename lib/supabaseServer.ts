import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export function getServerSupabaseOrNull(){
  if (!url || !serviceRoleKey) return null as any
  try {
    const client = createClient(url, serviceRoleKey)
    return client
  } catch {
    return null as any
  }
}
