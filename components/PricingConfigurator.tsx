'use client'

import React, { useState, useMemo } from 'react'
import { FiDollarSign, FiUsers, FiClock, FiPlus, FiTrash2, FiSun, FiMoon } from 'react-icons/fi'
import TimePicker from './TimePicker'
import {
  BookingType,
  DayType,
  GuestTier,
  BookingPricing,
  BOOKING_TYPES,
  TIME_SLOTS,
  DEFAULT_GUEST_TIERS,
  DEFAULT_DOWNPAYMENT_PERCENTAGE,
  getTimeSlotsForType,
} from '../lib/bookingTypes'
import type { ResortPricingConfig } from '../lib/validations'

// Prevent typing minus sign for price inputs
const preventNegativeInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === '-' || e.key === 'e' || e.key === 'E') {
    e.preventDefault()
  }
}

// Clamp value on blur/change to prevent spinner from going negative
const clampPrice = (e: React.FocusEvent<HTMLInputElement> | React.ChangeEvent<HTMLInputElement>) => {
  const val = parseInt(e.target.value) || 0
  if (val < 0) e.target.value = '0'
  if (val > MAX_PRICE) e.target.value = String(MAX_PRICE)
}

const MAX_PRICE = 10000000 // 10 million peso max

// Custom time slot type
interface CustomTimeSlot {
  id: string
  label: string
  startTime: string
  endTime: string
  bookingType: BookingType
}

interface PricingConfiguratorProps {
  value: ResortPricingConfig | null
  onChange: (config: ResortPricingConfig) => void
  capacity?: number
}

const DEFAULT_CONFIG: ResortPricingConfig = {
  enabledBookingTypes: ['daytour', 'overnight', '22hrs'],
  enabledTimeSlots: ['daytour_8am_5pm', 'overnight_7pm_6am', '22hrs_8am_6am'],
  customTimeSlots: [],
  guestTiers: [
    { id: 'tier_1', label: 'Up to 20 guests', minGuests: 1, maxGuests: 20 },
    { id: 'tier_2', label: '21-30 guests', minGuests: 21, maxGuests: 30 },
  ],
  pricing: [],
  downpaymentPercentage: DEFAULT_DOWNPAYMENT_PERCENTAGE,
}

