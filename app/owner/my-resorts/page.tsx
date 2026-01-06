'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import DisclaimerBanner from '../../../components/DisclaimerBanner'
import PricingRequiredBanner from '../../../components/PricingRequiredBanner'
import { RESORT_TYPES, getResortTypeLabel } from '../../../lib/resortTypes'
import { FiMapPin, FiClock, FiCheck, FiX, FiUsers, FiEdit, FiEye, FiTrash2 } from 'react-icons/fi'
import { FaHotel } from 'react-icons/fa'
import { toast } from 'sonner'

export default function MyResorts(){
  const [resorts, setResorts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [deleting, setDeleting] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function load(){
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push('/auth/login'); return }

      // Verify owner role
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, is_admin')
        .eq('id', session.user.id)
        .maybeSingle()
      if (!profile || profile.role !== 'owner') {
        router.push('/owner/dashboard')
        return
      }

      // First-login email gate
      if (!profile.email) {
        router.push('/profile?requireEmail=1')
        return
      }

      let query = supabase.from('resorts').select('*').eq('owner_id', session.user.id)
      if (typeFilter !== 'all') query = query.eq('type', typeFilter as any)
      const { data } = await query.order('created_at', { ascending: false })
      const enriched = (data || []).map((resort) => {
        // Derive slot-level prices from pricing_config or legacy fields
        let config: any = resort.pricing_config
        if (typeof config === 'string') {
          try { config = JSON.parse(config) } catch { config = null }
        }
        const slotPrices: { daytour: number | null; overnight: number | null; '22hrs': number | null } = { daytour: null, overnight: null, '22hrs': null }
        if (config?.pricing && Array.isArray(config.pricing)) {
          config.pricing.forEach((p: any) => {
            if (p?.bookingType && typeof p.price === 'number' && p.price > 0 && slotPrices[p.bookingType as 'daytour' | 'overnight' | '22hrs'] !== undefined) {
              const key = p.bookingType as 'daytour' | 'overnight' | '22hrs'
              if (slotPrices[key] === null || p.price < slotPrices[key]!) {
                slotPrices[key] = p.price
              }
            }
          })
        }
        if (slotPrices.daytour == null && resort.day_tour_price) slotPrices.daytour = resort.day_tour_price
        if (slotPrices.overnight == null && (resort.overnight_price || resort.night_tour_price)) slotPrices.overnight = resort.overnight_price || resort.night_tour_price
        if (slotPrices['22hrs'] == null && (resort.overnight_price || resort.night_tour_price)) slotPrices['22hrs'] = resort.overnight_price || resort.night_tour_price
        return { ...resort, slotTypePrices: slotPrices }
      })
      setResorts(enriched)
      setLoading(false)
    }
    load()
  }, [typeFilter])

  async function handleDelete(resortId: string, resortName: string) {
    if (!confirm(`Are you sure you want to delete "${resortName}"? This action cannot be undone.`)) {
      return
    }
    
    setDeleting(resortId)
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      toast.error('Please sign in again')
      setDeleting(null)
      return
    }
    
    const { error } = await supabase
      .from('resorts')
      .delete()
      .eq('id', resortId)
      .eq('owner_id', session.user.id)
    
    if (error) {
      toast.error('Failed to delete resort: ' + error.message)
      setDeleting(null)
      return
    }
    
    toast.success('Resort deleted successfully')
    setResorts(prev => prev.filter(r => r.id !== resortId))
    setDeleting(null)
  }

  if (loading) return <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center text-slate-600">Loading...</div>

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 max-w-7xl mx-auto">
        {/* Persistent Pricing Required Banner */}
        <PricingRequiredBanner className="mb-6" />
        
        <Link href="/owner/empire" className="text-sm text-resort-500 font-semibold mb-8 inline-flex items-center gap-2 hover:gap-3 transition-all">← Back to Dashboard</Link>
        
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-10 gap-4 sm:gap-6">
          <div className="flex items-center gap-3">
            <FaHotel className="w-8 h-8 sm:w-10 sm:h-10 text-slate-700 flex-shrink-0" />
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold text-slate-900">My Resorts</h1>
              <p className="text-sm sm:text-lg text-slate-600 mt-1">Manage your resort listings</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border-2 border-slate-200 rounded-xl bg-white text-sm appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-8 focus:outline-none focus:ring-2 focus:ring-resort-500/20 focus:border-resort-500 transition-all hover:border-slate-300"
              aria-label="Filter by type"
            >
              <option value="all">All Types</option>
              {RESORT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <Link href="/owner/create-resort" className="px-4 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-resort-500 to-blue-500 text-white rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all border-2 border-resort-400 whitespace-nowrap text-center text-sm sm:text-base">
              ➕ Create Resort
            </Link>
          </div>
          <div className="mt-3 sm:hidden">
            <DisclaimerBanner title="Owner Payment Notice">
              ResortifyPH does not process payments. Please share payment details with guests in chat and verify incoming transfers before confirming stays.
            </DisclaimerBanner>
          </div>
        </div>
        <div className="hidden sm:block mb-6">
          <DisclaimerBanner title="Owner Payment Notice">
            ResortifyPH does not process payments. Please share payment details with guests in chat and verify incoming transfers before confirming stays.
          </DisclaimerBanner>
        </div>

        {resorts.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
            <p className="text-2xl font-bold text-slate-900 mb-2">🏝️ No resorts yet</p>
            <p className="text-slate-600 mb-6 text-lg">Start by creating your first resort listing!</p>
            <Link href="/owner/create-resort" className="inline-block px-8 py-3 bg-gradient-to-r from-resort-500 to-blue-500 text-white rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all">
              Create your first resort →
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {resorts.map(resort => (
              <div key={resort.id} className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-resort-400 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-resort-600 transition">{resort.name}</h3>
                    <p className="text-sm text-slate-600 mt-1 inline-flex items-center gap-1"><FiMapPin className="w-4 h-4" /> {resort.location}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-lg font-bold border-2 whitespace-nowrap ${
                    resort.status === 'approved' ? 'bg-green-100 text-green-800 border-green-300' :
                    resort.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                    'bg-red-100 text-red-800 border-red-300'
                  }`}>
                    <span className="inline-flex items-center gap-1">
                      {resort.status === 'approved' ? <FiCheck className="w-4 h-4" /> : resort.status === 'pending' ? <FiClock className="w-4 h-4" /> : <FiX className="w-4 h-4" />}
                      {resort.status}
                    </span>
                  </span>
                </div>

                <div className="space-y-1 text-sm text-slate-700 mb-4 pb-4 border-b border-slate-100">
                  <p>
                    {(() => {
                      const slot = (resort as any).slotTypePrices as { daytour: number | null; overnight: number | null; '22hrs': number | null } | undefined
                      let display: number | null = null
                      let label = '/ night'

                      if (slot) {
                        // Prefer overnight, then 22hrs, then daytour
                        if (slot.overnight) { display = slot.overnight; label = '/ overnight' }
                        else if (slot['22hrs']) { display = slot['22hrs']; label = '/ 22hrs' }
                        else if (slot.daytour) { display = slot.daytour; label = '/ daytour' }
                      }

                      if (display == null || display <= 0) {
                        // Legacy fallback
                        if (resort.overnight_price || resort.night_tour_price) {
                          display = resort.overnight_price || resort.night_tour_price
                          label = '/ overnight'
                        } else if (resort.day_tour_price) {
                          display = resort.day_tour_price
                          label = '/ daytour'
                        } else if (resort.price) {
                          display = resort.price
                          label = '/ night'
                        }
                      }

                      return display ? `₱${Number(display).toLocaleString()}${label}` : 'Add pricing to show rate'
                    })()}
                    {' '}
                    · <span className="inline-flex items-center gap-1"><FiUsers className="w-4 h-4" /> {resort.capacity} {resort.capacity === 1 ? 'guest' : 'guests'}</span>
                  </p>
                  {resort.type && (
                    <p className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium">
                      {getResortTypeLabel(resort.type)}
                    </p>
                  )}
                  {resort.amenities && <p>Amenities: {resort.amenities.join(', ')}</p>}
                </div>

                <p className="text-sm text-slate-600 mb-6 line-clamp-2 italic">{resort.description}</p>

                <div className="flex gap-3">
                  <Link href={`/owner/edit-resort/${resort.id}`} className="flex-1 px-4 py-3 text-sm font-bold border-2 border-slate-300 rounded-xl hover:bg-slate-50 hover:border-slate-400 transition text-center inline-flex items-center justify-center gap-2">
                    <FiEdit className="w-4 h-4" /> Edit
                  </Link>
                  <Link href={`/resorts/${resort.id}`} className="flex-1 px-4 py-3 text-sm font-bold bg-gradient-to-r from-resort-500 to-blue-500 text-white rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all border-2 border-resort-400 text-center inline-flex items-center justify-center gap-2">
                    <FiEye className="w-4 h-4" /> View
                  </Link>
                  <button
                    onClick={() => handleDelete(resort.id, resort.name)}
                    disabled={deleting === resort.id}
                    className="px-4 py-3 text-sm font-bold border-2 border-red-300 text-red-600 rounded-xl hover:bg-red-50 hover:border-red-400 transition inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete resort"
                  >
                    <FiTrash2 className="w-4 h-4" />
                    {deleting === resort.id ? '...' : ''}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
