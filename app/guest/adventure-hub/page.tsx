'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function AdventureHub(){
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    
    async function load(){
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return
        
        if (!session?.user) { 
          router.push('/auth/login')
          return 
        }

        const { data: userProfile, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
        if (!mounted) return
        
        if (error || !userProfile) {
          console.error('Profile error:', error)
          router.push('/')
          return
        }

        if (userProfile?.role !== 'guest') {
          router.push('/')
          return
        }

        setProfile(userProfile)
        setLoading(false)
      } catch (err) {
        console.error('Adventure hub error:', err)
        if (mounted) setLoading(false)
      }
    }
    
    load()
    
    return () => { mounted = false }
  }, [])

  if (loading) return <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center text-slate-600">Loading...</div>

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-resort-50 via-white to-resort-100 px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <p className="text-sm text-resort-500 font-semibold mb-2 uppercase tracking-wide">Welcome Back, {profile?.full_name?.split(' ')[0] || 'Traveler'}</p>
          <h1 className="text-4xl md:text-5xl font-bold text-resort-900 mb-4">Your Resort Adventure Hub</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">Discover amazing resorts, manage bookings, and create unforgettable memories</p>
        </div>

        {/* Main Action Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {/* Browse Resorts Card */}
          <Link href="/resorts" className="group bg-white border-2 border-slate-200 rounded-xl p-8 hover:shadow-xl hover:border-resort-500 transition-all duration-300 transform hover:-translate-y-1">
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🌴</div>
            <h3 className="text-2xl font-bold text-resort-900 mb-3">Explore Paradise</h3>
            <p className="text-slate-600 mb-4 leading-relaxed">Find your next getaway with curated resort listings across Manila, Antipolo, and Rizal</p>
            <span className="inline-flex items-center text-sm text-resort-500 font-semibold group-hover:text-resort-600">
              Start Exploring 
              <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </Link>

          {/* My Bookings Card */}
          <Link href="/guest/trips" className="group bg-white border-2 border-slate-200 rounded-xl p-8 hover:shadow-xl hover:border-resort-500 transition-all duration-300 transform hover:-translate-y-1">
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🎫</div>
            <h3 className="text-2xl font-bold text-resort-900 mb-3">Your Trips</h3>
            <p className="text-slate-600 mb-4 leading-relaxed">View upcoming bookings, past reservations, and manage your travel plans</p>
            <span className="inline-flex items-center text-sm text-resort-500 font-semibold group-hover:text-resort-600">
              View Trips 
              <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </Link>
        </div>

        {/* Profile & Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Link href="/profile" className="bg-gradient-to-br from-resort-500 to-resort-600 text-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="text-3xl mb-3">👤</div>
            <h3 className="text-xl font-bold mb-2">Your Profile</h3>
            <p className="text-sm opacity-90 mb-3">{profile?.email}</p>
            <span className="inline-flex items-center text-sm font-semibold">
              Manage Profile →
            </span>
          </Link>

          {/* Favorites - Coming Soon */}
          <div className="bg-white border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center opacity-60">
            <div className="text-3xl mb-2">❤️</div>
            <h3 className="text-lg font-semibold text-slate-700 mb-1">Favorites</h3>
            <p className="text-xs text-slate-500">Coming Soon</p>
          </div>

          {/* Reviews - Coming Soon */}
          <div className="bg-white border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center opacity-60">
            <div className="text-3xl mb-2">⭐</div>
            <h3 className="text-lg font-semibold text-slate-700 mb-1">Reviews</h3>
            <p className="text-xs text-slate-500">Coming Soon</p>
          </div>
        </div>
      </div>
    </div>
  )
}