export default function PricingConfigurator({ value, onChange, capacity }: PricingConfiguratorProps) {
  const config = value || DEFAULT_CONFIG
  const [showCustomSlotForm, setShowCustomSlotForm] = useState<BookingType | null>(null)
  const [customStartTime, setCustomStartTime] = useState('08:00')
  const [customEndTime, setCustomEndTime] = useState('17:00')
  
  const updateConfig = (updates: Partial<ResortPricingConfig>) => {
    onChange({ ...config, ...updates })
  }

  // Toggle booking type
  const toggleBookingType = (type: BookingType) => {
    const current = config.enabledBookingTypes
    const newTypes = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type]
    
    // Also remove time slots for disabled types
    const validSlots = config.enabledTimeSlots.filter(slotId => {
      const slot = TIME_SLOTS.find(s => s.id === slotId)
      return slot && newTypes.includes(slot.bookingType)
    })
    
    // Also remove custom slots for disabled types
    const validCustomSlots = (config.customTimeSlots || []).filter(
      slot => newTypes.includes(slot.bookingType)
    )
    
    updateConfig({ 
      enabledBookingTypes: newTypes,
      enabledTimeSlots: validSlots,
      customTimeSlots: validCustomSlots,
    })
  }

  // Toggle time slot
  const toggleTimeSlot = (slotId: string) => {
    const current = config.enabledTimeSlots
    const newSlots = current.includes(slotId)
      ? current.filter(s => s !== slotId)
      : [...current, slotId]
    
    updateConfig({ enabledTimeSlots: newSlots })
  }

  // Add custom time slot
  const addCustomTimeSlot = (bookingType: BookingType) => {
    const customSlots = config.customTimeSlots || []
    const startHour = parseInt(customStartTime.split(':')[0])
    const endHour = parseInt(customEndTime.split(':')[0])
    const startPeriod = startHour >= 12 ? 'PM' : 'AM'
    const endPeriod = endHour >= 12 ? 'PM' : 'AM'
    const displayStart = `${startHour > 12 ? startHour - 12 : startHour || 12}:${customStartTime.split(':')[1]} ${startPeriod}`
    const displayEnd = `${endHour > 12 ? endHour - 12 : endHour || 12}:${customEndTime.split(':')[1]} ${endPeriod}`
    
    const newSlot: CustomTimeSlot = {
      id: `custom_${bookingType}_${Date.now()}`,
      label: `${displayStart} - ${displayEnd}`,
      startTime: customStartTime,
      endTime: customEndTime,
      bookingType,
    }
    
    updateConfig({
      customTimeSlots: [...customSlots, newSlot],
      enabledTimeSlots: [...config.enabledTimeSlots, newSlot.id],
    })
    
    setShowCustomSlotForm(null)
    setCustomStartTime('08:00')
    setCustomEndTime('17:00')
  }

  // Remove custom time slot
  const removeCustomTimeSlot = (slotId: string) => {
    const customSlots = (config.customTimeSlots || []).filter(s => s.id !== slotId)
    const enabledSlots = config.enabledTimeSlots.filter(s => s !== slotId)
    updateConfig({
      customTimeSlots: customSlots,
      enabledTimeSlots: enabledSlots,
    })
  }

  // Update guest tier
  const updateTier = (index: number, tier: GuestTier) => {
    const newTiers = [...config.guestTiers]
    newTiers[index] = tier
    updateConfig({ guestTiers: newTiers })
  }

  // Add new tier
  const addTier = () => {
    const lastTier = config.guestTiers[config.guestTiers.length - 1]
    const newMin = lastTier ? (lastTier.maxGuests || 0) + 1 : 1
    const maxCapacity = capacity ?? 100 // Default to 100 if not specified
    const newMax = Math.min(newMin + 10, maxCapacity)
    
    const newTier: GuestTier = {
      id: `tier_${Date.now()}`,
      label: `${newMin}-${newMax} guests`,
      minGuests: newMin,
      maxGuests: newMax,
    }
    
    updateConfig({ guestTiers: [...config.guestTiers, newTier] })
  }

  // Remove tier
  const removeTier = (index: number) => {
    if (config.guestTiers.length <= 1) return
    const newTiers = config.guestTiers.filter((_, i) => i !== index)
    // Also remove pricing for this tier
    const tierId = config.guestTiers[index].id
    const newPricing = config.pricing.filter(p => p.guestTierId !== tierId)
    updateConfig({ guestTiers: newTiers, pricing: newPricing })
  }

  // Update price for a combination
  const updatePrice = (bookingType: BookingType, dayType: DayType, tierId: string, price: number) => {
    const existingIndex = config.pricing.findIndex(
      p => p.bookingType === bookingType && p.dayType === dayType && p.guestTierId === tierId
    )
    
    const newPricing = [...config.pricing]
    const entry: BookingPricing = { bookingType, dayType, guestTierId: tierId, price }
    
    if (existingIndex >= 0) {
      newPricing[existingIndex] = entry
    } else {
      newPricing.push(entry)
    }
    
    updateConfig({ pricing: newPricing })
  }

  // Get price for a combination
  const getPrice = (bookingType: BookingType, dayType: DayType, tierId: string): number => {
    const entry = config.pricing.find(
      p => p.bookingType === bookingType && p.dayType === dayType && p.guestTierId === tierId
    )
    return entry?.price || 0
  }

  // Available slots for enabled booking types
  const availableSlots = useMemo(() => {
    return TIME_SLOTS.filter(slot => config.enabledBookingTypes.includes(slot.bookingType))
  }, [config.enabledBookingTypes])

  return (
    <div className="space-y-6">
      {/* Booking Types Section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <FiClock className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-900">Booking Types</h3>
        </div>
        <p className="text-sm text-slate-600 mb-4">Select which booking types you want to offer:</p>
        
        <div className="grid sm:grid-cols-3 gap-3">
          {BOOKING_TYPES.map(type => (
            <label 
              key={type.id}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                config.enabledBookingTypes.includes(type.id)
                  ? 'bg-blue-100 border-blue-400'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="checkbox"
                checked={config.enabledBookingTypes.includes(type.id)}
                onChange={() => toggleBookingType(type.id)}
                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <div>
                <p className="font-semibold text-slate-900">{type.label}</p>
                <p className="text-xs text-slate-500">{type.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Time Slots Section */}
      {config.enabledBookingTypes.length > 0 && (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <FiClock className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-bold text-slate-900">Time Slots</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4">Choose available time slots for each booking type, or add your own custom slots:</p>
          
          {config.enabledBookingTypes.map(bookingType => {
            const slots = getTimeSlotsForType(bookingType)
            const typeInfo = BOOKING_TYPES.find(t => t.id === bookingType)
            const customSlots = (config.customTimeSlots || []).filter(s => s.bookingType === bookingType)
            
            return (
              <div key={bookingType} className="mb-6 last:mb-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-slate-700">{typeInfo?.label}:</p>
                  <button
                    type="button"
                    onClick={() => setShowCustomSlotForm(showCustomSlotForm === bookingType ? null : bookingType)}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                  >
                    <FiPlus className="w-3 h-3" /> Add Custom
                  </button>
                </div>
                
                {/* Custom slot form */}
                {showCustomSlotForm === bookingType && (
                  <div className="mb-3 p-3 bg-white border-2 border-purple-300 rounded-lg">
                    <p className="text-sm font-medium text-slate-700 mb-2">Create custom time slot:</p>
                    <div className="flex flex-wrap items-end gap-3">
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">Start Time</label>
                        <TimePicker
                          value={customStartTime}
                          onChange={(value) => setCustomStartTime(value)}
                          className="!gap-1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">End Time</label>
                        <TimePicker
                          value={customEndTime}
                          onChange={(value) => setCustomEndTime(value)}
                          className="!gap-1"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => addCustomTimeSlot(bookingType)}
                        className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm font-medium hover:bg-purple-700"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCustomSlotForm(null)}
                        className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded text-sm font-medium hover:bg-slate-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2">
                  {/* Preset slots */}
                  {slots.map(slot => (
                    <label
                      key={slot.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-all ${
                        config.enabledTimeSlots.includes(slot.id)
                          ? 'bg-purple-100 border-purple-400 text-purple-900'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={config.enabledTimeSlots.includes(slot.id)}
                        onChange={() => toggleTimeSlot(slot.id)}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <span>{slot.label.replace(/^(Daytour|Overnight|22 Hours):\s*/, '')}</span>
                    </label>
                  ))}
                  
                  {/* Custom slots */}
                  {customSlots.map(slot => (
                    <div
                      key={slot.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                        config.enabledTimeSlots.includes(slot.id)
                          ? 'bg-green-100 border-green-400 text-green-900'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={config.enabledTimeSlots.includes(slot.id)}
                        onChange={() => toggleTimeSlot(slot.id)}
                        className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                      />
                      <span>{slot.label}</span>
                      <span className="text-xs bg-green-200 text-green-800 px-1.5 py-0.5 rounded">Custom</span>
                      <button
                        type="button"
                        onClick={() => removeCustomTimeSlot(slot.id)}
                        className="p-1 text-red-500 hover:bg-red-100 rounded transition"
                      >
                        <FiTrash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Guest Tiers Section */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FiUsers className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-bold text-slate-900">Guest Tiers</h3>
          </div>
          <button
            type="button"
            onClick={addTier}
            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
          >
            <FiPlus className="w-4 h-4" /> Add Tier
          </button>
        </div>
        <p className="text-sm text-slate-600 mb-4">Define pricing tiers based on guest count:</p>
        
        <div className="space-y-3">
          {config.guestTiers.map((tier, index) => (
            <div key={tier.id} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white p-3 rounded-lg border border-slate-200">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tier Name</label>
                  <input
                    type="text"
                    value={tier.label}
                    onChange={(e) => updateTier(index, { ...tier, label: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Min Guests</label>
                  <input
                    type="number"
                    min={1}
                    max={capacity}
                    value={tier.minGuests}
                    onChange={(e) => updateTier(index, { ...tier, minGuests: parseInt(e.target.value) || 1 })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Max Guests</label>
                  <input
                    type="number"
                    min={tier.minGuests}
                    max={capacity}
                    value={tier.maxGuests || ''}
                    placeholder="∞"
                    onChange={(e) => updateTier(index, { ...tier, maxGuests: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>
              {config.guestTiers.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTier(index)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Matrix Section */}
      {config.enabledBookingTypes.length > 0 && config.guestTiers.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <FiDollarSign className="w-5 h-5 text-amber-600" />
            <h3 className="text-lg font-bold text-slate-900">Pricing Matrix</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4">Set prices for each combination of booking type, day type, and guest tier:</p>
          
          {config.enabledBookingTypes.map(bookingType => {
            const typeInfo = BOOKING_TYPES.find(t => t.id === bookingType)
            
            return (
              <div key={bookingType} className="mb-6 last:mb-0">
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  {bookingType === 'daytour' && <FiSun className="w-4 h-4 text-amber-500" />}
                  {bookingType === 'overnight' && <FiMoon className="w-4 h-4 text-indigo-500" />}
                  {bookingType === '22hrs' && <FiClock className="w-4 h-4 text-purple-500" />}
                  {typeInfo?.label}
                </h4>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="px-3 py-2 text-left font-medium text-slate-600 rounded-tl-lg">Guest Tier</th>
                        <th className="px-3 py-2 text-center font-medium text-slate-600">
                          <span className="flex items-center justify-center gap-1">
                            <FiSun className="w-4 h-4" /> Weekday
                          </span>
                        </th>
                        <th className="px-3 py-2 text-center font-medium text-slate-600 rounded-tr-lg">
                          <span className="flex items-center justify-center gap-1">
                            <FiMoon className="w-4 h-4" /> Weekend/Holiday
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {config.guestTiers.map((tier, idx) => (
                        <tr key={tier.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="px-3 py-2 font-medium text-slate-700">{tier.label}</td>
                          <td className="px-3 py-2">
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₱</span>
                              <input
                                type="number"
                                min={0}
                                max={MAX_PRICE}
                                onKeyDown={preventNegativeInput}
                                onBlur={clampPrice}
                                value={getPrice(bookingType, 'weekday', tier.id) || ''}
                                onChange={(e) => updatePrice(bookingType, 'weekday', tier.id, Math.min(MAX_PRICE, Math.max(0, parseInt(e.target.value) || 0)))}
                                placeholder="0"
                                className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-amber-400"
                              />
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₱</span>
                              <input
                                type="number"
                                min={0}
                                max={MAX_PRICE}
                                onKeyDown={preventNegativeInput}
                                onBlur={clampPrice}
                                value={getPrice(bookingType, 'weekend', tier.id) || ''}
                                onChange={(e) => updatePrice(bookingType, 'weekend', tier.id, Math.min(MAX_PRICE, Math.max(0, parseInt(e.target.value) || 0)))}
                                placeholder="0"
                                className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-amber-400"
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Downpayment Section */}
      <div className="bg-gradient-to-br from-rose-50 to-red-50 border-2 border-rose-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <FiDollarSign className="w-5 h-5 text-rose-600" />
          <h3 className="text-lg font-bold text-slate-900">Downpayment</h3>
        </div>
        <p className="text-sm text-slate-600 mb-4">Set the required downpayment percentage for booking confirmation:</p>
        
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0}
            max={100}
            onKeyDown={preventNegativeInput}
            value={config.downpaymentPercentage}
            onChange={(e) => updateConfig({ downpaymentPercentage: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
            className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-center font-semibold focus:ring-2 focus:ring-rose-400"
          />
          <span className="text-slate-700 font-medium">%</span>
          <span className="text-sm text-slate-500">of total booking price</span>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Example: If total is ₱10,000 and downpayment is {config.downpaymentPercentage}%, guest pays ₱{((10000 * config.downpaymentPercentage) / 100).toLocaleString()} to confirm.
        </p>
      </div>
    </div>
  )
}
