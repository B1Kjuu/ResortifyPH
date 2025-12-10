'use client'
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { FaFacebookF, FaTwitter, FaInstagram, FaYoutube } from 'react-icons/fa'

export default function Footer(){
  return (
    <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-300 mt-auto border-t-4 border-resort-500">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-8 md:mb-12">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Image 
                  src="/assets/ResortifyPH_Logo.png" 
                  alt="ResortifyPH Logo" 
                  width={36} 
                  height={36}
                  className="w-9 h-9 drop-shadow-lg"
                />
                <span className="font-bold text-xl bg-gradient-to-r from-resort-400 to-blue-400 bg-clip-text text-transparent">ResortifyPH</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">Discover and book amazing resorts across the Philippines. 🇵🇭</p>
            </div>

            {/* Guests */}
            <div>
              <h3 className="font-bold text-white mb-4 text-base flex items-center gap-2">
                <span>🧓</span>
                <span>For Guests</span>
              </h3>
              <ul className="space-y-3 text-sm">
                <li><Link href="/resorts" className="text-slate-400 hover:text-resort-400 transition-colors flex items-center gap-2 group"><span className="group-hover:translate-x-1 transition-transform">→</span> Browse Resorts</Link></li>
                <li><Link href="/auth/signup" className="text-slate-400 hover:text-resort-400 transition-colors flex items-center gap-2 group"><span className="group-hover:translate-x-1 transition-transform">→</span> Create Account</Link></li>
                <li><Link href="/resorts" className="text-slate-400 hover:text-resort-400 transition-colors flex items-center gap-2 group"><span className="group-hover:translate-x-1 transition-transform">→</span> Search</Link></li>
                <li><Link href="/help-center" className="text-slate-400 hover:text-resort-400 transition-colors flex items-center gap-2 group"><span className="group-hover:translate-x-1 transition-transform">→</span> Help Center</Link></li>
              </ul>
            </div>

            {/* Hosts */}
            <div>
              <h3 className="font-bold text-white mb-4 text-base flex items-center gap-2">
                <span>🏢</span>
                <span>For Owners</span>
              </h3>
              <ul className="space-y-3 text-sm">
                <li><Link href="/become-host" className="text-slate-400 hover:text-resort-400 transition-colors flex items-center gap-2 group"><span className="group-hover:translate-x-1 transition-transform">→</span> Become a Host</Link></li>
                <li><Link href="/how-it-works" className="text-slate-400 hover:text-resort-400 transition-colors flex items-center gap-2 group"><span className="group-hover:translate-x-1 transition-transform">→</span> How It Works</Link></li>
                <li><Link href="/resources" className="text-slate-400 hover:text-resort-400 transition-colors flex items-center gap-2 group"><span className="group-hover:translate-x-1 transition-transform">→</span> Resource Center</Link></li>
                <li><Link href="/contact" className="text-slate-400 hover:text-resort-400 transition-colors flex items-center gap-2 group"><span className="group-hover:translate-x-1 transition-transform">→</span> Contact Support</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="font-bold text-white mb-4 text-base flex items-center gap-2">
                <span>🏛️</span>
                <span>Company</span>
              </h3>
              <ul className="space-y-3 text-sm">
                <li><Link href="/about" className="text-slate-400 hover:text-resort-400 transition-colors flex items-center gap-2 group"><span className="group-hover:translate-x-1 transition-transform">→</span> About Us</Link></li>
                <li><Link href="/terms" className="text-slate-400 hover:text-resort-400 transition-colors flex items-center gap-2 group"><span className="group-hover:translate-x-1 transition-transform">→</span> Terms & Conditions</Link></li>
                <li><Link href="/privacy" className="text-slate-400 hover:text-resort-400 transition-colors flex items-center gap-2 group"><span className="group-hover:translate-x-1 transition-transform">→</span> Privacy Policy</Link></li>
                <li><Link href="/contact" className="text-slate-400 hover:text-resort-400 transition-colors flex items-center gap-2 group"><span className="group-hover:translate-x-1 transition-transform">→</span> Contact</Link></li>
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-700 pt-8">
            {/* Social Links */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-6 sm:gap-0">
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-resort-500 hover:text-white transition-all transform hover:scale-110" aria-label="Facebook">
                  <FaFacebookF size={18} />
                </a>
                <a href="#" className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-blue-400 hover:text-white transition-all transform hover:scale-110" aria-label="Twitter">
                  <FaTwitter size={18} />
                </a>
                <a href="#" className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-pink-500 hover:text-white transition-all transform hover:scale-110" aria-label="Instagram">
                  <FaInstagram size={18} />
                </a>
                <a href="#" className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-red-600 hover:text-white transition-all transform hover:scale-110" aria-label="YouTube">
                  <FaYoutube size={18} />
                </a>
              </div>
              <div className="text-sm text-slate-400 text-center">
                © {new Date().getFullYear()} <span className="font-semibold text-white">ResortifyPH</span>. All rights reserved. ❤️
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
