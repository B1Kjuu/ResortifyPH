'use client'
import React from 'react'
import Link from 'next/link'

export default function HowItWorksPage() {
  return (
    <div className="w-full min-h-screen bg-white">
      {/* Hero */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-16 sm:py-24 bg-gradient-to-br from-slate-50 to-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">How ResortifyPH Works</h1>
          <p className="text-xl text-slate-600">Simple, secure, and seamless resort booking for everyone</p>
        </div>
      </div>

      {/* For Guests */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full font-semibold mb-4">For Guests</span>
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Book Your Perfect Getaway</h2>
            <p className="text-xl text-slate-600">Four easy steps to your dream vacation</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-6">
                🔍
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">1. Search & Discover</h3>
              <p className="text-slate-600">Browse hundreds of resorts across the Philippines. Filter by location, price, and amenities.</p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-6">
                📅
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">2. Select Dates</h3>
              <p className="text-slate-600">Choose your check-in and check-out dates, and the number of guests for your stay.</p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-6">
                💳
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">3. Book & Pay</h3>
              <p className="text-slate-600">Submit your booking request and make secure payment once confirmed by the host.</p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-6">
                🏖️
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">4. Enjoy Your Stay</h3>
              <p className="text-slate-600">Receive booking confirmation and get ready for an amazing resort experience!</p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link href="/resorts" className="inline-block px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:shadow-xl transition">
              Start Browsing
            </Link>
          </div>
        </div>
      </div>

      {/* For Hosts */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-20 sm:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-green-100 text-green-700 rounded-full font-semibold mb-4">For Hosts</span>
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Start Earning as a Host</h2>
            <p className="text-xl text-slate-600">List your resort and reach thousands of travelers</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-6">
                📝
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">1. Create Listing</h3>
              <p className="text-slate-600">Sign up and add your resort details, photos, amenities, and pricing information.</p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-6">
                ✅
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">2. Get Approved</h3>
              <p className="text-slate-600">Our team reviews your listing (usually within 24-48 hours) to ensure quality standards.</p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-6">
                📨
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">3. Receive Bookings</h3>
              <p className="text-slate-600">Get booking requests from guests. Accept or decline based on your availability.</p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-6">
                💰
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">4. Get Paid</h3>
              <p className="text-slate-600">Receive secure payments after confirmed bookings. Withdraw anytime to your account.</p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link href="/become-host" className="inline-block px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold hover:shadow-xl transition">
              Become a Host
            </Link>
          </div>
        </div>
      </div>

      {/* Key Features */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-slate-900 text-center mb-16">What Makes Us Different</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 border border-slate-200 rounded-2xl hover:shadow-lg transition">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Secure Transactions</h3>
              <p className="text-slate-600">Industry-standard encryption protects all payments and personal information.</p>
            </div>

            <div className="p-8 border border-slate-200 rounded-2xl hover:shadow-lg transition">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Instant Booking</h3>
              <p className="text-slate-600">Quick booking process with instant confirmation from verified hosts.</p>
            </div>

            <div className="p-8 border border-slate-200 rounded-2xl hover:shadow-lg transition">
              <div className="text-4xl mb-4">🛡️</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Trust & Safety</h3>
              <p className="text-slate-600">All listings are verified. Secure messaging and booking protection policies.</p>
            </div>

            <div className="p-8 border border-slate-200 rounded-2xl hover:shadow-lg transition">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Easy Management</h3>
              <p className="text-slate-600">Intuitive dashboard for both guests and hosts to manage everything.</p>
            </div>

            <div className="p-8 border border-slate-200 rounded-2xl hover:shadow-lg transition">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">24/7 Support</h3>
              <p className="text-slate-600">Our support team is always ready to help with any questions or issues.</p>
            </div>

            <div className="p-8 border border-slate-200 rounded-2xl hover:shadow-lg transition">
              <div className="text-4xl mb-4">🌟</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Quality Verified</h3>
              <p className="text-slate-600">Every resort is reviewed to ensure quality experiences for our community.</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-20 sm:py-24 bg-gradient-to-r from-resort-500 to-resort-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl mb-8 text-resort-100">Join thousands of happy guests and successful hosts</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup" className="px-8 py-4 bg-white text-resort-600 rounded-xl font-semibold hover:shadow-xl transition">
              Sign Up Free
            </Link>
            <Link href="/help-center" className="px-8 py-4 border-2 border-white text-white rounded-xl font-semibold hover:bg-white hover:bg-opacity-10 transition">
              Learn More
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
