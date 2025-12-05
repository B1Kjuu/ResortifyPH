'use client'
import React from 'react'
import Link from 'next/link'

export default function DashboardSidebar(){
  return (
    <aside className="w-64 p-4 border rounded-lg">
      <nav className="flex flex-col gap-2">
        <Link href="/dashboard" className="text-sm">Overview</Link>
        <Link href="/dashboard/create-resort" className="text-sm">Create Resort</Link>
        <Link href="/dashboard/resorts" className="text-sm">My Resorts</Link>
      </nav>
    </aside>
  )
}
