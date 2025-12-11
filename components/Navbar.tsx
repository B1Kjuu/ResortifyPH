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
              .select('is_admin, role')
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
            } else {
              setIsAdmin(false)
              setUserRole('guest')
            }
            
            authCompletedRef.current = true
            clearTimeout(timeoutId)
            setAuthChecked(true)
          } catch (err) {
            if (!mounted) return
            console.error('Profile fetch exception:', err)
            setIsAdmin(false)
            setUserRole('guest')
            authCompletedRef.current = true
            clearTimeout(timeoutId)
            setAuthChecked(true)
          }
        } else {
          setUser(null)
          setIsAdmin(false)
          setUserRole('')
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
    <header className="bg-white/95 backdrop-blur-sm border-b-2 border-slate-200 w-full sticky top-0 z-50 shadow-md">
      <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between py-4 max-w-7xl mx-auto">
        {/* Logo */}
        <Link href={getHomeLink()} className="flex items-center gap-2 hover:scale-105 transition-transform flex-shrink-0 group">
          <div className="relative">
            <Image 
              src="/assets/ResortifyPH_Logo.png" 
              alt="ResortifyPH Logo" 
              width={40} 
              height={40}
              className="w-10 h-10 sm:w-11 sm:h-11 drop-shadow-md"
            />
          </div>
          <span className="font-bold text-lg sm:text-xl bg-gradient-to-r from-resort-600 to-blue-600 bg-clip-text text-transparent">ResortifyPH</span>
        </Link>

        {/* Center Navigation */}
        <nav className="hidden md:flex items-center gap-8 flex-1 justify-center">
          <Link href="/resorts" className="text-sm font-semibold text-slate-700 hover:text-resort-600 transition-all relative group px-2 py-1">
            🏝️ Explore
            <span className="absolute -bottom-1 left-0 w-0 h-1 bg-gradient-to-r from-resort-500 to-blue-500 rounded-full group-hover:w-full transition-all"></span>
          </Link>
          {authChecked && user && userRole === 'guest' && (
            <Link href="/guest/trips" className="text-sm font-semibold text-slate-700 hover:text-resort-600 transition-all relative group px-2 py-1">
              ✈️ My Trips
              <span className="absolute -bottom-1 left-0 w-0 h-1 bg-gradient-to-r from-resort-500 to-blue-500 rounded-full group-hover:w-full transition-all"></span>
            </Link>
          )}
          {authChecked && user && userRole === 'owner' && (
            <>
              <Link href="/owner/my-resorts" className="text-sm font-semibold text-slate-700 hover:text-resort-600 transition-all relative group px-2 py-1">
                🏢 My Properties
                <span className="absolute -bottom-1 left-0 w-0 h-1 bg-gradient-to-r from-resort-500 to-blue-500 rounded-full group-hover:w-full transition-all"></span>
              </Link>
              <Link href="/owner/bookings" className="text-sm font-semibold text-slate-700 hover:text-resort-600 transition-all relative group px-2 py-1">
                💼 Bookings
                <span className="absolute -bottom-1 left-0 w-0 h-1 bg-gradient-to-r from-resort-500 to-blue-500 rounded-full group-hover:w-full transition-all"></span>
              </Link>
            </>
          )}
          {authChecked && isAdmin && (
            <>
              <Link href="/admin/approvals" className="text-sm font-semibold text-slate-700 hover:text-resort-600 transition-all relative group px-2 py-1">
                ✔️ Approvals
                <span className="absolute -bottom-1 left-0 w-0 h-1 bg-gradient-to-r from-resort-500 to-blue-500 rounded-full group-hover:w-full transition-all"></span>
              </Link>
              <Link href="/admin/command-center" className="text-sm font-semibold text-slate-700 hover:text-resort-600 transition-all relative group px-2 py-1">
                ⚙️ Control Center
                <span className="absolute -bottom-1 left-0 w-0 h-1 bg-gradient-to-r from-resort-500 to-blue-500 rounded-full group-hover:w-full transition-all"></span>
              </Link>
            </>
          )}
        </nav>

        {/* Right Section - Auth */}
        <div className="flex items-center gap-3">
          {authChecked && user ? (
            <>
              {/* Role Switcher */}
              <div className="hidden sm:flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                <button
                  onClick={() => handleRoleSwitch('guest')}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                    userRole === 'guest' 
                      ? 'bg-gradient-to-r from-resort-500 to-blue-500 text-white shadow-md' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  👤 Guest
                </button>
                <button
                  onClick={() => handleRoleSwitch('owner')}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                    userRole === 'owner' 
                      ? 'bg-gradient-to-r from-resort-500 to-blue-500 text-white shadow-md' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🏢 Host
                </button>
              </div>

              <Link href="/profile" className="hidden sm:flex items-center gap-2 px-4 py-2.5 text-slate-700 hover:bg-gradient-to-r hover:from-slate-100 hover:to-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-200">
                <span className="text-xl">⚙️</span>
                <span className="text-sm font-semibold hidden md:inline">Settings</span>
              </Link>
              <button 
                onClick={handleLogout} 
                className="px-5 py-2.5 text-sm font-semibold text-slate-700 border-2 border-slate-300 rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm"
              >
                Sign out
              </button>
            </>
          ) : authChecked ? (
            <>
              <Link href="/auth/signin" className="px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-all rounded-xl border-2 border-transparent hover:border-slate-200">
                Sign in
              </Link>
              <Link href="/auth/signup" className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-resort-500 to-blue-500 rounded-xl hover:shadow-lg transition-all">
                Sign up
              </Link>
            </>
          ) : (
            <div className="px-3 py-2 text-xs text-slate-400">Loading...</div>
          )}
        </div>
      </div>
    </header>
  )
}
