'use client'
import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function Dashboard(){
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load(){
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push('/auth/login'); return }
      const { data } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, is_admin')
        .eq('id', session.user.id)
        .single()
      if (data?.is_admin) {
        router.replace('/admin/command-center')
        return
      }
      if (data?.role === 'owner') {
        router.replace('/owner/empire')
        return
      }
      router.replace('/guest/adventure-hub')
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center text-slate-600">Redirecting...</div>

  return null
}
