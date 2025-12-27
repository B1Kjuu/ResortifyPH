'use client'
import React, { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'
import LocationCombobox from './LocationCombobox'
import NotificationsBell from './NotificationsBell'

export default function Navbar(){
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const [profileEmail, setProfileEmail] = useState<string | null>(null)
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [quickLocation, setQuickLocation] = useState('')
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const authCompletedRef = useRef(false)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isAdminContext = isAdmin && pathname?.startsWith('/admin')

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
              .select('id, email, is_admin, role, avatar_url')
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
                setProfileAvatarUrl(profile.avatar_url || null)
            } else {
              setIsAdmin(false)
              setUserRole('guest')
              setProfileEmail(session.user.email || null)
                setProfileAvatarUrl(null)
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

  useEffect(() => {
    if (pathname?.startsWith('/resorts')) {
      setQuickLocation(searchParams.get('location') || '')
    } else {
      setQuickLocation('')
    }
  }, [pathname, searchParams])

  async function handleRoleSwitch(newRole: string) {
    if (newRole === userRole) return
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', user?.id)
      
      if (error) throw error
      
      setUserRole(newRole)
      
      if (newRole === 'owner') router.push('/owner/empire')
      else if (newRole === 'guest') router.push('/guest/adventure-hub')
    } catch (err) {
      console.error('Role switch error:', err)
      alert('Failed to switch role')
    }
  }

  function applyQuickFilter(province: string | null) {
    const value = province || ''
    setQuickLocation(value)

    const params = pathname?.startsWith('/resorts')
      ? new URLSearchParams(searchParams.toString())
      : new URLSearchParams()

    if (value) {
      params.set('location', value)
    } else {
      params.delete('location')
    }

    const queryString = params.toString()
    router.push(`/resorts${queryString ? `?${queryString}` : ''}`)
    setShowMobileFilters(false)
  }

  async function handleLogout(){
    try {
      await supabase.auth.signOut()
      setUser(null)
      setIsAdmin(false)
      setUserRole('')
      setProfileEmail(null)
      window.location.href = '/'
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  function handleExploreClick(e?: React.MouseEvent) {
    try {
      if (e) e.preventDefault()
      router.push('/resorts')
      // Nudge environments relying on window "load" after SPA route changes
      setTimeout(() => { try { window.dispatchEvent(new Event('load')) } catch {} }, 0)
    } catch {
      try { window.location.assign('/resorts') } catch {}
    }
  }

  const getHomeLink = () => {
    if (!user) return '/'
    if (isAdmin) return '/admin/command-center'
    if (userRole === 'owner') return '/owner/empire'
    return '/guest/adventure-hub'
  }

  return (
    <>
    <header className="bg-white border-b border-slate-200 w-full sticky top-0 z-50 shadow-sm">
      <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center h-16 max-w-7xl mx-auto">
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
          <Link href="/resorts" prefetch={false} className="text-sm font-medium text-slate-600 hover:text-resort-600 transition">
            Explore
          </Link>
          {authChecked && user && !isAdminContext && (
            <Link
              href={userRole === 'owner' ? '/owner/chats' : '/guest/chats'}
              className="text-sm font-medium text-slate-600 hover:text-resort-600 transition"
            >
              Chats
            </Link>
          )}
          {authChecked && user && userRole === 'guest' && !isAdminContext && (
            <Link href="/guest/adventure-hub" className="text-sm font-medium text-slate-600 hover:text-resort-600 transition">
              Adventure Hub
            </Link>
          )}
          {authChecked && user && userRole === 'guest' && !isAdminContext && (
            <Link href="/guest/trips" className="text-sm font-medium text-slate-600 hover:text-resort-600 transition">
              My Trips
            </Link>
          )}
          {authChecked && user && userRole === 'owner' && !isAdminContext && (
            <>
              <Link href="/owner/empire" className="text-sm font-medium text-slate-600 hover:text-resort-600 transition">
                Empire
              </Link>
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

        {/* Quick Filters - Desktop (Compact Pill) */}
        <div className="hidden lg:flex flex-1 items-center ml-6 mr-6 max-w-md">
          <div className="flex items-center gap-2 w-full px-4 py-2 rounded-full border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
            <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <div className="flex-1 min-w-0">
              <LocationCombobox
                value={quickLocation}
                onChange={applyQuickFilter}
                placeholder="Where to?"
                variant="hero"
              />
            </div>
            {quickLocation && (
              <button
                onClick={(e) => { e.stopPropagation(); applyQuickFilter(null); }}
                className="p-0.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 flex-shrink-0"
                aria-label="Clear"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Right Section - Auth */}
        <div className="flex items-center gap-2 ml-auto justify-end">
          <button
            onClick={() => setShowMobileMenu(true)}
            className="lg:hidden px-2.5 py-1.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-full hover:bg-slate-200 transition whitespace-nowrap"
            aria-label="Open menu"
          >
            <span className="sr-only">Menu</span>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {/* Hide mobile Filters button to declutter navbar */}
          {/* <button
            onClick={() => setShowMobileFilters(true)}
            className="lg:hidden px-3 py-1.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-full hover:bg-slate-200 transition whitespace-nowrap"
            aria-label="Open quick filters"
          >
            Filters
          </button> */}
          {authChecked && user ? (
            <>
              {/* Role Switcher */}
              <NotificationsBell />
              {!isAdminContext && (
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
              )}

              <Link
                href="/profile"
                aria-label={profileEmail ? `Open profile for ${profileEmail}` : 'Open profile'}
                className="p-1 rounded-full hover:bg-slate-100 transition"
              >
                {profileAvatarUrl ? (
                  <img
                    src={profileAvatarUrl}
                    alt={profileEmail ? `${profileEmail} avatar` : 'Profile avatar'}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
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
              <Link href="/auth/signin" className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition whitespace-nowrap">
                Sign in
              </Link>
              <Link href="/auth/signup" className="px-3 py-1.5 text-sm font-medium text-white bg-resort-600 hover:bg-resort-700 rounded-lg transition whitespace-nowrap">
                Sign up
              </Link>
            </>
          ) : (
            <div className="text-xs text-slate-400">Loading...</div>
          )}
        </div>
      </div>
    </header>
    {/* Mobile Menu Drawer */}
    {showMobileMenu && (
      <div className="lg:hidden fixed inset-0 z-[60]">
        <div
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setShowMobileMenu(false)}
        />
        <div className="absolute left-0 top-0 h-full w-[86%] max-w-sm bg-white border-r border-slate-200 shadow-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📖</span>
              <p className="text-lg font-bold text-slate-900">Menu</p>
            </div>
            <button
              onClick={() => setShowMobileMenu(false)}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          <nav className="space-y-2">
            <Link href="/resorts" onClick={() => setShowMobileMenu(false)} className="block px-3 py-2 rounded-lg text-slate-800 hover:bg-slate-100 font-medium">Explore</Link>
            {authChecked && user && !isAdminContext && (
              <Link
                href={userRole === 'owner' ? '/owner/chats' : '/guest/chats'}
                onClick={() => setShowMobileMenu(false)}
                className="block px-3 py-2 rounded-lg text-slate-800 hover:bg-slate-100 font-medium"
              >
                Chats
              </Link>
            )}
            {authChecked && user && userRole === 'guest' && !isAdminContext && (
              <Link href="/guest/adventure-hub" onClick={() => setShowMobileMenu(false)} className="block px-3 py-2 rounded-lg text-slate-800 hover:bg-slate-100 font-medium">Adventure Hub</Link>
            )}
            {authChecked && user && userRole === 'guest' && !isAdminContext && (
              <Link href="/guest/trips" onClick={() => setShowMobileMenu(false)} className="block px-3 py-2 rounded-lg text-slate-800 hover:bg-slate-100 font-medium">My Trips</Link>
            )}
            {authChecked && user && userRole === 'owner' && !isAdminContext && (
              <>
                <Link href="/owner/empire" onClick={() => setShowMobileMenu(false)} className="block px-3 py-2 rounded-lg text-slate-800 hover:bg-slate-100 font-medium">Empire</Link>
                <Link href="/owner/my-resorts" onClick={() => setShowMobileMenu(false)} className="block px-3 py-2 rounded-lg text-slate-800 hover:bg-slate-100 font-medium">My Properties</Link>
                <Link href="/owner/bookings" onClick={() => setShowMobileMenu(false)} className="block px-3 py-2 rounded-lg text-slate-800 hover:bg-slate-100 font-medium">Bookings</Link>
              </>
            )}
            {authChecked && isAdmin && (
              <>
                <Link href="/admin/approvals" onClick={() => setShowMobileMenu(false)} className="block px-3 py-2 rounded-lg text-slate-800 hover:bg-slate-100 font-medium">Approvals</Link>
                <Link href="/admin/command-center" onClick={() => setShowMobileMenu(false)} className="block px-3 py-2 rounded-lg text-slate-800 hover:bg-slate-100 font-medium">Admin</Link>
              </>
            )}

            <div className="h-px bg-slate-200 my-4" />

            {authChecked && user ? (
              <div className="space-y-2">
                <Link href="/profile" onClick={() => setShowMobileMenu(false)} className="block px-3 py-2 rounded-lg text-slate-800 hover:bg-slate-100 font-medium">Profile</Link>
                <button onClick={() => { setShowMobileMenu(false); handleLogout(); }} className="w-full px-3 py-2 rounded-lg text-left text-slate-800 hover:bg-slate-100 font-medium">Sign out</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link href="/auth/signin" onClick={() => setShowMobileMenu(false)} className="px-3 py-2 text-center rounded-lg border border-slate-200 text-slate-800 font-semibold">Sign in</Link>
                <Link href="/auth/signup" onClick={() => setShowMobileMenu(false)} className="px-3 py-2 text-center rounded-lg bg-resort-600 text-white font-semibold">Sign up</Link>
              </div>
            )}
          </nav>
        </div>
      </div>
    )}
    {showMobileFilters && (
      <div className="lg:hidden fixed inset-0 z-[60]">
        <div
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setShowMobileFilters(false)}
        />
        <div className="absolute inset-x-0 bottom-0 px-4 pb-6">
          <div className="bg-white border border-slate-100 rounded-3xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🧭</span>
                <div>
                  <p className="text-xs font-semibold text-resort-500 uppercase tracking-[0.3em]">Quick Filters</p>
                  <p className="text-lg font-bold text-slate-900">Pick a province to explore</p>
                </div>
              </div>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close filters"
              >
                ✕
              </button>
            </div>
            <div className="mb-3">
              <LocationCombobox
                value={quickLocation}
                onChange={applyQuickFilter}
                placeholder="Search or pick a province"
              />
            </div>
            <p className="text-xs text-slate-500">
              We'll open the Explore page and keep your selection pinned. Clear to browse everything again.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-5">
              <button
                onClick={() => applyQuickFilter(null)}
                className="px-4 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl"
              >
                Clear
              </button>
              <button
                onClick={() => applyQuickFilter(quickLocation || null)}
                className="px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-resort-600 to-blue-600 rounded-xl shadow-md"
              >
                View resorts
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
