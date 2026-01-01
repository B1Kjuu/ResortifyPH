'use client'
import React, { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'
import LocationCombobox from './LocationCombobox'
import NotificationsBell from './NotificationsBell'
import { toast } from 'sonner'

// Security: Check if password reset is pending
const PASSWORD_RESET_KEY = 'resortify_password_reset_pending'

// Helper to get cookie value
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null
  return null
}

// Helper to delete cookie
function deleteCookie(name: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
}

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
  const [passwordResetPending, setPasswordResetPending] = useState(false)
  const authCompletedRef = useRef(false)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isAdminContext = isAdmin && pathname?.startsWith('/admin')

  // Security: Check if user is in password reset flow
  useEffect(() => {
    try {
      const sessionPending = sessionStorage.getItem(PASSWORD_RESET_KEY) === 'true'
      const cookiePending = getCookie(PASSWORD_RESET_KEY) === 'true'
      const isPending = sessionPending || cookiePending
      setPasswordResetPending(isPending)
      
      // If password reset is pending but user navigated away from reset page, sign them out
      if (isPending && !pathname?.includes('/auth/reset-password') && !pathname?.includes('/auth/forgot-password')) {
        sessionStorage.removeItem(PASSWORD_RESET_KEY)
        deleteCookie(PASSWORD_RESET_KEY)
        supabase.auth.signOut().then(() => {
          toast.error('Session ended for security', {
            description: 'Please complete the password reset process.'
          })
          router.push('/auth/forgot-password')
        })
      }
    } catch {}
  }, [pathname, router])

  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout

    async function checkAuth(){
      // In e2e mode, skip Supabase auth checks to make UI deterministic
      if (process.env.NEXT_PUBLIC_E2E === 'true') {
        setAuthChecked(true)
        setUser(null)
        setIsAdmin(false)
        setUserRole('')
        setProfileEmail(null)
        authCompletedRef.current = true
        return
      }
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
    
    // Show confirmation toast before switching
    const roleLabel = newRole === 'owner' ? 'Host' : 'Guest'
    const currentLabel = userRole === 'owner' ? 'Host' : 'Guest'
    
    toast(
      `Switch from ${currentLabel} to ${roleLabel}?`,
      {
        description: newRole === 'owner' 
          ? 'As a Host, you can manage your resorts and bookings.' 
          : 'As a Guest, you can browse and book resorts.',
        action: {
          label: 'Switch',
          onClick: async () => {
            try {
              const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', user?.id)
              
              if (error) throw error
              
              setUserRole(newRole)
              toast.success(`Switched to ${roleLabel} mode`)
              
              if (newRole === 'owner') router.push('/owner/empire')
              else if (newRole === 'guest') router.push('/guest/adventure-hub')
            } catch (err) {
              console.error('Role switch error:', err)
              toast.error('Failed to switch role')
            }
          }
        },
        cancel: {
          label: 'Cancel',
          onClick: () => {}
        },
        duration: 10000,
      }
    )
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

  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)

  async function handleLogout(){
    // Check if user wants to skip confirmation
    const skipConfirm = typeof window !== 'undefined' && localStorage.getItem('skipSignOutConfirm') === 'true'
    
    if (!skipConfirm && !showSignOutConfirm) {
      setShowSignOutConfirm(true)
      return
    }
    
    try {
      // Save preference if checked
      if (dontShowAgain && typeof window !== 'undefined') {
        localStorage.setItem('skipSignOutConfirm', 'true')
      }
      
      await supabase.auth.signOut()
      setUser(null)
      setIsAdmin(false)
      setUserRole('')
      setProfileEmail(null)
      setShowSignOutConfirm(false)
      window.location.href = '/'
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  function cancelSignOut() {
    setShowSignOutConfirm(false)
    setDontShowAgain(false)
  }

  async function handleExploreClick(e?: React.MouseEvent) {
    try {
      if (e) e.preventDefault()
      // If current role is owner, switch to guest before navigating so booking is enabled
      if (user && userRole === 'owner') {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ role: 'guest' })
            .eq('id', user.id)
          if (!error) setUserRole('guest')
        } catch (err) {
          console.warn('Explore role switch failed:', err)
        }
      }
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
      <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center h-14 sm:h-16 max-w-7xl mx-auto">
        {/* Left Section: Logo Only */}
        <Link href={getHomeLink()} className="flex items-center gap-2 flex-shrink-0 group">
          <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-resort-500 to-resort-600 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow overflow-hidden">
            <Image 
              src="/assets/ResortifyPH-LOGO-CLEAN.png" 
              alt="ResortifyPH Logo" 
              width={28} 
              height={28}
              className="w-6 h-6 sm:w-7 sm:h-7"
              priority
            />
          </div>
          <span className="hidden sm:inline font-bold text-base sm:text-lg text-slate-900">ResortifyPH</span>
        </Link>

        {/* Left spacer */}
        <div className="flex-1" />

        {/* Center Section: Navigation + Search - Desktop Only */}
        <div className="hidden lg:flex items-center gap-2 xl:gap-4">
          <nav className="flex items-center gap-0.5 xl:gap-1">
            <Link href="/resorts" prefetch={false} onClick={(e) => handleExploreClick(e)} className="px-2 xl:px-3 py-2 text-xs xl:text-sm font-medium text-slate-600 hover:text-resort-600 hover:bg-resort-50 rounded-lg transition-all whitespace-nowrap">
              Explore
            </Link>
          {authChecked && user && !isAdminContext && (
            <Link
              href={userRole === 'owner' ? '/owner/chats' : '/guest/chats'}
              className="px-2 xl:px-3 py-2 text-xs xl:text-sm font-medium text-slate-600 hover:text-resort-600 hover:bg-resort-50 rounded-lg transition-all whitespace-nowrap"
            >
              Chats
            </Link>
          )}
          {authChecked && user && userRole === 'guest' && !isAdminContext && (
            <Link href="/guest/adventure-hub" className="px-2 xl:px-3 py-2 text-xs xl:text-sm font-medium text-slate-600 hover:text-resort-600 hover:bg-resort-50 rounded-lg transition-all whitespace-nowrap">
              Adventure Hub
            </Link>
          )}
          {authChecked && user && userRole === 'guest' && !isAdminContext && (
            <Link href="/guest/trips" className="px-2 xl:px-3 py-2 text-xs xl:text-sm font-medium text-slate-600 hover:text-resort-600 hover:bg-resort-50 rounded-lg transition-all whitespace-nowrap">
              My Trips
            </Link>
          )}
          {authChecked && user && userRole === 'owner' && !isAdminContext && (
            <>
              <Link href="/owner/empire" className="px-2 xl:px-3 py-2 text-xs xl:text-sm font-medium text-slate-600 hover:text-resort-600 hover:bg-resort-50 rounded-lg transition-all whitespace-nowrap">
                Empire
              </Link>
              <Link href="/owner/my-resorts" className="px-2 xl:px-3 py-2 text-xs xl:text-sm font-medium text-slate-600 hover:text-resort-600 hover:bg-resort-50 rounded-lg transition-all whitespace-nowrap">
                Properties
              </Link>
              <Link href="/owner/bookings" className="px-2 xl:px-3 py-2 text-xs xl:text-sm font-medium text-slate-600 hover:text-resort-600 hover:bg-resort-50 rounded-lg transition-all whitespace-nowrap">
                Bookings
              </Link>
            </>
          )}
          {authChecked && isAdmin && (
            <>
              <Link href="/admin/approvals" className="px-2 xl:px-3 py-2 text-xs xl:text-sm font-medium text-slate-600 hover:text-resort-600 hover:bg-resort-50 rounded-lg transition-all whitespace-nowrap">
                Approvals
              </Link>
              <Link href="/admin/command-center" className="px-2 xl:px-3 py-2 text-xs xl:text-sm font-medium text-slate-600 hover:text-resort-600 hover:bg-resort-50 rounded-lg transition-all whitespace-nowrap">
                Admin
              </Link>
            </>
          )}
          </nav>

          {/* Quick Filters - Search Bar */}
          <div className="flex items-center w-56 xl:w-72">
            <div className="flex items-center gap-2 w-full px-3 xl:px-4 py-2 rounded-full border border-slate-200 bg-slate-50 hover:bg-white hover:shadow-md hover:border-slate-300 transition-all cursor-pointer">
              <svg className="w-4 h-4 text-resort-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        </div>

        {/* Right spacer */}
        <div className="flex-1" />

        {/* Right Section - Auth */}
        <div className="flex items-center gap-2 sm:gap-3">
          {authChecked && user ? (
            <>
              {/* Notifications Bell */}
              <NotificationsBell />
              {/* Role Switcher - Hide on mobile */}
              {!isAdminContext && (
                <div className="hidden sm:flex items-center gap-0.5 bg-slate-100 rounded-full p-1">
                  <button
                    onClick={() => handleRoleSwitch('guest')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
                      userRole === 'guest' 
                        ? 'bg-white text-resort-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Guest
                  </button>
                  <button
                    onClick={() => handleRoleSwitch('owner')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
                      userRole === 'owner' 
                        ? 'bg-white text-resort-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Host
                  </button>
                </div>
              )}

              <Link
                href="/profile"
                aria-label={profileEmail ? `Open profile for ${profileEmail}` : 'Open profile'}
                className="p-1 rounded-full hover:bg-slate-100 transition hidden sm:block"
              >
                {profileAvatarUrl ? (
                  <img
                    src={profileAvatarUrl}
                    alt={profileEmail ? `${profileEmail} avatar` : 'Profile avatar'}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-sm"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-resort-400 to-resort-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                    {profileEmail ? profileEmail[0].toUpperCase() : 'U'}
                  </div>
                )}
              </Link>
              
              <button 
                onClick={handleLogout} 
                className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign out</span>
              </button>
            </>
          ) : authChecked ? (
            <>
              {/* Desktop Sign in/up */}
              <div className="hidden sm:flex items-center gap-2">
                <Link href="/auth/signin" className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-resort-600 hover:bg-slate-50 rounded-lg transition-all whitespace-nowrap">
                  Sign in
                </Link>
                <Link href="/auth/signup" className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-resort-500 to-resort-600 hover:from-resort-600 hover:to-resort-700 rounded-lg shadow-sm hover:shadow-md transition-all whitespace-nowrap">
                  Sign up
                </Link>
              </div>
              {/* Mobile Sign in/up - compact and aligned */}
              <div className="sm:hidden flex items-center gap-2 ">
                <Link href="/auth/signin" className="text-sm font-medium text-slate-600 hover:text-resort-600 pt-3">
                  Sign in
                </Link>
                <Link href="/auth/signup" className="px-3 py-2.5 text-sm font-semibold text-white bg-resort-600 rounded-xl pt-3">
                  Sign up
                </Link>
              </div>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-16 h-8 bg-slate-100 rounded-lg animate-pulse" />
              <div className="w-16 h-8 bg-slate-200 rounded-lg animate-pulse" />
            </div>
          )}
          
          {/* Mobile Menu Button - Always visible on mobile */}
          <button
            onClick={() => setShowMobileMenu(true)}
            className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
    {/* Mobile Menu Drawer - Always rendered with CSS transitions */}
    <div className={`lg:hidden fixed inset-0 z-[60] transition-opacity duration-300 ${showMobileMenu ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={() => setShowMobileMenu(false)}
      />
      <div className={`absolute left-0 top-0 h-full w-[86%] max-w-sm bg-white border-r border-slate-200 shadow-2xl p-6 transform transition-transform duration-300 ease-out ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'}`}>
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
          <Link href="/resorts" onClick={(e) => { handleExploreClick(e); setShowMobileMenu(false) }} className="block px-3 py-2 rounded-lg text-slate-800 hover:bg-slate-100 font-medium">Explore</Link>
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
                {/* Mobile Role Switcher */}
                {!isAdminContext && (
                  <div className="mb-3">
                    <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Switch Mode</p>
                    <div className="flex items-center gap-2 px-3">
                      <button
                        onClick={() => { handleRoleSwitch('guest'); setShowMobileMenu(false); }}
                        className={`flex-1 px-3 py-2.5 text-sm font-semibold rounded-xl transition-all ${userRole === 'guest' ? 'bg-resort-500 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        Guest
                      </button>
                      <button
                        onClick={() => { handleRoleSwitch('owner'); setShowMobileMenu(false); }}
                        className={`flex-1 px-3 py-2.5 text-sm font-semibold rounded-xl transition-all ${userRole === 'owner' ? 'bg-resort-500 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        Host
                      </button>
                    </div>
                  </div>
                )}
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

    {/* Sign Out Confirmation Modal */}
    {showSignOutConfirm && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center">
        <div
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          onClick={cancelSignOut}
        />
        <div className="relative bg-white rounded-2xl shadow-2xl p-6 mx-4 max-w-sm w-full">
          <div className="text-center mb-4">
            <div className="w-16 h-16 mx-auto mb-3 bg-amber-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900">Sign Out?</h3>
            <p className="text-sm text-slate-600 mt-1">Are you sure you want to sign out of your account?</p>
          </div>
          
          <label className="flex items-center gap-2 mb-4 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 text-resort-500 rounded focus:ring-resort-400"
            />
            <span className="text-sm text-slate-600">Don't ask me again</span>
          </label>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={cancelSignOut}
              className="px-4 py-2.5 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
