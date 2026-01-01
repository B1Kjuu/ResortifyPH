'use client'
import React, { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'email' | 'otp' | 'reset'>('email')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const router = useRouter()

  // Step 1: Send OTP to email
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    
    if (!email) {
      toast.error('Please enter your email address')
      return
    }

    setLoading(true)
    // Use signInWithOtp to send a verification code
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false, // Don't create new users, only existing accounts
      }
    })
    setLoading(false)

    if (error) {
      // Don't reveal if account exists or not
      if (error.message.includes('User not found') || error.message.includes('Email not confirmed')) {
        // Still show success to prevent account enumeration
        setStep('otp')
        toast.success('If an account exists, a verification code has been sent.')
      } else {
        toast.error(error.message)
      }
      return
    }

    setStep('otp')
    toast.success('Verification code sent to your email!')
  }

  // Step 2: Verify OTP
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    
    const otpCode = otp.join('')
    if (otpCode.length !== 6) {
      toast.error('Please enter the 6-digit code')
      return
    }

    setLoading(true)
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: 'email',
    })
    setLoading(false)

    if (error) {
      toast.error('Invalid or expired code. Please try again.')
      return
    }

    if (data.session) {
      setStep('reset')
      toast.success('Code verified! Now set your new password.')
    } else {
      toast.error('Verification failed. Please try again.')
    }
  }

  // Step 3: Reset Password
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })
    setLoading(false)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Password updated successfully!')
    // Sign out so user can sign in with new password
    await supabase.auth.signOut()
    setTimeout(() => {
      router.push('/auth/signin')
    }, 1500)
  }

  // OTP input handler
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 6).split('')
      const newOtp = [...otp]
      digits.forEach((digit, i) => {
        if (index + i < 6) newOtp[index + i] = digit
      })
      setOtp(newOtp)
      const nextIndex = Math.min(index + digits.length, 5)
      inputRefs.current[nextIndex]?.focus()
      return
    }

    const digit = value.replace(/\D/g, '')
    const newOtp = [...otp]
    newOtp[index] = digit
    setOtp(newOtp)

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  return (
    <div className="min-h-[80vh] bg-gradient-to-br from-resort-50 to-resort-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-8">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 'email' ? 'bg-resort-500 text-white' : 'bg-resort-100 text-resort-600'}`}>1</div>
          <div className={`w-12 h-1 rounded ${step !== 'email' ? 'bg-resort-500' : 'bg-slate-200'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 'otp' ? 'bg-resort-500 text-white' : step === 'reset' ? 'bg-resort-100 text-resort-600' : 'bg-slate-200 text-slate-400'}`}>2</div>
          <div className={`w-12 h-1 rounded ${step === 'reset' ? 'bg-resort-500' : 'bg-slate-200'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 'reset' ? 'bg-resort-500 text-white' : 'bg-slate-200 text-slate-400'}`}>3</div>
        </div>

        {/* Step 1: Enter Email */}
        {step === 'email' && (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-resort-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-resort-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-resort-500">Step 1 of 3</p>
              <h1 className="text-2xl font-bold text-resort-900 mt-1">Forgot your password?</h1>
              <p className="text-slate-600 text-sm mt-2">
                Enter your email and we'll send a 6-digit verification code.
              </p>
            </div>

            <form onSubmit={handleSendOtp} className="space-y-4">
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
                {loading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </form>
          </>
        )}

        {/* Step 2: Enter OTP */}
        {step === 'otp' && (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-resort-500">Step 2 of 3</p>
              <h1 className="text-2xl font-bold text-resort-900 mt-1">Enter Verification Code</h1>
              <p className="text-slate-600 text-sm mt-2">
                We sent a 6-digit code to <span className="font-semibold text-resort-600">{email}</span>
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="flex justify-center gap-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-12 h-14 text-center text-2xl font-bold border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-resort-500 focus:border-resort-500"
                  />
                ))}
              </div>

              <button
                className="w-full py-2.5 rounded-lg bg-resort-500 text-white font-semibold hover:bg-resort-600 transition disabled:opacity-70"
                disabled={loading || otp.join('').length !== 6}
                type="submit"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => { setStep('email'); setOtp(['', '', '', '', '', '']) }}
                className="text-sm text-resort-600 font-semibold hover:underline"
              >
                ← Back to email
              </button>
            </div>
          </>
        )}

        {/* Step 3: Reset Password */}
        {step === 'reset' && (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-resort-500">Step 3 of 3</p>
              <h1 className="text-2xl font-bold text-resort-900 mt-1">Create New Password</h1>
              <p className="text-slate-600 text-sm mt-2">
                Your identity has been verified. Set your new password below.
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-resort-500"
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
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-resort-500"
                  placeholder="••••••••"
                  type="password"
                  required
                  minLength={8}
                />
              </div>

              <button
                className="w-full py-2.5 rounded-lg bg-green-500 text-white font-semibold hover:bg-green-600 transition disabled:opacity-70"
                disabled={loading}
                type="submit"
              >
                {loading ? 'Updating...' : 'Reset Password'}
              </button>
            </form>
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
