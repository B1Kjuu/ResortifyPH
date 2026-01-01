'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!email) {
      toast.error('Please enter your email address')
      return
    }

    setLoading(true)
    
    // Use resetPasswordForEmail to send a magic link for password reset
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    
    setLoading(false)

    if (error) {
      // Don't reveal if account exists or not for security
      if (error.message.includes('User not found') || error.message.includes('Email not confirmed')) {
        setSent(true)
        toast.success('If an account exists with this email, you will receive a password reset link.')
      } else {
        toast.error(error.message)
      }
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
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-resort-500"
                  placeholder="you@example.com"
                  type="email"
                  required
                />
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
