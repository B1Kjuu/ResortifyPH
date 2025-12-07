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
        if (!session?.user) { 
          router.push('/auth/signin')
          return 
        }

        const { data: userProfile, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
        if (error || !userProfile) {
          console.error('Profile error:', error)
          router.push('/')
          return
        }

        if (userProfile?.role !== 'guest') {
          router.push('/')
          return
        }

        if (mounted) {
          setProfile(userProfile)
          setLoading(false)
        }
      } catch (err) {
        console.error('Adventure hub error:', err)
        if (mounted) setLoading(false)
      }
    }
    
    load()
    
    return () => { mounted = false }
  }, [router])

  if (loading) return <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center text-slate-600">Loading...</div>

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-10 max-w-6xl mx-auto">
      <div className="mb-8">
        <p className="text-sm text-resort-500 font-semibold mb-2">Welcome Back</p>
        <h1 className="text-4xl font-bold text-resort-900 mb-2">Your Resort Adventure Hub</h1>
        <p className="text-lg text-slate-600">Discover amazing resorts, manage bookings, and create unforgettable memories</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Browse Resorts Card */}
        <Link href="/resorts" className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-lg transition">
          <div className="text-4xl mb-3">🌴</div>
          <h3 className="text-xl font-semibold text-resort-900 mb-2">Explore Paradise</h3>
          <p className="text-slate-600 mb-4">Find your next getaway with curated resort listings</p>
          <span className="text-sm text-resort-500 font-semibold">Start Exploring →</span>
        </Link>

        {/* My Bookings Card */}
        <Link href="/guest/trips" className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-lg transition">
          <div className="text-4xl mb-3">🎫</div>
          <h3 className="text-xl font-semibold text-resort-900 mb-2">Your Trips</h3>
          <p className="text-slate-600 mb-4">View upcoming bookings and past reservations</p>
          <span className="text-sm text-resort-500 font-semibold">View Trips →</span>
        </Link>
      </div>

      {/* Profile Info */}
      <div className="mt-8 bg-resort-50 border border-resort-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-resort-900 mb-3">Your Profile</h3>
        <div className="space-y-2 text-slate-700">
          <p><strong>Email:</strong> {profile?.email}</p>
          <p><strong>Name:</strong> {profile?.full_name}</p>
          <p><strong>Role:</strong> Guest</p>
        </div>
      </div>
    </div>
  )
}
