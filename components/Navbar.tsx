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
    <header className="bg-white border-b w-full shadow-sm">
      <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between py-4 max-w-7xl mx-auto">
        <Link href={getHomeLink()} className="flex items-center gap-3 hover:opacity-80 transition">
          <Image 
            src="/assets/ResortifyPH_Logo.png" 
            alt="ResortifyPH Logo" 
            width={40} 
            height={40}
            className="w-10 h-10"
          />
          <span className="font-semibold text-resort-900 hidden sm:inline">ResortifyPH</span>
        </Link>

        <nav className="flex items-center gap-4">
          <Link href="/resorts" className="text-sm text-slate-700 hover:text-resort-500 transition">Resorts</Link>
          {authChecked && user && userRole === 'guest' && <Link href="/guest/trips" className="text-sm text-slate-700 hover:text-resort-500 transition">My Trips</Link>}
          {authChecked && user && userRole === 'owner' && <Link href="/owner/properties" className="text-sm text-slate-700 hover:text-resort-500 transition">My Properties</Link>}
          {authChecked && user && userRole === 'owner' && <Link href="/owner/bookings" className="text-sm text-slate-700 hover:text-resort-500 transition">Bookings</Link>}
          {authChecked && isAdmin && <Link href="/admin/approvals" className="text-sm text-slate-700 hover:text-resort-500 transition">Approvals</Link>}
          {authChecked && isAdmin && <Link href="/admin/bookings-control" className="text-sm text-slate-700 hover:text-resort-500 transition">Bookings</Link>}
          
          {authChecked && user ? (
            <>
              <Link href="/profile" className="text-sm text-slate-700 hover:text-resort-500 transition flex items-center gap-1">
                <span>👤</span>
                <span className="hidden md:inline">Profile</span>
              </Link>
              <button onClick={handleLogout} className="text-sm text-white bg-resort-teal px-4 py-2 rounded-lg hover:bg-resort-600 transition shadow-sm">Sign out</button>
            </>
          ) : authChecked ? (
            <>
              <Link href="/auth/signin" className="text-sm text-slate-700 hover:text-slate-900 transition">Sign in</Link>
              <Link href="/auth/signup" className="text-sm text-white bg-resort-500 px-4 py-2 rounded-lg hover:bg-resort-600 transition shadow-sm">Sign up</Link>
            </>
          ) : (
            <span className="text-sm text-slate-400">Checking...</span>
          )}
        </nav>
      </div>
    </header>
  )
}
