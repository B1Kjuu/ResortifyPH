'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { toast } from 'sonner'

export interface FavoritesState {
  ready: boolean
  userId: string | null
  favorites: Set<string>
  error: string | null
}

export function useFavorites() {
  const [state, setState] = useState<FavoritesState>({
    ready: false,
    userId: null,
    favorites: new Set<string>(),
    error: null,
  })

  useEffect(() => {
    let mounted = true
    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return
        if (!session?.user) {
          setState(prev => ({ ...prev, ready: true, userId: null }))
          return
        }
        const userId = session.user.id
        const { data, error } = await supabase
          .from('favorites')
          .select('resort_id')
        if (error) {
          setState(prev => ({ ...prev, ready: true, userId, error: error.message }))
          return
        }
        const favs = new Set<string>((data || []).map(r => r.resort_id as string))
        setState({ ready: true, userId, favorites: favs, error: null })
      } catch (err: any) {
        setState(prev => ({ ...prev, ready: true, error: err?.message || 'Failed to load favorites' }))
      }
    }
    init()
    return () => { mounted = false }
  }, [])

  const isFavorite = useCallback((resortId: string) => {
    return state.favorites.has(resortId)
  }, [state.favorites])

  const toggleFavorite = useCallback(async (resortId: string) => {
    if (!state.userId) {
      toast.info('Please sign in to save favorites')
      return
    }
    const currentlyFav = state.favorites.has(resortId)
    try {
      if (currentlyFav) {
        // optimistic removal
        setState(prev => ({ ...prev, favorites: new Set([...prev.favorites].filter(id => id !== resortId)) }))
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', state.userId)
          .eq('resort_id', resortId)
        if (error) {
          // revert on error
          setState(prev => {
            const next = new Set(prev.favorites)
            next.add(resortId)
            return { ...prev, favorites: next, error: error.message }
          })
          toast.error('Failed to remove from favorites')
        } else {
          toast.success('Removed from favorites')
        }
      } else {
        // optimistic add
        setState(prev => {
          const next = new Set(prev.favorites)
          next.add(resortId)
          return { ...prev, favorites: next }
        })
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: state.userId, resort_id: resortId })
        if (error) {
          // revert on error
          setState(prev => {
            const next = new Set([...prev.favorites].filter(id => id !== resortId))
            return { ...prev, favorites: next, error: error.message }
          })
          toast.error('Failed to save to favorites')
        } else {
          toast.success('Saved to favorites')
        }
      }
    } catch (err: any) {
      setState(prev => ({ ...prev, error: err?.message || 'Failed to toggle favorite' }))
      toast.error('Unexpected error while toggling favorite')
    }
  }, [state.userId, state.favorites])

  return {
    ready: state.ready,
    userId: state.userId,
    favorites: state.favorites,
    error: state.error,
    isFavorite,
    toggleFavorite,
  }
}
