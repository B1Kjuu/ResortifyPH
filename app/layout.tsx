import './globals.css'
import React from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { Toaster } from 'sonner'

export const metadata = {
  title: 'ResortifyPH',
  description: 'Book private resorts across the Philippines. Connect with resort owners and create unforgettable experiences.'
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="w-full">{children}</main>
        <Footer />
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
