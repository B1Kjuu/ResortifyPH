'use client'
import React, { useState, useMemo } from 'react'
import Image from 'next/image'

type Review = {
  id: string
  rating: number
  title?: string | null
  content: string
  guest_id?: string
  created_at: string
  images?: string[] | null
}

const REVIEWS_PER_PAGE = 5

export default function ReviewsList({ reviews, currentUserId }: { reviews: Review[], currentUserId?: string }){
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedImages, setExpandedImages] = useState<string | null>(null)
  
  const avg = reviews.length > 0 ? (reviews.reduce((a, r) => a + (r.rating || 0), 0) / reviews.length) : 0
  const stars = Math.round(avg)

  // Sort reviews: own review first, then by date
  const sortedReviews = useMemo(() => {
    if (!currentUserId) return reviews
    
    const ownReviews = reviews.filter(r => r.guest_id === currentUserId)
    const otherReviews = reviews.filter(r => r.guest_id !== currentUserId)
    
    return [...ownReviews, ...otherReviews]
  }, [reviews, currentUserId])

  // Pagination
  const totalPages = Math.ceil(sortedReviews.length / REVIEWS_PER_PAGE)
  const paginatedReviews = sortedReviews.slice(
    (currentPage - 1) * REVIEWS_PER_PAGE,
    currentPage * REVIEWS_PER_PAGE
  )

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
          {paginatedReviews.map(r => (
            <div 
              key={r.id} 
              className={`border rounded-xl p-4 ${
                currentUserId && r.guest_id === currentUserId 
                  ? 'border-resort-300 bg-resort-50' 
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-yellow-500 text-sm" aria-label={`${r.rating} star rating`}>
                    {Array.from({length:5}).map((_,i)=> (
                      <span key={i} className={i < r.rating ? 'text-yellow-500' : 'text-slate-300'}>★</span>
                    ))}
                  </div>
                  {currentUserId && r.guest_id === currentUserId && (
                    <span className="px-2 py-0.5 bg-resort-500 text-white text-xs font-semibold rounded-full">Your Review</span>
                  )}
                </div>
                <span className="text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              {r.title && <p className="mt-2 text-sm font-semibold text-resort-900">{r.title}</p>}
              <p className="mt-1 text-sm text-slate-700 leading-relaxed">{r.content}</p>
              
              {/* Review Images */}
              {r.images && r.images.length > 0 && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  {r.images.slice(0, 4).map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setExpandedImages(img)}
                      className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 hover:border-resort-400 transition"
                    >
                      <Image 
                        src={img} 
                        alt={`Review photo ${idx + 1}`} 
                        fill 
                        className="object-cover"
                        sizes="64px"
                        unoptimized
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4 border-t border-slate-100">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-slate-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Lightbox for expanded image */}
      {expandedImages && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setExpandedImages(null)}
        >
          <div className="relative max-w-3xl max-h-[80vh] w-full">
            <Image 
              src={expandedImages} 
              alt="Review photo" 
              width={800}
              height={600}
              className="object-contain w-full h-full rounded-lg"
              unoptimized
            />
            <button
              onClick={() => setExpandedImages(null)}
              className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
