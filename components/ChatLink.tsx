'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'

type Props = {
  bookingId?: string
  resortId?: string
  as: 'guest' | 'owner' | 'admin'
  label?: string
  title?: string
  variant?: 'outline' | 'primary'
  fullWidth?: boolean
}

export default function ChatLink({ bookingId, resortId, as, label, title, variant = 'outline', fullWidth }: Props) {
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null)
  
  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) setIsSignedIn(!!session?.user)
    })
    return () => { mounted = false }
  }, [])

  const defaultLabel = !label
    ? (as === 'guest' ? 'Message Host' : as === 'owner' ? 'Message Guest' : 'Open Chat')
    : label
  const qp = new URLSearchParams({ as })
  if (title) qp.set('title', title)
  const base = variant === 'primary'
    ? 'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold bg-resort-500 text-white shadow hover:bg-resort-600 transition-colors'
    : 'inline-flex items-center rounded-md border px-3 py-1 text-sm hover:bg-gray-50'
  const width = fullWidth ? ' w-full' : ''

  // If not signed in, show a button that redirects to sign in
  if (isSignedIn === false) {
    return (
      <Link
        href="/auth/signin"
        className={base + width}
      >
        Sign in to {defaultLabel}
      </Link>
    )
  }

  // Still loading auth state
  if (isSignedIn === null) {
    return (
      <span className={base + width + ' opacity-50 cursor-wait'}>
        {defaultLabel}
      </span>
    )
  }

  return (
    <Link
      href={resortId ? `/chat/resort/${resortId}?${qp.toString()}` : `/chat/${bookingId}?${qp.toString()}`}
      className={base + width}
    >
      {defaultLabel}
    </Link>
  )
}
