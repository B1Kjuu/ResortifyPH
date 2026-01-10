'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { toast } from 'sonner'
import Link from 'next/link'

// Security: Mark session as being in password reset mode
const PASSWORD_RESET_KEY = 'resortify_password_reset_pending'

// Helper to set cookie
function setCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=${value}; max-age=${maxAgeSeconds}; path=/; SameSite=Lax`
}

// Helper to get cookie value
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null
  return null
}

// Helper to delete cookie
function deleteCookie(name: string) {
  if (typeof document === 'undefined') return
  // Clear with all possible path variations
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`
  document.cookie = `${name}=; max-age=0; path=/;`
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [validToken, setValidToken] = useState(false)
  const [checking, setChecking] = useState(true)
  const [showExpiredMessage, setShowExpiredMessage] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Security: Sign out if user tries to navigate away without resetting password
  const handleSecuritySignOut = useCallback(async () => {
    // Clear the pending flags (both sessionStorage and cookie)
    try {
      sessionStorage.removeItem(PASSWORD_RESET_KEY)
      deleteCookie(PASSWORD_RESET_KEY)
    } catch {}
    // Sign out the user to prevent unauthorized access (use local scope to avoid refresh token errors)
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch {
      // Ignore errors - session might already be invalid
    }
  }, [])

  // Security: Prevent navigation away from this page
  useEffect(() => {
    if (!validToken) return

    // Set flag indicating password reset is in progress (sessionStorage as backup)
    try {
      sessionStorage.setItem(PASSWORD_RESET_KEY, 'true')
    } catch {}

    // Handle browser back/forward navigation
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'You must complete the password reset before leaving. Your session will be signed out for security.'
      return e.returnValue
    }

    // Handle route changes within the app
    const handleRouteChange = () => {
      // Sign out if navigating away
      handleSecuritySignOut()
    }

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    // Override link clicks to prevent navigation
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a')
      if (link && !link.href.includes('/auth/reset-password') && !link.href.includes('/auth/forgot-password')) {
        e.preventDefault()
        e.stopPropagation()
        toast.error('Please complete your password reset first', {
          description: 'You must set a new password before accessing other pages.'
        })
      }
    }
    
    document.addEventListener('click', handleClick, true)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('click', handleClick, true)
    }
  }, [validToken, handleSecuritySignOut])

  useEffect(() => {
    async function checkAuth() {
      // Check for error parameter (expired link)
      const errorParam = searchParams.get('error')
      if (errorParam === 'expired') {
        setShowExpiredMessage(true)
        setValidToken(false)
        setChecking(false)
        return
      }
      
      // Check if coming from callback with verified=true (PKCE flow)
      const isVerified = searchParams.get('verified') === 'true'
      if (isVerified) {
        // If the link landed here with a code but no session yet, round-trip through our callback route
        // so the server can exchange the code and set the security cookie.
        const code = searchParams.get('code')

        // Double-check we have a session from the callback
        const { data: { session } } = await supabase.auth.getSession()
        if (!session && code) {
          router.replace(`/auth/callback?type=recovery&code=${encodeURIComponent(code)}`)
          return
        }

        if (session) {
          // Ensure the password reset cookie is set (in case server-side cookie didn't persist)
          if (!getCookie(PASSWORD_RESET_KEY)) {
            setCookie(PASSWORD_RESET_KEY, 'true', 60 * 15) // 15 minutes
          }
          setValidToken(true)
          setChecking(false)
          return
        }
      }

      // Legacy: Check if user came from password reset email with token in hash
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const type = hashParams.get('type')
      const errorCode = hashParams.get('error_code')
      const refreshToken = hashParams.get('refresh_token')

      // Handle expired link from hash
      if (errorCode === 'otp_expired') {
        setShowExpiredMessage(true)
        setValidToken(false)
        setChecking(false)
        return
      }

      if (accessToken && type === 'recovery') {
        // Set the session from the hash tokens
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        })
        if (!error) {
          setValidToken(true)
          // Clear the hash from URL for security
          window.history.replaceState({}, '', window.location.pathname)
        } else {
          toast.error('Invalid or expired reset link')
        }
        setChecking(false)
        return
      }

      // Also check if we already have a valid session (user might have refreshed)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        // Check if this is a legitimate password reset session (check both sessionStorage and cookie)
        try {
          const isPendingSession = sessionStorage.getItem(PASSWORD_RESET_KEY) === 'true'
          const isPendingCookie = getCookie(PASSWORD_RESET_KEY) === 'true'
          if (isPendingSession || isPendingCookie || isVerified) {
            setValidToken(true)
            setChecking(false)
            return
          }
        } catch {}
        
        // User has a session but it's not from password reset flow
        // They might have navigated here directly while logged in
        // Don't allow password change without proper reset flow
        setShowExpiredMessage(true)
        setValidToken(false)
        setChecking(false)
        return
      }

      // No valid token found
      if (!isVerified) {
        // Don't show error toast immediately, might still be loading
        setShowExpiredMessage(true)
      }
      setChecking(false)
    }

    checkAuth()
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validToken) {
      toast.error('Invalid reset link')
      return
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({
      password: password
    })
    setLoading(false)

    if (error) {
      toast.error(error.message)
      return
    }

    // Clear the pending flags since password was successfully reset (both sessionStorage and cookie)
    try {
      sessionStorage.removeItem(PASSWORD_RESET_KEY)
      deleteCookie(PASSWORD_RESET_KEY)
    } catch {}

    // Sign out the session to force re-login with new password (use local scope to avoid errors)
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch {
      // Ignore errors
    }

    toast.success('Password updated successfully! Please sign in with your new password.')
    setTimeout(() => {
      router.push('/auth/signin')
    }, 1500)
  }

  // Show loading state while checking
  if (checking) {
    return (
      <div className="min-h-[80vh] bg-gradient-to-br from-resort-50 to-resort-100 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-8 text-center">
          <div className="w-12 h-12 border-4 border-resort-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Verifying reset link...</p>
        </div>
      </div>
    )
  }

  if (!validToken) {
    // Clear the cookie since we're showing invalid link
    deleteCookie(PASSWORD_RESET_KEY)
    try { sessionStorage.removeItem(PASSWORD_RESET_KEY) } catch {}
    
    return (
      <div className="min-h-[80vh] bg-gradient-to-br from-resort-50 to-resort-100 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-resort-900 mb-2">Invalid Reset Link</h1>
          <p className="text-slate-600 mb-6">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/auth/forgot-password"
              className="inline-block py-2.5 px-6 rounded-lg bg-resort-500 text-white font-semibold hover:bg-resort-600 transition"
            >
              Request New Link
            </Link>
            <Link
              href="/auth/signin"
              className="text-resort-600 font-semibold hover:underline text-sm"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] bg-gradient-to-br from-resort-50 to-resort-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-8">
        <div className="text-center mb-6">
          <p className="text-sm font-semibold text-resort-500">Reset Password</p>
          <h1 className="text-2xl font-bold text-resort-900 mt-1">Create New Password</h1>
          <p className="text-slate-600 text-sm mt-2">
            Enter your new password below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-resort-500"
              placeholder="••••••••"
              type="password"
              required
              minLength={8}
            />
            <p className="text-xs text-slate-500 mt-1">Must be at least 8 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-resort-500"
              placeholder="••••••••"
              type="password"
              required
              minLength={8}
            />
          </div>

          <button
            className="w-full py-2.5 rounded-lg bg-resort-500 text-white font-semibold hover:bg-resort-600 transition disabled:opacity-70"
            disabled={loading}
            type="submit"
          >
            {loading ? 'Updating...' : 'Reset Password'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-200 text-center text-sm text-slate-600">
          Remember your password?{' '}
          <Link href="/auth/signin" className="text-resort-600 font-semibold hover:underline">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
