'use client'
import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { toast } from 'sonner'
import Link from 'next/link'

export default function VerifyEmailPage() {
  const [loading, setLoading] = useState(false)
  const [verified, setVerified] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams.get('email') || ''
  const isVerified = searchParams.get('verified') === 'true'

  useEffect(() => {
    // If coming from callback with verified=true, the session is already established
    if (isVerified) {
      setVerified(true)
      toast.success('Email verified successfully!')
      setTimeout(() => {
        router.push('/profile?welcome=true')
      }, 2000)
      return
    }

    // Legacy: Check if user came from email link with token in hash (for older flows)
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get('access_token')
    const type = hashParams.get('type')

    if (accessToken && type === 'signup') {
      handleEmailVerification()
    }
  }, [isVerified])

  async function handleEmailVerification() {
    setLoading(true)
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      toast.error('Verification failed. Please try again.')
      setLoading(false)
      return
    }

    if (session) {
      setVerified(true)
      toast.success('Email verified successfully!')
      setTimeout(() => {
        router.push('/profile?welcome=true')
      }, 2000)
    }
    setLoading(false)
  }

  async function resendVerification() {
    if (!email) {
      toast.error('Email address not found')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback?type=signup` : undefined,
      }
    })
    setLoading(false)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Verification email resent!')
    }
  }

  return (
    <div className="min-h-[80vh] bg-gradient-to-br from-resort-50 to-resort-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-8">
        <div className="text-center">
          {verified ? (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-resort-900 mb-2">Email Verified!</h1>
              <p className="text-slate-600 mb-6">Your account has been verified successfully. Redirecting...</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-resort-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-resort-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-resort-900 mb-2">Verify Your Email</h1>
              <p className="text-slate-600 mb-2">
                We've sent a verification link to:
              </p>
              {email && (
                <p className="font-semibold text-resort-600 mb-4">{email}</p>
              )}
              <p className="text-sm text-slate-500 mb-6">
                Click the link in your email to verify your account. You may need to check your spam folder.
              </p>

              <button
                onClick={resendVerification}
                disabled={loading || !email}
                className="w-full py-2.5 rounded-lg bg-resort-500 text-white font-semibold hover:bg-resort-600 transition disabled:opacity-50 mb-4"
              >
                {loading ? 'Sending...' : 'Resend Verification Email'}
              </button>

              <div className="text-sm text-slate-600">
                Wrong email? <Link href="/auth/signup" className="text-resort-600 font-semibold hover:underline">Sign up again</Link>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200 text-center text-sm text-slate-600">
          Already verified? <Link href="/auth/signin" className="text-resort-600 font-semibold hover:underline">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
