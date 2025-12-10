'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'

export default function Home(){
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
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

            // Clear timeout before redirecting
            clearTimeout(timeoutId)

            if (error) {
              console.error('Profile fetch error:', error)
              window.location.href = '/guest/adventure-hub'
              return
            }

            if (profile?.is_admin) {
              window.location.href = '/admin/command-center'
              return
            }
            
            if (profile?.role === 'owner') {
              window.location.href = '/owner/empire'
              return
            }
            
            window.location.href = '/guest/adventure-hub'
            return
          } catch (err) {
            console.error('Profile fetch exception:', err)
            clearTimeout(timeoutId)
            if (mounted) {
              window.location.href = '/guest/adventure-hub'
            }
            return
          }
        }
        
        if (mounted) {
          setLoading(false)
          clearTimeout(timeoutId)
        }
      } catch (err) {
        console.error('Auth check error:', err)
        if (mounted) {
          setLoading(false)
          clearTimeout(timeoutId)
        }
      }
    }

    // Safety timeout - if still loading after 5 seconds, show landing page
    timeoutId = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth taking too long, showing landing page')
        setLoading(false)
      }
    }, 5000)

    checkAuth()

    return () => {
      mounted = false
      clearTimeout(timeoutId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="w-full min-h-screen bg-white">
      {loading ? (
        <div className="w-full min-h-screen flex items-center justify-center bg-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-resort-500 mx-auto mb-4"></div>
            <p className="text-slate-600">Redirecting...</p>
          </div>
        </div>
      ) : (
      <>
      {/* Hero Section */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-20 sm:py-32 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-6 sm:space-y-8">
              <div>
                <span className="inline-block px-3 py-1 bg-resort-100 text-resort-700 rounded-full text-sm font-semibold mb-4">✨ Discover Your Perfect Escape</span>
                <h1 className="text-5xl sm:text-6xl font-bold text-slate-900 leading-tight">
                  Find Your Next <span className="bg-gradient-to-r from-resort-500 to-resort-600 bg-clip-text text-transparent">Paradise</span>
                </h1>
              </div>
              
              <p className="text-xl text-slate-600 leading-relaxed">
                Explore stunning resorts across the Philippines. Book unique accommodations, connect with resort owners, and create unforgettable memories.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href="/auth/signup" className="px-8 py-4 bg-gradient-to-r from-resort-500 to-resort-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all duration-300 text-center">
                  Get Started Free
                </Link>
                <Link href="/resorts" className="px-8 py-4 border-2 border-slate-300 text-slate-900 rounded-xl font-semibold hover:border-resort-500 hover:bg-slate-50 transition-all duration-300 text-center">
                  Browse Resorts
                </Link>
              </div>

              <div className="flex gap-6 pt-4 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="text-lg">✓</span>
                  <span>No hidden fees</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">✓</span>
                  <span>Instant booking</span>
                </div>
              </div>
            </div>

            {/* Right Image */}
            <div className="relative h-96 sm:h-full hidden md:block">
              <div className="absolute inset-0 bg-gradient-to-br from-resort-100 to-resort-200 rounded-3xl"></div>
              <div className="absolute inset-0 rounded-3xl overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 400 400" fill="none">
                  <rect width="400" height="400" fill="#F0F9FF"/>
                  <circle cx="200" cy="200" r="150" fill="#0B6BFF" opacity="0.1"/>
                  <circle cx="100" cy="100" r="80" fill="#00D4FF" opacity="0.1"/>
                  <circle cx="300" cy="300" r="100" fill="#0B6BFF" opacity="0.1"/>
                  <path d="M 80 200 Q 200 100 320 200" stroke="#0B6BFF" strokeWidth="3" opacity="0.2"/>
                </svg>
              </div>
              <div className="absolute inset-0 rounded-3xl overflow-hidden flex items-end justify-center pb-8">
                <span className="text-8xl">🏝️</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-20 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">Everything You Need</h2>
            <p className="text-xl text-slate-600">From browsing to booking to managing reservations</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Guests */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl mb-6">
                🧳
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">For Guests</h3>
              <ul className="space-y-3 text-slate-700">
                <li className="flex items-start gap-3">
                  <span className="text-blue-500 font-bold">→</span>
                  <span>Discover resorts nationwide</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-500 font-bold">→</span>
                  <span>Instant booking confirmation</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-500 font-bold">→</span>
                  <span>Manage all bookings</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-500 font-bold">→</span>
                  <span>Secure payments</span>
                </li>
              </ul>
            </div>

            {/* Owners */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 border border-green-200 hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center text-white text-2xl mb-6">
                🏨
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">For Owners</h3>
              <ul className="space-y-3 text-slate-700">
                <li className="flex items-start gap-3">
                  <span className="text-green-500 font-bold">→</span>
                  <span>List your resort in minutes</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 font-bold">→</span>
                  <span>Upload beautiful photos</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 font-bold">→</span>
                  <span>Manage bookings</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 font-bold">→</span>
                  <span>Reach more customers</span>
                </li>
              </ul>
            </div>

            {/* Admins */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-purple-500 rounded-full flex items-center justify-center text-white text-2xl mb-6">
                ⚙️
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">For Admins</h3>
              <ul className="space-y-3 text-slate-700">
                <li className="flex items-start gap-3">
                  <span className="text-purple-500 font-bold">→</span>
                  <span>Review listings</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-purple-500 font-bold">→</span>
                  <span>Maintain platform quality</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-purple-500 font-bold">→</span>
                  <span>Monitor bookings</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-purple-500 font-bold">→</span>
                  <span>Community management</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-20 sm:py-24 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold text-resort-400 mb-2">500+</div>
              <p className="text-slate-300">Resorts Listed</p>
            </div>
            <div>
              <div className="text-5xl font-bold text-resort-400 mb-2">5K+</div>
              <p className="text-slate-300">Happy Guests</p>
            </div>
            <div>
              <div className="text-5xl font-bold text-resort-400 mb-2">1K+</div>
              <p className="text-slate-300">Active Owners</p>
            </div>
            <div>
              <div className="text-5xl font-bold text-resort-400 mb-2">24/7</div>
              <p className="text-slate-300">Support</p>
            </div>
          </div>
        </div>
      </section>

      {/* Locations Section */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-20 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">Explore by Type</h2>
            <p className="text-xl text-slate-600">Find the perfect resort for your getaway</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Link href="/resorts?type=beach" className="group cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 p-8 text-white hover:shadow-xl transition-all h-64 flex flex-col justify-between">
              <div>
                <div className="text-5xl mb-4">🏖️</div>
                <h3 className="text-2xl font-bold mb-2">Beach Resorts</h3>
                <p className="text-blue-100">Crystal waters & sandy shores</p>
              </div>
              <span className="text-sm font-semibold group-hover:translate-x-2 transition-transform inline-block">Explore →</span>
            </Link>

            <Link href="/resorts?type=mountain" className="group cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-green-400 to-green-600 p-8 text-white hover:shadow-xl transition-all h-64 flex flex-col justify-between">
              <div>
                <div className="text-5xl mb-4">🏔️</div>
                <h3 className="text-2xl font-bold mb-2">Mountain Resorts</h3>
                <p className="text-green-100">Cool air & scenic views</p>
              </div>
              <span className="text-sm font-semibold group-hover:translate-x-2 transition-transform inline-block">Explore →</span>
            </Link>

            <Link href="/resorts?type=nature" className="group cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 p-8 text-white hover:shadow-xl transition-all h-64 flex flex-col justify-between">
              <div>
                <div className="text-5xl mb-4">🌿</div>
                <h3 className="text-2xl font-bold mb-2">Nature Retreats</h3>
                <p className="text-amber-100">Peaceful & eco-friendly</p>
              </div>
              <span className="text-sm font-semibold group-hover:translate-x-2 transition-transform inline-block">Explore →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-20 sm:py-24 bg-gradient-to-r from-resort-500 to-resort-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">Ready to Book Your Perfect Getaway?</h2>
          <p className="text-lg sm:text-xl mb-8 text-resort-100">Join thousands of travelers discovering amazing resorts across the Philippines</p>
          {!user && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup" className="px-8 py-4 bg-white text-resort-600 rounded-xl font-semibold hover:shadow-xl transition-all">
                Create Free Account
              </Link>
              <Link href="/resorts" className="px-8 py-4 border-2 border-white text-white rounded-xl font-semibold hover:bg-white hover:bg-opacity-10 transition-all">
                Start Browsing
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
    )}
    </div>
  )
}
