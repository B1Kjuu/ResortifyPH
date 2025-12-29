'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { supabase } from '../../../lib/supabaseClient'

export default function MyReviewsPage(){
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [eligible, setEligible] = useState<Array<{ booking_id: string, resort: { id: string, name: string, location?: string, images?: string[] } }>>([])

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
          setReviews([])
          setLoading(false)
          return
        }
        const uid = session.user.id
        setUserId(uid)

        const { data, error } = await supabase
          .from('reviews')
          .select('id, rating, title, content, created_at, resort:resorts(id, name)')
          .eq('guest_id', uid)
          .order('created_at', { ascending: false })
        if (error) throw error
        setReviews(data || [])

        // Eligible to review: past confirmed bookings for this guest without an existing review
        // For daytour bookings (single day), allow review on the same day after checkout time
        // We use date_to <= today to include same-day completed bookings
        const today = new Date().toISOString().slice(0,10)
        const { data: bookings, error: bErr } = await supabase
          .from('bookings')
          .select('id, resort_id, date_to, resorts:resorts(id, name, location, images)')
          .eq('guest_id', uid)
          .eq('status', 'confirmed')
          .lte('date_to', today) // Changed to lte (less than or equal)
        if (bErr) throw bErr

        const bookingIds = (bookings || []).map((b: any) => b.id)
        let reviewedIds: string[] = []
        if (bookingIds.length > 0) {
          const { data: existing, error: eErr } = await supabase
            .from('reviews')
            .select('booking_id')
            .eq('guest_id', uid)
            .in('booking_id', bookingIds)
          if (eErr) throw eErr
          reviewedIds = (existing || []).map((r: any) => r.booking_id)
        }

        const eligibleList = (bookings || [])
          .filter((b: any) => !reviewedIds.includes(b.id))
          .map((b: any) => ({ booking_id: b.id, resort: b.resorts }))
        setEligible(eligibleList)

        setLoading(false)
      } catch (err: any) {
        setError(err?.message || 'Failed to load reviews')
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  async function deleteReview(id: string){
    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', id)
      if (error) throw error
      setReviews(prev => prev.filter(r => r.id !== id))
      toast.success('Review deleted')
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete review')
    }
  }

  const backLink = (
    <div className="mb-3">
      <Link href="/guest/adventure-hub" className="inline-flex items-center gap-1 text-sm font-semibold text-resort-600 hover:text-resort-700">
        <span aria-hidden>←</span> Back to Adventure Hub
      </Link>
    </div>
  )

  const header = (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-slate-900">My Reviews</h1>
      <p className="text-sm text-slate-600">View and manage your reviews. Below are stays you can now review.</p>
    </div>
  )

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {backLink}
        {header}
        <p className="text-slate-500">Loading…</p>
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {backLink}
        {header}
        <div className="rounded-xl border border-slate-200 p-6 bg-slate-50" data-testid="reviews-signin-required">
          <p className="text-slate-700">Please sign in to manage your reviews.</p>
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

  if (reviews.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {backLink}
        {header}
        <div className="rounded-xl border border-slate-200 p-6 bg-slate-50 mb-6">
          <p className="text-slate-700">You have not posted any reviews yet.</p>
        </div>
        {/* Eligible to Review */}
        <div className="rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-slate-900">Ready to Review</h3>
          </div>
          {eligible.length === 0 ? (
            <p className="text-sm text-slate-600">No completed stays to review right now.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {eligible.map((e) => (
                <div key={e.booking_id} className="p-3 border border-slate-200 rounded-xl">
                  <div className="font-semibold text-slate-900">{e.resort?.name || 'Resort'}</div>
                  <div className="text-xs text-slate-600">{e.resort?.location || '—'}</div>
                  <div className="mt-2 flex items-center gap-2">
                    {e.resort?.id && (
                      <Link href={`/resorts/${e.resort.id}`} className="text-xs font-semibold text-resort-600 hover:text-resort-700">Write a review →</Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {backLink}
      {header}
      <div className="space-y-4">
        {reviews.map((r: any) => (
          <div key={r.id} className="border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-resort-900">{r.resort?.name || 'Resort'}</div>
              <span className="text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString()}</span>
            </div>
            <div className="mt-1 text-sm text-slate-700">Rating: {r.rating}/5</div>
            {r.title && <p className="mt-1 text-sm font-semibold text-slate-900">{r.title}</p>}
            {r.content && <p className="mt-1 text-sm text-slate-700 leading-relaxed">{r.content}</p>}
            <div className="mt-3 flex items-center gap-2">
              {r.resort?.id && (
                <Link href={`/resorts/${r.resort.id}`} className="text-xs font-semibold text-resort-600 hover:text-resort-700">Open resort →</Link>
              )}
              <button onClick={() => deleteReview(r.id)} className="text-xs font-semibold text-red-600 hover:text-red-700">Delete</button>
            </div>
          </div>
        ))}
      </div>
      {/* Eligible list even when you have reviews */}
      <div className="mt-6 rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-slate-900">Ready to Review</h3>
        </div>
        {eligible.length === 0 ? (
          <p className="text-sm text-slate-600">No completed stays to review right now.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {eligible.map((e) => (
              <div key={e.booking_id} className="p-3 border border-slate-200 rounded-xl">
                <div className="font-semibold text-slate-900">{e.resort?.name || 'Resort'}</div>
                <div className="text-xs text-slate-600">{e.resort?.location || '—'}</div>
                <div className="mt-2 flex items-center gap-2">
                  {e.resort?.id && (
                    <Link href={`/resorts/${e.resort.id}`} className="text-xs font-semibold text-resort-600 hover:text-resort-700">Write a review →</Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
