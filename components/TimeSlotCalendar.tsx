'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, addDays, startOfWeek, endOfWeek, addMonths, subMonths } from 'date-fns'
import { FiChevronLeft, FiChevronRight, FiSun, FiMoon, FiClock } from 'react-icons/fi'
import type { BookingType, AvailableTimeSlot } from '../lib/bookingTypes'

type SlotAvailability = {
  daytour: 'available' | 'booked' | 'none'
  overnight: 'available' | 'booked' | 'none'
  '22hrs': 'available' | 'booked' | 'none'
}

interface TimeSlotCalendarProps {
  resortId: string
  selectedDate: Date | null
  onSelectDate: (date: Date) => void
  selectedSlotId?: string | null
  onSelectSlot?: (slotId: string) => void
  showSlotSelector?: boolean
}

export default function TimeSlotCalendar({
  resortId,
  selectedDate,
  onSelectDate,
  selectedSlotId,
  onSelectSlot,
  showSlotSelector = true,
}: TimeSlotCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [availabilityCache, setAvailabilityCache] = useState<Record<string, SlotAvailability>>({})
  const [slotsForDate, setSlotsForDate] = useState<AvailableTimeSlot[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch availability for visible month
  useEffect(() => {
    async function fetchMonthAvailability() {
      setLoading(true)
      const cache: Record<string, SlotAvailability> = {}
      
      // Get dates for current month view
      const firstOfMonth = startOfMonth(currentMonth)
      const lastOfMonth = endOfMonth(currentMonth)
      const gridStart = startOfWeek(firstOfMonth)
      const gridEnd = endOfWeek(lastOfMonth)
      
      // Fetch availability for each date (batch by checking a few key dates)
      const dates: Date[] = []
      let cursor = gridStart
      while (cursor <= gridEnd) {
        dates.push(new Date(cursor))
        cursor = addDays(cursor, 1)
      }
      
      // For now, initialize with 'available' (in production, this would batch fetch from API)
      for (const date of dates) {
        const key = format(date, 'yyyy-MM-dd')
        cache[key] = { daytour: 'available', overnight: 'available', '22hrs': 'available' }
      }
      
      setAvailabilityCache(cache)
      setLoading(false)
    }
    
    fetchMonthAvailability()
  }, [currentMonth, resortId])

  // Fetch detailed slots when a date is selected
  useEffect(() => {
    async function fetchSlotsForDate() {
      if (!selectedDate) {
        setSlotsForDate([])
        return
      }
      
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        const response = await fetch(`/api/resorts/${resortId}/availability?date=${dateStr}`)
        
        if (response.ok) {
          const data = await response.json()
          setSlotsForDate(data.availableSlots || [])
        }
      } catch (err) {
        console.error('Failed to fetch slots:', err)
        setSlotsForDate([])
      }
    }
    
    fetchSlotsForDate()
  }, [selectedDate, resortId])

  // Build calendar grid
  const days = useMemo(() => {
    const firstOfMonth = startOfMonth(currentMonth)
    const lastOfMonth = endOfMonth(currentMonth)
    const gridStart = startOfWeek(firstOfMonth)
    const gridEnd = endOfWeek(lastOfMonth)
    
    const result: Date[] = []
    let cursor = gridStart
    while (cursor <= gridEnd) {
      result.push(new Date(cursor))
      cursor = addDays(cursor, 1)
      if (result.length > 42) break
    }
    return result
  }, [currentMonth])

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  
  const isToday = (date: Date) => {
    const today = new Date()
    return format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
  }
  
  const isPast = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  const getSlotIcon = (type: BookingType) => {
    switch (type) {
      case 'daytour': return <FiSun className="w-3 h-3" />
      case 'overnight': return <FiMoon className="w-3 h-3" />
      case '22hrs': return <FiClock className="w-3 h-3" />
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-resort-50 to-blue-50 p-4 flex items-center justify-between border-b border-slate-200">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 hover:bg-white rounded-lg transition-colors"
        >
          <FiChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h3 className="font-bold text-slate-900">{format(currentMonth, 'MMMM yyyy')}</h3>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 hover:bg-white rounded-lg transition-colors"
        >
          <FiChevronRight className="w-5 h-5 text-slate-600" />
        </button>
      </div>
      
      {/* Week days header */}
      <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-semibold text-slate-500 py-2">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-slate-100 p-px">
        {days.map((date) => {
          const key = format(date, 'yyyy-MM-dd')
          const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
          const isSelected = selectedDate && format(selectedDate, 'yyyy-MM-dd') === key
          const past = isPast(date)
          const today = isToday(date)
          const availability = availabilityCache[key]
          
          return (
            <button
              key={key}
              type="button"
              disabled={past}
              onClick={() => !past && onSelectDate(date)}
              className={`
                relative min-h-[60px] sm:min-h-[72px] bg-white p-1 sm:p-2 text-left transition-all
                ${!isCurrentMonth ? 'opacity-40' : ''}
                ${past ? 'cursor-not-allowed bg-slate-50' : 'hover:bg-resort-50 cursor-pointer'}
                ${isSelected ? 'ring-2 ring-resort-500 ring-inset z-10' : ''}
                ${today ? 'bg-resort-50' : ''}
              `}
            >
              <div className={`text-sm font-semibold ${today ? 'text-resort-600' : past ? 'text-slate-300' : 'text-slate-700'}`}>
                {format(date, 'd')}
              </div>
              
              {/* Slot availability indicators */}
              {!past && availability && (
                <div className="flex flex-wrap gap-0.5 mt-1">
                  {availability.daytour !== 'none' && (
                    <span className={`w-4 h-4 rounded flex items-center justify-center ${
                      availability.daytour === 'available' 
                        ? 'bg-amber-100 text-amber-600' 
                        : 'bg-red-100 text-red-400'
                    }`}>
                      <FiSun className="w-2.5 h-2.5" />
                    </span>
                  )}
                  {availability.overnight !== 'none' && (
                    <span className={`w-4 h-4 rounded flex items-center justify-center ${
                      availability.overnight === 'available' 
                        ? 'bg-indigo-100 text-indigo-600' 
                        : 'bg-red-100 text-red-400'
                    }`}>
                      <FiMoon className="w-2.5 h-2.5" />
                    </span>
                  )}
                  {availability['22hrs'] !== 'none' && (
                    <span className={`w-4 h-4 rounded flex items-center justify-center ${
                      availability['22hrs'] === 'available' 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-red-100 text-red-400'
                    }`}>
                      <FiClock className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
      
      {/* Time slot selector (when date is selected) */}
      {showSlotSelector && selectedDate && (
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">
            Available Time Slots for {format(selectedDate, 'MMMM d, yyyy')}
          </h4>
          
          {slotsForDate.length === 0 ? (
            <p className="text-sm text-slate-500">Loading slots...</p>
          ) : (
            <div className="space-y-2">
              {slotsForDate.map(slot => (
                <button
                  key={slot.slot_id}
                  type="button"
                  disabled={!slot.is_available}
                  onClick={() => slot.is_available && onSelectSlot?.(slot.slot_id)}
                  className={`
                    w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left
                    ${selectedSlotId === slot.slot_id 
                      ? 'border-resort-500 bg-resort-50 ring-1 ring-resort-500' 
                      : slot.is_available 
                        ? 'border-slate-200 bg-white hover:border-resort-300 hover:bg-resort-50' 
                        : 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                    }
                  `}
                >
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    slot.slot_type === 'daytour' ? 'bg-amber-100 text-amber-600' :
                    slot.slot_type === 'overnight' ? 'bg-indigo-100 text-indigo-600' :
                    'bg-green-100 text-green-600'
                  }`}>
                    {getSlotIcon(slot.slot_type)}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 text-sm">{slot.label}</p>
                    <p className="text-xs text-slate-500">{slot.hours} hours</p>
                  </div>
                  {slot.is_available ? (
                    <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                      Available
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded-full">
                      Booked
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Legend */}
      <div className="border-t border-slate-200 p-3 bg-white">
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-amber-100 flex items-center justify-center text-amber-600">
              <FiSun className="w-2.5 h-2.5" />
            </span>
            Daytour
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-indigo-100 flex items-center justify-center text-indigo-600">
              <FiMoon className="w-2.5 h-2.5" />
            </span>
            Overnight
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-green-100 flex items-center justify-center text-green-600">
              <FiClock className="w-2.5 h-2.5" />
            </span>
            22 Hours
          </span>
        </div>
      </div>
    </div>
  )
}
