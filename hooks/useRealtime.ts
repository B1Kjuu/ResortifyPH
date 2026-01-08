'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { RealtimeChannel } from '@supabase/supabase-js'

type SubscriptionCallback<T = any> = (payload: T) => void

interface UseRealtimeOptions {
  /** Debounce time in ms for rapid updates (default: 100) */
  debounce?: number
  /** Whether to enable the subscription (default: true) */
  enabled?: boolean
}

/**
 * Hook for subscribing to real-time database changes with optimizations
 * Handles cleanup, debouncing, and connection management
 */
export function useRealtimeSubscription<T = any>(
  channelName: string,
  table: string,
  filter: string | null,
  callback: SubscriptionCallback<T>,
  options: UseRealtimeOptions = {}
) {
  const { debounce = 100, enabled = true } = options
  const channelRef = useRef<RealtimeChannel | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const callbackRef = useRef(callback)

  // Keep callback ref up to date
  callbackRef.current = callback

  useEffect(() => {
    if (!enabled) return

    // Clear any existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          // Debounce rapid updates
          if (timerRef.current) clearTimeout(timerRef.current)
          timerRef.current = setTimeout(() => {
            callbackRef.current(payload as T)
          }, debounce)
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [channelName, table, filter, debounce, enabled])
}

/**
 * Hook for subscribing to multiple real-time channels efficiently
 */
export function useMultiRealtimeSubscription(
  subscriptions: Array<{
    channelName: string
    table: string
    filter?: string
    callback: SubscriptionCallback
  }>,
  options: UseRealtimeOptions = {}
) {
  const { enabled = true } = options
  const channelsRef = useRef<RealtimeChannel[]>([])

  useEffect(() => {
    if (!enabled) return

    // Clean up existing channels
    channelsRef.current.forEach(ch => supabase.removeChannel(ch))
    channelsRef.current = []

    // Create new channels
    subscriptions.forEach(({ channelName, table, filter, callback }) => {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            ...(filter ? { filter } : {}),
          },
          callback
        )
        .subscribe()

      channelsRef.current.push(channel)
    })

    return () => {
      channelsRef.current.forEach(ch => supabase.removeChannel(ch))
      channelsRef.current = []
    }
  }, [subscriptions, enabled])
}

/**
 * Hook to track connection status for real-time features
 */
export function useRealtimeStatus() {
  const [isConnected, setIsConnected] = useState(true)
  const [lastConnected, setLastConnected] = useState<Date | null>(null)

  useEffect(() => {
    // Monitor online/offline status
    const handleOnline = () => {
      setIsConnected(true)
      setLastConnected(new Date())
    }
    const handleOffline = () => setIsConnected(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check initial status
    setIsConnected(navigator.onLine)
    if (navigator.onLine) setLastConnected(new Date())

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isConnected, lastConnected }
}

/**
 * Optimistic update helper for real-time data
 * Returns current data, optimistic setter, and rollback function
 */
export function useOptimisticUpdate<T>(initialData: T[]) {
  const [data, setData] = useState<T[]>(initialData)
  const previousDataRef = useRef<T[]>(initialData)

  const optimisticUpdate = useCallback((updater: (prev: T[]) => T[]) => {
    previousDataRef.current = data
    setData(updater)
  }, [data])

  const rollback = useCallback(() => {
    setData(previousDataRef.current)
  }, [])

  const confirm = useCallback((newData: T[]) => {
    previousDataRef.current = newData
    setData(newData)
  }, [])

  return {
    data,
    setData,
    optimisticUpdate,
    rollback,
    confirm,
  }
}
