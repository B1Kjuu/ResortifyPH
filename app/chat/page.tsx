"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function ChatsPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return
      if (!session?.user) { router.replace('/auth/signin'); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
      const role = profile?.role || 'guest'
      router.replace(role === 'owner' ? '/owner/chats' : '/guest/chats')
      setReady(true)
    })()
    return () => { mounted = false }
  }, [router])

  return (
    <div className="mx-auto max-w-3xl p-6 text-sm text-slate-600">Redirecting to your chats…</div>
  )
}
