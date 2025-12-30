import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl
  const code = searchParams.get('code')
  const type = searchParams.get('type') // recovery, signup, etc.
  const next = searchParams.get('next') || '/'

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Redirect based on type
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/reset-password?verified=true`)
      }
      if (type === 'signup' || type === 'email') {
        return NextResponse.redirect(`${origin}/auth/verify-email?verified=true`)
      }
      // Default redirect
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // If code exchange fails, redirect to error page
  return NextResponse.redirect(`${origin}/auth/signin?error=auth_callback_error`)
}
