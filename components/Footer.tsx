'use client'
import React from 'react'

export default function Footer(){
  return (
    <footer className="border-t mt-12">
      <div className="container py-6 text-center text-sm text-slate-500">© {new Date().getFullYear()} ResortifyPH. All rights reserved.</div>
    </footer>
  )
}
