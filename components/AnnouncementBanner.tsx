'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { usePathname } from 'next/navigation'
import { FiInfo, FiAlertTriangle, FiCheckCircle, FiXCircle, FiSettings, FiX } from 'react-icons/fi'

interface Announcement {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'error' | 'maintenance'
  target_audience: 'all' | 'guests' | 'owners' | 'admins'
  display_type: 'banner' | 'modal' | 'toast'
  is_active: boolean
  is_dismissible: boolean
  starts_at: string
  ends_at: string | null
}

const TYPE_CONFIG = {
  info: { 
    icon: FiInfo, 
    bg: 'bg-blue-500', 
    border: 'border-blue-600',
    text: 'text-white'
  },
  warning: { 
    icon: FiAlertTriangle, 
    bg: 'bg-amber-500', 
    border: 'border-amber-600',
    text: 'text-white'
  },
  success: { 
    icon: FiCheckCircle, 
    bg: 'bg-green-500', 
    border: 'border-green-600',
    text: 'text-white'
  },
  error: { 
    icon: FiXCircle, 
    bg: 'bg-red-500', 
    border: 'border-red-600',
    text: 'text-white'
  },
  maintenance: { 
    icon: FiSettings, 
    bg: 'bg-purple-500', 
    border: 'border-purple-600',
    text: 'text-white'
  }
}

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [userRole, setUserRole] = useState<string>('guest')
  const [isAdmin, setIsAdmin] = useState(false)
  const pathname = usePathname()

  // Only hide on the announcement management page itself
  const hideOnThisPage = pathname?.startsWith('/admin/announcements')

  useEffect(() => {
    // Load dismissed announcements from localStorage
    try {
      const dismissed = localStorage.getItem('dismissed_announcements')
      if (dismissed) {
        setDismissedIds(new Set(JSON.parse(dismissed)))
      }
    } catch {}
  }, [])

  useEffect(() => {
    async function fetchAnnouncements() {
      // Get current user's role
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, is_admin')
          .eq('id', session.user.id)
          .single()
        
        if (profile) {
          setUserRole(profile.role || 'guest')
          setIsAdmin(profile.is_admin || false)
        }
      }

      // Fetch active banner announcements
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .eq('display_type', 'banner')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setAnnouncements(data)
      }
    }

    if (!hideOnThisPage) {
      fetchAnnouncements()
    }
  }, [hideOnThisPage])

  const handleDismiss = useCallback((id: string) => {
    setDismissedIds(prev => {
      const newSet = new Set(prev)
      newSet.add(id)
      try {
        localStorage.setItem('dismissed_announcements', JSON.stringify([...newSet]))
      } catch {}
      return newSet
    })
  }, [])

  // Don't render on announcements admin page
  if (hideOnThisPage) return null

  // Filter announcements based on user role and dismissed state
  const visibleAnnouncements = announcements.filter(a => {
    // Check if dismissed
    if (dismissedIds.has(a.id)) return false
    
    // Check target audience
    if (a.target_audience === 'all') return true
    if (a.target_audience === 'admins' && isAdmin) return true
    if (a.target_audience === 'guests' && userRole === 'guest') return true
    if (a.target_audience === 'owners' && userRole === 'owner') return true
    
    return false
  })

  if (visibleAnnouncements.length === 0) return null

  return (
    <div className="w-full">
      {visibleAnnouncements.map((announcement) => {
        const config = TYPE_CONFIG[announcement.type]
        const Icon = config.icon

        return (
          <div
            key={announcement.id}
            className={`${config.bg} ${config.text} border-b ${config.border}`}
          >
            <div className="max-w-7xl mx-auto px-4 py-2 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <div className="min-w-0">
                    {announcement.title && (
                      <span className="font-semibold mr-2">{announcement.title}:</span>
                    )}
                    <span className="text-sm opacity-95">{announcement.message}</span>
                  </div>
                </div>
                {announcement.is_dismissible && (
                  <button
                    onClick={() => handleDismiss(announcement.id)}
                    className="p-1 rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
                    aria-label="Dismiss announcement"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
