import './globals.css'
import React from 'react'
import Script from 'next/script'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import AnnouncementBanner from '../components/AnnouncementBanner'
import { Toaster } from 'sonner'
import RouteLoadNudger from '../components/RouteLoadNudger'
import AuthHashHandler from '../components/AuthHashHandler'
import FirstTimeRoleCheck from '../components/FirstTimeRoleCheck'
import GlobalRealtimeManager from '../components/GlobalRealtimeManager'
import ChunkLoadRecovery from '../components/ChunkLoadRecovery'
import TermsAcceptanceGate from '../components/TermsAcceptanceGate'

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
  metadataBase: new URL('https://www.resortifyph.me'),
  alternates: {
    canonical: 'https://www.resortifyph.me/',
  },
  icons: {
    icon: '/assets/ResortifyPH-LOGO-CLEAN.ico',
    shortcut: '/assets/ResortifyPH-LOGO-CLEAN.ico',
  },
  openGraph: {
    type: 'website',
    locale: 'en_PH',
    url: 'https://www.resortifyph.me/',
    title: 'ResortifyPH - Book Private Resorts in the Philippines',
    description: 'Book private resorts across the Philippines. Connect with resort owners and create unforgettable experiences.',
    siteName: 'ResortifyPH',
    images: [
      {
        url: 'https://www.resortifyph.me/opengraph-image',
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
    images: ['https://www.resortifyph.me/twitter-image'],
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
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'ResortifyPH',
    url: 'https://www.resortifyph.me/',
    description: 'Book private resorts across the Philippines',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://www.resortifyph.me/resorts?search={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head suppressHydrationWarning>
        <Script
          id="jsonld"
          type="application/ld+json"
          // Use beforeInteractive to ensure JSON-LD is available early without violating CSP
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          suppressHydrationWarning
        />
      </head>
      <body suppressHydrationWarning>
        <AnnouncementBanner />
        <Navbar />
        <main className="w-full">{children}</main>
        <Footer />
        {/* Self-heal stale Next.js chunk cache after deployments */}
        <ChunkLoadRecovery />
        {/* Nudge SPA route changes to emit a synthetic load for E2E stability */}
        <RouteLoadNudger />
        {/* Handle Supabase auth link hashes (expired, recovery, signup) */}
        <AuthHashHandler />
        {/* First-time user role selection modal */}
        <FirstTimeRoleCheck />
        {/* Require Terms acceptance after signup / first login */}
        <TermsAcceptanceGate />
        {/* Global real-time presence and connection monitoring */}
        <GlobalRealtimeManager />
        <Toaster position="top-right" richColors />
        {/* Ensure a 'load' event fires promptly after DOM is ready for tests */}
        <Script
          id="emit-load-event"
          strategy="afterInteractive"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener('DOMContentLoaded', function(){ try { window.dispatchEvent(new Event('load')); } catch {} });`,
          }}
        />
      </body>
    </html>
  )
}
