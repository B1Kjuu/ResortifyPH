'use client'
import React from 'react'
import Link from 'next/link'

export default function Navbar(){
  return (
    <header className="bg-white border-b">
      <div className="container flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-md bg-resortify-500" />
          <span className="font-semibold">ResortifyPH</span>
        </Link>

        <nav className="flex items-center gap-4">
          <Link href="/resorts" className="text-sm text-slate-700">Resorts</Link>
          <Link href="/bookings" className="text-sm text-slate-700">Bookings</Link>
          <Link href="/auth/login" className="text-sm text-white bg-resortify-500 px-3 py-1 rounded">Sign in</Link>
        </nav>
      </div>
    </header>
  )
}
