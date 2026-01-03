'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signUpSchema, type SignUpInput } from '../../../lib/validations'
import { toast } from 'sonner'

export default function SignUpPage(){
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  
  const router = useRouter()
  
  const { register, handleSubmit, formState: { errors } } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema)
  })

  async function onSubmit(data: SignUpInput){
    setLoading(true)
    
    // Check if email already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', data.email.toLowerCase())
      .maybeSingle()
    
    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is expected
      console.error('Email check error:', checkError)
    }
    
    if (existingUser) {
      setLoading(false)
      toast.error('An account with this email already exists', {
        description: 'Please sign in instead or use a different email.',
        action: {
          label: 'Sign In',
          onClick: () => router.push('/auth/signin')
        }
      })
      return
    }
    
    const { error } = await supabase.auth.signUp({ 
      email: data.email, 
      password: data.password,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback?type=signup` : undefined,
        data: {
          full_name: data.fullName,
          role: 'guest',  // All new users start as guest
          phone: data.phone,
        }
      }
    })
    setLoading(false)
    
    if (error){ 
      toast.error(error.message)
      return 
    }

    toast.success('Check your email for verification link!')
    router.push(`/auth/verify-email?email=${encodeURIComponent(data.email)}`)
  }

  async function signUpWithFacebook(){
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

  async function signUpWithGoogle(){
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

  // SMS sign-up is currently disabled; keeping a static "coming soon" notice.

  

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-resort-50 via-white to-ocean-50 flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md bg-white shadow-card hover:shadow-card-hover transition-shadow rounded-2xl p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-resort-500 to-ocean-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-resort-500 uppercase tracking-wide">Join ResortifyPH</p>
          <h1 className="text-xl sm:text-2xl font-bold text-resort-900 mt-1">Create your account</h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-2">Book amazing resorts. Become a host anytime.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Full name</label>
            <input
              {...register('fullName')}
              className="w-full rounded-xl border border-slate-200 px-3 sm:px-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-resort-500 focus:border-transparent transition"
              placeholder="Juan Dela Cruz"
            />
            {errors.fullName && (
              <p className="text-red-500 text-xs mt-1">{errors.fullName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              {...register('email')}
              className="w-full rounded-xl border border-slate-200 px-3 sm:px-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-resort-500 focus:border-transparent transition"
              placeholder="you@example.com"
              type="email"
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              {...register('password')}
              className="w-full rounded-xl border border-slate-200 px-3 sm:px-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-resort-500 focus:border-transparent transition"
              placeholder="••••••••"
              type="password"
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input
              {...register('phone')}
              className="w-full rounded-xl border border-slate-200 px-3 sm:px-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-resort-500 focus:border-transparent transition"
              placeholder="09171234567 or +639171234567"
              type="tel"
            />
            {errors.phone && (
              <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
            )}
          </div>

          <button
            className="w-full py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-resort-500 to-resort-600 text-white font-semibold hover:from-resort-600 hover:to-resort-700 transition-all shadow-md hover:shadow-lg disabled:opacity-70 text-sm sm:text-base"
            disabled={loading}
            type="submit"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px bg-slate-200 flex-1" />
          <span className="text-slate-400 text-xs uppercase tracking-wider">or continue with</span>
          <div className="h-px bg-slate-200 flex-1" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Facebook OAuth */}
          <button
            onClick={signUpWithFacebook}
            className="flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition disabled:opacity-70 text-sm"
            disabled={oauthLoading}
            type="button"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Facebook
          </button>

          {/* Google OAuth */}
          <button
            onClick={signUpWithGoogle}
            className="flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl bg-white text-slate-700 font-medium border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition disabled:opacity-70 text-sm"
            disabled={oauthLoading}
            type="button"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Google
          </button>
        </div>

        {/* Phone OTP disabled */}
        <div className="mt-4">
          <div className="w-full px-3 py-2.5 rounded-xl bg-slate-50 text-slate-500 text-xs sm:text-sm text-center border border-slate-100">
            📱 Phone sign-up (SMS) — coming soon
          </div>
        </div>

        <div className="mt-6 text-sm text-center text-slate-600">
          Already have an account?{' '}
          <Link href="/auth/signin" className="text-resort-600 font-semibold hover:underline">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
