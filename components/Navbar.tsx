'use client'
import React, { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'

export default function Navbar(){
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const [profileEmail, setProfileEmail] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const authCompletedRef = useRef(false)
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout

    async function checkAuth(){
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return

        if (session?.user) {
          setUser(session.user)
          
          try {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('id, email, is_admin, role')
              .eq('id', session.user.id)
              .single()
            
            if (!mounted) return
            
            if (error) {
              console.error('Profile fetch error:', error)
              setIsAdmin(false)
              setUserRole('guest')
            } else if (profile) {
              setIsAdmin(profile.is_admin || false)
              setUserRole(profile.role || 'guest')
              setProfileEmail(profile.email || session.user.email || null)
            } else {
              setIsAdmin(false)
              setUserRole('guest')
              setProfileEmail(session.user.email || null)
            }
            
            authCompletedRef.current = true
            clearTimeout(timeoutId)
            setAuthChecked(true)
          } catch (err) {
            if (!mounted) return
            console.error('Profile fetch exception:', err)
            setIsAdmin(false)
            setUserRole('guest')
            setProfileEmail(session.user.email || null)
            authCompletedRef.current = true
            clearTimeout(timeoutId)
            setAuthChecked(true)
          }
        } else {
          setUser(null)
          setIsAdmin(false)
          setUserRole('')
          setProfileEmail(null)
          authCompletedRef.current = true
          clearTimeout(timeoutId)
          setAuthChecked(true)
        }
      } catch (err) {
        console.error('Auth check error:', err)
        if (mounted) {
          authCompletedRef.current = true
          clearTimeout(timeoutId)
          setAuthChecked(true)
        }
      }
    }

    // Safety timeout - if auth not checked after 5 seconds, force it
    timeoutId = setTimeout(() => {
      if (mounted && !authCompletedRef.current) {
        console.warn('Auth taking too long, showing UI anyway')
        setAuthChecked(true)
      }
    }, 5000)

    checkAuth()

    return () => {
      mounted = false
      clearTimeout(timeoutId)
    }
  }, [])

  async function handleRoleSwitch(newRole: string) {
    if (newRole === userRole) return
    
    try {
      // Update profile with new role
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', user?.id)
      
      if (error) throw error
      
      setUserRole(newRole)
      
      // Redirect to appropriate dashboard
      if (newRole === 'owner') router.push('/owner/empire')
      else if (newRole === 'guest') router.push('/guest/adventure-hub')
    } catch (err) {
      console.error('Role switch error:', err)
      alert('Failed to switch role')
    }
  }

  async function handleLogout(){
    try {
      await supabase.auth.signOut()
      setUser(null)
      setIsAdmin(false)
      setUserRole('')
      setProfileEmail(null)
      // Force full page reload to clear cache and reset state
      window.location.href = '/'
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  // Determine home link based on user role
  const getHomeLink = () => {
    if (!user) return '/'
    if (isAdmin) return '/admin/command-center'
    if (userRole === 'owner') return '/owner/empire'
    return '/guest/adventure-hub'
  }

  return (
    <header className="bg-white border-b border-slate-200 w-full sticky top-0 z-50 shadow-sm">
      <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center py-3 max-w-7xl mx-auto">
        {/* Logo */}
        <Link href={getHomeLink()} className="flex items-center gap-2 flex-shrink-0">
          <div className="relative">
            <Image 
              src="/assets/ResortifyPH_Logo.png" 
              alt="ResortifyPH Logo" 
              width={36} 
              height={36}
              className="w-9 h-9"
            />
          </div>
          <span className="font-bold text-base sm:text-lg text-resort-600">ResortifyPH</span>
        </Link>

        {/* Navigation - Desktop Only */}
        <nav className="hidden lg:flex items-center gap-6 ml-8">
          <Link href="/resorts" className="text-sm font-medium text-slate-600 hover:text-resort-600 transition">
            Explore
          </Link>
          {authChecked && user && userRole === 'guest' && (
            <Link href="/guest/trips" className="text-sm font-medium text-slate-600 hover:text-resort-600 transition">
              My Trips
            </Link>
          )}
          {authChecked && user && userRole === 'owner' && (
            <>
              <Link href="/owner/my-resorts" className="text-sm font-medium text-slate-600 hover:text-resort-600 transition">
                My Properties
              </Link>
              <Link href="/owner/bookings" className="text-sm font-medium text-slate-600 hover:text-resort-600 transition">
                Bookings
              </Link>
            </>
          )}
          {authChecked && isAdmin && (
            <>
              <Link href="/admin/approvals" className="text-sm font-medium text-slate-600 hover:text-resort-600 transition">
                Approvals
              </Link>
              <Link href="/admin/command-center" className="text-sm font-medium text-slate-600 hover:text-resort-600 transition">
                Admin
              </Link>
            </>
          )}
        </nav>

        {/* Right Section - Auth */}
        <div className="flex items-center gap-2 ml-auto">
          {authChecked && user ? (
            <>
              {/* Role Switcher - Simplified */}
              <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
                <button
                  onClick={() => handleRoleSwitch('guest')}
                  className={`px-2 py-1.5 text-xs font-medium rounded-md transition ${
                    userRole === 'guest' 
                      ? 'bg-resort-600 text-white' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Guest
                </button>
                <button
                  onClick={() => handleRoleSwitch('owner')}
                  className={`px-2 py-1.5 text-xs font-medium rounded-md transition ${
                    userRole === 'owner' 
                      ? 'bg-resort-600 text-white' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Host
                </button>
              </div>

              <Link
                href="/profile"
                aria-label={profileEmail ? `Open profile for ${profileEmail}` : 'Open profile'}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </Link>
              
              <button 
                onClick={handleLogout} 
                className="hidden sm:block px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                Sign out
              </button>
            </>
          ) : authChecked ? (
            <>
              <Link href="/auth/signin" className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition">
                Sign in
              </Link>
              <Link href="/auth/signup" className="px-3 py-1.5 text-sm font-medium text-white bg-resort-600 hover:bg-resort-700 rounded-lg transition">
                Sign up
              </Link>
            </>
          ) : (
            <div className="text-xs text-slate-400">Loading...</div>
          )}
        </div>
      </div>
    </header>
  )
}
