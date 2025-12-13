'use client'
import { useState, useEffect, useCallback } from 'react'

export interface GeolocationPosition {
  latitude: number
  longitude: number
  accuracy: number
}

export interface GeolocationState {
  position: GeolocationPosition | null
  error: string | null
  loading: boolean
  supported: boolean
}

export interface UseGeolocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
}

const defaultOptions: UseGeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 300000, // 5 minutes cache
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  // Start with supported: false to avoid hydration mismatch
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    loading: false,
    supported: false,
  })

  const mergedOptions = { ...defaultOptions, ...options }

  // Check geolocation support on client side only
  useEffect(() => {
    const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator
    setState(prev => ({ ...prev, supported: isSupported }))
  }, [])

  const requestLocation = useCallback(() => {
    if (!state.supported) {
      setState(prev => ({ ...prev, error: 'Geolocation is not supported by your browser' }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          position: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
          error: null,
          loading: false,
          supported: true,
        })
      },
      (error) => {
        let errorMessage = 'Failed to get location'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out'
            break
        }
        setState(prev => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }))
      },
      {
        enableHighAccuracy: mergedOptions.enableHighAccuracy,
        timeout: mergedOptions.timeout,
        maximumAge: mergedOptions.maximumAge,
      }
    )
  }, [state.supported, mergedOptions.enableHighAccuracy, mergedOptions.timeout, mergedOptions.maximumAge])

  // Try to get cached position on mount
  useEffect(() => {
    if (state.supported && !state.position && !state.loading) {
      // Check for cached position with high maximumAge
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setState({
            position: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            },
            error: null,
            loading: false,
            supported: true,
          })
        },
        () => {
          // Silently fail on initial cached check
        },
        { maximumAge: 600000, timeout: 0 } // Check cache only
      )
    }
  }, [])

  return {
    ...state,
    requestLocation,
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`
  }
  if (km < 10) {
    return `${km.toFixed(1)} km`
  }
  return `${Math.round(km)} km`
}
