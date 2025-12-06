'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '../lib/supabaseClient'

export default function Home(){
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    async function checkAuth(){
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
    }
    checkAuth()
  }, [])

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-resort-50 to-resort-100">
      {/* Hero Section */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="text-center max-w-2xl mx-auto">
          <div className="mb-6 flex justify-center">
            <Image 
              src="/assets/ResortifyPH_Logo.png" 
              alt="ResortifyPH Logo" 
              width={120}
              height={120}
              className="w-20 h-20 sm:w-28 sm:h-28"
              priority
            />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-resort-900 mb-4 sm:mb-6">Welcome to ResortifyPH</h1>
          <p className="text-lg sm:text-xl text-slate-700 mb-6 sm:mb-8">Discover and book the perfect resort in Manila, Antipolo, and Rizal. Connect with resort owners and create unforgettable experiences.</p>
          
          {user ? (
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Link href="/resorts" className="px-6 py-3 bg-resort-500 text-white rounded-lg font-semibold hover:bg-resort-600 transition">
                Browse Resorts
              </Link>
              <Link href="/dashboard" className="px-6 py-3 bg-resort-teal text-white rounded-lg font-semibold hover:bg-resort-teal-dark transition">
                Dashboard
              </Link>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Link href="/auth/login" className="px-6 py-3 bg-resort-500 text-white rounded-lg font-semibold hover:bg-resort-600 transition">
                Sign In
              </Link>
              <Link href="/auth/register" className="px-6 py-3 bg-resort-teal text-white rounded-lg font-semibold hover:bg-resort-teal-dark transition">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-8 sm:mb-12 text-resort-900">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
          {/* For Guests */}
          <div className="bg-white p-8 rounded-lg shadow-md">
            <div className="w-12 h-12 bg-resort-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🏖️</span>
            </div>
            <h3 className="text-xl font-semibold mb-3 text-resort-900">For Guests</h3>
            <ul className="text-slate-700 space-y-2">
              <li>✓ Browse resorts in your favorite locations</li>
              <li>✓ View detailed resort information & photos</li>
              <li>✓ Book resorts easily with instant confirmation</li>
              <li>✓ Manage your bookings in one place</li>
            </ul>
          </div>

          {/* For Owners */}
          <div className="bg-white p-8 rounded-lg shadow-md">
            <div className="w-12 h-12 bg-resort-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🏨</span>
            </div>
            <h3 className="text-xl font-semibold mb-3 text-resort-900">For Owners</h3>
            <ul className="text-slate-700 space-y-2">
              <li>✓ List your resort with detailed info</li>
              <li>✓ Upload high-quality resort photos</li>
              <li>✓ Manage guest bookings & confirmations</li>
              <li>✓ Reach more customers instantly</li>
            </ul>
          </div>

          {/* For Admins */}
          <div className="bg-white p-8 rounded-lg shadow-md">
            <div className="w-12 h-12 bg-resort-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">⚙️</span>
            </div>
            <h3 className="text-xl font-semibold mb-3 text-resort-900">For Moderators</h3>
            <ul className="text-slate-700 space-y-2">
              <li>✓ Review & approve new resort listings</li>
              <li>✓ Maintain platform quality & standards</li>
              <li>✓ Monitor resort information & compliance</li>
              <li>✓ Ensure safe & reliable service</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="bg-gradient-to-r from-resort-500 to-resort-600 text-white rounded-lg p-8 sm:p-12 text-center max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">Ready to Get Started?</h2>
          <p className="text-base sm:text-lg mb-6 sm:mb-8 opacity-90">Join thousands of guests and resort owners on ResortifyPH</p>
          {!user && (
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Link href="/auth/register" className="px-6 py-3 bg-white text-resort-600 rounded-lg font-semibold hover:bg-slate-100 transition">
                Create Account
              </Link>
              <Link href="/resorts" className="px-6 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:bg-opacity-10 transition">
                Browse Resorts
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Locations Section */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-8 sm:mb-12 text-resort-900">Popular Locations</h2>
        <div className="grid md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="text-4xl mb-3">📍</div>
            <h3 className="text-xl font-semibold text-resort-900 mb-2">Manila</h3>
            <p className="text-slate-600">Urban resorts and relaxation centers in the heart of the city</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="text-4xl mb-3">🏔️</div>
            <h3 className="text-xl font-semibold text-resort-900 mb-2">Antipolo</h3>
            <p className="text-slate-600">Scenic mountain resorts with breathtaking views</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="text-4xl mb-3">🌿</div>
            <h3 className="text-xl font-semibold text-resort-900 mb-2">Rizal</h3>
            <p className="text-slate-600">Nature retreats and eco-friendly resort experiences</p>
          </div>
        </div>
      </section>
    </div>
  )
}
