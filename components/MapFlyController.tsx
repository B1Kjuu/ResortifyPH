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
      map.flyTo([userPosition.latitude, userPosition.longitude], 14, { duration: 1.2 })
    }
  }, [map, userPosition, flyToUserTrigger])

  return null
}
