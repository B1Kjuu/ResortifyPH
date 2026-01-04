'use client'
import React from 'react'
import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="w-full min-h-screen bg-white">
      {/* Hero */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-16 sm:py-24 bg-gradient-to-br from-slate-50 to-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">About ResortifyPH</h1>
          <p className="text-xl text-slate-600">Connecting travelers with unforgettable resort and staycation experiences across the Philippines</p>
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Mission */}
          <section>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Our Mission</h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              ResortifyPH is dedicated to making resort discovery and booking seamless for travelers across the Philippines. 
              Whether you're looking for a beachfront paradise, a mountain retreat, or a cozy staycation near the city, 
              we help you find unique accommodations that create lasting memories.
            </p>
          </section>

          {/* Story */}
          <section>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Our Story</h2>
            <p className="text-lg text-slate-600 leading-relaxed mb-4">
              Founded in 2025, ResortifyPH was born from a simple idea: make it easier for Filipinos and tourists 
              to discover and book amazing resorts and staycation spots across our beautiful archipelago.
            </p>
            <p className="text-lg text-slate-600 leading-relaxed">
              What started as a small platform has grown into a trusted marketplace connecting thousands of guests 
              with resort and staycation property owners nationwide—from pristine beaches and serene mountain retreats 
              to trendy urban getaways perfect for weekend escapes.
            </p>
          </section>

          {/* Values */}
          <section>
            <h2 className="text-3xl font-bold text-slate-900 mb-6">Our Values</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="p-6 bg-slate-50 rounded-xl">
                <div className="text-3xl mb-3">🤝</div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Trust</h3>
                <p className="text-slate-600">Building a reliable platform where guests and owners connect with confidence</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-xl">
                <div className="text-3xl mb-3">✨</div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Quality</h3>
                <p className="text-slate-600">Curating the best resort experiences for our community</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-xl">
                <div className="text-3xl mb-3">🌏</div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Accessibility</h3>
                <p className="text-slate-600">Making resort booking simple and available to everyone</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-xl">
                <div className="text-3xl mb-3">💚</div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Sustainability</h3>
                <p className="text-slate-600">Supporting eco-friendly practices and local communities</p>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="bg-gradient-to-r from-resort-500 to-resort-600 rounded-2xl p-8 sm:p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Join Our Community</h2>
            <p className="text-lg mb-8 text-resort-100">Start exploring amazing resorts today</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/resorts" className="px-8 py-3 bg-white text-resort-600 rounded-xl font-semibold hover:shadow-xl transition">
                Browse Resorts
              </Link>
              <Link href="/auth/signup" className="px-8 py-3 border-2 border-white text-white rounded-xl font-semibold hover:bg-white hover:bg-opacity-10 transition">
                Sign Up Free
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
