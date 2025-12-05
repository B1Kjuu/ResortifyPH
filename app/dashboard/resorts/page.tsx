'use client'
import React, { useEffect, useState } from 'react'
import DashboardSidebar from '../../../components/DashboardSidebar'
import { supabase } from '../../../lib/supabaseClient'

export default function MyResorts(){
  const [resorts, setResorts] = useState<any[]>([])

  useEffect(() => {
    async function load(){
      const user = (await supabase.auth.getUser()).data.user
      if (!user) return
      const { data } = await supabase.from('resorts').select('*').eq('owner_id', user.id)
      setResorts(data || [])
    }
    load()
  }, [])

  return (
    <div className="grid md:grid-cols-4 gap-6">
      <DashboardSidebar />
      <div className="md:col-span-3">
        <h2 className="text-2xl font-semibold mb-4">My Resorts</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {resorts.map(r => (
            <div key={r.id} className="p-4 border rounded">
              <h3 className="font-semibold">{r.name}</h3>
              <p className="text-sm text-slate-500">Status: {r.status}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
