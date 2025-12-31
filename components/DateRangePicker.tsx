'use client'

import { useEffect, useState, useRef } from 'react'
import { DayPicker, DateRange } from 'react-day-picker'
import { format, eachDayOfInterval, parseISO, differenceInDays, addDays } from 'date-fns'
import { FiCalendar, FiClock, FiSun, FiMoon } from 'react-icons/fi'
import 'react-day-picker/dist/style.css'

interface DateRangePickerProps {
  bookedDates: string[] // Array of date strings in ISO format
  onSelectRange: (range: { from: Date | undefined; to: Date | undefined }) => void
  selectedRange: { from: Date | undefined; to: Date | undefined }
  months?: number // explicit number of months to render
  preferTwoMonthsOnDesktop?: boolean // show 2 months on >=768px, else 1
  singleDateMode?: boolean // For daytour: select single date only
  onSelectSingleDate?: (date: Date | undefined) => void
  selectedSingleDate?: Date | undefined
  // New props for time display
  bookingType?: 'daytour' | 'overnight' | '22hrs' | null
  checkInTime?: string // HH:mm format
  checkOutTime?: string // HH:mm format
  // Time cutoff props - when time exceeds cutoff, today is disabled
  cutoffTime?: string // HH:mm format - if current time > cutoff, today is disabled
}

