'use client'
import React from 'react'
import Link from 'next/link'
import { FiCreditCard } from 'react-icons/fi'

interface DashboardSidebarProps {
  isAdmin?: boolean
}

export default function DashboardSidebar({ isAdmin = false }: DashboardSidebarProps){
  return (
    <aside className="w-64 p-4 border rounded-lg">
      <nav className="flex flex-col gap-2">
        <Link href="/owner/empire" className="text-sm">Overview</Link>
        {!isAdmin && <Link href="/owner/chats" className="text-sm">Chats</Link>}
        {!isAdmin && <Link href="/owner/create-resort" className="text-sm">Create Resort</Link>}
        {!isAdmin && <Link href="/owner/my-resorts" className="text-sm">My Resorts</Link>}
        {!isAdmin && <Link href="/owner/bookings" className="text-sm font-semibold text-resort-500">Guest Bookings</Link>}
        {!isAdmin && (
          <Link href="/owner/payment-settings" className="text-sm flex items-center gap-1.5 text-amber-600 hover:text-amber-700">
            <FiCreditCard className="w-3.5 h-3.5" />
            Payment Settings
          </Link>
        )}
        {isAdmin && <Link href="/admin/approvals" className="text-sm font-semibold text-orange-600">Approvals</Link>}
      </nav>
    </aside>
  )
}
