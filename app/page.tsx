'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'
import Reveal from '../components/Reveal'
import { FiSearch, FiCalendar, FiShield, FiMapPin, FiHome, FiUsers, FiCheckCircle, FiCreditCard, FiStar, FiMessageCircle, FiHelpCircle, FiChevronDown, FiClock, FiPhoneCall, FiXCircle, FiFileText, FiDollarSign, FiRefreshCcw, FiArrowRight } from 'react-icons/fi'

export default function Home(){
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout

    async function checkAuth(){
      // In e2e mode, skip auth gating and show landing immediately
      if (process.env.NEXT_PUBLIC_E2E === 'true') {
        setLoading(false)
        return
      }
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return

        if (session?.user) {
          setUser(session.user)
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('id, email, is_admin, role')
            .eq('id', session.user.id)
            .maybeSingle()

          if (!mounted) return
          clearTimeout(timeoutId)

          if (error) {
            console.error('Profile fetch error:', error)
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
        }

        // No session → show landing page
        setLoading(false)
      } catch (err) {
        console.error('Auth check error:', err)
        if (mounted) {
          setLoading(false)
          clearTimeout(timeoutId)
        }
      }
    }

    // Safety timeout - if still loading after 2 seconds, show landing page
    timeoutId = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth taking too long, showing landing page')
        setLoading(false)
      }
    }, 2000)

    checkAuth()

    // Signal a 'load' event to help test environments
    setTimeout(() => { try { window.dispatchEvent(new Event('load')) } catch {} }, 0)

    return () => { 
      mounted = false
      clearTimeout(timeoutId)
    }
  }, [])

  return (
    <div className="w-full min-h-screen bg-white">
      <>
      {/* Hero Section */}
      <section className="relative overflow-hidden w-full px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32 bg-gradient-to-b from-resort-50/80 via-white to-white">
        {/* Ambient blurred gradient accents */}
        <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[400px] sm:w-[600px] lg:w-[720px] h-[200px] sm:h-[300px] rounded-full bg-gradient-to-r from-resort-300/40 via-resort-500/25 to-ocean-400/20 blur-3xl float-slow"></div>
        <div aria-hidden className="pointer-events-none absolute bottom-0 right-0 translate-x-10 translate-y-10 w-[250px] sm:w-[380px] h-[150px] sm:h-[220px] rounded-full bg-gradient-to-br from-ocean-200/40 to-resort-400/25 blur-3xl float-slow"></div>
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-5 sm:space-y-6 lg:space-y-8 fade-in-up text-center lg:text-left">
              <div>
                <span className="inline-block px-3 py-1.5 bg-gradient-to-r from-resort-100 to-ocean-100 text-resort-700 rounded-full text-xs sm:text-sm font-semibold mb-4 shadow-sm">✨ Discover Your Perfect Escape</span>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight">
                  Find Your Next <span className="bg-gradient-to-r from-resort-500 via-resort-600 to-ocean-600 bg-clip-text text-transparent">Paradise</span>
                </h1>
              </div>
              
              <p className="text-base sm:text-lg lg:text-xl text-slate-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
                Explore stunning resorts across the Philippines. Book unique accommodations, connect with resort owners, and create unforgettable memories.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4 justify-center lg:justify-start">
                <Link href="/auth/signup" prefetch={false} className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-resort-500 to-resort-600 text-white rounded-xl font-semibold hover:shadow-xl hover:shadow-resort-500/25 transition-all duration-300 text-center text-sm sm:text-base">
                  Get Started Free
                </Link>
                <Link
                  href="/resorts"
                  prefetch={false}
                  className="px-6 sm:px-8 py-3 sm:py-4 border-2 border-slate-300 text-slate-900 rounded-xl font-semibold hover:border-resort-500 hover:bg-resort-50/50 transition-all duration-300 text-center text-sm sm:text-base"
                >
                  Browse Resorts
                </Link>
              </div>

              <div className="flex gap-4 sm:gap-6 pt-2 sm:pt-4 text-xs sm:text-sm text-slate-600 justify-center lg:justify-start">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-resort-100 flex items-center justify-center text-resort-600">✓</span>
                  <span>No hidden fees</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-resort-100 flex items-center justify-center text-resort-600">✓</span>
                  <span>Instant booking</span>
                </div>
              </div>
            </div>

            {/* Right Image */}
            <div className="relative h-64 sm:h-80 lg:h-full hidden sm:block blur-in">
              <div className="absolute inset-0 bg-gradient-to-br from-resort-100 via-ocean-50 to-resort-200 rounded-2xl sm:rounded-3xl"></div>
              <div className="absolute inset-0 rounded-2xl sm:rounded-3xl overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 400 400" fill="none">
                  <rect width="400" height="400" fill="#F0F9FF"/>
                  <circle cx="200" cy="200" r="150" fill="#22c55e" opacity="0.08"/>
                  <circle cx="100" cy="100" r="80" fill="#0ea5e9" opacity="0.08"/>
                  <circle cx="300" cy="300" r="100" fill="#22c55e" opacity="0.08"/>
                  <path d="M 80 200 Q 200 100 320 200" stroke="#22c55e" strokeWidth="3" opacity="0.2"/>
                </svg>
              </div>
              <div className="absolute inset-0 rounded-2xl sm:rounded-3xl overflow-hidden flex items-end justify-center pb-6 sm:pb-8">
                <span className="text-6xl sm:text-7xl lg:text-8xl">🏝️</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <span className="inline-block px-4 py-1.5 bg-resort-500/20 text-resort-300 rounded-full text-xs sm:text-sm font-semibold mb-4">WHY CHOOSE US</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">The Complete Platform</h2>
            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto">Everything you need to discover, book, and enjoy the best resorts across the Philippines</p>
          </div>

          <Reveal className="grid sm:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto">
            {/* Guests */}
            <div className="group relative p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 hover:border-resort-400/50 transition-all duration-300 hover:shadow-2xl hover:shadow-resort-500/10">
              <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-resort-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-resort-400 to-resort-600 text-white flex items-center justify-center mb-5 shadow-lg shadow-resort-500/30">
                  <FiSearch size={24} className="sm:w-7 sm:h-7" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-4">For Guests</h3>
                <ul className="space-y-3 text-slate-300">
                  <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-resort-500/20 flex items-center justify-center text-resort-400"><FiCheckCircle size={14} /></span><span>Browse resorts by location & amenities</span></li>
                  <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-resort-500/20 flex items-center justify-center text-resort-400"><FiCheckCircle size={14} /></span><span>Real-time availability calendar</span></li>
                  <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-resort-500/20 flex items-center justify-center text-resort-400"><FiCheckCircle size={14} /></span><span>Secure messaging with hosts</span></li>
                  <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-resort-500/20 flex items-center justify-center text-resort-400"><FiCheckCircle size={14} /></span><span>Manage bookings in one place</span></li>
                </ul>
                <Link href="/auth/signup" className="inline-flex items-center gap-2 mt-6 text-resort-400 font-semibold hover:text-resort-300 transition-colors">
                  Start exploring <span className="group-hover:translate-x-1 transition-transform">→</span>
                </Link>
              </div>
            </div>

            {/* Owners */}
            <div className="group relative p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 hover:border-ocean-400/50 transition-all duration-300 hover:shadow-2xl hover:shadow-ocean-500/10">
              <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-ocean-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-ocean-400 to-ocean-600 text-white flex items-center justify-center mb-5 shadow-lg shadow-ocean-500/30">
                  <FiHome size={24} className="sm:w-7 sm:h-7" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-4">For Hosts</h3>
                <ul className="space-y-3 text-slate-300">
                  <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-ocean-500/20 flex items-center justify-center text-ocean-400"><FiCheckCircle size={14} /></span><span>List your resort in minutes</span></li>
                  <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-ocean-500/20 flex items-center justify-center text-ocean-400"><FiCheckCircle size={14} /></span><span>Flexible pricing & packages</span></li>
                  <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-ocean-500/20 flex items-center justify-center text-ocean-400"><FiCheckCircle size={14} /></span><span>Booking calendar & management</span></li>
                  <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-ocean-500/20 flex items-center justify-center text-ocean-400"><FiCheckCircle size={14} /></span><span>Reach guests nationwide</span></li>
                </ul>
                <Link href="/become-host" className="inline-flex items-center gap-2 mt-6 text-ocean-400 font-semibold hover:text-ocean-300 transition-colors">
                  Become a host <span className="group-hover:translate-x-1 transition-transform">→</span>
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Stats/Trust Section */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-16 bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-resort-600 mb-1">100+</div>
              <div className="text-sm sm:text-base text-slate-600">Resorts Listed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-resort-600 mb-1">50+</div>
              <div className="text-sm sm:text-base text-slate-600">Provinces Covered</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-resort-600 mb-1">4.8★</div>
              <div className="text-sm sm:text-base text-slate-600">Average Rating</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-resort-600 mb-1">24/7</div>
              <div className="text-sm sm:text-base text-slate-600">Support Available</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Enhanced */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-white to-resort-50/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <span className="inline-block px-4 py-1.5 bg-resort-100 text-resort-700 rounded-full text-xs sm:text-sm font-semibold mb-4">SIMPLE PROCESS</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">How It Works</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">Book your dream resort in just three easy steps</p>
          </div>
          
          <div className="relative">
            {/* Connection line - hidden on mobile */}
            <div className="hidden sm:block absolute top-24 left-1/2 -translate-x-1/2 w-2/3 h-0.5 bg-gradient-to-r from-resort-200 via-resort-400 to-ocean-400"></div>
            
            <div className="grid sm:grid-cols-3 gap-8 sm:gap-6">
              <Reveal className="relative">
                <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-resort-200/50 transition-all duration-300 text-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-resort-500 to-resort-600 text-white flex items-center justify-center mx-auto mb-5 shadow-lg shadow-resort-500/30 text-2xl sm:text-3xl font-bold">
                    1
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3">Discover</h3>
                  <p className="text-slate-600">Browse resorts by location, type, amenities, and price. Use filters to find your perfect match.</p>
                </div>
              </Reveal>
              
              <Reveal className="relative">
                <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-resort-200/50 transition-all duration-300 text-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-resort-600 to-ocean-500 text-white flex items-center justify-center mx-auto mb-5 shadow-lg shadow-resort-500/30 text-2xl sm:text-3xl font-bold">
                    2
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3">Book</h3>
                  <p className="text-slate-600">Select your dates, choose your package, and submit your booking request to the host.</p>
                </div>
              </Reveal>
              
              <Reveal className="relative">
                <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-ocean-200/50 transition-all duration-300 text-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-ocean-500 to-ocean-600 text-white flex items-center justify-center mx-auto mb-5 shadow-lg shadow-ocean-500/30 text-2xl sm:text-3xl font-bold">
                    3
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3">Enjoy</h3>
                  <p className="text-slate-600">Get confirmed, coordinate with your host, and create unforgettable memories.</p>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* Locations Section - Redesigned */}
      <section className="relative overflow-hidden w-full px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <span className="inline-block px-4 py-1.5 bg-ocean-100 text-ocean-700 rounded-full text-xs sm:text-sm font-semibold mb-4">BROWSE RESORTS</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">Explore by Type</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">Find the perfect resort for your getaway</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            <Reveal>
              <Link href="/resorts?type=beach" className="group block relative overflow-hidden rounded-2xl sm:rounded-3xl h-72 sm:h-80">
                <div className="absolute inset-0 bg-gradient-to-br from-ocean-400 via-ocean-500 to-ocean-600"></div>
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/40 to-transparent"></div>
                <div className="relative h-full p-6 sm:p-8 flex flex-col justify-between text-white">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-7 h-7 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-bold mb-2">Beach Resorts</h3>
                    <p className="text-white/80 mb-3">Crystal waters & sandy shores</p>
                    <span className="inline-flex items-center text-sm font-semibold group-hover:translate-x-2 transition-transform">
                      Explore <FiArrowRight className="ml-2" />
                    </span>
                  </div>
                </div>
              </Link>
            </Reveal>

            <Reveal>
              <Link href="/resorts?type=mountain" className="group block relative overflow-hidden rounded-2xl sm:rounded-3xl h-72 sm:h-80">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700"></div>
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/40 to-transparent"></div>
                <div className="relative h-full p-6 sm:p-8 flex flex-col justify-between text-white">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-7 h-7 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M5 21l7-14 7 14M12 7l5 10H7l5-10z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-bold mb-2">Mountain Resorts</h3>
                    <p className="text-white/80 mb-3">Cool air & scenic views</p>
                    <span className="inline-flex items-center text-sm font-semibold group-hover:translate-x-2 transition-transform">
                      Explore <FiArrowRight className="ml-2" />
                    </span>
                  </div>
                </div>
              </Link>
            </Reveal>

            <Reveal>
              <Link href="/resorts?type=nature" className="group block relative overflow-hidden rounded-2xl sm:rounded-3xl h-72 sm:h-80">
                <div className="absolute inset-0 bg-gradient-to-br from-resort-500 via-resort-600 to-resort-700"></div>
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/40 to-transparent"></div>
                <div className="relative h-full p-6 sm:p-8 flex flex-col justify-between text-white">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-7 h-7 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M5 21c1.5-1.5 3.5-3 7-3s5.5 1.5 7 3M12 18c-4 0-6 3-6 3M9 10c0-1.657 1.343-3 3-3s3 1.343 3 3c0 2-3 4-3 4s-3-2-3-4z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-bold mb-2">Nature Retreats</h3>
                    <p className="text-white/80 mb-3">Peaceful & eco-friendly</p>
                    <span className="inline-flex items-center text-sm font-semibold group-hover:translate-x-2 transition-transform">
                      Explore <FiArrowRight className="ml-2" />
                    </span>
                  </div>
                </div>
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Testimonials - Redesigned */}
      <section className="relative overflow-hidden w-full px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <span className="inline-block px-4 py-1.5 bg-sunset-100 text-sunset-700 rounded-full text-xs sm:text-sm font-semibold mb-4">TESTIMONIALS</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">What Guests Say</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">Real experiences from real travelers</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
