'use client'
import React, { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { getProvinceCoordinates } from '../lib/locations'
import 'leaflet/dist/leaflet.css'
import { FiMapPin } from 'react-icons/fi'

// Dynamic import to avoid SSR issues with Leaflet
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
)
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
)
const useMap = dynamic(
  () => import('react-leaflet').then((mod) => mod.useMap as any),
  { ssr: false }
) as any

interface Resort {
  id: string
  name: string
  location: string
  price: number
  images?: string[]
  type?: string
  description?: string
  latitude?: number | null
  longitude?: number | null
  address?: string | null
}

interface ResortMapProps {
  resorts: Resort[]
  userPosition?: { latitude: number; longitude: number } | null
  onResortClick?: (resortId: string) => void
  selectedResortId?: string | null
  className?: string
}

// Component to handle map bounds
function MapBoundsHandler({ resorts, userPosition }: { resorts: Resort[]; userPosition?: { latitude: number; longitude: number } | null }) {
  const [mapReady, setMapReady] = useState(false)
  
  useEffect(() => {
    setMapReady(true)
  }, [])

  if (!mapReady) return null

  return null
}

// Custom marker icon - Airbnb style price tags
function getMarkerIcon(isSelected: boolean = false, isUser: boolean = false, price?: number) {
  if (typeof window === 'undefined') return null
  
  const L = require('leaflet')
  
  if (isUser) {
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div class="relative">
          <div class="w-8 h-8 bg-blue-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center animate-pulse">
            <div class="w-3 h-3 bg-white rounded-full"></div>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    })
  }

  // Format price for display
  const formatPrice = (p: number) => {
    if (p >= 1000) {
      return `₱${(p / 1000).toFixed(p % 1000 === 0 ? 0 : 1)}k`
    }
    return `₱${p}`
  }
  
  const priceText = price ? formatPrice(price) : ''
  const width = price ? Math.max(60, priceText.length * 10 + 20) : 40
  
  // Airbnb-style price tag marker
  if (price) {
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div class="cursor-pointer transform transition-all duration-200 ${isSelected ? 'scale-110' : 'hover:scale-105'} marker-pulse-hover">
          <div class="px-2 py-1.5 ${isSelected ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'} 
            rounded-full shadow-lg border ${isSelected ? 'border-slate-900' : 'border-slate-200'} 
            font-semibold text-sm whitespace-nowrap hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors">
            ${priceText}
          </div>
          ${isSelected ? `
            <div class="absolute left-1/2 -bottom-1.5 transform -translate-x-1/2 w-0 h-0 
              border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent 
              border-t-[6px] border-t-slate-900"></div>
          ` : ''}
        </div>
      `,
      iconSize: [width, 32],
      iconAnchor: [width / 2, 16],
    })
  }
  
  // Fallback to circle marker if no price
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="relative group cursor-pointer transform transition-transform ${isSelected ? 'scale-125' : 'hover:scale-110'} marker-pulse-hover">
        <div class="w-10 h-10 ${isSelected ? 'bg-resort-600' : 'bg-resort-500'} rounded-full border-3 ${isSelected ? 'border-white ring-4 ring-resort-300' : 'border-white'} shadow-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          </svg>
        </div>
        ${isSelected ? `<div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-resort-600"></div>` : ''}
      </div>
    `,
    iconSize: [40, 48],
    iconAnchor: [20, 48],
  })
}

export default function ResortMap({ resorts, userPosition, onResortClick, selectedResortId, className = '' }: ResortMapProps) {
  const [isClient, setIsClient] = useState(false)
  const [mapKey, setMapKey] = useState(0)
  
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Calculate resort positions - prefer exact coordinates, fallback to province
  const resortPositions = useMemo(() => {
    return resorts
      .map((resort) => {
        // Use exact coordinates if available
        if (resort.latitude && resort.longitude) {
          return {
            ...resort,
            lat: resort.latitude,
            lng: resort.longitude,
            hasExactLocation: true,
          }
        }
        // Fallback to province center coordinates
        const coords = getProvinceCoordinates(resort.location)
        if (!coords) return null
        return {
          ...resort,
          lat: coords.lat,
          lng: coords.lng,
          hasExactLocation: false,
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
  }, [resorts])

  // Calculate center and bounds
  const { center, zoom } = useMemo(() => {
    if (userPosition) {
      return {
        center: [userPosition.latitude, userPosition.longitude] as [number, number],
        zoom: 8,
      }
    }
    
    if (resortPositions.length === 0) {
      // Default to Philippines center
      return {
        center: [12.8797, 121.7740] as [number, number],
        zoom: 6,
      }
    }
    
    if (resortPositions.length === 1) {
      return {
        center: [resortPositions[0].lat, resortPositions[0].lng] as [number, number],
        zoom: 10,
      }
    }
    
    // Calculate center from all resorts
    const avgLat = resortPositions.reduce((sum, r) => sum + r.lat, 0) / resortPositions.length
    const avgLng = resortPositions.reduce((sum, r) => sum + r.lng, 0) / resortPositions.length
    
    return {
      center: [avgLat, avgLng] as [number, number],
      zoom: 6,
    }
  }, [resortPositions, userPosition])

  if (!isClient) {
    return (
      <div className={`bg-slate-100 rounded-2xl flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-3 border-resort-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-slate-600 font-medium">Loading map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative rounded-2xl overflow-hidden shadow-lg border-2 border-slate-200 ${className}`}>
      {/* Map Legend */}
      <div className="absolute top-4 right-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-3 border border-slate-200">
        <div className="text-xs font-semibold text-slate-700 mb-2">Legend</div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-resort-500 rounded-full border-2 border-white shadow"></div>
            <span className="text-xs text-slate-600">Resort</span>
          </div>
          {userPosition && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow animate-pulse"></div>
              <span className="text-xs text-slate-600">Your location</span>
            </div>
          )}
        </div>
      </div>

      {/* Resort Count Badge */}
      <div className="absolute top-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-4 py-2 border border-slate-200">
        <div className="flex items-center gap-2">
          <FiMapPin aria-hidden className="text-lg" />
          <span className="text-sm font-semibold text-slate-700">{resortPositions.length} resorts on map</span>
        </div>
      </div>

      <MapContainer
        key={mapKey}
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%', minHeight: '400px' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* User position marker */}
        {userPosition && (
          <Marker 
            position={[userPosition.latitude, userPosition.longitude]}
            icon={getMarkerIcon(false, true)}
          >
            <Popup>
              <div className="text-center p-1">
                <p className="font-semibold text-blue-700 flex items-center gap-1"><FiMapPin aria-hidden /> <span>You are here</span></p>
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Resort markers with price tags */}
        {resortPositions.map((resort) => (
          <Marker
            key={resort.id}
            position={[resort.lat, resort.lng]}
            icon={getMarkerIcon(selectedResortId === resort.id, false, resort.price)}
            eventHandlers={{
              click: () => onResortClick?.(resort.id),
            }}
          >
            <Popup>
              <div className="w-64 p-1">
                {resort.images && resort.images[0] && (
                  <div className="relative h-32 rounded-lg overflow-hidden mb-3">
                    <img 
                      src={resort.images[0]} 
                      alt={resort.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 flex gap-1">
                      {resort.type && (
                        <span className="px-2 py-0.5 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-slate-700 capitalize">
                          {resort.type}
                        </span>
                      )}
                      {resort.hasExactLocation && (
                        <span className="px-2 py-0.5 bg-green-500/90 backdrop-blur-sm rounded-full text-xs font-medium text-white">
                          <span className="inline-flex items-center gap-1"><FiMapPin aria-hidden /> Exact</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <h3 className="font-bold text-slate-900 text-base mb-1">{resort.name}</h3>
                <p className="text-sm text-slate-600 mb-1">{resort.address || resort.location}</p>
                {resort.address && (
                  <p className="text-xs text-slate-400 mb-2">{resort.location}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-resort-600">₱{resort.price?.toLocaleString()}<span className="text-sm font-normal text-slate-500">/night</span></span>
                  <a 
                    href={`/resorts/${resort.id}`}
                    className="px-3 py-1.5 bg-resort-500 hover:bg-resort-600 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    View
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
        
        <MapBoundsHandler resorts={resortPositions} userPosition={userPosition} />
      </MapContainer>
    </div>
  )
}
