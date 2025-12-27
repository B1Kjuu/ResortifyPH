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

  // SMS sign-in is currently disabled; keeping a static "coming soon" notice.

  

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
            <div className="text-right mt-1">
              <Link href="/auth/forgot-password" className="text-xs text-resort-600 hover:underline">
                Forgot password?
              </Link>
            </div>
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

        {/* Phone OTP disabled */}
        <div className="mt-4">
          <div className="w-full px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm text-center">Phone sign-in (SMS) — coming soon</div>
        </div>

        

        <div className="mt-4 text-sm text-center text-slate-600">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="text-resort-600 font-semibold hover:underline">Sign up</Link>
        </div>
      </div>
    </div>
  )
}
