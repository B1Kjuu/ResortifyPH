'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Emits a synthetic window "load" event after route changes to
 * improve reliability for E2E tests that wait for navigation until "load".
 */
export default function RouteLoadNudger() {
  const pathname = usePathname()
  useEffect(() => {
    try {
      // Dispatch on route change microtask
      const id = setTimeout(() => {
        try { window.dispatchEvent(new Event('load')) } catch {}
      }, 0)
      return () => clearTimeout(id)
    } catch {}
  }, [pathname])
  return null
}