<Reveal>
              <div className="relative p-6 sm:p-8 bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-lg shadow-slate-200/50 hover:shadow-xl transition-all duration-300">
                <div className="absolute -top-3 -right-3 w-12 h-12 bg-gradient-to-br from-resort-500 to-ocean-500 rounded-full flex items-center justify-center text-white text-2xl shadow-lg">&quot;</div>
                <div className="flex gap-1 text-amber-400 mb-4">
                  <FiStar className="fill-current" /><FiStar className="fill-current" /><FiStar className="fill-current" /><FiStar className="fill-current" /><FiStar className="fill-current" />
                </div>
                <p className="text-slate-700 text-lg mb-6">&quot;Smooth booking and a beautiful place. The host was incredibly accommodating. Will definitely return!&quot;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-resort-400 to-ocean-400 flex items-center justify-center text-white font-semibold">A</div>
                  <div>
                    <div className="font-semibold text-slate-900">Ana</div>
                    <div className="text-sm text-slate-500">Cebu City</div>
                  </div>
                </div>
              </div>
            </Reveal>
<Reveal>
              <div className="relative p-6 sm:p-8 bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-lg shadow-slate-200/50 hover:shadow-xl transition-all duration-300">
                <div className="absolute -top-3 -right-3 w-12 h-12 bg-gradient-to-br from-ocean-500 to-resort-500 rounded-full flex items-center justify-center text-white text-2xl shadow-lg">&quot;</div>
                <div className="flex gap-1 text-amber-400 mb-4">
                  <FiStar className="fill-current" /><FiStar className="fill-current" /><FiStar className="fill-current" /><FiStar className="fill-current" /><FiStar className="fill-current" />
                </div>
                <p className="text-slate-700 text-lg mb-6">&quot;Great host and clear communication from start to finish. The resort exceeded all expectations!&quot;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center text-white font-semibold">M</div>
                  <div>
                    <div className="font-semibold text-slate-900">Marco</div>
                    <div className="text-sm text-slate-500">Baguio City</div>
                  </div>
                </div>
              </div>
            </Reveal>
