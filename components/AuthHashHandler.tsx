'use client'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { supabase } from '../lib/supabaseClient'

// Security cookie to mark password reset sessions
const PASSWORD_RESET_KEY = 'resortify_password_reset_pending'

// Helper to set cookie
function setCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=${value}; max-age=${maxAgeSeconds}; path=/; SameSite=Lax`
}

export default function AuthHashHandler(){
  const router = useRouter()
  const pathname = usePathname()

  // Handle query-based auth flows (PKCE/code) that may land on ANY route.
  // Key security rule: if this is a recovery flow, force reset-password and set the pending cookie ASAP.
  useEffect(() => {
    if (typeof window === 'undefined') return

    const url = new URL(window.location.href)
    const type = url.searchParams.get('type') || url.searchParams.get('token_type')
    const error = url.searchParams.get('error')
    const errorCode = url.searchParams.get('error_code')

    // Handle expired or invalid link
    if (errorCode === 'otp_expired' || error === 'access_denied') {
      toast.error('Your link is invalid or expired. Request a new one.')
      router.replace('/auth/forgot-password')
      return
    }

    if (type === 'recovery') {
      setCookie(PASSWORD_RESET_KEY, 'true', 60 * 15)

      // If the recovery link landed on a non-reset route (e.g. /dashboard), force reset-password.
      // Preserve query/hash so the session exchange can still happen.
      if (!pathname.startsWith('/auth/reset-password')) {
        url.pathname = '/auth/reset-password'
        url.searchParams.set('verified', 'true')
        router.replace(`${url.pathname}?${url.searchParams.toString()}${url.hash}`)
      }
    }
  }, [router, pathname])

  // Listen for PASSWORD_RECOVERY event from Supabase auth
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[AuthHashHandler] Auth event:', event)
      }
      
      // Supabase fires PASSWORD_RECOVERY specifically when a recovery link is clicked
      // This is the ONLY reliable way to detect password recovery flow
      if (event === 'PASSWORD_RECOVERY') {
        console.log('[AuthHashHandler] PASSWORD_RECOVERY event detected, forcing reset page')
        setCookie(PASSWORD_RESET_KEY, 'true', 60 * 15) // 15 minutes
        
        if (!pathname.startsWith('/auth/reset-password')) {
          router.replace('/auth/reset-password?verified=true')
        }
        return
      }
      
      // DO NOT check recovery_sent_at on INITIAL_SESSION or SIGNED_IN
      // This causes false positives during normal auth operations (role switching, page refresh, etc.)
      // The PASSWORD_RECOVERY event is the proper way to detect recovery flows
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, pathname])

  // Handle hash-based auth flows (legacy implicit grant)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash
    if (!hash) return

    const params = new URLSearchParams(hash.substring(1))
    const type = params.get('type') // signup | recovery
    const error = params.get('error')
    const errorCode = params.get('error_code')

    // Handle expired or invalid link
    if (errorCode === 'otp_expired' || error === 'access_denied') {
      toast.error('Your link is invalid or expired. Request a new one.')
      router.replace('/auth/forgot-password')
      return
    }

    // Ensure recovery flows land on the reset page even if template points to root
    if (type === 'recovery') {
      // Set the security cookie to prevent navigation away
      setCookie(PASSWORD_RESET_KEY, 'true', 60 * 15) // 15 minutes
      
      if (pathname !== '/auth/reset-password') {
        router.replace(`/auth/reset-password${hash}`)
        return
      }
    }

    // Ensure signup verification flows land on the verify page
    if (type === 'signup' && pathname !== '/auth/verify-email') {
      router.replace(`/auth/verify-email${hash}`)
      return
    }
  }, [router, pathname])

  return null
}
