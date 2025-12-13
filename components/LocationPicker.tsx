'use client'
import React, { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import 'leaflet/dist/leaflet.css'

// Dynamic imports for Leaflet components
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
const useMapEvents = dynamic(
  () => import('react-leaflet').then((mod) => mod.useMapEvents as any),
  { ssr: false }
) as any

interface LocationPickerProps {
  latitude: number | null
  longitude: number | null
  address: string
  onLocationChange: (lat: number, lng: number) => void
  onAddressChange: (address: string) => void
  error?: string
}

// Get marker icon
function getMarkerIcon() {
  if (typeof window === 'undefined') return null
  
  const L = require('leaflet')
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="relative animate-bounce">
        <div class="w-10 h-10 bg-resort-600 rounded-full border-3 border-white shadow-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          </svg>
        </div>
        <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-resort-600"></div>
      </div>
    `,
    iconSize: [40, 48],
    iconAnchor: [20, 48],
  })
}

// Map click handler component
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  const [ready, setReady] = useState(false)
  
  useEffect(() => {
    setReady(true)
  }, [])
  
  useEffect(() => {
    if (!ready || typeof window === 'undefined') return
    
    const { useMapEvents: useMapEventsHook } = require('react-leaflet')
    // This component just needs to exist in the tree
  }, [ready])
  
  return null
}

// Draggable marker component
function DraggableMarker({ position, onDragEnd }: { position: [number, number]; onDragEnd: (lat: number, lng: number) => void }) {
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  if (!isClient) return null
  
  return (
    <Marker
      position={position}
      icon={getMarkerIcon()}
      draggable={true}
      eventHandlers={{
        dragend: (e: any) => {
          const marker = e.target
          const pos = marker.getLatLng()
          onDragEnd(pos.lat, pos.lng)
        },
      }}
    />
  )
}

// Interactive map with click-to-place functionality
function InteractiveMap({
  position,
  onLocationSelect,
  mapRef,
}: {
  position: [number, number] | null
  onLocationSelect: (lat: number, lng: number) => void
  mapRef: React.RefObject<any>
}) {
  const [isClient, setIsClient] = useState(false)
  useEffect(() => { setIsClient(true) }, [])
  // Default center: Philippines
  const defaultCenter: [number, number] = [12.8797, 121.7740]
  const center = position || defaultCenter
  const zoom = position ? 15 : 6
  // Use a key to force remount when position changes
  const mapKey = position ? `${position[0]},${position[1]}` : 'default';
  // Use a custom component to handle map click events
  const MapEventHandler = () => {
    if (!isClient) return null;
    const { useMapEvents } = require('react-leaflet');
    useMapEvents({
      click: (e: any) => {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      },
    });
    return null;
  };
  // Effect: zoom/pan map when position changes (after search or pin)
  useEffect(() => {
    if (mapRef.current && position) {
      mapRef.current.flyTo(position, 17, { animate: true, duration: 1.2 });
    }
  }, [position, mapRef]);
  if (!isClient) {
    return (
      <div className="h-[300px] bg-slate-100 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-6 h-6 border-2 border-resort-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-sm text-slate-600">Loading map...</p>
        </div>
      </div>
    )
  }
  return (
    <MapContainer
      key={mapKey}
      center={center}
      zoom={zoom}
      style={{ height: '300px', width: '100%' }}
      scrollWheelZoom={true}
      whenCreated={(mapInstance) => { if (mapRef) mapRef.current = mapInstance; }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapEventHandler />
      {position && (
        <DraggableMarker
          position={position}
          onDragEnd={onLocationSelect}
        />
      )}
    </MapContainer>
  )
}

export default function LocationPicker({
  latitude,
  longitude,
  address,
  onLocationChange,
  onAddressChange,
  error,
}: LocationPickerProps) {
  // ...existing code...
  // All logic and hooks should be inside the function body
  const [isLocating, setIsLocating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const position: [number, number] | null = latitude && longitude ? [latitude, longitude] : null
  // Ref for map instance
  const mapRef = React.useRef<any>(null);
  // (Removed: zoom/pan logic now handled in InteractiveMap)

  // Utility: Clean address to remove non-Latin characters
  const cleanAddress = (address: string) => {
    // Allow: Latin, numbers, common punctuation, spaces, commas, dashes, periods
    return address.replace(/[^\p{Script=Latin}0-9.,\-()'"\s]/gu, '').replace(/\s+/g, ' ').trim()
  }

  // Reverse geocode to get address from coordinates using Nominatim
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        { headers: { 'User-Agent': 'ResortifyPH' } }
      );
      const data = await response.json();
      if (data.display_name) {
        const cleaned = cleanAddress(data.display_name);
        onAddressChange(cleaned);
      }
    } catch (err) {
      console.error('Reverse geocode error:', err);
    }
  }

  // Get user's current location
  const handleGetCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser')
      return
    }
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocationChange(pos.coords.latitude, pos.coords.longitude)
        setIsLocating(false)
        // Try to get address from coordinates
        reverseGeocode(pos.coords.latitude, pos.coords.longitude)
      },
      (err) => {
        console.error('Geolocation error:', err)
        alert('Unable to get your location. Please enable location services or pin manually.')
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [onLocationChange])

  // Search for address using Nominatim (OpenStreetMap)
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=ph&limit=5`,
        { headers: { 'User-Agent': 'ResortifyPH' } }
      );
      const data = await response.json();
      // Clean up display_name for each result to remove non-Latin characters
      const cleanedResults = data.map((result: any) => ({
        ...result,
        display_name: cleanAddress(result.display_name),
      }));
      setSearchResults(cleanedResults);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  }

  // Handle search result selection
  const handleSelectResult = (result: any) => {
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    onLocationChange(lat, lng)
    const cleaned = cleanAddress(result.display_name)
    onAddressChange(cleaned)
    setSearchResults([])
    setSearchQuery('')
    // Pan/zoom map to selected place
    // (Removed: zoom/pan logic now handled in InteractiveMap)
  }

  // Handle map click
  const handleMapClick = useCallback((lat: number, lng: number) => {
    onLocationChange(lat, lng)
    reverseGeocode(lat, lng)
  }, [onLocationChange])

  return (
    <div className="space-y-4">
      {/* Search and locate buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
              placeholder="Search for an address in the Philippines..."
              className="flex-1 px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 text-sm"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={isSearching}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
            >
              {isSearching ? '...' : '🔍'}
            </button>
          </div>
          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
              {searchResults.map((result, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectResult(result)}
                  className="w-full px-4 py-3 text-left hover:bg-resort-50 transition-colors border-b border-slate-100 last:border-0"
                >
                  <p className="text-sm font-medium text-slate-900 truncate">{result.display_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{result.type}</p>
                </button>
              ))}
            </div>
          )}
          {searchResults.length === 0 && searchQuery.trim() && !isSearching && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="px-4 py-3 text-slate-500 text-sm">No results found</div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={isLocating}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {isLocating ? (
            <>
              <span className="animate-spin">⏳</span>
              <span>Locating...</span>
            </>
          ) : (
            <>
              <span>📍</span>
              <span>Use My Location</span>
            </>
          )}
        </button>
      </div>
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
        <p className="text-sm text-blue-800">
          <span className="font-semibold">📌 Tip:</span> Click on the map to pin your resort location, or drag the marker to adjust. 
          You can also search for an address or use your current location.
        </p>
      </div>
      
      {/* Map */}
      <div className="rounded-xl overflow-hidden border-2 border-slate-200">
        <InteractiveMap
          position={position}
          onLocationSelect={handleMapClick}
          mapRef={mapRef}
        />
      </div>
      
      {/* Coordinates display */}
      {position && (
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
            <span className="text-green-600">✓</span>
            <span className="text-green-800 font-medium">
              {latitude?.toFixed(6)}, {longitude?.toFixed(6)}
            </span>
          </div>
        </div>
      )}
      
      {/* Address input */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Full Address <span className="text-slate-400 font-normal">(auto-filled or edit manually)</span>
        </label>
        <textarea
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder="e.g., 123 Beach Road, Brgy. San Roque, Puerto Galera, Oriental Mindoro"
          rows={2}
          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 text-sm resize-none"
        />
      </div>
      
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}
