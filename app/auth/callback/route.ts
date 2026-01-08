import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Security cookie to mark password reset sessions
const PASSWORD_RESET_COOKIE = 'resortify_password_reset_pending'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl
  const code = searchParams.get('code')
  const type = searchParams.get('type') // recovery, signup, etc.
  const next = searchParams.get('next') || '/'
  const error = searchParams.get('error')
  const errorCode = searchParams.get('error_code')
  const errorDescription = searchParams.get('error_description')
  
  // Also check for token_hash which Supabase uses for some flows
  const tokenHash = searchParams.get('token_hash')
  const tokenType = searchParams.get('type') || searchParams.get('token_type')

  // Handle error parameters from Supabase (expired/invalid links)
  if (error || errorCode) {
    if (type === 'recovery' || tokenType === 'recovery' || errorDescription?.includes('recovery')) {
      return NextResponse.redirect(`${origin}/auth/reset-password?error=expired`)
    }
    if (type === 'signup' || type === 'email' || errorDescription?.includes('signup')) {
      return NextResponse.redirect(`${origin}/auth/verify-email?error=expired`)
    }
    
    return NextResponse.redirect(`${origin}/auth/signin?error=auth_callback_error`)
  }

  if (code) {
    const cookieStore = cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              // Handle cookie errors in edge cases
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
              // Handle cookie errors in edge cases
            }
          },
        },
      }
    )

    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!exchangeError && data?.session) {
      // Check the session's aal (authentication assurance level) or user metadata to detect recovery
      const isRecovery = type === 'recovery' || tokenType === 'recovery' || data.session.user?.recovery_sent_at
      
      // Redirect based on type
      if (isRecovery || type === 'recovery') {
        // Set a security cookie to mark this as a password reset session
        const response = NextResponse.redirect(`${origin}/auth/reset-password?verified=true`)
        response.cookies.set(PASSWORD_RESET_COOKIE, 'true', {
          httpOnly: false, // Needs to be accessible from client-side
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 15, // 15 minutes max to complete reset
          path: '/',
        })
        return response
      }
      if (type === 'signup' || type === 'email') {
        return NextResponse.redirect(`${origin}/auth/verify-email?verified=true`)
      }
      // Default redirect
      return NextResponse.redirect(`${origin}${next}`)
    }
    
    // Handle exchange errors (expired token, invalid code, etc.)
    const errorMsg = exchangeError?.message?.toLowerCase() || ''
    if (errorMsg.includes('expired') || errorMsg.includes('invalid')) {
      if (type === 'recovery' || tokenType === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/reset-password?error=expired`)
      }
      if (type === 'signup' || type === 'email') {
        return NextResponse.redirect(`${origin}/auth/verify-email?error=expired`)
      }
    }
  }

  // If code exchange fails, redirect to error page
  return NextResponse.redirect(`${origin}/auth/signin?error=auth_callback_error`)
}
