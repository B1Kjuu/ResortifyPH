'use client'

import React, { useState, useRef, useEffect } from 'react'

type Option = {
  value: string
  label: string
}

type CustomSelectProps = {
  value: string
  onChange: (value: string) => void
  options: Option[]
  ariaLabel?: string
  className?: string
  placeholder?: string
}

export default function CustomSelect({ value, onChange, options, ariaLabel, className = '', placeholder }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const selectedOption = options.find(opt => opt.value === value)
  const displayText = selectedOption?.label || placeholder || 'Select...'

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  return (
    <div ref={containerRef} className={`relative ${className ? '' : 'min-w-[110px]'} ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className={`appearance-none w-full px-3 py-2 h-10 border rounded-xl text-sm font-medium text-left bg-gradient-to-b from-white to-slate-50 shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-resort-400 pr-9 cursor-pointer transition-all duration-200 ${
          isOpen ? 'border-resort-400 ring-2 ring-resort-400 bg-white' : 'border-slate-200 hover:border-slate-300'
        } ${!selectedOption ? 'text-slate-500' : 'text-slate-700'}`}
      >
        <span className="block truncate">{displayText}</span>
      </button>
      
      {/* Arrow Icon */}
      <div className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 ${
        isOpen ? 'bg-resort-100 rotate-180' : 'bg-slate-100 group-hover:bg-slate-200'
      }`}>
        <svg
          className={`w-3.5 h-3.5 transition-colors ${isOpen ? 'text-resort-600' : 'text-slate-500'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full min-w-[160px] bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <ul
            role="listbox"
            aria-label={ariaLabel}
            className="max-h-60 overflow-auto py-1"
          >
            {options.map((option) => {
              const isSelected = option.value === value
              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                  }}
                  className={`relative cursor-pointer select-none px-3 py-2.5 text-sm transition-colors ${
                    isSelected
                      ? 'bg-resort-50 text-resort-700 font-medium'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center justify-between">
                    <span className="block truncate">{option.label}</span>
                    {isSelected && (
                      <svg className="w-4 h-4 text-resort-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
