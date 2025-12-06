'use client'
import React, { useEffect, useState } from 'react'
import ResortCard from '../../components/ResortCard'
import { supabase } from '../../lib/supabaseClient'

export default function ResortsPage(){
  const [resorts, setResorts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadResorts(){
      const { data, error } = await supabase
        .from('resorts')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
      
      if (!error) {
        setResorts(data || [])
      }
      setLoading(false)
    }

    loadResorts()

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('resorts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'resorts', filter: 'status=eq.approved' },
        (payload) => {
          loadResorts()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (loading) return <div className="container py-8">Loading resorts...</div>

  return (
    <section className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-semibold mb-4 text-resort-900">Available Resorts</h2>
        {resorts.length === 0 ? (
          <p className="text-slate-600">No approved resorts yet.</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {resorts.map((r: any) => <ResortCard key={r.id} resort={r} />)}
          </div>
        )}
      </div>
    </section>
  )
}
