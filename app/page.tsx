'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'
import Reveal from '../components/Reveal'
import { FiSearch, FiCalendar, FiShield, FiMapPin, FiHome, FiUsers, FiCheckCircle, FiCreditCard, FiStar, FiMessageCircle, FiHelpCircle, FiChevronDown, FiClock, FiPhoneCall, FiXCircle, FiFileText, FiDollarSign, FiRefreshCcw } from 'react-icons/fi'

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
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('id, email, is_admin, role')
            .eq('id', session.user.id)
            .single()

          if (!mounted) return
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

    // Safety timeout - if still loading after 5 seconds, show landing page
    timeoutId = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth taking too long, showing landing page')
        setLoading(false)
      }
    }, 5000)

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
      <section className="relative overflow-hidden w-full px-4 sm:px-6 lg:px-8 py-20 sm:py-32 bg-gradient-to-b from-slate-50 to-white">
        {/* Ambient blurred gradient accents */}
        <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[720px] h-[300px] rounded-full bg-gradient-to-r from-resort-300/50 via-resort-500/30 to-resort-700/20 blur-3xl float-slow"></div>
        <div aria-hidden className="pointer-events-none absolute bottom-0 right-0 translate-x-10 translate-y-10 w-[380px] h-[220px] rounded-full bg-gradient-to-br from-resort-200/50 to-resort-400/30 blur-3xl float-slow"></div>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-6 sm:space-y-8 fade-in-up">
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
                <Link href="/auth/signup" prefetch={false} className="px-8 py-4 bg-gradient-to-r from-resort-500 to-resort-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all duration-300 text-center">
                  Get Started Free
                </Link>
                <Link href="/resorts" prefetch={false} onClick={(e)=>{ e.preventDefault(); try { router.push('/resorts') } catch {} finally { window.location.assign('/resorts') } }} className="px-8 py-4 border-2 border-slate-300 text-slate-900 rounded-xl font-semibold hover:border-resort-500 hover:bg-slate-50 transition-all duration-300 text-center">
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
            <div className="relative h-96 sm:h-full hidden md:block blur-in">
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
      <section className="w-full px-4 sm:px-6 lg:px-8 py-16 sm:py-20 bg-gradient-to-br from-resort-teal-dark to-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">Built for Every User</h2>
            <p className="text-lg sm:text-xl text-white/80">From browsing to booking to managing reservations</p>
          </div>

          <Reveal className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {/* Guests */}
            <div className="p-6 rounded-2xl border border-slate-200 hover:shadow-lg transition-all bg-white will-change-transform hover:translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-resort-100 text-resort-700 flex items-center justify-center mb-4">
                <FiSearch size={22} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">For Guests</h3>
              <ul className="space-y-2 text-slate-700 text-sm">
                <li className="flex items-start gap-2"><FiHome className="mt-0.5" /><span>Discover resorts nationwide</span></li>
                <li className="flex items-start gap-2"><FiCalendar className="mt-0.5" /><span>Instant booking confirmation</span></li>
                <li className="flex items-start gap-2"><FiUsers className="mt-0.5" /><span>Manage all bookings</span></li>
                <li className="flex items-start gap-2"><FiShield className="mt-0.5" /><span>Secure payments</span></li>
              </ul>
            </div>

            {/* Owners */}
            <div className="p-6 rounded-2xl border border-slate-200 hover:shadow-lg transition-all bg-white will-change-transform hover:translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-resort-100 text-resort-700 flex items-center justify-center mb-4">
                <FiHome size={22} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">For Owners</h3>
              <ul className="space-y-2 text-slate-700 text-sm">
                <li className="flex items-start gap-2"><FiSearch className="mt-0.5" /><span>List your resort in minutes</span></li>
                <li className="flex items-start gap-2"><FiMapPin className="mt-0.5" /><span>Showcase great locations</span></li>
                <li className="flex items-start gap-2"><FiCalendar className="mt-0.5" /><span>Manage bookings</span></li>
                <li className="flex items-start gap-2"><FiUsers className="mt-0.5" /><span>Reach more customers</span></li>
              </ul>
            </div>

            {/* Admins */}
            <div className="p-6 rounded-2xl border border-slate-200 hover:shadow-lg transition-all bg-white will-change-transform hover:translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-resort-100 text-resort-700 flex items-center justify-center mb-4">
                <FiShield size={22} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">For Admins</h3>
              <ul className="space-y-2 text-slate-700 text-sm">
                <li className="flex items-start gap-2"><FiSearch className="mt-0.5" /><span>Review listings</span></li>
                <li className="flex items-start gap-2"><FiShield className="mt-0.5" /><span>Maintain platform quality</span></li>
                <li className="flex items-start gap-2"><FiCalendar className="mt-0.5" /><span>Monitor bookings</span></li>
                <li className="flex items-start gap-2"><FiUsers className="mt-0.5" /><span>Community management</span></li>
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Highlights Section */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-16 bg-gradient-to-r from-resort-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-6">
            <Reveal className="p-6 bg-white rounded-2xl border border-slate-200 hover:shadow-lg transition-all will-change-transform hover:translate-y-1">
              <div className="w-10 h-10 rounded-lg bg-resort-100 text-resort-700 flex items-center justify-center mb-3"><FiCheckCircle /></div>
              <h3 className="font-semibold text-slate-900 mb-1">Transparent Pricing</h3>
              <p className="text-sm text-slate-600">Clear rates and no hidden fees when you book.</p>
            </Reveal>
            <Reveal className="p-6 bg-white rounded-2xl border border-slate-200 hover:shadow-lg transition-all will-change-transform hover:translate-y-1">
              <div className="w-10 h-10 rounded-lg bg-resort-100 text-resort-700 flex items-center justify-center mb-3"><FiShield /></div>
              <h3 className="font-semibold text-slate-900 mb-1">Verified Hosts</h3>
              <p className="text-sm text-slate-600">Quality-first listings with host verification checks.</p>
            </Reveal>
            <Reveal className="p-6 bg-white rounded-2xl border border-slate-200 hover:shadow-lg transition-all will-change-transform hover:translate-y-1">
              <div className="w-10 h-10 rounded-lg bg-resort-100 text-resort-700 flex items-center justify-center mb-3"><FiCalendar /></div>
              <h3 className="font-semibold text-slate-900 mb-1">Flexible Bookings</h3>
              <p className="text-sm text-slate-600">Instant confirmations and easy date management.</p>
            </Reveal>
            <Reveal className="p-6 bg-white rounded-2xl border border-slate-200 hover:shadow-lg transition-all will-change-transform hover:translate-y-1">
              <div className="w-10 h-10 rounded-lg bg-resort-100 text-resort-700 flex items-center justify-center mb-3"><FiMessageCircle /></div>
              <h3 className="font-semibold text-slate-900 mb-1">Responsive Support</h3>
              <p className="text-sm text-slate-600">Helpful assistance before, during, and after your stay.</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-16 sm:py-20 bg-gradient-to-br from-resort-600 to-resort-teal">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">How It Works</h2>
            <p className="text-white/80 mt-2">Plan your trip in three simple steps</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <Reveal className="p-6 rounded-2xl border border-slate-200 bg-white hover:shadow-lg transition-all will-change-transform hover:translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-resort-100 text-resort-700 flex items-center justify-center mb-3"><FiSearch /></div>
              <h3 className="font-semibold text-slate-900 mb-1">Search</h3>
              <p className="text-sm text-slate-600">Filter by type, location, and availability.</p>
            </Reveal>
            <Reveal className="p-6 rounded-2xl border border-slate-200 bg-white hover:shadow-lg transition-all will-change-transform hover:translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-resort-100 text-resort-700 flex items-center justify-center mb-3"><FiCreditCard /></div>
              <h3 className="font-semibold text-slate-900 mb-1">Book</h3>
              <p className="text-sm text-slate-600">Secure checkout and instant confirmations.</p>
            </Reveal>
            <Reveal className="p-6 rounded-2xl border border-slate-200 bg-white hover:shadow-lg transition-all will-change-transform hover:translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-resort-100 text-resort-700 flex items-center justify-center mb-3"><FiStar /></div>
              <h3 className="font-semibold text-slate-900 mb-1">Enjoy</h3>
              <p className="text-sm text-slate-600">Relax and make memories at your resort.</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Locations Section */}
      <section className="relative overflow-hidden w-full px-4 sm:px-6 lg:px-8 py-16 sm:py-20 bg-white">
        {/* Soft radial accent */}
        <div aria-hidden className="pointer-events-none absolute -top-10 left-1/4 w-[340px] h-[180px] rounded-full bg-gradient-to-r from-resort-100/60 to-resort-300/40 blur-2xl"></div>
        <div aria-hidden className="pointer-events-none absolute bottom-0 right-1/5 w-[280px] h-[140px] rounded-full bg-gradient-to-br from-resort-200/50 to-resort-400/30 blur-2xl"></div>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-2"><span className="gradient-text">Explore by Type</span></h2>
            <p className="text-xl text-slate-600">Find the perfect resort for your getaway</p>
            <div className="mx-auto h-1 w-24 bg-gradient-to-r from-resort-500 to-resort-700 rounded-full mt-4"></div>
          </div>

          <Reveal className="grid md:grid-cols-3 gap-8">
            <Link href="/resorts?type=beach" className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 ring-1 ring-transparent hover:ring-resort-300 p-8 bg-white hover:shadow-lg transition-all h-64 flex flex-col justify-between will-change-transform hover:translate-y-1">
              <div>
                <div className="w-12 h-12 rounded-xl bg-resort-100 text-resort-700 flex items-center justify-center mb-4"><FiMapPin /></div>
                <h3 className="text-2xl font-semibold mb-1 text-slate-900">Beach Resorts</h3>
                <p className="text-slate-600">Crystal waters & sandy shores</p>
              </div>
              <span className="text-sm font-semibold text-resort-700 group-hover:translate-x-2 transition-transform inline-block">Explore →</span>
            </Link>

            <Link href="/resorts?type=mountain" className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 ring-1 ring-transparent hover:ring-resort-300 p-8 bg-white hover:shadow-lg transition-all h-64 flex flex-col justify-between will-change-transform hover:translate-y-1">
              <div>
                <div className="w-12 h-12 rounded-xl bg-resort-100 text-resort-700 flex items-center justify-center mb-4"><FiMapPin /></div>
                <h3 className="text-2xl font-semibold mb-1 text-slate-900">Mountain Resorts</h3>
                <p className="text-slate-600">Cool air & scenic views</p>
              </div>
              <span className="text-sm font-semibold text-resort-700 group-hover:translate-x-2 transition-transform inline-block">Explore →</span>
            </Link>

            <Link href="/resorts?type=nature" className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 ring-1 ring-transparent hover:ring-resort-300 p-8 bg-white hover:shadow-lg transition-all h-64 flex flex-col justify-between will-change-transform hover:translate-y-1">
              <div>
                <div className="w-12 h-12 rounded-xl bg-resort-100 text-resort-700 flex items-center justify-center mb-4"><FiMapPin /></div>
                <h3 className="text-2xl font-semibold mb-1 text-slate-900">Nature Retreats</h3>
                <p className="text-slate-600">Peaceful & eco-friendly</p>
              </div>
              <span className="text-sm font-semibold text-resort-700 group-hover:translate-x-2 transition-transform inline-block">Explore →</span>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative overflow-hidden w-full px-4 sm:px-6 lg:px-8 py-16 sm:py-20 bg-gradient-to-r from-resort-50 to-white">
        {/* Soft accents */}
        <div aria-hidden className="pointer-events-none absolute -top-6 right-1/4 w-[300px] h-[160px] rounded-full bg-gradient-to-br from-resort-100/60 to-resort-300/40 blur-2xl"></div>
        <div aria-hidden className="pointer-events-none absolute bottom-0 left-1/5 w-[260px] h-[140px] rounded-full bg-gradient-to-br from-resort-200/50 to-resort-400/30 blur-2xl"></div>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">What Guests Say</h2>
            <p className="text-slate-700 mt-2">Real experiences from real travelers</p>
            <div className="mx-auto h-1 w-24 bg-gradient-to-r from-resort-500 to-resort-700 rounded-full mt-4"></div>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <Reveal className="p-6 bg-white rounded-2xl border border-slate-200 hover:shadow-lg transition-all will-change-transform hover:translate-y-1">
              <div className="flex gap-1 text-resort-500 mb-2" aria-hidden>
                <FiStar /><FiStar /><FiStar /><FiStar /><FiStar />
              </div>
              <p className="text-slate-700">“Smooth booking and a beautiful place. Will return!”</p>
              <div className="mt-4 text-sm text-slate-500">Ana, Cebu</div>
            </Reveal>
            <Reveal className="p-6 bg-white rounded-2xl border border-slate-200 hover:shadow-lg transition-all will-change-transform hover:translate-y-1">
              <div className="flex gap-1 text-resort-500 mb-2" aria-hidden>
                <FiStar /><FiStar /><FiStar /><FiStar /><FiStar />
              </div>
              <p className="text-slate-700">“Great host and clear communication from start to finish.”</p>
              <div className="mt-4 text-sm text-slate-500">Marco, Baguio</div>
            </Reveal>
            <Reveal className="p-6 bg-white rounded-2xl border border-slate-200 hover:shadow-lg transition-all will-change-transform hover:translate-y-1">
              <div className="flex gap-1 text-resort-500 mb-2" aria-hidden>
                <FiStar /><FiStar /><FiStar /><FiStar /><FiStar />
              </div>
              <p className="text-slate-700">“Loved the options by the beach; easy to sort.”</p>
              <div className="mt-4 text-sm text-slate-500">Jasmine, La Union</div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-16 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-resort-100 text-resort-700 flex items-center justify-center"><FiHelpCircle /></div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Frequently Asked Questions</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Reveal as="details" className="faq-item p-5">
              <summary className="faq-summary">
                <span className="flex items-center gap-2"><FiShield className="text-resort-600" /> Is payment secure?</span>
                <FiChevronDown className="faq-caret text-slate-500" />
              </summary>
              <p className="mt-3 text-sm text-slate-600">Yes. All transactions are processed through trusted payment gateways with TLS encryption, tokenization, and fraud checks. We never store full card details, and you’ll see a secure indicator on checkout pages.</p>
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

      {/* CTA Section */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-16 sm:py-20 bg-gradient-to-r from-resort-500 to-resort-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">Ready to Book Your Perfect Getaway?</h2>
          <p className="text-lg sm:text-xl mb-8 text-resort-100">Join travelers discovering amazing resorts across the Philippines</p>
          {!user && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup" className="px-8 py-4 bg-white text-resort-700 rounded-xl font-semibold hover:shadow-lg transition-all">
                Create Free Account
              </Link>
              <Link href="/resorts" className="px-8 py-4 border-2 border-white text-white rounded-xl font-semibold hover:bg-white/10 transition-all">
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
