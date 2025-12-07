'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'

export default function Navbar(){
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function checkAuth(){
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()
        setIsAdmin(profile?.is_admin || false)
      } else {
        setUser(null)
        setIsAdmin(false)
      }
      setAuthChecked(true)
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()
        setIsAdmin(profile?.is_admin || false)
      } else {
        setUser(null)
        setIsAdmin(false)
      }
      setAuthChecked(true)
    })

    return () => subscription?.unsubscribe()
  }, [])

  async function handleLogout(){
    await supabase.auth.signOut()
    setUser(null)
    setIsAdmin(false)
    router.push('/')
  }

  return (
    <header className="bg-white border-b w-full">
      <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between py-4 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-3">
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
          <Link href="/resorts" className="text-sm text-slate-700">Resorts</Link>
          {authChecked && user && !isAdmin && <Link href="/guest/trips" className="text-sm text-slate-700">My Trips</Link>}
          {authChecked && user && !isAdmin && <Link href="/guest/adventure-hub" className="text-sm text-slate-700">Hub</Link>}
          {authChecked && isAdmin && <Link href="/admin/command-center" className="text-sm text-slate-700">Dashboard</Link>}
          {authChecked && isAdmin && <Link href="/admin/approvals" className="text-sm text-resort-teal font-semibold">Approvals</Link>}
          {authChecked && isAdmin && <Link href="/admin/bookings-control" className="text-sm text-resort-teal font-semibold">Bookings</Link>}
          
          {authChecked && user ? (
            <>
              <span className="text-sm text-slate-600">{user.email}</span>
              <button onClick={handleLogout} className="text-sm text-white bg-resort-teal px-3 py-1 rounded hover:bg-resort-teal-dark transition">Sign out</button>
            </>
          ) : authChecked ? (
            <>
              <Link href="/auth/signin" className="text-sm text-slate-700 hover:text-slate-900">Sign in</Link>
              <Link href="/auth/signup" className="text-sm text-white bg-resort-500 px-3 py-1 rounded hover:bg-resort-600 transition">Sign up</Link>
            </>
          ) : (
            <span className="text-sm text-slate-400">Checking...</span>
          )}
        </nav>
      </div>
    </header>
  )
}
