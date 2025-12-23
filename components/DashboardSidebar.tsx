'use client'
import React from 'react'
import Link from 'next/link'

interface DashboardSidebarProps {
  isAdmin?: boolean
}

export default function DashboardSidebar({ isAdmin = false }: DashboardSidebarProps){
  return (
    <aside className="w-64 p-4 border rounded-lg">
      <nav className="flex flex-col gap-2">
        <Link href="/dashboard" className="text-sm">Overview</Link>
        {!isAdmin && <Link href="/owner/chats" className="text-sm">Chats</Link>}
        {!isAdmin && <Link href="/dashboard/create-resort" className="text-sm">Create Resort</Link>}
        {!isAdmin && <Link href="/dashboard/resorts" className="text-sm">My Resorts</Link>}
        {!isAdmin && <Link href="/dashboard/bookings-management" className="text-sm font-semibold text-resort-500">Guest Bookings</Link>}
        {isAdmin && <Link href="/admin/resorts" className="text-sm font-semibold text-orange-600">Approve Resorts</Link>}
      </nav>
    </aside>
  )
}
