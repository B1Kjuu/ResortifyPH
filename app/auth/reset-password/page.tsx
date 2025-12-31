'use client'
import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { toast } from 'sonner'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [validToken, setValidToken] = useState(false)
  const [checking, setChecking] = useState(true)
  const [showExpiredMessage, setShowExpiredMessage] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

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
        // Double-check we have a session from the callback
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
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
        setValidToken(true)
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

    toast.success('Password updated successfully!')
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
          <Link
            href="/auth/forgot-password"
            className="inline-block py-2.5 px-6 rounded-lg bg-resort-500 text-white font-semibold hover:bg-resort-600 transition"
          >
            Request New Link
          </Link>
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
