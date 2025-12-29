'use client'

import React, { useMemo } from 'react'
import { FiSun, FiMoon, FiClock } from 'react-icons/fi'
import {
  BookingType,
  BOOKING_TYPES,
  TIME_SLOTS,
  TimeSlot,
  getTimeSlotsForType,
  getDayType,
  getGuestTier,
  formatTime,
  GuestTier,
  BookingPricing,
} from '../lib/bookingTypes'
import type { ResortPricingConfig } from '../lib/validations'

interface BookingTypeSelectorProps {
  pricingConfig: ResortPricingConfig | null
  selectedBookingType: BookingType | null
  selectedTimeSlot: string | null
  selectedDate: Date | null
  guestCount: number
  onBookingTypeChange: (type: BookingType) => void
  onTimeSlotChange: (slotId: string) => void
  // Legacy pricing fallback
  legacyPricing?: {
    day_tour_price?: number | null
    night_tour_price?: number | null
    overnight_price?: number | null
  }
}

export default function BookingTypeSelector({
  pricingConfig,
  selectedBookingType,
  selectedTimeSlot,
  selectedDate,
  guestCount,
  onBookingTypeChange,
  onTimeSlotChange,
  legacyPricing,
}: BookingTypeSelectorProps) {
  // Get enabled booking types
  const enabledTypes = useMemo(() => {
    if (pricingConfig?.enabledBookingTypes?.length) {
      return BOOKING_TYPES.filter(t => pricingConfig.enabledBookingTypes.includes(t.id))
    }
    // Fallback to legacy: show all types if legacy prices exist
    const types: BookingType[] = []
    if (legacyPricing?.day_tour_price) types.push('daytour')
    if (legacyPricing?.night_tour_price) types.push('overnight')
    if (legacyPricing?.overnight_price) types.push('22hrs')
    // If no legacy prices, show all
    if (types.length === 0) return BOOKING_TYPES
    return BOOKING_TYPES.filter(t => types.includes(t.id))
  }, [pricingConfig, legacyPricing])

  // Get available time slots for selected booking type
  const availableSlots = useMemo(() => {
    if (!selectedBookingType) return []
    
    if (pricingConfig?.enabledTimeSlots?.length) {
      return TIME_SLOTS.filter(s => 
        s.bookingType === selectedBookingType && 
        pricingConfig.enabledTimeSlots.includes(s.id)
      )
    }
    // Fallback: show default slots for the type
    return getTimeSlotsForType(selectedBookingType).slice(0, 2)
  }, [selectedBookingType, pricingConfig])

  // Calculate price for a booking type
  const getPriceForType = (type: BookingType): number | null => {
    if (pricingConfig?.pricing?.length && selectedDate) {
      const dayType = getDayType(selectedDate)
      const tier = getGuestTier(guestCount, pricingConfig.guestTiers)
      if (!tier) return null
      
      const priceEntry = pricingConfig.pricing.find(p =>
        p.bookingType === type && p.dayType === dayType && p.guestTierId === tier.id
      )
      return priceEntry?.price ?? null
    }
    
    // Legacy fallback
    switch (type) {
      case 'daytour':
        return legacyPricing?.day_tour_price ?? null
      case 'overnight':
        return legacyPricing?.night_tour_price ?? null
      case '22hrs':
        return legacyPricing?.overnight_price ?? null
      default:
        return null
    }
  }

  // Get icon for booking type
  const getIcon = (type: BookingType) => {
    switch (type) {
      case 'daytour':
        return <FiSun className="w-5 h-5" />
      case 'overnight':
        return <FiMoon className="w-5 h-5" />
      case '22hrs':
        return <FiClock className="w-5 h-5" />
    }
  }

  // Get day type label for pricing info
  const dayTypeLabel = selectedDate ? (
    getDayType(selectedDate) === 'weekend' ? 'Weekend/Holiday rate' : 'Weekday rate'
  ) : null

  // Get current tier label
  const currentTier = pricingConfig?.guestTiers 
    ? getGuestTier(guestCount, pricingConfig.guestTiers)
    : null

  return (
    <div className="space-y-4">
      {/* Booking Type Selection */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Booking Type</label>
        <div className="grid grid-cols-3 gap-2">
          {enabledTypes.map((type) => {
            const price = getPriceForType(type.id)
            const isSelected = selectedBookingType === type.id
            
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => onBookingTypeChange(type.id)}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  isSelected
                    ? 'border-resort-500 bg-resort-50 text-resort-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex justify-center mb-1">
                  {getIcon(type.id)}
                </div>
                <p className="font-semibold text-sm">{type.label}</p>
                {price !== null && (
                  <p className="text-xs text-resort-600 mt-1">₱{price.toLocaleString()}</p>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Time Slot Selection */}
      {selectedBookingType && availableSlots.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Time Slot</label>
          <div className="space-y-2">
            {availableSlots.map((slot) => {
              const isSelected = selectedTimeSlot === slot.id
              
              return (
                <label
                  key={slot.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-resort-500 bg-resort-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="timeSlot"
                    value={slot.id}
                    checked={isSelected}
                    onChange={() => onTimeSlotChange(slot.id)}
                    className="w-4 h-4 text-resort-600 focus:ring-resort-500"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">
                      {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                      {slot.crossesMidnight && <span className="text-xs text-slate-500 ml-1">(+1 day)</span>}
                    </p>
                    <p className="text-xs text-slate-500">{slot.hours} hours</p>
                  </div>
                </label>
              )
            })}
          </div>
        </div>
      )}

      {/* Pricing Info */}
      {pricingConfig && selectedDate && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-800">
              {dayTypeLabel}
              {currentTier && (
                <span className="block text-xs text-blue-600 mt-0.5">
                  {currentTier.label}
                </span>
              )}
            </span>
            {pricingConfig.downpaymentPercentage > 0 && (
              <span className="text-blue-700 font-medium">
                {pricingConfig.downpaymentPercentage}% downpayment required
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
