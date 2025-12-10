'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

type Props = {
  resort: any
}

export default function ResortCard({ resort }: Props){
  const [isHovered, setIsHovered] = useState(false)
  const image = resort.images?.[0] || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect width="400" height="400" fill="%23e2e8f0"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="48" fill="%2394a3b8"%3E🏨%3C/text%3E%3C/svg%3E'
  
  return (
    <Link href={`/resorts/${resort.id}`}>
      <article 
        className="group cursor-pointer h-full bg-white rounded-2xl border-2 border-slate-200 overflow-hidden transition-all hover:shadow-2xl hover:border-resort-400 hover:-translate-y-1"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Image Container with Overlay */}
        <div className="relative overflow-hidden aspect-[4/3] bg-slate-200">
          <Image 
            src={image} 
            alt={resort.name}
            width={400}
            height={300}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className={`absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />
          
          {/* Heart Icon */}
          <button 
            className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full p-2.5 shadow-lg hover:shadow-xl hover:scale-110 transition-all"
            onClick={(e) => e.preventDefault()}
          >
            <svg className="w-5 h-5 text-slate-600 hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>

          {/* Type Badge */}
          {resort.type && (
            <div className="absolute top-4 left-4 bg-gradient-to-r from-resort-500 to-blue-500 rounded-lg px-3 py-1.5 shadow-lg">
              <span className="text-xs font-bold text-white uppercase tracking-wide">
                {resort.type === 'beach' && '🏖️ Beach'}
                {resort.type === 'mountain' && '🏔️ Mountain'}
                {resort.type === 'nature' && '🌿 Nature'}
                {resort.type === 'city' && '🏙️ City'}
                {resort.type === 'countryside' && '🌾 Countryside'}
              </span>
            </div>
          )}

          {/* Rating Badge */}
          {resort.rating && (
            <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl px-3 py-1.5 shadow-lg flex items-center gap-1">
              <span className="text-yellow-400 text-lg">★</span>
              <span className="text-sm font-bold text-slate-900">{resort.rating}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          <div>
            <h3 className="font-bold text-slate-900 text-lg line-clamp-2 group-hover:text-resort-600 transition-colors mb-1">
              {resort.name}
            </h3>
            <p className="text-sm text-slate-500 line-clamp-1 flex items-center gap-1">
              <span>📍</span>
              <span>{resort.location}</span>
            </p>
          </div>
          
          {/* Description */}
          {resort.description && (
            <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
              {resort.description}
            </p>
          )}

          {/* Amenities Preview */}
          {resort.amenities && resort.amenities.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {resort.amenities.slice(0, 3).map((amenity: string, idx: number) => (
                <span key={idx} className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-medium border border-slate-200">
                  {amenity}
                </span>
              ))}
              {resort.amenities.length > 3 && (
                <span className="text-xs text-slate-500 px-2 py-1 font-medium">
                  +{resort.amenities.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Price */}
          <div className="pt-3 border-t-2 border-slate-100">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold bg-gradient-to-r from-resort-600 to-blue-600 bg-clip-text text-transparent">₱{resort.price?.toLocaleString()}</span>
              <span className="text-sm text-slate-500 font-medium">per night</span>
            </div>
            {resort.capacity && (
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <span>👥</span>
                <span>Up to {resort.capacity} guests</span>
              </p>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}
