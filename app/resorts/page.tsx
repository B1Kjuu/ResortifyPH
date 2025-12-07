'use client'
import React, { useEffect, useState } from 'react'
import ResortCard from '../../components/ResortCard'
import SkeletonCard from '../../components/SkeletonCard'
import { supabase } from '../../lib/supabaseClient'

export default function ResortsPage(){
  const [resorts, setResorts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    let subscription: any = null
    let timeoutId: NodeJS.Timeout

    async function loadResorts(){
      try {
        const { data, error } = await supabase
          .from('resorts')
          .select('*')
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
        
        if (!mounted) return

        if (error) {
          console.error('Resorts fetch error:', error)
          setResorts([])
          setLoading(false)
          return
        }

        if (mounted) {
          setResorts(data || [])
          setLoading(false)
        }
      } catch (err) {
        console.error('Load resorts error:', err)
        if (mounted) {
          setResorts([])
          setLoading(false)
        }
      }
    }

    loadResorts()

    // Safety timeout - force stop loading after 10 seconds
    timeoutId = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Resorts loading timeout')
        setLoading(false)
      }
    }, 10000)

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])

  return (
    <section className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-semibold mb-4 text-resort-900">Available Resorts</h2>
        {loading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : resorts.length === 0 ? (
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