export default function DateRangePicker({ 
  bookedDates, 
  onSelectRange, 
  selectedRange, 
  months,
  preferTwoMonthsOnDesktop,
  singleDateMode = false,
  onSelectSingleDate,
  selectedSingleDate,
  bookingType,
  checkInTime,
  checkOutTime,
  cutoffTime,
}: DateRangePickerProps) {
  const [monthCount, setMonthCount] = useState(1)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  // Format time to 12-hour format
  const formatTime12h = (time?: string) => {
    if (!time) return ''
    try {
      const [h, m] = time.split(':').map(Number)
      const ampm = h >= 12 ? 'PM' : 'AM'
      const hr12 = ((h + 11) % 12) + 1
      return `${hr12}:${String(m).padStart(2, '0')} ${ampm}`
    } catch {
      return time
    }
  }

  // Check if today is past the cutoff time for this booking type
  const isTodayPastCutoff = (): boolean => {
    if (!cutoffTime && !checkInTime) return false
    
    const now = new Date()
    const cutoff = cutoffTime || checkInTime
    if (!cutoff) return false
    
    try {
      const [cutoffHour, cutoffMin] = cutoff.split(':').map(Number)
      const currentHour = now.getHours()
      const currentMin = now.getMinutes()
      
      // If current time is past the cutoff, today should be disabled
      if (currentHour > cutoffHour) return true
      if (currentHour === cutoffHour && currentMin >= cutoffMin) return true
      return false
    } catch {
      return false
    }
  }

  // Get default times based on booking type
  const getDefaultTimes = () => {
    if (checkInTime && checkOutTime) {
      return { checkIn: formatTime12h(checkInTime), checkOut: formatTime12h(checkOutTime) }
    }
    switch (bookingType) {
      case 'daytour':
        return { checkIn: '8:00 AM', checkOut: '5:00 PM' }
      case 'overnight':
        return { checkIn: '7:00 PM', checkOut: '6:00 AM' }
      case '22hrs':
        return { checkIn: '2:00 PM', checkOut: '12:00 PM' }
      default:
        return { checkIn: '2:00 PM', checkOut: '12:00 PM' }
    }
  }

  const times = getDefaultTimes()
  
  // Convert booked date strings to Date objects
  const disabledDates = bookedDates.map(dateStr => parseISO(dateStr))
  // Only mark FUTURE booked dates in red; past dates stay simply disabled
  const today = new Date(); today.setHours(0,0,0,0)
  const futureBookedDates = disabledDates.filter(d => {
    const dd = new Date(d); dd.setHours(0,0,0,0)
    return dd >= today
  })
  
  // Calculate the minimum selectable date based on cutoff time
  const getMinDate = (): Date => {
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    
    // If past cutoff time, start from tomorrow
    if (isTodayPastCutoff()) {
      const tomorrow = new Date(todayStart)
      tomorrow.setDate(tomorrow.getDate() + 1)
      return tomorrow
    }
    
    return todayStart
  }
  
  const minDate = getMinDate()
  
  // Disable past dates and booked dates
  const disabledDays = [
    { before: minDate },
    ...disabledDates
  ]

  useEffect(() => {
    const el = wrapperRef.current
    const update = () => {
      if (typeof months === 'number') {
        setMonthCount(months)
        return
      }

      // prefer 2 months on desktop width if requested
      if (preferTwoMonthsOnDesktop) {
        const vw = window.innerWidth
        setMonthCount(vw >= 768 ? 2 : 1)
        return
      }

      if (!el) {
        setMonthCount(1)
        return
      }

      const w = el.clientWidth || window.innerWidth
      // default heuristic: show two months when there is ample space
      setMonthCount(w >= 640 ? 2 : 1)
    }

    update()
    const ro = new ResizeObserver(update)
    if (el) ro.observe(el)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [wrapperRef, months, preferTwoMonthsOnDesktop])

  const handleSelect = (range: DateRange | undefined) => {
    if (!range) {
      onSelectRange({ from: undefined, to: undefined })
      return
    }

    // For overnight bookings, automatically set 'to' as the next day (always 2 days)
    // Overnight is a 1-night package: check-in evening day 1, check-out morning day 2
    if (bookingType === 'overnight' && range.from) {
      const nextDay = addDays(range.from, 1)
      // Force it to be exactly 2 days (1 night)
      if (!range.to || differenceInDays(range.to, range.from) !== 1) {
        // Check if next day is booked
        const nextDayStr = format(nextDay, 'yyyy-MM-dd')
        const isNextDayBooked = disabledDates.some(d => 
          format(d, 'yyyy-MM-dd') === nextDayStr
        )
        if (isNextDayBooked) {
          onSelectRange({ from: undefined, to: undefined })
          return
        }
        onSelectRange({ from: range.from, to: nextDay })
        return
      }
    }

    // For 22hrs bookings, ensure at least 2 days but allow longer stays
    if (bookingType === '22hrs' && range.from && range.to) {
      if (differenceInDays(range.to, range.from) < 1) {
        // Auto-extend to next day for minimum stay
        const nextDay = addDays(range.from, 1)
        const nextDayStr = format(nextDay, 'yyyy-MM-dd')
        const isNextDayBooked = disabledDates.some(d => 
          format(d, 'yyyy-MM-dd') === nextDayStr
        )
        if (isNextDayBooked) {
          onSelectRange({ from: undefined, to: undefined })
          return
        }
        onSelectRange({ from: range.from, to: nextDay })
        return
      }
    }

    // Check if selected range overlaps with booked dates
    if (range.from && range.to) {
      const selectedDays = eachDayOfInterval({ start: range.from, end: range.to })
      const hasOverlap = selectedDays.some(day => 
        disabledDates.some(disabledDate => 
          format(disabledDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
        )
      )
      
      if (hasOverlap) {
        // Reset selection if overlaps with booked dates
        onSelectRange({ from: undefined, to: undefined })
        return
      }
    }

    onSelectRange({ from: range.from, to: range.to })
  }

  // Handle single date selection (for daytour)
  const handleSingleSelect = (date: Date | undefined) => {
    if (!date) {
      onSelectSingleDate?.(undefined)
      return
    }
    
    // Check if selected date is booked
    const isBooked = disabledDates.some(disabledDate => 
      format(disabledDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    )
    
    if (isBooked) {
      onSelectSingleDate?.(undefined)
      return
    }
    
    onSelectSingleDate?.(date)
  }

  // Single date mode (for daytour)
  if (singleDateMode) {
    return (
      <div ref={wrapperRef} className="w-full">
        <DayPicker
          mode="single"
          selected={selectedSingleDate}
          onSelect={handleSingleSelect}
          disabled={disabledDays}
          numberOfMonths={monthCount}
          className={`calendar-custom ${monthCount === 2 ? 'two-months' : ''}`}
          modifiers={{
            booked: futureBookedDates,
          }}
          modifiersClassNames={{
            booked: 'day-booked',
          }}
          styles={{
            root: { width: '100%' },
            months: { display: 'flex', gap: '16px', justifyContent: 'flex-start', flexWrap: 'wrap' },
          }}
        />
        {selectedSingleDate && (
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <FiCalendar className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-900">Your Selected Date</span>
            </div>
            <p className="text-base font-medium text-gray-800">
              {format(selectedSingleDate, 'EEEE, MMMM d, yyyy')}
            </p>
            {bookingType && (
              <div className="mt-3 pt-3 border-t border-blue-200/50 flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1.5">
                  <FiSun className="w-4 h-4 text-amber-500" />
                  <span>{times.checkIn}</span>
                </div>
                <span className="text-gray-400">→</span>
                <div className="flex items-center gap-1.5">
                  {bookingType === 'daytour' ? (
                    <FiSun className="w-4 h-4 text-orange-500" />
                  ) : (
                    <FiMoon className="w-4 h-4 text-indigo-500" />
                  )}
                  <span>{times.checkOut}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div ref={wrapperRef} className="w-full">
      <DayPicker
        mode="range"
        selected={selectedRange}
        onSelect={handleSelect}
        disabled={disabledDays}
        numberOfMonths={monthCount}
        className={`calendar-custom ${monthCount === 2 ? 'two-months' : ''}`}
        modifiers={{
          booked: futureBookedDates,
        }}
        modifiersClassNames={{
          booked: 'day-booked',
        }}
        styles={{
          root: { width: '100%' },
          months: { display: 'flex', gap: '16px', justifyContent: 'flex-start', flexWrap: 'wrap' },
        }}
      />
      {selectedRange.from && selectedRange.to && (
        <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <FiCalendar className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-900">Your Stay</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Check-in</p>
                <p className="text-base font-medium text-gray-800">
                  {format(selectedRange.from, 'EEE, MMM d, yyyy')}
                </p>
                {bookingType && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
                    <FiClock className="w-3.5 h-3.5 text-blue-500" />
                    <span>{times.checkIn}</span>
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Check-out</p>
                <p className="text-base font-medium text-gray-800">
                  {format(selectedRange.to, 'EEE, MMM d, yyyy')}
                </p>
                {bookingType && (
                  <div className="flex items-center justify-end gap-1 mt-1 text-sm text-gray-600">
                    <FiClock className="w-3.5 h-3.5 text-blue-500" />
                    <span>{times.checkOut}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
