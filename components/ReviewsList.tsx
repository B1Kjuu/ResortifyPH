'use client'
import React from 'react'

type Review = {
  id: string
  rating: number
  title?: string | null
  content: string
  guest_id?: string
  created_at: string
}

export default function ReviewsList({ reviews }: { reviews: Review[] }){
  const avg = reviews.length > 0 ? (reviews.reduce((a, r) => a + (r.rating || 0), 0) / reviews.length) : 0
  const stars = Math.round(avg)

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-resort-900">Reviews</h3>
        <div className="flex items-center gap-2">
          <span className="text-lg">{Array.from({length:5}).map((_,i)=> (
            <span key={i} aria-hidden className={i < stars ? 'text-yellow-500' : 'text-slate-300'}>★</span>
          ))}</span>
          <span className="text-sm text-slate-600">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {reviews.length === 0 ? (
        <p className="text-sm text-slate-600">No reviews yet. Be the first to share your experience.</p>
      ) : (
        <div className="space-y-4">
          {reviews.map(r => (
            <div key={r.id} className="border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="text-yellow-500 text-sm" aria-label={`${r.rating} star rating`}>
                  {Array.from({length:5}).map((_,i)=> (
                    <span key={i} className={i < r.rating ? 'text-yellow-500' : 'text-slate-300'}>★</span>
                  ))}
                </div>
                <span className="text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              {r.title && <p className="mt-2 text-sm font-semibold text-resort-900">{r.title}</p>}
              <p className="mt-1 text-sm text-slate-700 leading-relaxed">{r.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
