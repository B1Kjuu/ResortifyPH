'use client'
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function Footer(){
  return (
    <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-300 mt-auto border-t-4 border-resort-500">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 md:gap-8 mb-6">
            {/* Brand + short blurb */}
            <div className="flex items-center gap-3">
              <Image 
                src="/assets/ResortifyPH_Logo.png" 
                alt="ResortifyPH Logo" 
                width={36} 
                height={36}
                className="w-9 h-9 drop-shadow-lg"
              />
              <div>
                <p className="font-bold text-lg bg-gradient-to-r from-resort-400 to-resort-600 bg-clip-text text-transparent">ResortifyPH</p>
                <p className="text-slate-400 text-xs sm:text-sm">Discover and book private resorts across the Philippines.</p>
              </div>
            </div>

            {/* Compact nav */}
            <nav className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm">
              <Link href="/resorts" className="text-slate-300 hover:text-white">Explore</Link>
              <span className="text-slate-600">•</span>
              <Link href="/help-center" className="text-slate-300 hover:text-white">Help Center</Link>
              <span className="text-slate-600">•</span>
              <Link href="/terms" className="text-slate-300 hover:text-white">Terms</Link>
              <span className="text-slate-600">•</span>
              <Link href="/privacy" className="text-slate-300 hover:text-white">Privacy</Link>
            </nav>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-700 pt-8">
            <div className="flex justify-center md:justify-between items-center">
              <div className="text-sm text-slate-400 text-center">
                © {new Date().getFullYear()} <span className="font-semibold text-white">ResortifyPH</span>. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
