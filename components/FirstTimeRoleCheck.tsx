'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import RoleSelectionModal from './RoleSelectionModal'

/**
 * This component monitors auth state and shows the role selection modal
 * for first-time users who haven't completed the initial role selection.
 */
export default function FirstTimeRoleCheck() {
  const [showModal, setShowModal] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function checkFirstTimeUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.user) {
          if (mounted) {
            setShowModal(false)
            setUserId(null)
          }
          return
        }

        // Check if user has completed initial role selection
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('initial_role_selected')
          .eq('id', session.user.id)
          .single()

        if (error) {
          // Profile might not exist yet (still being created by trigger)
          // Check again after a short delay
          if (error.code === 'PGRST116') {
            setTimeout(() => {
              if (mounted) checkFirstTimeUser()
            }, 1000)
          }
          return
        }

        if (mounted && profile && !profile.initial_role_selected) {
          setUserId(session.user.id)
          setShowModal(true)
        }
      } catch (err) {
        console.error('FirstTimeRoleCheck error:', err)
      }
    }

    // Check on mount
    checkFirstTimeUser()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Small delay to let profile trigger complete
        setTimeout(() => {
          if (mounted) checkFirstTimeUser()
        }, 500)
      } else if (event === 'SIGNED_OUT') {
        if (mounted) {
          setShowModal(false)
          setUserId(null)
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (!showModal || !userId) return null

  return (
    <RoleSelectionModal
      userId={userId}
      onComplete={() => setShowModal(false)}
    />
  )
}
