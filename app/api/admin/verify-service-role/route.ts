import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: false, error: 'Disabled in production' }, { status: 404 })
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    return NextResponse.json({ ok: false, error: 'NEXT_PUBLIC_SUPABASE_URL is not set' }, { status: 500 })
  }
  if (!serviceKey) {
    return NextResponse.json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY is missing (server-only)' }, { status: 500 })
  }

  try {
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 })
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
    // Do not expose any secrets; only return minimal success info
    return NextResponse.json({ ok: true, usersChecked: data?.users?.length ?? 0 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 })
  }
}
