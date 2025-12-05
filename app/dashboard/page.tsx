'use client'
import React, { useEffect, useState } from 'react'
import DashboardSidebar from '../../components/DashboardSidebar'
import { supabase } from '../../lib/supabaseClient'

export default function Dashboard(){
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    async function load(){
      const user = supabase.auth.getUser().then(r => r.data.user)
      const u = await user
      if (!u) return
      const { data } = await supabase.from('profiles').select('*').eq('id', u.id).single()
      setProfile(data)
    }
    load()
  }, [])

  return (
    <div className="grid md:grid-cols-4 gap-6">
      <DashboardSidebar />
      <div className="md:col-span-3">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <p className="text-slate-600 mt-2">Welcome{profile ? `, ${profile.full_name}` : ''}</p>
      </div>
    </div>
  )
}
