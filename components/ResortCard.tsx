'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

// Helper to check if listing is new (within last 14 days)
function isNewListing(createdAt: string) {
  const created = new Date(createdAt)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays <= 14
}

type Props = {
  resort: any
  compact?: boolean
  nights?: number
  showTotalPrice?: boolean
}

export default function ResortCard({ resort, compact = false, nights = 0, showTotalPrice = false }: Props){
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  
  const images = resort.images?.length > 0 
    ? resort.images 
    : ['data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect width="400" height="400" fill="%23e2e8f0"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="48" fill="%2394a3b8"%3E🏨%3C/text%3E%3C/svg%3E']
  
  const handlePrevImage = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }
  
  const handleNextImage = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }
  
  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsWishlisted(!isWishlisted)
  }
  
  return (
    <Link href={`/resorts/${resort.id}`}>
      <article 
        className="group cursor-pointer h-full"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Image Container - Airbnb Style */}
        <div className="relative overflow-hidden aspect-square rounded-xl bg-slate-100 fade-in-up">
          <img 
            src={images[currentImageIndex]} 
            alt={resort.name} 
            className="w-full h-full object-cover transition-transform duration-300"
          />
          
          {/* Image Navigation Arrows */}
          {images.length > 1 && isHovered && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
              >
                <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
              >
                <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
          
          {/* Image Dots */}
          {images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
              {images.slice(0, 5).map((_: string, idx: number) => (
                <span
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    idx === currentImageIndex
                      ? 'bg-white w-2'
                      : 'bg-white/60'
                  }`}
                />
              ))}
              {images.length > 5 && (
                <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
              )}
            </div>
          )}
          
          {/* Wishlist Heart */}
          <button 
            onClick={handleWishlist}
            className="absolute top-3 right-3 p-2 transition-transform hover:scale-110"
          >
            <svg 
              className={`w-6 h-6 drop-shadow-md transition-colors ${
                isWishlisted ? 'text-red-500 fill-red-500' : 'text-white fill-white/20 stroke-white'
              }`} 
              fill="currentColor"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </button>

          {/* Guest Favorite Badge */}
          {resort.rating && resort.rating >= 4.8 && (
            <div className="absolute top-3 left-3 bg-white rounded-full px-2.5 py-1 shadow-sm">
              <span className="text-xs font-semibold text-slate-900">Guest favorite</span>
            </div>
          )}
          
          {/* New listing badge */}
          {!resort.rating && resort.created_at && isNewListing(resort.created_at) && (
            <div className="absolute top-3 left-3 bg-white rounded-full px-2.5 py-1 shadow-sm">
              <span className="text-xs font-semibold text-slate-900">New</span>
            </div>
          )}
        </div>

        {/* Content - Airbnb Minimal Style */}
        <div className="mt-3 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-slate-900 text-[15px] line-clamp-1">
              {resort.name}
            </h3>
            {resort.rating && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <svg className="w-3.5 h-3.5 text-slate-900" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-sm text-slate-900">{resort.rating}</span>
              </div>
            )}
          </div>
          
          <p className="text-sm text-slate-500 line-clamp-1">
            {resort.location}
          </p>
          
          <p className="text-sm text-slate-500">
            {resort.type && (
              <span className="capitalize">{resort.type} resort</span>
            )}
          </p>
          
          {/* Price */}
          <div className="pt-1 flex items-center gap-2">
            <span className="font-semibold text-slate-900">₱{resort.price?.toLocaleString()}</span>
            <span className="text-slate-500">night</span>
            {resort.instant_book && (
              <span className="ml-auto" title="Instant Book">
                <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
              </span>
            )}
          </div>
          {showTotalPrice && nights > 0 && resort.price ? (
            <div className="mt-0.5 text-xs text-slate-600">
              Total for {nights} night{nights > 1 ? 's' : ''}: <span className="font-semibold text-slate-900">₱{(nights * (resort.price || 0)).toLocaleString()}</span>
            </div>
          ) : null}
        </div>
      </article>
    </Link>
  )
}
