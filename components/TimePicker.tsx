'use client'

import React, { useState, useEffect } from 'react'

interface TimePickerProps {
  value?: string  // 24-hour format string like "14:00"
  onChange: (value: string) => void
  className?: string
  id?: string
  name?: string
}

export default function TimePicker({ value = '14:00', onChange, className = '', id, name }: TimePickerProps) {
  // Parse initial value
  const parseTime = (timeStr: string) => {
    const [h, m] = (timeStr || '14:00').split(':').map(Number)
    const hour24 = isNaN(h) ? 14 : h
    const minute = isNaN(m) ? 0 : m
    const period = hour24 >= 12 ? 'PM' : 'AM'
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    return { hour12, minute, period }
  }

  const [time, setTime] = useState(() => parseTime(value))

  useEffect(() => {
    const parsed = parseTime(value)
    setTime(parsed)
  }, [value])

  const updateTime = (newTime: typeof time) => {
    setTime(newTime)
    // Convert back to 24-hour format
    let hour24 = newTime.hour12
    if (newTime.period === 'AM') {
      hour24 = newTime.hour12 === 12 ? 0 : newTime.hour12
    } else {
      hour24 = newTime.hour12 === 12 ? 12 : newTime.hour12 + 12
    }
    const formatted = `${hour24.toString().padStart(2, '0')}:${newTime.minute.toString().padStart(2, '0')}`
    onChange(formatted)
  }

  const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  const minutes = Array.from({ length: 60 }, (_, i) => i)

  return (
    <div className={`flex items-center gap-2 ${className}`} id={id}>
      <select
        value={time.hour12}
        onChange={(e) => updateTime({ ...time, hour12: Number(e.target.value) })}
        className="flex-1 px-3 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 bg-white text-center appearance-none cursor-pointer"
        name={name ? `${name}-hour` : undefined}
        aria-label="Hour"
      >
        {hours.map(h => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      
      <span className="text-xl font-semibold text-slate-600">:</span>
      
      <select
        value={time.minute}
        onChange={(e) => updateTime({ ...time, minute: Number(e.target.value) })}
        className="flex-1 px-3 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 bg-white text-center appearance-none cursor-pointer"
        name={name ? `${name}-minute` : undefined}
        aria-label="Minute"
      >
        {minutes.map(m => (
          <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
        ))}
      </select>
      
      <select
        value={time.period}
        onChange={(e) => updateTime({ ...time, period: e.target.value as 'AM' | 'PM' })}
        className="px-3 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 bg-white font-semibold text-center appearance-none cursor-pointer"
        name={name ? `${name}-period` : undefined}
        aria-label="AM or PM"
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  )
}
