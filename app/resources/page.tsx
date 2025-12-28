'use client'
import React from 'react'
import Link from 'next/link'
import { FiEdit3, FiDollarSign, FiCalendar, FiMessageSquare, FiFileText, FiClipboard } from 'react-icons/fi'
import { FaCamera, FaStar, FaBroom } from 'react-icons/fa'

export default function ResourcesPage() {
  return (
    <div className="w-full min-h-screen bg-white">
      {/* Hero */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-16 sm:py-24 bg-gradient-to-br from-slate-50 to-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">Resource Center</h1>
          <p className="text-xl text-slate-600">Guides, tips, and best practices for resort hosts</p>
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="max-w-7xl mx-auto">
          {/* Getting Started */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-slate-900 mb-8">Getting Started</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 border border-slate-200 rounded-xl hover:shadow-lg transition">
                <div className="text-3xl mb-4"><FiEdit3 aria-hidden /></div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Creating Your Listing</h3>
                <p className="text-slate-600 mb-4">Learn how to create an attractive and complete resort listing that gets bookings.</p>
                <a href="#" className="text-resort-500 font-semibold hover:underline">Read Guide →</a>
              </div>

              <div className="p-6 border border-slate-200 rounded-xl hover:shadow-lg transition">
                <div className="text-3xl mb-4"><FaCamera aria-hidden /></div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Photography Tips</h3>
                <p className="text-slate-600 mb-4">Take stunning photos that showcase your property's best features.</p>
                <a href="#" className="text-resort-500 font-semibold hover:underline">Read Guide →</a>
              </div>

              <div className="p-6 border border-slate-200 rounded-xl hover:shadow-lg transition">
                <div className="text-3xl mb-4"><FiDollarSign aria-hidden /></div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Pricing Strategy</h3>
                <p className="text-slate-600 mb-4">Set competitive prices that maximize your bookings and revenue.</p>
                <a href="#" className="text-resort-500 font-semibold hover:underline">Read Guide →</a>
              </div>
            </div>
          </section>

          {/* Best Practices */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-slate-900 mb-8">Best Practices</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex gap-4 p-6 bg-slate-50 rounded-xl">
                <div className="flex-shrink-0 w-12 h-12 bg-resort-100 rounded-lg flex items-center justify-center text-2xl">
                  <FaStar aria-hidden />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-2">Provide Excellent Service</h3>
                  <p className="text-slate-600">Respond promptly to inquiries, maintain clean facilities, and exceed guest expectations.</p>
                </div>
              </div>

              <div className="flex gap-4 p-6 bg-slate-50 rounded-xl">
                <div className="flex-shrink-0 w-12 h-12 bg-resort-100 rounded-lg flex items-center justify-center text-2xl">
                  <FiCalendar aria-hidden />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-2">Keep Calendar Updated</h3>
                  <p className="text-slate-600">Regularly update your availability to avoid double bookings and disappointed guests.</p>
                </div>
              </div>

              <div className="flex gap-4 p-6 bg-slate-50 rounded-xl">
                <div className="flex-shrink-0 w-12 h-12 bg-resort-100 rounded-lg flex items-center justify-center text-2xl">
                  <FiMessageSquare aria-hidden />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-2">Communicate Clearly</h3>
                  <p className="text-slate-600">Set clear expectations about check-in/out times, house rules, and amenities.</p>
                </div>
              </div>

              <div className="flex gap-4 p-6 bg-slate-50 rounded-xl">
                <div className="flex-shrink-0 w-12 h-12 bg-resort-100 rounded-lg flex items-center justify-center text-2xl">
                  <FaBroom aria-hidden />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-2">Maintain High Standards</h3>
                  <p className="text-slate-600">Ensure your property is always clean, well-maintained, and guest-ready.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Marketing Tips */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-slate-900 mb-8">Marketing Your Resort</h2>
            <div className="space-y-6">
              <div className="p-6 border-l-4 border-resort-500 bg-slate-50">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Write Compelling Descriptions</h3>
                <p className="text-slate-600">Highlight unique features, nearby attractions, and what makes your resort special. Use descriptive language that helps guests imagine their stay.</p>
              </div>

              <div className="p-6 border-l-4 border-resort-500 bg-slate-50">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Showcase Amenities</h3>
                <p className="text-slate-600">List all amenities accurately. Guests search by amenities, so completeness matters.</p>
              </div>

              <div className="p-6 border-l-4 border-resort-500 bg-slate-50">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Respond Quickly</h3>
                <p className="text-slate-600">Fast response times increase booking rates. Aim to respond to inquiries within 24 hours.</p>
              </div>

              <div className="p-6 border-l-4 border-resort-500 bg-slate-50">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Encourage Reviews</h3>
                <p className="text-slate-600">Positive reviews build trust. Provide great experiences and kindly ask satisfied guests to leave feedback.</p>
              </div>
            </div>
          </section>

          {/* Downloads */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-slate-900 mb-8">Downloadable Resources</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 border border-slate-200 rounded-xl hover:shadow-lg transition">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FiFileText aria-hidden className="text-2xl" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 mb-2">Host Welcome Guide</h3>
                    <p className="text-slate-600 text-sm mb-3">Complete guide for new hosts</p>
                    <a href="#" className="text-resort-500 font-semibold text-sm hover:underline">Download PDF →</a>
                  </div>
                </div>
              </div>

              <div className="p-6 border border-slate-200 rounded-xl hover:shadow-lg transition">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FiClipboard aria-hidden className="text-2xl" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 mb-2">Listing Checklist</h3>
                    <p className="text-slate-600 text-sm mb-3">Ensure your listing is complete</p>
                    <a href="#" className="text-resort-500 font-semibold text-sm hover:underline">Download PDF →</a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="bg-gradient-to-r from-resort-500 to-resort-600 rounded-2xl p-8 sm:p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Need More Help?</h2>
            <p className="text-lg mb-8 text-resort-100">Contact our support team or visit the help center</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact" className="px-8 py-3 bg-white text-resort-600 rounded-xl font-semibold hover:shadow-xl transition">
                Contact Support
              </Link>
              <Link href="/help-center" className="px-8 py-3 border-2 border-white text-white rounded-xl font-semibold hover:bg-white hover:bg-opacity-10 transition">
                Help Center
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
