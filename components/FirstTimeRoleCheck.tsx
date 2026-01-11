'use client'

import React, { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'
import RoleSelectionModal from './RoleSelectionModal'

/**
 * This component monitors auth state and shows the role selection modal
 * for first-time users who haven't completed the initial role selection.
 * Excludes admin pages and admin users.
 */
export default function FirstTimeRoleCheck() {
  const [showModal, setShowModal] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const pathname = usePathname()

  // Don't show on admin pages
  const isAdminPage = pathname?.startsWith('/admin')
  const isLegalPage = pathname === '/terms' || pathname === '/privacy'

  useEffect(() => {
    // Skip entirely on admin pages
    if (isAdminPage || isLegalPage) return

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

        // Check if user has completed initial role selection and their role
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('initial_role_selected, role')
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

        // Don't show modal for admin users
        if (profile?.role === 'admin') {
          if (mounted) {
            setShowModal(false)
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
  }, [isAdminPage, isLegalPage])

  if (!showModal || !userId || isAdminPage || isLegalPage) return null

  return (
    <RoleSelectionModal
      userId={userId}
      onComplete={() => setShowModal(false)}
    />
  )
}
