'use client'
import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import ResortCard from '../../../components/ResortCard'

type Resort = {
  id: string
  name: string
  images?: string[]
  rating?: number
  location?: string
  type?: string
  price?: number
  day_tour_price?: number
  night_tour_price?: number
  overnight_price?: number
  instant_book?: boolean
  created_at?: string
}

export default function FavoritesPage(){
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resorts, setResorts] = useState<Resort[]>([])

  useEffect(() => {
    let mounted = true
    async function load(){
      try {
        setLoading(true)
        setError(null)
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return
        if (!session?.user) {
          setUserId(null)
          setResorts([])
          setLoading(false)
          return
        }
        const uid = session.user.id
        setUserId(uid)

        const { data: favs, error: favErr } = await supabase
          .from('favorites')
          .select('resort_id')

        if (favErr) throw favErr
        const ids = (favs || []).map(r => r.resort_id as string)
        if (ids.length === 0) {
          setResorts([])
          setLoading(false)
          return
        }

        const { data: resortsData, error: resortsErr } = await supabase
          .from('resorts')
          .select('id, name, images, location, type, price, day_tour_price, night_tour_price, overnight_price, created_at')
          .in('id', ids)

        if (resortsErr) throw resortsErr
        setResorts((resortsData || []) as Resort[])
        setLoading(false)
      } catch (err: any) {
        if (!mounted) return
        setError(err?.message || 'Failed to load favorites')
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const backLink = (
    <div className="mb-3">
      <Link href="/guest/adventure-hub" className="inline-flex items-center gap-1 text-sm font-semibold text-resort-600 hover:text-resort-700">
        <span aria-hidden>←</span> Back to Adventure Hub
      </Link>
    </div>
  )

  const header = useMemo(() => (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-slate-900">Favorites</h1>
      <p className="text-sm text-slate-600">Your saved resorts</p>
    </div>
  ), [])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {backLink}
        {header}
        <div className="rounded-xl border border-slate-200 p-6 bg-slate-50" data-testid="favorites-signin-required">
          <p className="text-slate-700">Please sign in to view favorites.</p>
          <p className="text-slate-500 mt-2">Loading…</p>
        </div>
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {backLink}
        {header}
        <div className="rounded-xl border border-slate-200 p-6 bg-slate-50" data-testid="favorites-signin-required">
          <p className="text-slate-700">Please sign in to view favorites.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {backLink}
        {header}
        <div className="rounded-xl border border-red-200 p-6 bg-red-50">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  if (resorts.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {backLink}
        {header}
        <div className="rounded-xl border border-slate-200 p-6 bg-slate-50" data-testid="favorites-empty">
          <p className="text-slate-700">No favorites yet. Tap the heart on any resort to save it.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {backLink}
      {header}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {resorts.map(r => (
          <ResortCard key={r.id} resort={r} />
        ))}
      </div>
    </div>
  )
}
