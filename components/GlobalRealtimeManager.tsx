'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { realtimeManager } from '../lib/realtimeManager'

/**
 * Global component that manages:
 * 1. User presence (online/offline status)
 * 2. Connection quality monitoring
 * 3. Cleanup on unmount
 */
export default function GlobalRealtimeManager() {
  const [userId, setUserId] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)

  // Track auth state
  useEffect(() => {
    let mounted = true

    async function getUser() {
      const { data: { session } } = await supabase.auth.getSession()
      if (mounted && session?.user) {
        setUserId(session.user.id)
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        setUserId(session?.user?.id || null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Manage presence
  useEffect(() => {
    if (!userId) return

    // Set online
    realtimeManager.setUserPresence(userId, 'online')

    // Handle visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        realtimeManager.setUserPresence(userId, 'offline')
      } else {
        realtimeManager.setUserPresence(userId, 'online')
      }
    }

    // Handle online/offline network status
    const handleOnline = () => {
      setIsOnline(true)
      realtimeManager.setUserPresence(userId, 'online')
    }

    const handleOffline = () => {
      setIsOnline(false)
      realtimeManager.setUserPresence(userId, 'offline')
    }

    // Handle page unload
    const handleBeforeUnload = () => {
      // Set offline status on page close
      realtimeManager.setUserPresence(userId, 'offline')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      realtimeManager.setUserPresence(userId, 'offline')
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [userId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      realtimeManager.cleanup()
    }
  }, [])

  // Show offline indicator
  if (!isOnline) {
    return (
      <div className="fixed bottom-4 left-4 z-50 bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
        </svg>
        <span className="text-sm font-medium">You're offline. Changes will sync when reconnected.</span>
      </div>
    )
  }

  return null
}
