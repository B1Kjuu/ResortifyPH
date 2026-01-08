'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEmailError(null)
    
    if (!email) {
      toast.error('Please enter your email address')
      return
    }

    setLoading(true)
    
    // First check if email exists in the system
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle()
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Email check error:', checkError)
    }
    
    // If no user found with this email, show error
    if (!existingUser) {
      setLoading(false)
      setEmailError('No account found with this email address. Please check your email or create a new account.')
      return
    }
    
    // Use resetPasswordForEmail to send a magic link for password reset
    // Redirect to callback route which will handle the code exchange and redirect to reset-password
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })
    
    setLoading(false)

    if (error) {
      toast.error(error.message)
      return
    }

    setSent(true)
    toast.success('Password reset link sent! Check your email.')
  }

  return (
    <div className="min-h-[80vh] bg-gradient-to-br from-resort-50 to-resort-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-8">
        {!sent ? (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-resort-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-resort-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-resort-900 mt-1">Forgot your password?</h1>
              <p className="text-slate-600 text-sm mt-2">
                Enter your email and we'll send you a link to reset your password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setEmailError(null) // Clear error when user types
                  }}
                  className={`w-full rounded-lg border px-3 py-2.5 focus:outline-none focus:ring-2 transition ${
                    emailError 
                      ? 'border-red-400 focus:ring-red-500 bg-red-50' 
                      : 'border-slate-200 focus:ring-resort-500'
                  }`}
                  placeholder="you@example.com"
                  type="email"
                  required
                />
                {emailError && (
                  <div className="flex items-start gap-1.5 mt-1.5">
                    <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-red-600 text-xs">{emailError} <Link href="/auth/signup" className="text-resort-600 underline hover:text-resort-700 font-medium">Sign up</Link></p>
                  </div>
                )}
              </div>

              <button
                className="w-full py-2.5 rounded-lg bg-resort-500 text-white font-semibold hover:bg-resort-600 transition disabled:opacity-70"
                disabled={loading}
                type="submit"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-resort-900 mt-1">Check your email</h1>
              <p className="text-slate-600 text-sm mt-2 mb-4">
                We've sent a password reset link to <span className="font-semibold text-resort-600">{email}</span>
              </p>
              <p className="text-slate-500 text-sm">
                Click the link in your email to reset your password. If you don't see it, check your spam folder.
              </p>
              
              <button
                onClick={() => { setSent(false); setEmail('') }}
                className="mt-6 text-sm text-resort-600 font-semibold hover:underline"
              >
                ← Try a different email
              </button>
            </div>
          </>
        )}

        <div className="mt-6 pt-6 border-t border-slate-200 text-center text-sm text-slate-600">
          Remember your password?{' '}
          <Link href="/auth/signin" className="text-resort-600 font-semibold hover:underline">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
