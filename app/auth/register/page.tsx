'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

const signupSchema = z.object({
  full_name: z.string().min(2, 'Full name required'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must include an uppercase letter')
    .regex(/[0-9]/, 'Must include a number'),
})

type SignupForm = z.infer<typeof signupSchema>

export default function RegisterPage(){
  const [role, setRole] = useState<'guest'|'owner'>('guest')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const { register, handleSubmit, formState: { errors } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { full_name: '', email: '', password: '' },
  })

  const onSubmit = async (values: SignupForm) => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { full_name: values.full_name, role },
        },
      })
      if (error) throw error
      toast.success('Account created! Check your email to verify.')
      router.push(role === 'owner' ? '/dashboard' : '/')
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] bg-gradient-to-br from-resort-50 to-resort-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-8">
        <div className="text-center mb-6">
          <p className="text-sm font-semibold text-resort-500">Join ResortifyPH</p>
          <h1 className="text-2xl font-bold text-resort-900 mt-1">Create your account</h1>
          <p className="text-slate-600 text-sm mt-2">Book resorts as a guest or manage listings as an owner.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
            <input
              {...register('full_name')}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-resort-500"
              placeholder="Juan Dela Cruz"
            />
            {errors.full_name && (
              <p className="text-red-600 text-xs mt-1">{errors.full_name.message}</p>
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
              <p className="text-red-600 text-xs mt-1">{errors.email.message}</p>
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
              <p className="text-red-600 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('guest')}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${role === 'guest' ? 'border-resort-500 bg-resort-50 text-resort-700' : 'border-slate-200 text-slate-700 hover:border-slate-300'}`}
              >
                Guest
              </button>
              <button
                type="button"
                onClick={() => setRole('owner')}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${role === 'owner' ? 'border-resort-500 bg-resort-50 text-resort-700' : 'border-slate-200 text-slate-700 hover:border-slate-300'}`}
              >
                Owner
              </button>
            </div>
          </div>

          <button
            className="w-full py-2.5 rounded-lg bg-resort-500 text-white font-semibold hover:bg-resort-600 transition disabled:opacity-70"
            disabled={loading}
            type="submit"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="mt-4 text-sm text-center text-slate-600">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-resort-600 font-semibold hover:underline">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
