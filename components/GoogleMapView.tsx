'use client'
import React, { useEffect, useRef, useState, useCallback } from 'react'
import { FiMapPin, FiNavigation, FiCrosshair, FiLoader } from 'react-icons/fi'

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
  distance?: number | null
}

interface GoogleMapViewProps {
  resorts: Resort[]
  userPosition?: { latitude: number; longitude: number } | null
  onResortClick?: (resortId: string) => void
  selectedResortId?: string | null
  className?: string
  onRequestLocation?: () => void
  showNearbyButton?: boolean
  geoLoading?: boolean
}

declare global {
  interface Window {
    google: any
    initGoogleMaps: () => void
  }
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

export default function GoogleMapView({
  resorts,
  userPosition,
  onResortClick,
  selectedResortId,
  className = '',
  onRequestLocation,
  showNearbyButton = true,
  geoLoading = false,
}: GoogleMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
  const userMarkerRef = useRef<any>(null)
  const infoWindowRef = useRef<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load Google Maps script
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      console.warn('Google Maps API key not configured')
      return
    }

    if (window.google?.maps) {
      setIsLoaded(true)
      return
    }

    // Set up callback
    window.initGoogleMaps = () => {
      setIsLoaded(true)
    }

    // Load script
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&callback=initGoogleMaps`
    script.async = true
    script.defer = true
    document.head.appendChild(script)

    return () => {
      // Cleanup
      if (window.initGoogleMaps) {
        window.initGoogleMaps = undefined as any
      }
    }
  }, [])

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return
    
    // Only create map once
    if (!mapInstanceRef.current) {
      const center = userPosition
        ? { lat: userPosition.latitude, lng: userPosition.longitude }
        : { lat: 12.8797, lng: 121.774 } // Center of Philippines

      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: userPosition ? 10 : 6,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      })
    }
    
    // Always ensure InfoWindow exists
    if (!infoWindowRef.current) {
      infoWindowRef.current = new window.google.maps.InfoWindow({
        maxWidth: 280,
      })
    }
  }, [isLoaded, userPosition])

  // Update user marker
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current) return

    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null)
    }

    if (userPosition) {
      userMarkerRef.current = new window.google.maps.Marker({
        position: { lat: userPosition.latitude, lng: userPosition.longitude },
        map: mapInstanceRef.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#3b82f6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        title: 'Your location',
        zIndex: 1000,
      })

      // Add pulsing effect
      const pulseMarker = new window.google.maps.Marker({
        position: { lat: userPosition.latitude, lng: userPosition.longitude },
        map: mapInstanceRef.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 20,
          fillColor: '#3b82f6',
          fillOpacity: 0.3,
          strokeColor: '#3b82f6',
          strokeWeight: 1,
        },
        zIndex: 999,
      })

      // Center map on user and zoom to neighborhood level
      mapInstanceRef.current.panTo({ lat: userPosition.latitude, lng: userPosition.longitude })
      mapInstanceRef.current.setZoom(16) // Neighborhood level zoom
    }
  }, [isLoaded, userPosition])

  // Update resort markers
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current) return

    // Clear existing markers and overlays
    markersRef.current.forEach((item: any) => {
      if (item.marker) item.marker.setMap(null)
      if (item.customMarker) item.customMarker.setMap(null)
      if (item.setMap) item.setMap(null) // Legacy support
    })
    markersRef.current.clear()

    // Function to open info window - defined before loop
    function openInfoWindow(resort: any, position: any) {
      // Focus the map when a resort is clicked
      try {
        mapInstanceRef.current?.panTo(position)
        const currentZoom = mapInstanceRef.current?.getZoom?.() ?? 0
        mapInstanceRef.current?.setZoom(Math.max(currentZoom, 15))
      } catch {}

      const image = resort.images?.[0] || '/assets/placeholder.jpg'
      const typeLabel = resort.type ? `<span style="display: inline-block; padding: 4px 12px; background: linear-gradient(135deg, #f1f5f9, #e2e8f0); border-radius: 16px; font-size: 11px; font-weight: 600; color: #475569; text-transform: capitalize;">${resort.type}</span>` : ''
      
      const content = `
        <div style="width: min(260px, 85vw); font-family: system-ui, -apple-system, sans-serif;">
          <div style="position: relative;">
            <img src="${image}" alt="${resort.name}" style="width: 100%; height: 130px; object-fit: cover; border-radius: 10px 10px 0 0;" onerror="this.src='/assets/placeholder.jpg'" />
            <div style="position: absolute; top: 8px; left: 8px;">${typeLabel}</div>
          </div>
          <div style="padding: 12px;">
            <h3 style="margin: 0 0 4px; font-size: 15px; font-weight: 700; color: #1f2937; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${resort.name}</h3>
            <p style="margin: 0 0 8px; font-size: 12px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${resort.address || resort.location}</p>
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div>
                <span style="font-size: 16px; font-weight: 700; color: #0891b2;">₱${resort.price.toLocaleString()}</span>
                <span style="font-size: 11px; color: #6b7280;">/night</span>
              </div>
              <a href="/resorts/${resort.slug || resort.id}" style="padding: 8px 14px; background: #0891b2; color: white; border-radius: 8px; font-size: 12px; font-weight: 600; text-decoration: none;">View</a>
            </div>
            ${resort.distance != null ? `<p style="margin: 8px 0 0; font-size: 11px; color: #6b7280;">📍 ${resort.distance < 1 ? `${Math.round(resort.distance * 1000)} m away` : `${resort.distance.toFixed(1)} km away`}</p>` : ''}
          </div>
        </div>
      `
      
      if (!infoWindowRef.current) {
        infoWindowRef.current = new window.google.maps.InfoWindow({ 
          maxWidth: 280,
          disableAutoPan: false
        })
      }
      
      infoWindowRef.current.setContent(content)
      infoWindowRef.current.setPosition(position)
      infoWindowRef.current.open(mapInstanceRef.current)
      
      if (onResortClick) {
        onResortClick(resort.id)
      }
    }

    const bounds = new window.google.maps.LatLngBounds()
    let hasValidMarkers = false

    resorts.forEach(resort => {
      if (!resort.latitude || !resort.longitude) return

      const position = { lat: resort.latitude, lng: resort.longitude }
      hasValidMarkers = true
      bounds.extend(position)

      const isSelected = resort.id === selectedResortId
      const priceLabel = resort.price >= 1000
        ? `₱${(resort.price / 1000).toFixed(resort.price % 1000 === 0 ? 0 : 1)}k`
        : `₱${resort.price}`

      // Create a custom HTML element for the marker
      const markerDiv = document.createElement('div')
      markerDiv.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          transform: translate(-50%, -100%);
        ">
          <div style="
            padding: 6px 12px;
            background: ${isSelected ? '#0891b2' : '#ffffff'};
            color: ${isSelected ? '#ffffff' : '#1f2937'};
            font-size: 13px;
            font-weight: 700;
            font-family: system-ui, -apple-system, sans-serif;
            border-radius: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1);
            border: 2px solid ${isSelected ? '#0891b2' : '#e2e8f0'};
            white-space: nowrap;
            transition: all 0.15s ease;
          ">${priceLabel}</div>
          <div style="
            width: 0;
            height: 0;
            border-left: 8px solid transparent;
            border-right: 8px solid transparent;
            border-top: 8px solid ${isSelected ? '#0891b2' : '#ffffff'};
            margin-top: -2px;
            filter: drop-shadow(0 1px 1px rgba(0,0,0,0.1));
          "></div>
        </div>
      `

      // Create marker using OverlayView for custom HTML
      const marker = new window.google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 0,
        },
        zIndex: isSelected ? 100 : 1,
      })

      // Create custom overlay for the marker
      class CustomMarker extends window.google.maps.OverlayView {
        position: any
        div: HTMLElement | null = null
        
        constructor(position: any, map: any) {
          super()
          this.position = position
          this.setMap(map)
        }
        
        onAdd() {
          this.div = markerDiv.firstElementChild as HTMLElement
          const panes = this.getPanes()
          panes?.overlayMouseTarget.appendChild(this.div)
          
          // Add click listener
          this.div.addEventListener('click', (e) => {
            e.stopPropagation()
            openInfoWindow(resort, position)
          })
          
          // Hover effect
          this.div.addEventListener('mouseenter', () => {
            if (this.div) {
              const inner = this.div.querySelector('div') as HTMLElement
              if (inner && !isSelected) {
                inner.style.transform = 'scale(1.08)'
                inner.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'
              }
            }
          })
          this.div.addEventListener('mouseleave', () => {
            if (this.div) {
              const inner = this.div.querySelector('div') as HTMLElement
              if (inner) {
                inner.style.transform = 'scale(1)'
                inner.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)'
              }
            }
          })
        }
        
        draw() {
          if (!this.div) return
          const overlayProjection = this.getProjection()
          const pos = overlayProjection.fromLatLngToDivPixel(this.position)
          if (pos) {
            this.div.style.position = 'absolute'
            this.div.style.left = pos.x + 'px'
            this.div.style.top = pos.y + 'px'
          }
        }
        
        onRemove() {
          if (this.div?.parentNode) {
            this.div.parentNode.removeChild(this.div)
            this.div = null
          }
        }
      }
      
      const customMarker = new CustomMarker(position, mapInstanceRef.current)
      markersRef.current.set(resort.id, { marker, customMarker })
    })

    // Add user position to bounds if available
    if (userPosition) {
      bounds.extend({ lat: userPosition.latitude, lng: userPosition.longitude })
    }

    // Fit bounds if we have markers
    if (hasValidMarkers && markersRef.current.size > 1) {
      mapInstanceRef.current.fitBounds(bounds, { padding: 50 })
    }
  }, [isLoaded, resorts, selectedResortId, userPosition, onResortClick])

  // Pan/zoom when a resort is selected externally (e.g., from a list click)
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current || !selectedResortId) return
    const selected = resorts.find(r => r.id === selectedResortId)
    if (!selected?.latitude || !selected?.longitude) return

    const position = { lat: selected.latitude, lng: selected.longitude }
    try {
      mapInstanceRef.current.panTo(position)
      const currentZoom = mapInstanceRef.current.getZoom?.() ?? 0
      mapInstanceRef.current.setZoom(Math.max(currentZoom, 14))
    } catch {}
  }, [isLoaded, selectedResortId, resorts])

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className={`bg-slate-100 rounded-xl flex items-center justify-center ${className}`} style={{ minHeight: 300 }}>
        <div className="text-center p-6">
          <FiMapPin className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Map not available</p>
          <p className="text-sm text-slate-500">Google Maps API key not configured</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {/* Loading state */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-100 rounded-xl flex items-center justify-center z-10">
          <div className="text-center">
            <FiLoader className="w-8 h-8 text-resort-500 animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-600">Loading map...</p>
          </div>
        </div>
      )}

      {/* Map container */}
      <div
        ref={mapRef}
        className="w-full h-full min-h-[400px] rounded-xl"
      />

      {/* Controls - top right */}
      {showNearbyButton && onRequestLocation && (
        <div className="absolute top-3 right-3">
          <button
            onClick={() => {
              if (userPosition && mapInstanceRef.current) {
                try {
                  mapInstanceRef.current.panTo({ lat: userPosition.latitude, lng: userPosition.longitude })
                  mapInstanceRef.current.setZoom(16)
                  return
                } catch {}
              }
              onRequestLocation()
            }}
            disabled={geoLoading}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl shadow-lg border transition-all ${
              userPosition 
                ? 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600' 
                : geoLoading
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-wait'
                  : 'bg-white/95 backdrop-blur-sm text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-blue-300'
            }`}
            title={userPosition ? 'Go to my location' : 'Find my location'}
          >
            {geoLoading ? (
              <FiLoader className="w-4 h-4 animate-spin" />
            ) : userPosition ? (
              <FiCrosshair className="w-4 h-4" />
            ) : (
              <FiNavigation className="w-4 h-4" />
            )}
            <span className="text-xs font-semibold whitespace-nowrap">
              {geoLoading ? 'Locating...' : userPosition ? 'My Location' : 'Nearby Me'}
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
