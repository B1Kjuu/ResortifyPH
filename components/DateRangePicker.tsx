'use client'

import { useEffect, useState, useRef } from 'react'
import { DayPicker, DateRange } from 'react-day-picker'
import { format, eachDayOfInterval, parseISO } from 'date-fns'
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
}: DateRangePickerProps) {
  const [monthCount, setMonthCount] = useState(1)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  
  // Convert booked date strings to Date objects
  const disabledDates = bookedDates.map(dateStr => parseISO(dateStr))
  // Only mark FUTURE booked dates in red; past dates stay simply disabled
  const today = new Date(); today.setHours(0,0,0,0)
  const futureBookedDates = disabledDates.filter(d => {
    const dd = new Date(d); dd.setHours(0,0,0,0)
    return dd >= today
  })
  
  // Disable past dates and booked dates
  const disabledDays = [
    { before: new Date() },
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
          <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
            <p className="text-sm text-blue-900 font-medium">
              Date: {format(selectedSingleDate, 'EEEE, MMM dd, yyyy')}
            </p>
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
