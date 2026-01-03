'use client'
import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'
import { 
  FiHome, FiUsers, FiCheckCircle, FiMessageSquare, FiDollarSign, 
  FiBookOpen, FiMenu, FiX, FiChevronRight, FiShield,
  FiMap, FiLogOut, FiBarChart2,
  FiFileText, FiFlag, FiUserCheck, FiVolume2, FiHeart
} from 'react-icons/fi'

interface AdminLayoutProps {
  children: React.ReactNode
}

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  badge?: number
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [stats, setStats] = useState({ pendingResorts: 0, openReports: 0 })
  const pathname = usePathname()
  const router = useRouter()

  // Close sidebar when route changes
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [])

  // Check admin status
  useEffect(() => {
    async function checkAdmin() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          router.push('/auth/login')
          return
        }

        const { data: userProfile } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, is_admin, avatar_url')
          .eq('id', session.user.id)
          .single()

        if (!userProfile?.is_admin) {
          router.push('/')
          return
        }

        setProfile(userProfile)
        setIsAdmin(true)
        
        // Load quick stats for badges
        const [{ count: pendingCount }, { count: reportsCount }] = await Promise.all([
          supabase.from('resorts').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('reports').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_review', 'in-review'])
        ])
        
        setStats({
          pendingResorts: pendingCount || 0,
          openReports: reportsCount || 0
        })
      } catch (err) {
        console.error('Admin check error:', err)
        router.push('/')
      } finally {
        setLoading(false)
      }
    }

    checkAdmin()
  }, [router])

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut({ scope: 'local' })
    router.push('/')
  }, [router])

  const navItems: NavItem[] = [
    { href: '/admin/command-center', label: 'Command Center', icon: <FiHome className="w-5 h-5" /> },
    { href: '/admin/analytics', label: 'Analytics', icon: <FiBarChart2 className="w-5 h-5" /> },
    { href: '/admin/approvals', label: 'Resort Approvals', icon: <FiCheckCircle className="w-5 h-5" />, badge: stats.pendingResorts },
    { href: '/admin/resorts', label: 'Active Resorts', icon: <FiMap className="w-5 h-5" /> },
    { href: '/admin/users', label: 'User Management', icon: <FiUsers className="w-5 h-5" /> },
    { href: '/admin/verifications', label: 'ID Verifications', icon: <FiUserCheck className="w-5 h-5" /> },
    { href: '/admin/content-moderation', label: 'Reports & Reviews', icon: <FiMessageSquare className="w-5 h-5" />, badge: stats.openReports },
    { href: '/admin/disputes', label: 'Booking Disputes', icon: <FiFlag className="w-5 h-5" /> },
    { href: '/admin/payment-oversight', label: 'Payment Oversight', icon: <FiDollarSign className="w-5 h-5" /> },
    { href: '/admin/resort-bookings', label: 'All Bookings', icon: <FiBookOpen className="w-5 h-5" /> },
    { href: '/admin/announcements', label: 'Announcements', icon: <FiVolume2 className="w-5 h-5" /> },
    { href: '/admin/audit-logs', label: 'Audit Logs', icon: <FiFileText className="w-5 h-5" /> },
    { href: '/admin/system-health', label: 'System Health', icon: <FiHeart className="w-5 h-5" /> },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600 font-medium">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Open menu"
          >
            <FiMenu className="w-6 h-6 text-slate-700" />
          </button>
          <div className="flex items-center gap-2">
            <FiShield className="w-5 h-5 text-purple-600" />
            <span className="font-bold text-slate-900">Admin Panel</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
            <span className="text-purple-700 font-bold text-sm">
              {profile?.full_name?.charAt(0) || 'A'}
            </span>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-slate-200 
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:z-30
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <FiShield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900">ResortifyPH</h1>
              <p className="text-xs text-purple-600 font-medium">Admin Panel</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close menu"
          >
            <FiX className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center justify-between px-3 py-2.5 rounded-xl transition-all
                  ${isActive 
                    ? 'bg-purple-50 text-purple-700 font-semibold' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                `}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-purple-600' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span className="text-sm">{item.label}</span>
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                ) : isActive ? (
                  <FiChevronRight className="w-4 h-4 text-purple-400" />
                ) : null}
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <span className="text-purple-700 font-bold text-sm">
                {profile?.full_name?.charAt(0) || 'A'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 truncate text-sm">{profile?.full_name || 'Admin'}</p>
              <p className="text-xs text-slate-500 truncate">{profile?.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/"
              className="flex-1 px-3 py-2 text-xs font-medium text-center text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              View Site
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              <FiLogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 pt-16 lg:pt-0 min-h-screen">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-2 py-1 safe-area-inset-bottom">
        <div className="flex items-center justify-around">
          {navItems.slice(0, 5).map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg relative min-w-[3.5rem]
                  ${isActive ? 'text-purple-600' : 'text-slate-500'}
                `}
              >
                <span className="relative">
                  {item.icon}
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-medium truncate max-w-[4rem]">
                  {item.label.split(' ')[0]}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
