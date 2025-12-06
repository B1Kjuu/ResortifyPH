import './globals.css'
import React from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export const metadata = {
  title: 'ResortifyPH',
  description: 'Book private resorts in Manila, Antipolo and Rizal.'
}

export default function RootLayout({ children }: { children: React.ReactNode }){
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="w-full">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
