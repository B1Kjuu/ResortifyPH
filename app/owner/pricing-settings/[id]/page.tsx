'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import {
  BookingType,
  DayType,
  ResortTimeSlot,
  ResortGuestTier,
  ResortPricingEntry,
  DEFAULT_TIME_SLOT_TEMPLATES,
  DEFAULT_GUEST_TIER_TEMPLATES,
  formatDbTime,
  calculateHours,
  isPricingMatrixComplete,
} from '@/lib/bookingTypes'
import {
  FiClock,
  FiUsers,
  FiDollarSign,
  FiPlus,
  FiTrash2,
  FiSave,
  FiArrowLeft,
  FiCheck,
  FiAlertCircle,
  FiSun,
  FiMoon,
  FiSettings,
} from 'react-icons/fi'

type DraftTimeSlot = Omit<ResortTimeSlot, 'id' | 'resort_id' | 'created_at' | 'updated_at'> & { tempId?: string }
type DraftGuestTier = Omit<ResortGuestTier, 'id' | 'resort_id' | 'created_at' | 'updated_at'> & { tempId?: string }
type DraftPricingEntry = {
  slot_label: string
  tier_label: string
  day_type: DayType
  price: number
}

export default function PricingSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const resortId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [resortName, setResortName] = useState('')
  const [isAuthorized, setIsAuthorized] = useState(false)

  // Settings state
  const [useAdvancedPricing, setUseAdvancedPricing] = useState(true)
  const [allowSplitDay, setAllowSplitDay] = useState(true)
  const [downpaymentPercentage, setDownpaymentPercentage] = useState(50)

  // Data state
  const [timeSlots, setTimeSlots] = useState<DraftTimeSlot[]>([])
  const [guestTiers, setGuestTiers] = useState<DraftGuestTier[]>([])
  const [pricingMatrix, setPricingMatrix] = useState<DraftPricingEntry[]>([])

  // Active tab
  const [activeTab, setActiveTab] = useState<'slots' | 'tiers' | 'pricing'>('slots')

  // Load pricing data
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError(null)

      try {
        // Check auth
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          router.push('/auth/login')
          return
        }

        // Verify ownership
        const { data: resort } = await supabase
          .from('resorts')
          .select('id, name, owner_id, downpayment_percentage, allow_split_day, use_advanced_pricing')
          .eq('id', resortId)
          .single()

        if (!resort || resort.owner_id !== session.user.id) {
          setError('Resort not found or you do not have permission to edit it.')
          setLoading(false)
          return
        }

        setResortName(resort.name)
        setIsAuthorized(true)
        setDownpaymentPercentage(resort.downpayment_percentage ?? 50)
        setAllowSplitDay(resort.allow_split_day ?? true)
        setUseAdvancedPricing(resort.use_advanced_pricing ?? false)

        // Load time slots
        const { data: slots } = await supabase
          .from('resort_time_slots')
          .select('*')
          .eq('resort_id', resortId)
          .order('sort_order')

        // Load guest tiers
        const { data: tiers } = await supabase
          .from('resort_guest_tiers')
          .select('*')
          .eq('resort_id', resortId)
          .order('sort_order')

        // Load pricing matrix
        const { data: pricing } = await supabase
          .from('resort_pricing_matrix')
          .select('*, resort_time_slots(label), resort_guest_tiers(label)')
          .eq('resort_id', resortId)

        if (slots && slots.length > 0) {
          setTimeSlots(slots.map(s => ({
            slot_type: s.slot_type,
            label: s.label,
            start_time: s.start_time,
            end_time: s.end_time,
            crosses_midnight: s.crosses_midnight,
            hours: s.hours,
            is_active: s.is_active,
            sort_order: s.sort_order,
          })))
        } else {
          // Use defaults if no slots exist
          setTimeSlots(DEFAULT_TIME_SLOT_TEMPLATES)
        }

        if (tiers && tiers.length > 0) {
          setGuestTiers(tiers.map(t => ({
            label: t.label,
            min_guests: t.min_guests,
            max_guests: t.max_guests,
            is_active: t.is_active,
            sort_order: t.sort_order,
          })))
        } else {
          // Use defaults if no tiers exist
          setGuestTiers(DEFAULT_GUEST_TIER_TEMPLATES)
        }

        if (pricing && pricing.length > 0) {
          setPricingMatrix(pricing.map(p => ({
            slot_label: (p.resort_time_slots as { label: string })?.label || '',
            tier_label: (p.resort_guest_tiers as { label: string })?.label || '',
            day_type: p.day_type as DayType,
            price: p.price,
          })))
        }
      } catch (err) {
        console.error('Error loading pricing data:', err)
        setError('Failed to load pricing configuration')
      } finally {
        setLoading(false)
      }
    }

    if (resortId) {
      loadData()
    }
  }, [resortId, router])

  // Save all data
  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/resorts/${resortId}/pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          useAdvancedPricing,
          allowSplitDay,
          downpaymentPercentage,
          timeSlots,
          guestTiers,
          pricingMatrix,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save')
      }

      setSuccess('Pricing configuration saved successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Save error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save pricing configuration')
    } finally {
      setSaving(false)
    }
  }

  // Time slot handlers
  const addTimeSlot = () => {
    const newSlot: DraftTimeSlot = {
      tempId: `temp_${Date.now()}`,
      slot_type: 'daytour',
      label: 'New Time Slot',
      start_time: '08:00',
      end_time: '17:00',
      crosses_midnight: false,
      hours: 9,
      is_active: true,
      sort_order: timeSlots.length + 1,
    }
    setTimeSlots([...timeSlots, newSlot])
  }

  const updateTimeSlot = (index: number, updates: Partial<DraftTimeSlot>) => {
    const newSlots = [...timeSlots]
    newSlots[index] = { ...newSlots[index], ...updates }
    
    // Recalculate hours if times changed
    if (updates.start_time || updates.end_time || updates.crosses_midnight !== undefined) {
      const slot = newSlots[index]
      slot.hours = calculateHours(
        slot.start_time.substring(0, 5),
        slot.end_time.substring(0, 5),
        slot.crosses_midnight
      )
    }
    
    setTimeSlots(newSlots)
  }

  const removeTimeSlot = (index: number) => {
    const slotLabel = timeSlots[index].label
    setTimeSlots(timeSlots.filter((_, i) => i !== index))
    // Remove associated pricing
    setPricingMatrix(pricingMatrix.filter(p => p.slot_label !== slotLabel))
  }

  // Guest tier handlers
  const addGuestTier = () => {
    const lastTier = guestTiers[guestTiers.length - 1]
    const newMin = lastTier ? (lastTier.max_guests ?? 0) + 1 : 1
    
    const newTier: DraftGuestTier = {
      tempId: `temp_${Date.now()}`,
      label: `${newMin}+ guests`,
      min_guests: newMin,
      max_guests: null,
      is_active: true,
      sort_order: guestTiers.length + 1,
    }
    setGuestTiers([...guestTiers, newTier])
  }

  const updateGuestTier = (index: number, updates: Partial<DraftGuestTier>) => {
    const newTiers = [...guestTiers]
    const oldLabel = newTiers[index].label
    newTiers[index] = { ...newTiers[index], ...updates }
    setGuestTiers(newTiers)
    
    // Update pricing matrix labels if label changed
    if (updates.label && updates.label !== oldLabel) {
      setPricingMatrix(pricingMatrix.map(p => 
        p.tier_label === oldLabel ? { ...p, tier_label: updates.label! } : p
      ))
    }
  }

  const removeGuestTier = (index: number) => {
    const tierLabel = guestTiers[index].label
    setGuestTiers(guestTiers.filter((_, i) => i !== index))
    // Remove associated pricing
    setPricingMatrix(pricingMatrix.filter(p => p.tier_label !== tierLabel))
  }

  // Pricing matrix handlers
  const getPrice = (slotLabel: string, tierLabel: string, dayType: DayType): number => {
    const entry = pricingMatrix.find(
      p => p.slot_label === slotLabel && p.tier_label === tierLabel && p.day_type === dayType
    )
    return entry?.price ?? 0
  }

  const setPrice = (slotLabel: string, tierLabel: string, dayType: DayType, price: number) => {
    const existingIndex = pricingMatrix.findIndex(
      p => p.slot_label === slotLabel && p.tier_label === tierLabel && p.day_type === dayType
    )
    
    if (existingIndex >= 0) {
      const newMatrix = [...pricingMatrix]
      newMatrix[existingIndex].price = price
      setPricingMatrix(newMatrix)
    } else {
      setPricingMatrix([...pricingMatrix, { slot_label: slotLabel, tier_label: tierLabel, day_type: dayType, price }])
    }
  }

  // Check completeness
  const activeSlots = timeSlots.filter(s => s.is_active)
  const activeTiers = guestTiers.filter(t => t.is_active)
  const expectedPrices = activeSlots.length * activeTiers.length * 2 // × 2 for weekday/weekend
  const filledPrices = pricingMatrix.filter(p => 
    activeSlots.some(s => s.label === p.slot_label) && 
    activeTiers.some(t => t.label === p.tier_label) &&
    p.price > 0
  ).length
  const isComplete = filledPrices >= expectedPrices

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-resort-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <FiAlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-slate-600 mb-6">{error || 'You do not have permission to access this page.'}</p>
          <Link href="/owner/my-resorts" className="text-resort-600 hover:underline">
            Back to My Resorts
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Link
                href={`/owner/edit-resort/${resortId}`}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <FiArrowLeft className="w-5 h-5 text-slate-600" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Pricing Settings</h1>
                <p className="text-sm text-slate-500">{resortName}</p>
              </div>
            </div>
            
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-resort-600 text-white rounded-xl font-semibold hover:bg-resort-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Saving...
                </>
              ) : (
                <>
                  <FiSave className="w-5 h-5" />
                  Save All Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 flex items-center gap-2">
            <FiAlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        </div>
      )}
      {success && (
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 flex items-center gap-2">
            <FiCheck className="w-5 h-5 flex-shrink-0" />
            {success}
          </div>
        </div>
      )}

      {/* Settings Overview */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FiSettings className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">General Settings</h2>
          </div>
          
          <div className="grid sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Downpayment %
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={downpaymentPercentage}
                onChange={e => setDownpaymentPercentage(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-resort-500 focus:border-resort-500"
              />
              <p className="text-xs text-slate-500 mt-1">Required upfront payment</p>
            </div>
            
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowSplitDay}
                  onChange={e => setAllowSplitDay(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 text-resort-600 focus:ring-resort-500"
                />
                <div>
                  <span className="block font-medium text-slate-700">Allow Split Day</span>
                  <span className="text-xs text-slate-500">Daytour + Overnight same day</span>
                </div>
              </label>
            </div>
            
            <div className="flex items-center">
              <div className={`px-4 py-2 rounded-lg ${isComplete ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {isComplete ? (
                  <span className="flex items-center gap-2">
                    <FiCheck /> Pricing Complete
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <FiAlertCircle /> {filledPrices}/{expectedPrices} prices set
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
          {[
            { id: 'slots', label: 'Time Slots', icon: FiClock, count: activeSlots.length },
            { id: 'tiers', label: 'Guest Tiers', icon: FiUsers, count: activeTiers.length },
            { id: 'pricing', label: 'Pricing Matrix', icon: FiDollarSign, count: filledPrices },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-resort-600 text-resort-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === tab.id ? 'bg-resort-100 text-resort-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Time Slots Tab */}
        {activeTab === 'slots' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Time Slots</h3>
                <p className="text-sm text-slate-500">Define available booking time slots for your resort</p>
              </div>
              <button
                onClick={addTimeSlot}
                className="flex items-center gap-2 px-4 py-2 bg-resort-600 text-white rounded-lg font-medium hover:bg-resort-700 transition-colors"
              >
                <FiPlus className="w-4 h-4" />
                Add Slot
              </button>
            </div>
            
            <div className="divide-y divide-slate-100">
              {timeSlots.map((slot, index) => (
                <div key={slot.tempId || index} className={`p-6 ${!slot.is_active ? 'bg-slate-50 opacity-60' : ''}`}>
                  <div className="grid sm:grid-cols-6 gap-4 items-end">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Label</label>
                      <input
                        type="text"
                        value={slot.label}
                        onChange={e => updateTimeSlot(index, { label: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-resort-500"
                        placeholder="e.g., Morning Daytour"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                      <select
                        value={slot.slot_type}
                        onChange={e => updateTimeSlot(index, { slot_type: e.target.value as BookingType })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-resort-500"
                      >
                        <option value="daytour">Daytour</option>
                        <option value="overnight">Overnight</option>
                        <option value="22hrs">22 Hours</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Start</label>
                      <input
                        type="time"
                        value={slot.start_time.substring(0, 5)}
                        onChange={e => updateTimeSlot(index, { start_time: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-resort-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">End</label>
                      <input
                        type="time"
                        value={slot.end_time.substring(0, 5)}
                        onChange={e => updateTimeSlot(index, { end_time: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-resort-500"
                      />
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={slot.crosses_midnight}
                          onChange={e => updateTimeSlot(index, { crosses_midnight: e.target.checked })}
                          className="rounded border-slate-300 text-resort-600 focus:ring-resort-500"
                        />
                        +1 day
                      </label>
                      
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={slot.is_active}
                          onChange={e => updateTimeSlot(index, { is_active: e.target.checked })}
                          className="rounded border-slate-300 text-green-600 focus:ring-green-500"
                        />
                        Active
                      </label>
                      
                      <button
                        onClick={() => removeTimeSlot(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove slot"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-xs text-slate-500">
                    Duration: {slot.hours} hours • {formatDbTime(slot.start_time)} - {formatDbTime(slot.end_time)}
                    {slot.crosses_midnight ? ' (+1 day)' : ''}
                  </div>
                </div>
              ))}
              
              {timeSlots.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  <FiClock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No time slots defined. Add your first slot to get started.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Guest Tiers Tab */}
        {activeTab === 'tiers' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Guest Tiers</h3>
                <p className="text-sm text-slate-500">Define pricing tiers based on group size</p>
              </div>
              <button
                onClick={addGuestTier}
                className="flex items-center gap-2 px-4 py-2 bg-resort-600 text-white rounded-lg font-medium hover:bg-resort-700 transition-colors"
              >
                <FiPlus className="w-4 h-4" />
                Add Tier
              </button>
            </div>
            
            <div className="divide-y divide-slate-100">
              {guestTiers.map((tier, index) => (
                <div key={tier.tempId || index} className={`p-6 ${!tier.is_active ? 'bg-slate-50 opacity-60' : ''}`}>
                  <div className="grid sm:grid-cols-5 gap-4 items-end">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Label</label>
                      <input
                        type="text"
                        value={tier.label}
                        onChange={e => updateGuestTier(index, { label: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-resort-500"
                        placeholder="e.g., Small Group"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Min Guests</label>
                      <input
                        type="number"
                        min={1}
                        value={tier.min_guests}
                        onChange={e => updateGuestTier(index, { min_guests: Number(e.target.value) })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-resort-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Max Guests</label>
                      <input
                        type="number"
                        min={tier.min_guests}
                        value={tier.max_guests ?? ''}
                        onChange={e => updateGuestTier(index, { 
                          max_guests: e.target.value ? Number(e.target.value) : null 
                        })}
                        placeholder="Unlimited"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-resort-500"
                      />
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tier.is_active}
                          onChange={e => updateGuestTier(index, { is_active: e.target.checked })}
                          className="rounded border-slate-300 text-green-600 focus:ring-green-500"
                        />
                        Active
                      </label>
                      
                      <button
                        onClick={() => removeGuestTier(index)}
                        disabled={guestTiers.length <= 1}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Remove tier"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {guestTiers.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  <FiUsers className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No guest tiers defined. Add your first tier to get started.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pricing Matrix Tab */}
        {activeTab === 'pricing' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Pricing Matrix</h3>
              <p className="text-sm text-slate-500">Set prices for each combination of time slot, guest tier, and day type</p>
            </div>
            
            {activeSlots.length === 0 || activeTiers.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <FiDollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Please add at least one active time slot and guest tier first.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left text-sm font-medium text-slate-700 px-4 py-3 border-b">Time Slot</th>
                      <th className="text-left text-sm font-medium text-slate-700 px-4 py-3 border-b">Guest Tier</th>
                      <th className="text-center text-sm font-medium text-slate-700 px-4 py-3 border-b">
                        <span className="flex items-center justify-center gap-1">
                          <FiSun className="w-4 h-4 text-amber-500" />
                          Weekday
                        </span>
                      </th>
                      <th className="text-center text-sm font-medium text-slate-700 px-4 py-3 border-b">
                        <span className="flex items-center justify-center gap-1">
                          <FiMoon className="w-4 h-4 text-indigo-500" />
                          Weekend/Holiday
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSlots.map((slot) => (
                      activeTiers.map((tier, tierIndex) => (
                        <tr key={`${slot.label}-${tier.label}`} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm text-slate-900">
                            {tierIndex === 0 ? (
                              <div>
                                <p className="font-medium">{slot.label}</p>
                                <p className="text-xs text-slate-500">{slot.slot_type}</p>
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">{tier.label}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center">
                              <span className="text-slate-400 mr-1">₱</span>
                              <input
                                type="number"
                                min={0}
                                value={getPrice(slot.label, tier.label, 'weekday') || ''}
                                onChange={e => setPrice(slot.label, tier.label, 'weekday', Number(e.target.value))}
                                placeholder="0"
                                className="w-28 border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-center focus:ring-2 focus:ring-resort-500"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center">
                              <span className="text-slate-400 mr-1">₱</span>
                              <input
                                type="number"
                                min={0}
                                value={getPrice(slot.label, tier.label, 'weekend') || ''}
                                onChange={e => setPrice(slot.label, tier.label, 'weekend', Number(e.target.value))}
                                placeholder="0"
                                className="w-28 border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-center focus:ring-2 focus:ring-resort-500"
                              />
                            </div>
                          </td>
                        </tr>
                      ))
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
