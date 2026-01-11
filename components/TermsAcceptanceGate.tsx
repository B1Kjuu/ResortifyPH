'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabaseClient'

const SKIP_PREFIXES = ['/auth']
const SKIP_PATHS = new Set(['/terms', '/privacy'])

export default function TermsAcceptanceGate() {
  const pathname = usePathname()
  const router = useRouter()

  const shouldSkip = useMemo(() => {
    if (!pathname) return true
    if (SKIP_PATHS.has(pathname)) return true
    return SKIP_PREFIXES.some(p => pathname.startsWith(p))
  }, [pathname])

  const [checking, setChecking] = useState(true)
  const [needsAcceptance, setNeedsAcceptance] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (shouldSkip) {
        setChecking(false)
        setNeedsAcceptance(false)
        return
      }

      try {
        const { data: { session } } = await supabase.auth.getSession()
        const userId = session?.user?.id
        if (!userId) {
          setChecking(false)
          setNeedsAcceptance(false)
          return
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('terms_accepted_at')
          .eq('id', userId)
          .single()

        if (error) {
          // If we can't read, don't lock the user out.
          setChecking(false)
          setNeedsAcceptance(false)
          return
        }

        if (!cancelled) {
          setNeedsAcceptance(!profile?.terms_accepted_at)
          setChecking(false)
        }
      } catch {
        if (!cancelled) {
          setChecking(false)
          setNeedsAcceptance(false)
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [shouldSkip])

  async function acceptTerms() {
    if (busy) return
    setBusy(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      if (!userId) {
        toast.error('Please sign in again')
        setNeedsAcceptance(false)
        return
      }

      const { error } = await supabase
        .from('profiles')
        .update({ terms_accepted_at: new Date().toISOString() })
        .eq('id', userId)

      if (error) {
        toast.error('Could not save your acceptance')
        return
      }

      toast.success('Terms accepted')
      setNeedsAcceptance(false)
    } finally {
      setBusy(false)
    }
  }

  async function declineTerms() {
    if (busy) return
    setBusy(true)
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch {}
    finally {
      setBusy(false)
      toast.error('You must accept Terms to continue')
      router.push('/auth/signin')
    }
  }

  if (checking || !needsAcceptance) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-5 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">Accept Terms & Conditions</h2>
          <p className="text-sm text-slate-600 mt-2">
            To continue using ResortifyPH, please review and accept our{' '}
            <Link href="/terms" className="text-resort-600 font-semibold hover:underline">Terms & Conditions</Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-resort-600 font-semibold hover:underline">Privacy Policy</Link>.
          </p>

          <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={acceptTerms}
              disabled={busy}
              className="w-full sm:flex-1 px-4 py-3 rounded-xl bg-resort-600 hover:bg-resort-700 text-white font-semibold disabled:opacity-60"
            >
              {busy ? 'Saving…' : 'I Accept'}
            </button>
            <button
              onClick={declineTerms}
              disabled={busy}
              className="w-full sm:flex-1 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold disabled:opacity-60"
            >
              Decline
            </button>
          </div>

          <p className="text-xs text-slate-500 mt-3">
            By accepting, you agree to follow platform policies and acknowledge that transactions should be done only through official channels.
          </p>
        </div>
      </div>
    </div>
  )
}
