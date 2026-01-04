'use client'
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { FiMail } from 'react-icons/fi'
import { FaFacebook, FaInstagram } from 'react-icons/fa'

export default function Footer(){
  const pathname = usePathname()
  
  // Don't render Footer on admin pages - AdminLayout has its own footer
  if (pathname?.startsWith('/admin')) {
    return null
  }
  
  // Lightweight client-side navigation helper for E2E stability
  function push(path: string) {
    try { (window as any).next?.router?.push?.(path) } catch {}
    try { window.history.pushState(null, '', path); window.dispatchEvent(new Event('load')) } catch {}
  }
  return (
    <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-300 mt-auto border-t-4 border-resort-500">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-14">
        <div className="max-w-7xl mx-auto">
          {/* Main Grid - Responsive */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8">
            {/* Brand + short blurb */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3 mb-3">
                <Image 
                  src="/assets/ResortifyPH_Logo.png" 
                  alt="ResortifyPH Logo" 
                  width={40} 
                  height={40}
                  className="w-10 h-10 drop-shadow-lg"
                />
                <p className="font-bold text-xl bg-gradient-to-r from-resort-400 to-resort-500 bg-clip-text text-transparent">ResortifyPH</p>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                Discover and book private resorts across the Philippines. Your perfect getaway awaits.
              </p>
              {/* Social icons - Mobile visible */}
              <div className="flex items-center gap-3 mt-4 md:hidden">
                <a 
                  href="mailto:resortifyph@gmail.com" 
                  onClick={(e) => {
                    // Fallback for when mailto doesn't work
                    e.preventDefault()
                    window.location.href = 'mailto:resortifyph@gmail.com'
                  }}
                  aria-label="Email" 
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 border border-slate-700 text-white hover:bg-resort-600 transition-colors"
                >
                  <FiMail className="w-5 h-5" />
                </a>
                <a href="https://www.facebook.com/people/Resortifyph/61584827603544/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 border border-slate-700 text-white hover:bg-blue-600 transition-colors">
                  <FaFacebook className="w-5 h-5" />
                </a>
                <a href="https://www.instagram.com/resortifyph/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 border border-slate-700 text-white hover:bg-pink-600 transition-colors">
                  <FaInstagram className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* For Guests section */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">For Guests</h3>
              <ul className="flex flex-col gap-2.5 text-sm">
                <li><Link href="/resorts" className="text-slate-400 hover:text-white transition-colors">Explore Resorts</Link></li>
                <li><Link href="/how-it-works" className="text-slate-400 hover:text-white transition-colors">How It Works</Link></li>
                <li><Link href="/help-center" className="text-slate-400 hover:text-white transition-colors">Help Center</Link></li>
              </ul>
            </div>

            {/* For Hosts section */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">For Hosts</h3>
              <ul className="flex flex-col gap-2.5 text-sm">
                <li><Link href="/become-host" className="text-slate-400 hover:text-white transition-colors">Become a Host</Link></li>
                <li><Link href="/resources" className="text-slate-400 hover:text-white transition-colors">Host Resources</Link></li>
              </ul>
            </div>

            {/* Company section */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">Company</h3>
              <ul className="flex flex-col gap-2.5 text-sm">
                <li><Link href="/about" className="text-slate-400 hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="text-slate-400 hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/terms" className="text-slate-400 hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy" className="text-slate-400 hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-700/50 pt-6">
            <div className="flex flex-col sm:flex-row justify-center sm:justify-between items-center gap-4">
              <div className="text-sm text-slate-400 text-center sm:text-left">
                © {new Date().getFullYear()} <span className="font-semibold text-white">ResortifyPH</span>. All rights reserved.
              </div>
              {/* Social icons - Desktop */}
              <div className="hidden md:flex items-center gap-3">
                <a 
                  href="mailto:resortifyph@gmail.com" 
                  onClick={(e) => {
                    e.preventDefault()
                    window.location.href = 'mailto:resortifyph@gmail.com'
                  }}
                  aria-label="Email" 
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-800 border border-slate-700 text-white hover:bg-resort-600 hover:border-resort-600 transition-all"
                >
                  <FiMail className="w-4 h-4" />
                </a>
                <a href="https://www.facebook.com/people/Resortifyph/61584827603544/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-800 border border-slate-700 text-white hover:bg-blue-600 hover:border-blue-600 transition-all">
                  <FaFacebook className="w-4 h-4" />
                </a>
                <a href="https://www.instagram.com/resortifyph/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-800 border border-slate-700 text-white hover:bg-pink-600 hover:border-pink-600 transition-all">
                  <FaInstagram className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
