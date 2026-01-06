'use client'
import React, { useEffect, useState } from 'react'
import DisclaimerBanner from '../../../components/DisclaimerBanner'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { FiAlertTriangle, FiX } from 'react-icons/fi'

export default function OwnerDashboard(){
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 })
  const [loading, setLoading] = useState(true)
  const [resortsNeedingPricing, setResortsNeedingPricing] = useState<{id: string, name: string}[]>([])
  const [showPricingToast, setShowPricingToast] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load(){
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push('/auth/login'); return }

      // Verify owner role
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, is_admin')
        .eq('id', session.user.id)
        .single()
      if (userProfile?.role !== 'owner') {
        router.push('/dashboard')
        return
      }

      setProfile(userProfile)

      // Get resort stats
      const { data: resorts } = await supabase
        .from('resorts')
        .select('id, name, status, pricing_config, use_advanced_pricing')
        .eq('owner_id', session.user.id)
      
      const stats = {
        total: resorts?.length || 0,
        pending: resorts?.filter(r => r.status === 'pending').length || 0,
        approved: resorts?.filter(r => r.status === 'approved').length || 0,
        rejected: resorts?.filter(r => r.status === 'rejected').length || 0,
      }
      setStats(stats)

      // Check for approved resorts without advanced pricing
      const needsPricing = (resorts || []).filter(r => 
        r.status === 'approved' && 
        (!r.use_advanced_pricing || !r.pricing_config?.pricing?.length)
      ).map(r => ({ id: r.id, name: r.name }))
      
      setResortsNeedingPricing(needsPricing)
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center text-slate-600">Loading...</div>

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-10 max-w-6xl mx-auto">
      {/* Pricing Update Required Toast */}
      {showPricingToast && resortsNeedingPricing.length > 0 && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4 animate-slide-down">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl shadow-2xl p-4 border border-amber-400">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 bg-white/20 rounded-full p-2">
                <FiAlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-lg mb-1">⚠️ Pricing Update Required</h4>
                <p className="text-sm opacity-95 mb-3">
                  {resortsNeedingPricing.length === 1 
                    ? `Your resort "${resortsNeedingPricing[0].name}" needs pricing configuration. Without it, guests cannot see prices.`
                    : `${resortsNeedingPricing.length} of your approved resorts need pricing configuration. Without it, guests cannot see prices.`
                  }
                </p>
                <div className="flex flex-wrap gap-2">
                  {resortsNeedingPricing.slice(0, 3).map(resort => (
                    <Link
                      key={resort.id}
                      href={`/owner/edit-resort/${resort.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-amber-700 rounded-lg text-sm font-semibold hover:bg-amber-50 transition-colors"
                    >
                      Update {resort.name.length > 15 ? resort.name.slice(0, 15) + '...' : resort.name}
                    </Link>
                  ))}
                  {resortsNeedingPricing.length > 3 && (
                    <Link
                      href="/owner/my-resorts"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/20 rounded-lg text-sm font-semibold hover:bg-white/30 transition-colors"
                    >
                      +{resortsNeedingPricing.length - 3} more
                    </Link>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowPricingToast(false)}
                className="flex-shrink-0 p-1 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Dismiss"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <p className="text-sm text-resort-500 font-semibold mb-2">Resort Management</p>
        <h1 className="text-4xl font-bold text-resort-900 mb-2">Your Resort Empire</h1>
        <p className="text-lg text-slate-600">Manage listings, track submissions, and grow your business</p>
        <div className="mt-4">
          <DisclaimerBanner title="Owner Payment Notice">
            ResortifyPH does not process payments. Please share payment details with guests in chat and verify incoming transfers before confirming stays.
          </DisclaimerBanner>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-3xl font-bold text-resort-500">{stats.total}</div>
          <p className="text-sm text-slate-600">Total Resorts</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
          <p className="text-sm text-slate-600">Pending Approval</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-3xl font-bold text-green-600">{stats.approved}</div>
          <p className="text-sm text-slate-600">Approved</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-3xl font-bold text-red-600">{stats.rejected}</div>
          <p className="text-sm text-slate-600">Rejected</p>
        </div>
      </div>

      {/* Actions */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Link href="/owner/create-resort" className="bg-resort-500 text-white rounded-lg p-6 hover:bg-resort-600 transition">
          <div className="text-4xl mb-3">🏗️</div>
          <h3 className="text-xl font-semibold mb-2">Launch New Resort</h3>
          <p className="mb-4 opacity-90">Submit your property for approval</p>
          <span className="text-sm font-semibold">Get Started →</span>
        </Link>

        <Link href="/owner/my-resorts" className="bg-resort-teal text-white rounded-lg p-6 hover:bg-resort-teal-dark transition">
          <div className="text-4xl mb-3">📊</div>
          <h3 className="text-xl font-semibold mb-2">Manage Properties</h3>
          <p className="mb-4 opacity-90">Edit listings and monitor status</p>
          <span className="text-sm font-semibold">Manage →</span>
        </Link>
      </div>

      {/* Profile Info */}
      <div className="bg-resort-50 border border-resort-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-resort-900 mb-3">Your Profile</h3>
        <div className="space-y-2 text-slate-700">
          <p><strong>Email:</strong> {profile?.email}</p>
          <p><strong>Name:</strong> {profile?.full_name}</p>
          <p><strong>Role:</strong> Resort Owner</p>
        </div>
      </div>
    </div>
  )
}