<Reveal>
              <div className="relative p-6 sm:p-8 bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-lg shadow-slate-200/50 hover:shadow-xl transition-all duration-300">
                <div className="absolute -top-3 -right-3 w-12 h-12 bg-gradient-to-br from-sunset-500 to-resort-500 rounded-full flex items-center justify-center text-white text-2xl shadow-lg">&quot;</div>
                <div className="flex gap-1 text-amber-400 mb-4">
                  <FiStar className="fill-current" /><FiStar className="fill-current" /><FiStar className="fill-current" /><FiStar className="fill-current" /><FiStar className="fill-current" />
                </div>
                <p className="text-slate-700 text-lg mb-6">&quot;Loved the variety of beach options. Easy to filter and find exactly what we were looking for!&quot;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sunset-400 to-rose-400 flex items-center justify-center text-white font-semibold">J</div>
                  <div>
                    <div className="font-semibold text-slate-900">Jasmine</div>
                    <div className="text-sm text-slate-500">La Union</div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* FAQ - Redesigned */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <span className="inline-block px-4 py-1.5 bg-resort-100 text-resort-700 rounded-full text-xs sm:text-sm font-semibold mb-4">FAQ</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">Everything you need to know about booking on ResortifyPH</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Reveal as="details" className="faq-item p-5">
              <summary className="faq-summary">
                <span className="flex items-center gap-2"><FiShield className="text-resort-600" /> Is payment secure?</span>
                <FiChevronDown className="faq-caret text-slate-500" />
              </summary>
              <p className="mt-3 text-sm text-slate-600">We don’t process payments on-site. Coordinate payment details directly with the host in chat, and verify amounts and accounts before sending money. We’ll add in-site payment options later once the platform has more traction.</p>
            </Reveal>

            <Reveal as="details" className="faq-item p-5">
              <summary className="faq-summary">
                <span className="flex items-center gap-2"><FiCalendar className="text-resort-600" /> How do I change dates?</span>
                <FiChevronDown className="faq-caret text-slate-500" />
              </summary>
              <p className="mt-3 text-sm text-slate-600">You can modify dates from your Bookings dashboard if the listing supports changes. Otherwise, message the host to request a new schedule—most respond quickly and will offer alternatives when the calendar is tight.</p>
            </Reveal>

            <Reveal as="details" className="faq-item p-5">
              <summary className="faq-summary">
                <span className="flex items-center gap-2"><FiCheckCircle className="text-resort-600" /> Are hosts verified?</span>
                <FiChevronDown className="faq-caret text-slate-500" />
              </summary>
              <p className="mt-3 text-sm text-slate-600">Yes. We review listings and perform checks on host identities, property details, and policy compliance. Verified hosts display badges, and we regularly audit reviews to keep the marketplace high quality.</p>
            </Reveal>

            <Reveal as="details" className="faq-item p-5">
              <summary className="faq-summary">
                <span className="flex items-center gap-2"><FiFileText className="text-resort-600" /> What’s the cancellation policy?</span>
                <FiChevronDown className="faq-caret text-slate-500" />
              </summary>
              <p className="mt-3 text-sm text-slate-600">Policies vary by resort and appear in the Cancellation section of each listing. Many offer full refunds within a grace period; stricter policies may apply during peak seasons or for last-minute changes.</p>
            </Reveal>

            <Reveal as="details" className="faq-item p-5">
              <summary className="faq-summary">
                <span className="flex items-center gap-2"><FiRefreshCcw className="text-resort-600" /> Can I get a refund?</span>
                <FiChevronDown className="faq-caret text-slate-500" />
              </summary>
              <p className="mt-3 text-sm text-slate-600">Refunds follow the listing’s policy. If eligible, we process refunds automatically to your original payment method; timing depends on your bank. You’ll receive status updates by email and in your dashboard.</p>
            </Reveal>

            <Reveal as="details" className="faq-item p-5">
              <summary className="faq-summary">
                <span className="flex items-center gap-2"><FiClock className="text-resort-600" /> What are check-in and check-out times?</span>
                <FiChevronDown className="faq-caret text-slate-500" />
              </summary>
              <p className="mt-3 text-sm text-slate-600">Check-in and check-out are set by the host and appear on each listing. If you need early check-in or late check-out, message the host—they’ll confirm based on cleaning schedules and availability.</p>
            </Reveal>

            <Reveal as="details" className="faq-item p-5">
              <summary className="faq-summary">
                <span className="flex items-center gap-2"><FiDollarSign className="text-resort-600" /> Are there any extra fees?</span>
                <FiChevronDown className="faq-caret text-slate-500" />
              </summary>
              <p className="mt-3 text-sm text-slate-600">Pricing is transparent—taxes, cleaning, or security deposits are shown before checkout. If a host charges optional add-ons (like equipment rental), they’ll be clearly listed on the resort page.</p>
            </Reveal>

            <Reveal as="details" className="faq-item p-5">
              <summary className="faq-summary">
                <span className="flex items-center gap-2"><FiPhoneCall className="text-resort-600" /> How do I contact support?</span>
                <FiChevronDown className="faq-caret text-slate-500" />
              </summary>
              <p className="mt-3 text-sm text-slate-600">Open the Help Center for quick answers or submit a ticket via the contact form. Our team is available daily and can assist with payments, booking changes, or reporting listing issues.</p>
            </Reveal>

            <Reveal as="details" className="faq-item p-5">
              <summary className="faq-summary">
                <span className="flex items-center gap-2"><FiXCircle className="text-resort-600" /> My payment failed. What should I do?</span>
                <FiChevronDown className="faq-caret text-slate-500" />
              </summary>
              <p className="mt-3 text-sm text-slate-600">Retry after a few minutes or switch methods (card, e-wallet, or bank transfer). If it still fails, contact support with the error code—we’ll verify the gateway and help you complete the booking.</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA Section - Redesigned */}
      <section className="relative overflow-hidden w-full px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-resort-600 via-resort-700 to-ocean-700"></div>
        <div className="absolute inset-0 bg-[url('/assets/pattern.svg')] opacity-5"></div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3"></div>
        
        <div className="relative max-w-4xl mx-auto text-center text-white">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Over 100+ resorts available
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Ready to Book Your<br />Perfect Getaway?
          </h2>
          <p className="text-lg sm:text-xl lg:text-2xl mb-8 sm:mb-10 text-white/80 max-w-2xl mx-auto">
            Join thousands of travelers discovering amazing resorts across the Philippines
          </p>
          {!user && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup" className="group px-8 py-4 bg-white text-resort-700 rounded-2xl font-semibold hover:shadow-2xl hover:shadow-white/25 transition-all text-base sm:text-lg flex items-center justify-center gap-2">
                Create Free Account
                <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/resorts" className="px-8 py-4 border-2 border-white/50 text-white rounded-2xl font-semibold hover:bg-white/10 hover:border-white transition-all text-base sm:text-lg backdrop-blur-sm">
                Browse Resorts
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
    </div>
  )
}
