'use client'

import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'

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
  const [cities, setCities] = useState<string[]>([])
  const [regionsPsgc, setRegionsPsgc] = useState<Array<{ regCode: string; regDesc: string }>>([])
  const [provincesPsgc, setProvincesPsgc] = useState<Array<{ provCode: string; provDesc: string; regCode: string }>>([])
  const [citiesPsgc, setCitiesPsgc] = useState<Array<{ name: string; provCode: string }>>([])
  const [selectedRegion, setSelectedRegion] = useState<string>('')
  const [selectedProvince, setSelectedProvince] = useState<string>('')
  const containerRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 })

  const updateDropdownPosition = () => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    // Use viewport coords for fixed-position dropdown
    const top = rect.bottom
    const left = rect.left
    const width = rect.width
    setDropdownPos({ top, left, width })
  }

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

  // Load official PSGC cities once from public JSON (refcitymun)
  useEffect(() => {
    let cancelled = false
    async function loadCities() {
      try {
        const res = await fetch('/assets/refcitymun.json')
        if (!res.ok) return
        const data = await res.json()
        const records: any[] = Array.isArray(data?.RECORDS) ? data.RECORDS : []
        const cleaned = records
          .map((r) => String(r.citymunDesc || ''))
          .filter(Boolean)
          .map((s) => s.replace(/^CITY OF\s+/i, '').replace(/\(Capital\)/i, '').trim())
          .map((s) => s.toLowerCase().split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
        // Deduplicate and sort
        const uniq = Array.from(new Set(cleaned)).sort((a, b) => a.localeCompare(b))
        if (!cancelled) setCities(uniq)

        // Keep city->province mapping for cascade
        const mapping = records.map((r) => ({
          name: String(r.citymunDesc || '')
            .replace(/^CITY OF\s+/i, '')
            .replace(/\(Capital\)/i, '')
            .trim()
            .toLowerCase()
            .split(/\s+/)
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' '),
          provCode: String(r.provCode || ''),
        }))
        if (!cancelled) setCitiesPsgc(mapping)
      } catch {}
    }
    loadCities()
    return () => { cancelled = true }
  }, [])

  // Load regions and provinces for cascade
  useEffect(() => {
    let cancelled = false
    async function loadRegionsProvinces() {
      try {
        const [regRes, provRes] = await Promise.all([
          fetch('/assets/refregion.json'),
          fetch('/assets/refprovince.json'),
        ])
        if (!regRes.ok || !provRes.ok) return
        const regJson = await regRes.json()
        const provJson = await provRes.json()
        const regions = (Array.isArray(regJson?.RECORDS) ? regJson.RECORDS : []).map((r: any) => ({
          regCode: String(r.regCode || ''),
          regDesc: String(r.regDesc || ''),
        }))
        const provinces = (Array.isArray(provJson?.RECORDS) ? provJson.RECORDS : []).map((p: any) => ({
          provCode: String(p.provCode || ''),
          provDesc: String(p.provDesc || ''),
          regCode: String(p.regCode || ''),
        }))
        if (!cancelled) {
          setRegionsPsgc(regions)
          setProvincesPsgc(provinces)
          if (!selectedRegion && regions.length) setSelectedRegion(regions[0].regCode)
        }
      } catch {}
    }
    loadRegionsProvinces()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!isOpen) return

    function handleClick(event: MouseEvent) {
      const targetNode = event.target as Node
      const insideContainer = containerRef.current?.contains(targetNode)
      const insideDropdown = dropdownRef.current?.contains(targetNode)
      if (!insideContainer && !insideDropdown) {
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

  useLayoutEffect(() => {
    if (!isOpen) return
    updateDropdownPosition()
    const onScrollOrResize = () => updateDropdownPosition()
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
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

  const filteredCities = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase()
    if (!normalized) return cities
    const strip = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    return cities.filter((c) => strip(c).includes(strip(normalized)))
  }, [cities, searchTerm])

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
    ? 'w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-left focus:outline-none focus:ring-2 focus:ring-resort-400 transition text-sm'
    : 'w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-left focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm hover:border-slate-300 transition-colors bg-white'
  const dropdownClasses = hero
    ? 'fixed z-[1000] min-w-[360px] sm:min-w-[420px] bg-white border border-slate-100 rounded-2xl shadow-[0_25px_65px_rgba(15,23,42,0.15)]'
    : 'fixed z-[1000] bg-white border-2 border-slate-200 rounded-2xl shadow-xl'
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
          <div className="flex items-center gap-2 min-w-0">
            {hero && (
              <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
            )}
            <span className={`${value ? 'text-slate-900 font-medium' : 'text-slate-400'} ${hero ? 'truncate' : ''}`}>{value || placeholder}</span>
          </div>
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

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className={dropdownClasses}
          style={{
            top: dropdownPos.top + 8,
            left: dropdownPos.left,
            width: hero ? Math.max(380, dropdownPos.width) : dropdownPos.width,
            maxHeight: Math.max(320, (typeof window !== 'undefined' ? window.innerHeight : 800) - (dropdownPos.top + 24)),
            overflowY: 'auto',
          }}
        >
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

          {/* Cascade: Region → Province → City */}
          {(regionsPsgc.length > 0 && provincesPsgc.length > 0) && (
            <div className="px-3 py-3 border-b border-slate-100 bg-slate-50/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <select
                  value={selectedRegion}
                  onChange={(e) => { setSelectedRegion(e.target.value); setSelectedProvince('') }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  {regionsPsgc.map((r) => (
                    <option key={r.regCode} value={r.regCode}>{r.regDesc}</option>
                  ))}
                </select>

                <select
                  value={selectedProvince}
                  onChange={(e) => setSelectedProvince(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="">Select province</option>
                  {provincesPsgc
                    .filter((p) => p.regCode === selectedRegion)
                    .sort((a, b) => a.provDesc.localeCompare(b.provDesc))
                    .map((p) => (
                      <option key={p.provCode} value={p.provCode}>{p.provDesc}</option>
                    ))}
                </select>

                <select
                  value=""
                  onChange={(e) => { const cityName = e.target.value; if (cityName) handleSelect(cityName) }}
                  disabled={!selectedProvince}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">Select city</option>
                  {citiesPsgc
                    .filter((c) => c.provCode === selectedProvince)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((c) => (
                      <option key={c.name + c.provCode} value={c.name}>{c.name}</option>
                    ))}
                </select>
              </div>
              {/* Use province directly */}
              {selectedProvince && (
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      const prov = provincesPsgc.find((p) => p.provCode === selectedProvince)
                      if (prov) handleSelect(prov.provDesc)
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 text-slate-700 hover:border-resort-400 hover:text-resort-700 bg-white"
                  >
                    Use province
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="max-h-80 overflow-y-auto p-3 space-y-4">
            {filteredCities && filteredCities.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Cities</p>
                <div className="space-y-1">
                  {filteredCities.slice(0, 300).map((city) => {
                    const isActive = city === value
                    return (
                      <button
                        type="button"
                        key={city}
                        onClick={() => handleSelect(city)}
                        className={`w-full text-left px-3 py-2 rounded-lg border-2 ${
                          isActive
                            ? 'border-resort-400 bg-resort-50 text-resort-700'
                            : 'border-transparent bg-slate-50/60 text-slate-700 hover:bg-resort-50/60 hover:border-resort-200'
                        } transition-colors text-sm font-medium`}
                      >
                        {city}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
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
        </div>,
        document.body
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
