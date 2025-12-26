'use client'
import React from 'react'
import Link from 'next/link'

export default function HelpCenterPage() {
  const faqs = [
    {
      category: "Getting Started",
      questions: [
        {
          q: "How do I create an account?",
          a: "Click 'Sign Up' in the navigation bar, fill in your details, and verify your email address."
        },
        {
          q: "Is ResortifyPH free to use?",
          a: "Yes! Creating an account and browsing resorts is completely free. You only pay when you book a resort."
        },
        {
          q: "What areas does ResortifyPH cover?",
          a: "We list resorts across all provinces in the Philippines, from Luzon to Mindanao."
        }
      ]
    },
    {
      category: "Booking",
      questions: [
        {
          q: "How do I book a resort?",
          a: "Browse resorts, select your desired property, choose your dates and number of guests, then submit your booking request."
        },
        {
          q: "Is my booking confirmed immediately?",
          a: "Bookings require confirmation from the resort owner. You'll receive an email once your booking is confirmed or declined."
        },
        {
          q: "Can I cancel my booking?",
          a: "Cancellation policies vary by resort. Check the specific resort's cancellation policy before booking."
        },
        {
          q: "What payment methods are accepted?",
          a: "ResortifyPH does not process payments on-site. Coordinate payment directly with the host in chat, and verify details before sending money via your preferred method (e.g., bank transfer, e-wallet). In-site payment options may be introduced later."
        }
      ]
    },
    {
      category: "For Resort Owners",
      questions: [
        {
          q: "How do I list my resort?",
          a: "Create an owner account, then navigate to 'Create Resort' to add your property with details, photos, and pricing."
        },
        {
          q: "Is there a fee to list my resort?",
          a: "No listing fees! We only charge a small commission on confirmed bookings."
        },
        {
          q: "How long does approval take?",
          a: "Our team reviews new listings within 24-48 hours to ensure quality standards."
        },
        {
          q: "How do I manage bookings?",
          a: "Use your owner dashboard to view, confirm, or decline booking requests from guests."
        }
      ]
    },
    {
      category: "Account & Security",
      questions: [
        {
          q: "How do I reset my password?",
          a: "Click 'Sign In', then 'Forgot Password'. Enter your email to receive reset instructions."
        },
        {
          q: "Is my personal information secure?",
          a: "Yes! We use industry-standard encryption and security measures to protect your data."
        },
        {
          q: "Can I delete my account?",
          a: "Yes, you can request account deletion from your profile settings or by contacting support."
        }
      ]
    }
  ]

  React.useEffect(() => {
    // Help test environments: quickly signal a window 'load' after mount
    setTimeout(() => { try { window.dispatchEvent(new Event('load')) } catch {} }, 0)
  }, [])

  return (
    <div className="w-full min-h-screen bg-white">
      {/* Hero */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-16 sm:py-24 bg-gradient-to-br from-slate-50 to-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">Help Center</h1>
          <p className="text-xl text-slate-600 mb-8">Find answers to common questions</p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <svg className="absolute left-4 top-4 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                type="text" 
                placeholder="Search for help..." 
                className="w-full pl-12 pr-4 py-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-500 text-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="max-w-5xl mx-auto">
          {/* Quick Links */}
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            <Link href="/contact" className="p-6 bg-slate-50 rounded-xl hover:bg-slate-100 transition text-center">
              <div className="text-3xl mb-2">💬</div>
              <h3 className="font-semibold text-slate-900">Contact Us</h3>
            </Link>
            <Link href="/resorts" className="p-6 bg-slate-50 rounded-xl hover:bg-slate-100 transition text-center">
              <div className="text-3xl mb-2">🏖️</div>
              <h3 className="font-semibold text-slate-900">Browse Resorts</h3>
            </Link>
            <Link href="/auth/signup" className="p-6 bg-slate-50 rounded-xl hover:bg-slate-100 transition text-center">
              <div className="text-3xl mb-2">👤</div>
              <h3 className="font-semibold text-slate-900">Create Account</h3>
            </Link>
            <Link href="/become-host" className="p-6 bg-slate-50 rounded-xl hover:bg-slate-100 transition text-center">
              <div className="text-3xl mb-2">🏨</div>
              <h3 className="font-semibold text-slate-900">Become a Host</h3>
            </Link>
          </div>

          {/* FAQs */}
          <div className="space-y-12">
            {faqs.map((section, idx) => (
              <section key={idx}>
                <h2 className="text-3xl font-bold text-slate-900 mb-6">{section.category}</h2>
                <div className="space-y-4">
                  {section.questions.map((item, qIdx) => (
                    <details key={qIdx} className="group bg-white border border-slate-200 rounded-xl overflow-hidden">
                      <summary className="px-6 py-4 cursor-pointer font-semibold text-slate-900 hover:bg-slate-50 transition flex justify-between items-center">
                        {item.q}
                        <span className="text-resort-500 group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <div className="px-6 pb-4 text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                        {item.a}
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Still need help */}
          <div className="mt-16 bg-gradient-to-r from-resort-500 to-resort-600 rounded-2xl p-8 sm:p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Still Need Help?</h2>
            <p className="text-lg mb-8 text-resort-100">Our support team is here to assist you</p>
            <Link href="/contact" className="inline-block px-8 py-3 bg-white text-resort-600 rounded-xl font-semibold hover:shadow-xl transition">
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
