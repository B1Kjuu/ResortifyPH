'use client'
import React, { useState } from 'react'
import Image from 'next/image'
import { z } from 'zod'
import { supabase } from '../lib/supabaseClient'
import { FiCamera, FiX } from 'react-icons/fi'

const schema = z.object({
  rating: z.number().min(1).max(5),
  title: z.string().max(120).optional().or(z.literal('')),
  content: z.string().min(10, 'Please share a bit more (10+ chars)').max(2000),
})

const MAX_PHOTOS = 4

export default function ReviewForm({ resortId, bookingId, onSubmitted }: { resortId: string, bookingId: string, onSubmitted: () => void }){
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    
    const remainingSlots = MAX_PHOTOS - images.length
    if (remainingSlots <= 0) {
      setError(`Maximum ${MAX_PHOTOS} photos allowed`)
      return
    }
    
    const filesToUpload = Array.from(files).slice(0, remainingSlots)
    setUploading(true)
    setError(null)
    
    try {
      const uploadedUrls: string[] = []
      
      for (const file of filesToUpload) {
        // Validate file type and size
        if (!file.type.startsWith('image/')) {
          setError('Only image files are allowed')
          continue
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          setError('Each image must be under 5MB')
          continue
        }
        
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split('.').pop()}`
        const filePath = `reviews/${resortId}/${fileName}`
        
        const { error: uploadError } = await supabase.storage
          .from('resorts')
          .upload(filePath, file)
        
        if (uploadError) {
          console.error('Upload error:', uploadError)
          continue
        }
        
        const { data: urlData } = supabase.storage.from('resorts').getPublicUrl(filePath)
        if (urlData?.publicUrl) {
          uploadedUrls.push(urlData.publicUrl)
        }
      }
      
      setImages(prev => [...prev, ...uploadedUrls])
    } catch (err) {
      console.error('Upload failed:', err)
      setError('Failed to upload images')
    } finally {
      setUploading(false)
    }
  }

  function removeImage(index: number) {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  async function submit(){
    setError(null)
    const parsed = schema.safeParse({ rating, title, content })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Invalid input')
      return
    }
    setSubmitting(true)
    try {
      // First try the RPC
      const { data, error } = await supabase.rpc('create_review_safe', {
        p_resort_id: resortId,
        p_booking_id: bookingId,
        p_rating: rating,
        p_title: title || null,
        p_content: content,
      })
      
      if (error) {
        // Provide user-friendly error messages
        const msg = error.message || ''
        if (msg.includes('not_authenticated')) {
          setError('Please sign in to submit a review.')
        } else if (msg.includes('booking_not_eligible')) {
          setError('Your booking must be confirmed and completed (past checkout date) to leave a review.')
        } else if (msg.includes('duplicate_review')) {
          setError('You have already reviewed this booking.')
        } else if (msg.includes('invalid_rating')) {
          setError('Please select a rating between 1 and 5 stars.')
        } else {
          setError(msg || 'Failed to submit review. Please try again.')
        }
      } else {
        // If we have images, update the review with them
        if (images.length > 0 && data) {
          await supabase
            .from('reviews')
            .update({ images })
            .eq('id', data)
        }
        
        setRating(5); setTitle(''); setContent(''); setImages([])
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
        
        {/* Photo Upload */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Add Photos (optional, up to {MAX_PHOTOS})
          </label>
          <div className="flex flex-wrap gap-2">
            {/* Preview uploaded images */}
            {images.map((img, idx) => (
              <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200">
                <Image 
                  src={img} 
                  alt={`Upload ${idx + 1}`} 
                  fill 
                  className="object-cover"
                  sizes="80px"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white"
                >
                  <FiX className="w-3 h-3" />
                </button>
              </div>
            ))}
            
            {/* Upload button */}
            {images.length < MAX_PHOTOS && (
              <label className={`w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer transition ${
                uploading ? 'border-resort-300 bg-resort-50' : 'border-slate-300 hover:border-resort-400 hover:bg-resort-50'
              }`}>
                {uploading ? (
                  <div className="animate-spin w-5 h-5 border-2 border-resort-500 border-t-transparent rounded-full" />
                ) : (
                  <>
                    <FiCamera className="w-5 h-5 text-slate-400" />
                    <span className="text-xs text-slate-500 mt-1">Add</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">Max 5MB per image. JPG, PNG, or WebP.</p>
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={submit}
            disabled={submitting || uploading}
            className="px-5 py-2.5 bg-resort-600 text-white rounded-xl font-semibold shadow hover:bg-resort-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>
  )
}
