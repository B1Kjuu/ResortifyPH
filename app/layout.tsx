import './globals.css'
import React from 'react'
import { headers } from 'next/headers'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { Toaster } from 'sonner'
import RouteLoadNudger from '../components/RouteLoadNudger'

export const metadata = {
  title: {
    default: 'ResortifyPH - Book Private Resorts in the Philippines',
    template: '%s | ResortifyPH'
  },
  description: 'Book private resorts across the Philippines. Connect with resort owners and create unforgettable experiences. Find beach resorts, mountain getaways, and exclusive staycations.',
  keywords: ['resort booking philippines', 'private resort', 'beach resort', 'staycation', 'resort ph', 'philippine resorts', 'vacation rental philippines', 'resortify'],
  authors: [{ name: 'ResortifyPH' }],
  creator: 'ResortifyPH',
  publisher: 'ResortifyPH',
  metadataBase: new URL('https://resortifyph.me'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_PH',
    url: 'https://resortifyph.me',
    title: 'ResortifyPH - Book Private Resorts in the Philippines',
    description: 'Book private resorts across the Philippines. Connect with resort owners and create unforgettable experiences.',
    siteName: 'ResortifyPH',
    images: [
      {
        url: '/assets/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'ResortifyPH - Philippine Resort Booking Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ResortifyPH - Book Private Resorts in the Philippines',
    description: 'Book private resorts across the Philippines. Connect with resort owners and create unforgettable experiences.',
    images: ['/assets/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add your Google Search Console verification code here after setting up
    // google: 'your-verification-code',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = headers().get('x-csp-nonce') || undefined
  
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'ResortifyPH',
    url: 'https://resortifyph.me',
    description: 'Book private resorts across the Philippines',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://resortifyph.me/resorts?search={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
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
