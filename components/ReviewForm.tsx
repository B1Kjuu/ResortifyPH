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
  
  const isMobile = typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  // Compress image before upload
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = document.createElement('img')
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          
          // Max dimensions for review images
          const MAX_WIDTH = 1600
          const MAX_HEIGHT = 1600
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width
              width = MAX_WIDTH
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height
              height = MAX_HEIGHT
            }
          }
          
          canvas.width = width
          canvas.height = height
          
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                })
                resolve(compressedFile)
              } else {
                reject(new Error('Compression failed'))
              }
            },
            'image/jpeg',
            0.87 // 87% quality
          )
        }
        img.onerror = () => reject(new Error('Failed to load image'))
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
    })
  }

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
        
        // Compress image if over 500KB
        let fileToUpload = file
        if (file.size > 500 * 1024) {
          console.log(`🗜️ Compressing review image...`)
          try {
            fileToUpload = await compressImage(file)
            console.log(`✅ Compressed:`, {
              original: (file.size / 1024).toFixed(1) + ' KB',
              compressed: (fileToUpload.size / 1024).toFixed(1) + ' KB',
              saved: ((1 - fileToUpload.size / file.size) * 100).toFixed(0) + '%'
            })
          } catch (compressionError) {
            console.warn(`⚠️ Compression failed, using original`)
            fileToUpload = file
          }
        }
        
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split('.').pop()}`
        const filePath = `reviews/${resortId}/${fileName}`
        
        // Mobile-optimized upload with retry
        let uploadData = null
        let uploadError = null
        const maxRetries = isMobile ? 3 : 1
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const timeoutMs = isMobile ? (attempt * 20000) : 30000
            
            console.log(`📤 Upload attempt ${attempt}/${maxRetries}`)
            const { data, error } = await supabase.storage
              .from('review-images')
              .upload(filePath, fileToUpload)
            
            if (!error) {
              uploadData = data
              console.log(`✅ Upload successful`)
              break
            } else {
              uploadError = error
              console.warn(`⚠️ Attempt ${attempt} failed:`, error.message)
              if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
              }
            }
          } catch (err: any) {
            console.error(`❌ Attempt ${attempt} error:`, err)
            uploadError = err
            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
            }
          }
        }
        
        if (uploadError || !uploadData) {
          console.error('Final upload error:', uploadError)
          setError(`Upload failed after ${maxRetries} attempts`)
          continue
        }
        
        const { data: urlData } = supabase.storage.from('review-images').getPublicUrl(filePath)
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
        
        // Send notification to resort owner (non-blocking)
        if (data) {
          const { data: { session } } = await supabase.auth.getSession()
          fetch('/api/notifications/review-posted', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
            },
            keepalive: true,
            body: JSON.stringify({
              reviewId: data,
              resortId,
              rating,
              title,
              content
            })
          }).catch(err => console.warn('Review notification failed:', err))
        }
        
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
