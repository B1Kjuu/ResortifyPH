'use client'

import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'

export default function MapFlyToResortController({
  target,
  trigger,
}: {
  target?: { latitude: number; longitude: number } | null
  trigger: number
}) {
  const map = useMap()
  const lastTriggerRef = useRef(0)

  useEffect(() => {
    if (!map || !target) return
    if (trigger <= lastTriggerRef.current) return

    lastTriggerRef.current = trigger
    map.flyTo([target.latitude, target.longitude], 14, { duration: 1.0 })
  }, [map, target, trigger])

  return null
}
