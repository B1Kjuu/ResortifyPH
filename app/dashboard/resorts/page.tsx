'use client'
import React, { useEffect, useState } from 'react'
import DashboardSidebar from '../../../components/DashboardSidebar'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function MyResorts(){
  const [resorts, setResorts] = useState<any[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load(){
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push('/auth/login'); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, is_admin')
        .eq('id', session.user.id)
        .single()
      setIsAdmin(profile?.is_admin || false)
      const { data } = await supabase.from('resorts').select('*').eq('owner_id', session.user.id)
      setResorts(data || [])
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center text-slate-600">Loading...</div>

  return (
    <div className="grid md:grid-cols-4 gap-6 w-full px-4 sm:px-6 lg:px-8">
      <DashboardSidebar isAdmin={isAdmin} />
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
