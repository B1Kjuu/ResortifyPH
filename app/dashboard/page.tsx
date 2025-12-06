'use client'
import React, { useEffect, useState } from 'react'
import DashboardSidebar from '../../components/DashboardSidebar'
import { supabase } from '../../lib/supabaseClient'

export default function Dashboard(){
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    async function load(){
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(data)
    }
    load()
  }, [])

  return (
    <div className="grid md:grid-cols-4 gap-6">
      <DashboardSidebar isAdmin={profile?.is_admin || false} />
      <div className="md:col-span-3">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <p className="text-slate-600 mt-2">Welcome{profile ? `, ${profile.full_name}` : ''}</p>
      </div>
    </div>
  )
}
