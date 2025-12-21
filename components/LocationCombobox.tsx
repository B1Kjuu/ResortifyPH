'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'

import { PHILIPPINE_REGIONS } from '../lib/locations'

type LocationComboboxProps = {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  variant?: 'default' | 'hero'
  ariaLabel?: string
}

export default function LocationCombobox({ value = '', onChange, placeholder = 'Select province...', error, variant = 'default', ariaLabel }: LocationComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  const toggle = () => {
    setIsOpen((prev) => !prev)
  }

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('')
      requestAnimationFrame(() => {
        searchInputRef.current?.focus()
      })
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    function handleClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [isOpen])

  const filteredRegions = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase()
    if (!normalized) {
      return PHILIPPINE_REGIONS
    }

    return PHILIPPINE_REGIONS.map((region) => ({
      ...region,
      provinces: region.provinces.filter((province) => province.toLowerCase().includes(normalized)),
    })).filter((region) => region.provinces.length > 0)
  }, [searchTerm])

  const handleSelect = (province: string) => {
    onChange(province)
    setIsOpen(false)
  }

  const clearSelection = () => {
    onChange('')
    setIsOpen(false)
  }

  const hero = variant === 'hero'
  const buttonClasses = hero
    ? 'w-full text-left focus:outline-none transition text-sm truncate'
    : 'w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-left focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors bg-white'
  const dropdownClasses = hero
    ? 'absolute z-30 mt-2 left-0 min-w-[280px] bg-white border border-slate-100 rounded-2xl shadow-[0_25px_65px_rgba(15,23,42,0.15)]'
    : 'absolute z-20 mt-2 w-full bg-white border-2 border-slate-200 rounded-2xl shadow-xl'
  const searchInputClasses = hero
    ? 'w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 text-sm bg-slate-50'
    : 'w-full px-3 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 text-sm'

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={toggle}
        aria-label={ariaLabel}
        className={buttonClasses}
      >
        <div className="flex items-center justify-between gap-2">
          <span className={`${value ? 'text-slate-900 font-medium' : 'text-slate-400'} ${hero ? 'truncate' : ''}`}>{value || placeholder}</span>
          {!hero && (
            <svg
              className="w-3 h-3 text-slate-500 transition-transform flex-shrink-0"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              <path d="M5 7l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </button>

      {isOpen && (
        <div className={dropdownClasses}>
          <div className="p-3 border-b border-slate-100">
            <input
              ref={searchInputRef}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  // Find first visible province
                  const firstRegion = filteredRegions[0]
                  const firstProvince = firstRegion?.provinces?.[0]
                  if (firstProvince) {
                    event.preventDefault()
                    handleSelect(firstProvince)
                  }
                }
              }}
              placeholder="Search province or region"
              className={searchInputClasses}
              type="text"
            />
          </div>

          <div className="max-h-72 overflow-y-auto p-3 space-y-4">
            {filteredRegions.length === 0 && (
              <p className="text-sm text-slate-500">No matches found.</p>
            )}

            {filteredRegions.map((region) => (
              <div key={region.code}>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{region.name}</p>
                <div className="space-y-1">
                  {region.provinces.map((province) => {
                    const isActive = province === value
                    return (
                      <button
                        type="button"
                        key={province}
                        onClick={() => handleSelect(province)}
                        className={`w-full text-left px-3 py-2 rounded-lg border-2 ${
                          isActive
                            ? 'border-resort-400 bg-resort-50 text-resort-700'
                            : 'border-transparent bg-slate-50/60 text-slate-700 hover:bg-resort-50/60 hover:border-resort-200'
                        } transition-colors text-sm font-medium`}
                      >
                        {province}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={clearSelection}
              className="text-sm font-semibold text-slate-500 hover:text-resort-600"
            >
              Clear selection
            </button>
            <button type="button" onClick={() => setIsOpen(false)} className="text-sm font-semibold text-resort-600">
              Close
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
