'use client'
import React, { useState } from 'react'
import { z } from 'zod'
import { supabase } from '../lib/supabaseClient'

const schema = z.object({
  rating: z.number().min(1).max(5),
  title: z.string().max(120).optional().or(z.literal('')),
  content: z.string().min(10, 'Please share a bit more (10+ chars)').max(2000),
})

export default function ReviewForm({ resortId, bookingId, onSubmitted }: { resortId: string, bookingId: string, onSubmitted: () => void }){
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(){
    setError(null)
    const parsed = schema.safeParse({ rating, title, content })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Invalid input')
      return
    }
    setSubmitting(true)
    try {
      const { data, error } = await supabase.rpc('create_review_safe', {
        p_resort_id: resortId,
        p_booking_id: bookingId,
        p_rating: rating,
        p_title: title || null,
        p_content: content,
      })
      if (error) {
        setError(error.message)
      } else {
        setRating(5); setTitle(''); setContent('')
        onSubmitted()
      }
    } catch (e: any) {
      setError(e?.message || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <h3 className="text-xl font-bold text-resort-900 mb-3">Write a Review</h3>
      <p className="text-sm text-slate-600 mb-4">Rate your completed stay and share feedback to help others.</p>

      {error && (
        <div className="mb-3 px-4 py-3 rounded-lg text-sm font-semibold bg-red-50 text-red-700 border border-red-200">{error}</div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-semibold text-slate-700">Rating</label>
          <div className="text-2xl">
            {Array.from({length:5}).map((_,i)=> (
              <button
                key={i}
                type="button"
                onClick={() => setRating(i+1)}
                aria-label={`Set rating to ${i+1}`}
                className={(i < rating ? 'text-yellow-500' : 'text-slate-300') + ' hover:text-yellow-600'}
              >★</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700">Title (optional)</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={120}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-resort-500"
            placeholder="E.g., Amazing pool and friendly host"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700">Review</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={4}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-resort-500"
            placeholder="Share what you loved and any tips for future guests"
          />
        </div>
        <div className="flex justify-end">
          <button
            onClick={submit}
            disabled={submitting}
            className="px-5 py-2.5 bg-resort-600 text-white rounded-xl font-semibold shadow hover:bg-resort-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>
  )
}
