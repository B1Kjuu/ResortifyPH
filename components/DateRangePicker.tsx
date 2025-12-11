'use client'

import { useEffect, useState, useRef } from 'react'
import { DayPicker, DateRange } from 'react-day-picker'
import { format, eachDayOfInterval, parseISO } from 'date-fns'
import 'react-day-picker/dist/style.css'

interface DateRangePickerProps {
  bookedDates: string[] // Array of date strings in ISO format
  onSelectRange: (range: { from: Date | undefined; to: Date | undefined }) => void
  selectedRange: { from: Date | undefined; to: Date | undefined }
}

export default function DateRangePicker({ 
  bookedDates, 
  onSelectRange, 
  selectedRange 
}: DateRangePickerProps) {
  const [monthCount, setMonthCount] = useState(1)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  
  // Convert booked date strings to Date objects
  const disabledDates = bookedDates.map(dateStr => parseISO(dateStr))
  
  // Disable past dates
  const disabledDays = [
    { before: new Date() },
    ...disabledDates.map(date => ({ from: date, to: date }))
  ]

  useEffect(() => {
    // Prefer container width so the calendar can show two months inside the booking card when it fits.
    const el = wrapperRef.current
    if (!el) return

    const update = () => {
      const w = el.clientWidth || window.innerWidth
      // show two months when container width >= 520px (fits compact months)
      setMonthCount(w >= 520 ? 2 : 1)
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [wrapperRef])

  const handleSelect = (range: DateRange | undefined) => {
    if (!range) {
      onSelectRange({ from: undefined, to: undefined })
      return
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

  return (
    <div ref={wrapperRef} className="bg-white rounded-lg border border-gray-200 p-2 shadow-sm">
      <DayPicker
        mode="range"
        selected={selectedRange}
        onSelect={handleSelect}
        disabled={disabledDays}
        numberOfMonths={monthCount}
        className={`calendar-custom ${monthCount === 2 ? 'two-months' : ''}`}
      />
      {selectedRange.from && selectedRange.to && (
        <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
          <p className="text-sm text-blue-900 font-medium">
            Check-in: {format(selectedRange.from, 'MMM dd, yyyy')}
          </p>
          <p className="text-sm text-blue-900 font-medium mt-1">
            Check-out: {format(selectedRange.to, 'MMM dd, yyyy')}
          </p>
        </div>
      )}
    </div>
  )
}
