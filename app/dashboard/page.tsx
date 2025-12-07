'use client'
import React, { useEffect, useState } from 'react'
import DashboardSidebar from '../../components/DashboardSidebar'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function Dashboard(){
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load(){
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push('/auth/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(data)
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center text-slate-600">Loading dashboard...</div>

  return (
    <div className="grid md:grid-cols-4 gap-6 w-full px-4 sm:px-6 lg:px-8">
      <DashboardSidebar isAdmin={profile?.is_admin || false} />
      <div className="md:col-span-3">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <p className="text-slate-600 mt-2">Welcome{profile ? `, ${profile.full_name}` : ''}</p>
      </div>
    </div>
  )
}
