'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signInSchema, type SignInInput } from '../../../lib/validations'
import { toast } from 'sonner'

export default function SignInPage(){
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [phone, setPhone] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  
  const enablePhoneAuth = process.env.NEXT_PUBLIC_ENABLE_PHONE_AUTH === 'true'
  const router = useRouter()
  
  const { register, handleSubmit, formState: { errors } } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema)
  })

  async function onSubmit(data: SignInInput){
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ 
      email: data.email, 
      password: data.password 
    })
    setLoading(false)
    
    if (error){ 
      toast.error(error.message)
      return 
    }
    
    toast.success('Welcome back!')
    router.push('/')
  }

  async function signInWithFacebook(){
    try {
      setOauthLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: { redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined }
      })
      if (error) toast.error(error.message)
    } finally {
      setOauthLoading(false)
    }
  }

  async function signInWithGoogle(){
    try {
      setOauthLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
          queryParams: { prompt: 'select_account' }
        }
      })
      if (error) toast.error(error.message)
    } finally {
      setOauthLoading(false)
    }
  }

  async function sendPhoneOtp(){
    if (!phone) { toast.error('Enter a phone number'); return }
    // Basic PH mobile format check
    const ok = /^((\+63|0)?9\d{9})$/.test(phone)
    if (!ok) { toast.error('Invalid PH mobile number'); return }
    const { error } = await supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: true } })
    if (error) { toast.error(error.message); return }
    toast.success('SMS code sent')
    setOtpSent(true)
  }

  async function verifyPhoneOtp(){
    if (!otpCode) { toast.error('Enter the SMS code'); return }
    const { data, error } = await supabase.auth.verifyOtp({ type: 'sms', phone, token: otpCode })
    if (error) { toast.error(error.message); return }
    if (data?.session) {
      toast.success('Signed in via phone')
      router.push('/')
    }
  }

  

  return (
    <div className="min-h-[80vh] bg-gradient-to-br from-resort-50 to-resort-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-8">
        <div className="text-center mb-6">
          <p className="text-sm font-semibold text-resort-500">Welcome back</p>
          <h1 className="text-2xl font-bold text-resort-900 mt-1">Sign in to ResortifyPH</h1>
          <p className="text-slate-600 text-sm mt-2">Access your bookings, resorts, and approvals.</p>
        </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              {...register('email')}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-resort-500"
              placeholder="you@example.com"
              type="email"
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              {...register('password')}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-resort-500"
              placeholder="••••••••"
              type="password"
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            className="w-full py-2.5 rounded-lg bg-resort-500 text-white font-semibold hover:bg-resort-600 transition disabled:opacity-70"
            disabled={loading}
            type="submit"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px bg-slate-200 flex-1" />
          <span className="text-slate-500 text-xs">OR</span>
          <div className="h-px bg-slate-200 flex-1" />
        </div>

        {/* Facebook OAuth */}
        <button
          onClick={signInWithFacebook}
          className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-70"
          disabled={oauthLoading}
        >
          {oauthLoading ? 'Redirecting…' : 'Continue with Facebook'}
        </button>

        {/* Google OAuth */}
        <button
          onClick={signInWithGoogle}
          className="mt-3 w-full py-2.5 rounded-lg bg-white text-slate-900 font-semibold border border-slate-200 hover:bg-slate-50 transition disabled:opacity-70"
          disabled={oauthLoading}
        >
          {oauthLoading ? 'Redirecting…' : 'Continue with Google'}
        </button>

        {/* Phone OTP */}
        {enablePhoneAuth ? (
          <div className="mt-4 space-y-2">
            <label className="block text-sm font-medium text-slate-700">Phone sign-in (SMS)</label>
            <div className="flex gap-2">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-resort-500"
                placeholder="09171234567 or +639171234567"
              />
              {!otpSent ? (
                <button onClick={sendPhoneOtp} className="px-4 rounded-lg bg-resort-500 text-white font-semibold">Send code</button>
              ) : (
                <button onClick={() => { setOtpSent(false); setOtpCode('') }} className="px-4 rounded-lg bg-slate-200 text-slate-700 font-semibold">Reset</button>
              )}
            </div>
            {otpSent && (
              <div className="flex gap-2 mt-2">
                <input
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-resort-500"
                  placeholder="Enter SMS code"
                />
                <button onClick={verifyPhoneOtp} className="px-4 rounded-lg bg-resort-500 text-white font-semibold">Verify</button>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4">
            <div className="w-full px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm text-center">Phone sign-in (SMS) — coming soon</div>
          </div>
        )}

        

        <div className="mt-4 text-sm text-center text-slate-600">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="text-resort-600 font-semibold hover:underline">Sign up</Link>
        </div>
      </div>
    </div>
  )
}
