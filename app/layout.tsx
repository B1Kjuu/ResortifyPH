import './globals.css'
import React from 'react'
import { headers } from 'next/headers'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { Toaster } from 'sonner'
import RouteLoadNudger from '../components/RouteLoadNudger'

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
  const nonce = headers().get('x-csp-nonce') || undefined
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="w-full">{children}</main>
        <Footer />
        {/* Nudge SPA route changes to emit a synthetic load for E2E stability */}
        <RouteLoadNudger />
        <Toaster position="top-right" richColors />
        {/* Provide nonce to Next internal scripts; suppress hydration warnings */}
        {nonce && (
          <script
            nonce={nonce}
            dangerouslySetInnerHTML={{ __html: `window.__NEXT_SCRIPT_NONCE="${nonce}"` }}
            suppressHydrationWarning
          />
        )}
      </body>
    </html>
  )
}
