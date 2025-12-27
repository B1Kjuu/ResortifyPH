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
    const { error } = await supabase.auth.signUp({ 
      email: data.email, 
      password: data.password,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/verify-email` : undefined,
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
    <div className="min-h-[80vh] bg-gradient-to-br from-resort-50 to-resort-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-8">
        <div className="text-center mb-6">
          <p className="text-sm font-semibold text-resort-500">Join ResortifyPH</p>
          <h1 className="text-2xl font-bold text-resort-900 mt-1">Create your account</h1>
          <p className="text-slate-600 text-sm mt-2">Book amazing resorts. Become a host anytime.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
            <input
              {...register('fullName')}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-resort-500"
              placeholder="Juan Dela Cruz"
            />
            {errors.fullName && (
              <p className="text-red-500 text-xs mt-1">{errors.fullName.message}</p>
            )}
          </div>

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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input
              {...register('phone')}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-resort-500"
              placeholder="09171234567 or +639171234567"
              type="tel"
            />
            {errors.phone && (
              <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
            )}
          </div>



          <button
            className="w-full py-2.5 rounded-lg bg-resort-500 text-white font-semibold hover:bg-resort-600 transition disabled:opacity-70"
            disabled={loading}
            type="submit"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px bg-slate-200 flex-1" />
          <span className="text-slate-500 text-xs">OR</span>
          <div className="h-px bg-slate-200 flex-1" />
        </div>

        {/* Facebook OAuth */}
        <button
          onClick={signUpWithFacebook}
          className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-70"
          disabled={oauthLoading}
          type="button"
        >
          {oauthLoading ? 'Redirecting…' : 'Continue with Facebook'}
        </button>

        {/* Google OAuth */}
        <button
          onClick={signUpWithGoogle}
          className="mt-3 w-full py-2.5 rounded-lg bg-white text-slate-900 font-semibold border border-slate-200 hover:bg-slate-50 transition disabled:opacity-70"
          disabled={oauthLoading}
          type="button"
        >
          {oauthLoading ? 'Redirecting…' : 'Continue with Google'}
        </button>

        {/* Phone OTP disabled */}
        <div className="mt-4">
          <div className="w-full px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm text-center">Phone sign-up (SMS) — coming soon</div>
        </div>

        

        <div className="mt-4 text-sm text-center text-slate-600">
          Already have an account?{' '}
          <Link href="/auth/signin" className="text-resort-600 font-semibold hover:underline">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
