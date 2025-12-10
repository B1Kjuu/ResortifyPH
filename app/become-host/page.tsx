'use client'
import React from 'react'
import Link from 'next/link'

export default function BecomeHostPage() {
  return (
    <div className="w-full min-h-screen bg-white">
      {/* Hero */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-20 sm:py-32 bg-gradient-to-br from-green-50 to-white">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl sm:text-6xl font-bold text-slate-900 mb-6">
              Become a <span className="bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">Resort Host</span>
            </h1>
            <p className="text-xl text-slate-600 mb-8">
              List your property on ResortifyPH and reach thousands of travelers looking for their perfect getaway.
            </p>
            <Link href="/auth/signup" className="inline-block px-8 py-4 bg-gradient-to-r from-resort-500 to-resort-600 text-white rounded-xl font-semibold hover:shadow-xl transition">
              Get Started Free
            </Link>
          </div>
          <div className="relative h-96 hidden md:block">
            <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-green-200 rounded-3xl"></div>
            <div className="absolute inset-0 rounded-3xl flex items-center justify-center">
              <span className="text-9xl">🏨</span>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-slate-900 text-center mb-16">Why Host on ResortifyPH?</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 bg-slate-50 rounded-2xl">
              <div className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl mb-6">
                💰
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Maximize Earnings</h3>
              <p className="text-slate-600">
                Set your own prices and availability. Keep up to 85% of your booking revenue with our low commission rates.
              </p>
            </div>

            <div className="p-8 bg-slate-50 rounded-2xl">
              <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center text-white text-2xl mb-6">
                👥
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Reach More Guests</h3>
              <p className="text-slate-600">
                Connect with thousands of travelers actively searching for resorts across the Philippines.
              </p>
            </div>

            <div className="p-8 bg-slate-50 rounded-2xl">
              <div className="w-14 h-14 bg-purple-500 rounded-full flex items-center justify-center text-white text-2xl mb-6">
                📱
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Easy Management</h3>
              <p className="text-slate-600">
                Manage bookings, update availability, and communicate with guests all from your dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How it Works */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-20 sm:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-slate-900 text-center mb-16">How It Works</h2>
          
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-resort-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Sign Up</h3>
              <p className="text-slate-600">Create your free host account in minutes</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-resort-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">List Your Resort</h3>
              <p className="text-slate-600">Add photos, amenities, and pricing details</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-resort-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Get Approved</h3>
              <p className="text-slate-600">Our team reviews your listing (24-48 hours)</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-resort-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                4
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Start Hosting</h3>
              <p className="text-slate-600">Receive bookings and welcome guests</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-slate-900 text-center mb-16">Host Tools & Features</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-resort-100 rounded-lg flex items-center justify-center text-2xl">
                📊
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-2">Dashboard Analytics</h3>
                <p className="text-slate-600">Track bookings, revenue, and property performance</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-resort-100 rounded-lg flex items-center justify-center text-2xl">
                📅
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-2">Calendar Management</h3>
                <p className="text-slate-600">Easily manage availability and block dates</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-resort-100 rounded-lg flex items-center justify-center text-2xl">
                💬
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-2">Guest Communication</h3>
                <p className="text-slate-600">Message guests directly through the platform</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-resort-100 rounded-lg flex items-center justify-center text-2xl">
                🔒
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-2">Secure Payments</h3>
                <p className="text-slate-600">Get paid quickly and securely after bookings</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-resort-100 rounded-lg flex items-center justify-center text-2xl">
                📸
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-2">Photo Gallery</h3>
                <p className="text-slate-600">Showcase your property with unlimited photos</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-resort-100 rounded-lg flex items-center justify-center text-2xl">
                🛡️
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-2">Host Protection</h3>
                <p className="text-slate-600">Policies in place to protect your property</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-20 sm:py-24 bg-gradient-to-r from-resort-500 to-resort-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">Ready to Start Hosting?</h2>
          <p className="text-xl mb-8 text-resort-100">Join hundreds of successful hosts on ResortifyPH today</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup" className="px-8 py-4 bg-white text-resort-600 rounded-xl font-semibold hover:shadow-xl transition">
              Create Host Account
            </Link>
            <Link href="/contact" className="px-8 py-4 border-2 border-white text-white rounded-xl font-semibold hover:bg-white hover:bg-opacity-10 transition">
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
