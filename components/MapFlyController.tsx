'use client'
import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'

interface MapFlyControllerProps {
  userPosition?: { latitude: number; longitude: number } | null
  flyToUserTrigger: number
}

export default function MapFlyController({ userPosition, flyToUserTrigger }: MapFlyControllerProps) {
  const map = useMap()
  const lastTriggerRef = useRef(0)

  useEffect(() => {
    if (!map || !userPosition) return

    // Only fly if trigger has increased
    if (flyToUserTrigger > lastTriggerRef.current) {
      console.log('[MapFlyController] Flying to user:', userPosition, 'trigger:', flyToUserTrigger)
      lastTriggerRef.current = flyToUserTrigger
      // Use a minimum zoom of 14, but don't zoom out if already more zoomed in
      const currentZoom = map.getZoom()
      const targetZoom = Math.max(14, currentZoom)
      map.flyTo([userPosition.latitude, userPosition.longitude], targetZoom, { duration: 1.2 })
    }
  }, [map, userPosition, flyToUserTrigger])

  return null
}
