'use client'
import React, { useMemo, useState, useRef } from 'react'
import Link from 'next/link'
import { getResortTypeLabel } from '../lib/resortTypes'
import Image from 'next/image'
import { useFavorites } from '../hooks/useFavorites'

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
  distance?: number | null  // Distance in km from user location
  slotTypePrices?: { daytour: number | null; overnight: number | null; '22hrs': number | null } | null
  selectedSlotType?: 'all' | 'daytour' | 'overnight' | '22hrs'
}

// Format distance for display
function formatDistanceDisplay(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`
  }
  return `${km.toFixed(1)}km`
}

export default function ResortCard({ resort, compact = false, nights = 0, showTotalPrice = false, distance, slotTypePrices, selectedSlotType = 'all' }: Props){
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const { ready, isFavorite, toggleFavorite } = useFavorites()
  const isFavorited = useMemo(() => (resort?.id ? isFavorite(resort.id) : false), [isFavorite, resort?.id])
  
  // Touch swipe state
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)
  const minSwipeDistance = 50
  
  const images = resort.images?.length > 0 
    ? resort.images 
    : ['data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect width="400" height="400" fill="%23e2e8f0"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="48" fill="%2394a3b8"%3E🏨%3C/text%3E%3C/svg%3E']
  
  const handlePrevImage = (e?: React.MouseEvent | React.TouchEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }
  
  const handleNextImage = (e?: React.MouseEvent | React.TouchEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }
  
  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null
    touchStartX.current = e.targetTouches[0].clientX
  }
  
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartX.current || !touchEndX.current) return
    
    const distance = touchStartX.current - touchEndX.current
    const isSwipe = Math.abs(distance) > minSwipeDistance
    
    if (isSwipe && images.length > 1) {
      if (distance > 0) {
        // Swiped left -> next image
        handleNextImage()
      } else {
        // Swiped right -> previous image
        handlePrevImage()
      }
      // Prevent navigation when swiping
      e.preventDefault()
      e.stopPropagation()
    }
    
    touchStartX.current = null
    touchEndX.current = null
  }
  
  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (resort?.id) {
      toggleFavorite(resort.id)
    }
  }
  
  return (
    <Link href={`/resorts/${resort.id}`}>
      <article 
        className="group cursor-pointer h-full"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Image Container - Enhanced Style with Touch Swipe */}
        <div 
          className="relative overflow-hidden aspect-square rounded-xl sm:rounded-2xl bg-slate-100 shadow-card group-hover:shadow-card-hover transition-all duration-300 touch-pan-y"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img 
            src={images[currentImageIndex]} 
            alt={resort.name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 pointer-events-none"
          />
          
          {/* Image Navigation Arrows - Always visible on mobile, hover on desktop */}
          {images.length > 1 && (
            <>
              <button
                onClick={handlePrevImage}
                className={`absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 ${isHovered ? 'opacity-100' : 'opacity-70 sm:opacity-0 sm:group-hover:opacity-100'}`}
              >
                <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={handleNextImage}
                className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 ${isHovered ? 'opacity-100' : 'opacity-70 sm:opacity-0 sm:group-hover:opacity-100'}`}
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
          
          {/* Favorite Heart */}
          <button 
            onClick={handleFavorite}
            className="absolute top-3 right-3 p-2 transition-transform hover:scale-110"
            aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            title={!ready ? 'Sign in to favorite' : (isFavorited ? 'Favorited' : 'Favorite')}
          >
            <svg 
              className={`w-6 h-6 drop-shadow-md transition-colors ${
                isFavorited ? 'text-red-500 fill-red-500' : 'text-white fill-white/20 stroke-white'
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
          
          {/* Distance badge - bottom left to avoid overlap with top badges */}
          {distance !== null && distance !== undefined && (
            <div className="absolute bottom-3 left-3 px-2 py-1 bg-white/95 backdrop-blur-sm rounded-full shadow-md flex items-center gap-1 z-10">
              <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>
              <span className="text-xs font-semibold text-emerald-700">{formatDistanceDisplay(distance)}</span>
            </div>
          )}
        </div>

        {/* Content - Enhanced Minimal Style */}
        <div className="mt-3 space-y-1.5 px-0.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-slate-900 text-sm sm:text-[15px] line-clamp-1 group-hover:text-resort-700 transition-colors">
              {resort.name}
            </h3>
            {resort.rating && (
              <div className="flex items-center gap-1 flex-shrink-0 bg-slate-50 px-1.5 py-0.5 rounded-md">
                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-xs sm:text-sm font-medium text-slate-900">{resort.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
          
          <p className="text-xs sm:text-sm text-slate-500 line-clamp-1 flex items-center gap-1">
            <svg className="w-3 h-3 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {resort.location}
          </p>
          
          {resort.type && (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-resort-50 to-ocean-50 text-slate-700 text-[10px] sm:text-[11px] font-medium border border-slate-100">
              <span>{getResortTypeLabel(resort.type)}</span>
            </div>
          )}
          
          {/* Price */}
          {(() => {
            // Determine price based on advanced pricing or standard
            const useAdvanced = resort.use_advanced_pricing && slotTypePrices
            let displayPrice: number | null = null
            let priceLabel = '/ night'
            
            if (useAdvanced) {
              // For advanced pricing, show price based on selected slot type
              if (selectedSlotType !== 'all' && slotTypePrices[selectedSlotType]) {
                displayPrice = slotTypePrices[selectedSlotType]
                priceLabel = selectedSlotType === 'daytour' ? '/ daytour' : selectedSlotType === 'overnight' ? '/ overnight' : '/ 22hrs'
              } else {
                // Default: show overnight, then 22hrs, then daytour
                displayPrice = slotTypePrices.overnight || slotTypePrices['22hrs'] || slotTypePrices.daytour
                priceLabel = slotTypePrices.overnight ? '/ overnight' : slotTypePrices['22hrs'] ? '/ 22hrs' : '/ daytour'
              }
            } else {
              // Standard pricing - use legacy price fields based on filter
              if (selectedSlotType === 'daytour' && resort.day_tour_price) {
                displayPrice = resort.day_tour_price
                priceLabel = '/ daytour'
              } else if (selectedSlotType === 'overnight' && (resort.overnight_price || resort.night_tour_price)) {
                displayPrice = resort.overnight_price || resort.night_tour_price
                priceLabel = '/ overnight'
              } else if (selectedSlotType === '22hrs' && resort.overnight_price) {
                displayPrice = resort.overnight_price
                priceLabel = '/ 22hrs'
              } else {
                // Default to standard price
                displayPrice = resort.price || resort.overnight_price || resort.day_tour_price || resort.night_tour_price
                priceLabel = '/ night'
              }
            }
            
            return displayPrice != null && displayPrice > 0 ? (
              <div className="pt-1 flex items-center gap-1.5 sm:gap-2">
                <span className="font-bold text-slate-900 text-sm sm:text-base">₱{displayPrice.toLocaleString()}</span>
                <span className="text-slate-500 text-xs sm:text-sm">{priceLabel}</span>
                {resort.instant_book && (
                  <span className="ml-auto" title="Instant Book">
                    <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </div>
            ) : (
              <div className="pt-1 flex items-center gap-1.5 sm:gap-2">
                <span className="text-slate-500 text-xs sm:text-sm italic">Contact for pricing</span>
              </div>
            )
          })()}
          {showTotalPrice && nights > 0 && resort.price ? (
            <div className="mt-0.5 text-[10px] sm:text-xs text-slate-600 bg-slate-50 rounded-md px-2 py-1 inline-block">
              Total for {nights} night{nights > 1 ? 's' : ''}: <span className="font-semibold text-slate-900">₱{(nights * (resort.price || 0)).toLocaleString()}</span>
            </div>
          ) : null}
        </div>
      </article>
    </Link>
  )
}
