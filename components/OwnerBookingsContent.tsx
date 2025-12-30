'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import SkeletonTable from './SkeletonTable'
import ChatLink from './ChatLink'
import { DayPicker } from 'react-day-picker'
import DisclaimerBanner from './DisclaimerBanner'
import PaymentVerificationPanel from './PaymentVerificationPanel'
import { format } from 'date-fns'
import { FiCreditCard, FiX } from 'react-icons/fi'

type ManualBookingData = {
  resort_id: string
  date_from: string
  date_to: string
  guest_name: string
  guest_count: number
  notes: string
}

type Props = {
  loading: boolean
  toast: { message: string; type: 'success' | 'error' | '' }
  resortOptions: { id: string; name: string }[]
  selectedResortId: string
  setSelectedResortId: (id: string) => void
  bookedDatesForCalendar: Date[]
  dateToBookings: Map<string, any[]>
  hoverTooltip: { x: number, y: number, text: string } | null
  setHoverTooltip: (v: { x: number, y: number, text: string } | null) => void
  selectedDate: Date | null
  selectedDayBookings: any[]
  setSelectedDate: (d: Date | null) => void
  setSelectedDayBookings: (list: any[]) => void
  calendarRef: React.RefObject<HTMLDivElement | null>
  pendingBookings: any[]
  confirmedBookings: any[]
  rejectedBookings: any[]
  selectedBookings: Set<string>
  toggleSelect: (id: string) => void
  toggleSelectAll: (list: any[]) => void
  bulkDeleteBookings: () => void
  deleteBooking: (id: string) => void
  confirmBooking: (id: string) => void
  rejectBooking: (id: string) => void
  updateVerificationDetails: (id: string, details: { method?: string; reference?: string; notes?: string }) => void
  togglePaymentVerified: (id: string, verified: boolean) => void
  approveCancellation: (id: string) => void
  declineCancellation: (id: string) => void
  bulkApproveCancellations: () => void
  bulkDeclineCancellations: () => void
  cancelBooking: (id: string) => void
  // Manual booking props
  allResorts?: { id: string; name: string }[]
  onAddManualBooking?: (data: ManualBookingData) => Promise<void>
}

export default function OwnerBookingsContent(props: Props){
  const {
    loading, toast, resortOptions, selectedResortId, setSelectedResortId,
    bookedDatesForCalendar, dateToBookings, hoverTooltip, setHoverTooltip,
    selectedDate, selectedDayBookings, setSelectedDate, setSelectedDayBookings,
    calendarRef, pendingBookings, confirmedBookings, rejectedBookings,
    selectedBookings, toggleSelect, toggleSelectAll, bulkDeleteBookings,
    deleteBooking, confirmBooking, rejectBooking, updateVerificationDetails, togglePaymentVerified,
    approveCancellation, declineCancellation, bulkApproveCancellations, bulkDeclineCancellations, cancelBooking,
    allResorts, onAddManualBooking,
  } = props

  // Top-level owner nav tabs
  const [tab, setTab] = React.useState<'requests' | 'calendar' | 'confirmed' | 'cancellations' | 'history'>('requests')
  const [showOnlyVerified, setShowOnlyVerified] = React.useState(false)
  const [showOnlyCancellations, setShowOnlyCancellations] = React.useState(false)
  const [verificationEdits, setVerificationEdits] = React.useState<Record<string, { method: string; reference: string; notes: string }>>({})
  const [paymentModalBookingId, setPaymentModalBookingId] = React.useState<string | null>(null)
  
  // Manual booking modal state
  const [showManualBookingModal, setShowManualBookingModal] = React.useState(false)
  const [manualBookingForm, setManualBookingForm] = React.useState({
    resort_id: '',
    date_from: '',
    date_to: '',
    guest_name: '',
    guest_count: 1,
    notes: ''
  })
  const [manualBookingSubmitting, setManualBookingSubmitting] = React.useState(false)

  const setEdit = (id: string, field: 'method' | 'reference' | 'notes', value: string) => {
    setVerificationEdits(prev => ({
      ...prev,
      [id]: { method: prev[id]?.method || '', reference: prev[id]?.reference || '', notes: prev[id]?.notes || '', [field]: value }
    }))
  }

  // Handle manual booking form submission
  async function handleManualBookingSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!onAddManualBooking) return
    if (!manualBookingForm.resort_id || !manualBookingForm.date_from || !manualBookingForm.date_to) {
      return
    }
    setManualBookingSubmitting(true)
    try {
      await onAddManualBooking(manualBookingForm)
      setShowManualBookingModal(false)
      setManualBookingForm({
        resort_id: '',
        date_from: '',
        date_to: '',
        guest_name: '',
        guest_count: 1,
        notes: ''
      })
    } finally {
      setManualBookingSubmitting(false)
    }
  }

  const now = new Date()
  const upcomingConfirmed = confirmedBookings.filter(b => new Date(b.date_to) >= now)
  const pastConfirmed = confirmedBookings.filter(b => new Date(b.date_to) < now)

  const pendingToShow = showOnlyVerified ? pendingBookings.filter(b => !!b.payment_verified_at) : pendingBookings
  let upcomingToShow = showOnlyVerified ? upcomingConfirmed.filter(b => !!b.payment_verified_at) : upcomingConfirmed
  let pastToShow = showOnlyVerified ? pastConfirmed.filter(b => !!b.payment_verified_at) : pastConfirmed
  if (showOnlyCancellations) {
    upcomingToShow = upcomingToShow.filter(b => b.cancellation_status === 'requested')
    pastToShow = pastToShow.filter(b => b.cancellation_status === 'requested')
  }

  const pendingVerifiedCount = pendingBookings.filter(b => !!b.payment_verified_at).length
  const upcomingVerifiedCount = upcomingConfirmed.filter(b => !!b.payment_verified_at).length
  const pastVerifiedCount = pastConfirmed.filter(b => !!b.payment_verified_at).length

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 to-white px-3 sm:px-6 lg:px-8 py-6 sm:py-12">
      <div className="max-w-7xl mx-auto">
        <Link href="/owner/empire" className="text-sm text-resort-500 font-semibold mb-4 sm:mb-8 inline-flex items-center gap-2 hover:gap-3 transition-all">
          ← Back to Empire
        </Link>

        <div className="mb-4 sm:mb-6 fade-in-up">
          <div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold leading-normal pb-1 break-words bg-gradient-to-r from-resort-600 to-blue-600 bg-clip-text text-transparent">Bookings</h1>
            <p className="text-sm sm:text-lg text-slate-600 mt-1 sm:mt-2">Manage all booking requests for your resorts</p>
            <div className="mt-3">
              <DisclaimerBanner title="Owner Notice">
                Confirm only after verifying offline payment in chat (e.g., GCash/Bank). Coordinate details and ask for a receipt screenshot before confirming.
              </DisclaimerBanner>
            </div>
            {/* Owner Sub-Navbar - Scrollable on mobile */}
            <div className="mt-4 overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
              <div className="flex items-center gap-2 min-w-max pb-2 sm:pb-0 sm:flex-wrap">
              {([
                { key: 'requests', label: `Requests (${pendingBookings.length})` },
                { key: 'calendar', label: 'Calendar' },
                { key: 'confirmed', label: `Confirmed (${upcomingConfirmed.length})` },
                { key: 'cancellations', label: 'Cancellations' },
                { key: 'history', label: `History (${pastConfirmed.length + rejectedBookings.length})` },
              ] as const).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-shrink-0 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border-2 transition-all whitespace-nowrap ${tab === t.key ? 'bg-resort-600 text-white border-resort-500' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                  aria-pressed={tab === t.key}
                >
                  {t.label}
                </button>
              ))}
              </div>
            </div>
            {/* Filter checkboxes - below tabs on mobile */}
            <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-4">
              <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300"
                  checked={showOnlyVerified}
                  onChange={(e) => setShowOnlyVerified(e.target.checked)}
                />
                <span className="hidden sm:inline">Show only</span> Payment verified
              </label>
              <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300"
                  checked={showOnlyCancellations}
                  onChange={(e) => setShowOnlyCancellations(e.target.checked)}
                />
                <span className="hidden sm:inline">Show only</span> Cancellations
              </label>
            </div>
          </div>
          {/* Right-side stats removed for cleaner header */}
        </div>

        {toast.message && (
          <div className={`mb-6 px-6 py-4 rounded-2xl font-semibold border-2 ${
            toast.type === 'success' ? 'bg-green-50 text-green-700 border-green-300' : 'bg-red-50 text-red-700 border-red-300'
          }`}>
            {toast.type === 'success' ? '✅' : '❌'} {toast.message}
          </div>
        )}

        {loading ? (
          <div className="space-y-6">
            <SkeletonTable rows={3} />
          </div>
        ) : (
          <>
            {/* Global Bulk Actions */}
            <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border-2 border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4">
              <div className="text-sm text-slate-600">
                {selectedBookings.size > 0 ? (
                  <span><strong>{selectedBookings.size}</strong> selected</span>
                ) : (
                  <span>Select bookings to enable bulk actions</span>
                )}
              </div>
              <button
                onClick={bulkDeleteBookings}
                disabled={selectedBookings.size === 0}
                className={`px-4 py-2 rounded-xl font-semibold border-2 transition-all ${selectedBookings.size === 0 ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white border-red-500'}`}
              >
                Delete Selected
              </button>
            </div>
            {tab === 'calendar' && (
            <section className="mb-8 sm:mb-12 fade-in-up">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
                <div>
                  <h2 className="text-xl sm:text-3xl font-bold text-slate-900">Bookings Calendar</h2>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">View confirmed bookings or add existing reservations</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                  {allResorts && allResorts.length > 0 && onAddManualBooking ? (
                    <button
                      onClick={() => setShowManualBookingModal(true)}
                      className="px-3 sm:px-4 py-2 bg-gradient-to-r from-resort-500 to-blue-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all border-2 border-resort-400"
                    >
                      + Add Existing Booking
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Create a resort first to add bookings</span>
                  )}
                  <div className="flex items-center gap-2">
                    <label className="text-xs sm:text-sm text-slate-600">Resort:</label>
                    <select
                      value={selectedResortId}
                      onChange={(e) => setSelectedResortId(e.target.value)}
                      className="flex-1 px-3 py-2 border-2 border-slate-200 rounded-xl bg-white text-slate-900 text-sm appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-8 focus:outline-none focus:ring-2 focus:ring-resort-500/20 focus:border-resort-500 transition-all hover:border-slate-300"
                    >
                      <option value="all">All resorts</option>
                      {resortOptions.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Add Existing Booking Modal */}
              {showManualBookingModal && allResorts && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/40" onClick={() => setShowManualBookingModal(false)} />
                  <div className="relative bg-white rounded-2xl border-2 border-slate-200 shadow-xl w-[95%] max-w-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900">Add Existing Booking</h3>
                        <p className="text-slate-600 text-sm">Block dates for bookings made before using this platform</p>
                      </div>
                      <button
                        type="button"
                        className="px-3 py-2 rounded-lg border-2 border-slate-200 hover:bg-slate-50"
                        onClick={() => setShowManualBookingModal(false)}
                      >✖</button>
                    </div>
                    <form onSubmit={handleManualBookingSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Resort *</label>
                        <select
                          required
                          value={manualBookingForm.resort_id}
                          onChange={(e) => setManualBookingForm(prev => ({ ...prev, resort_id: e.target.value }))}
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-white text-sm appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10 focus:outline-none focus:ring-2 focus:ring-resort-500/20 focus:border-resort-500 transition-all hover:border-slate-300"
                        >
                          <option value="">Select a resort</option>
                          {allResorts.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Check-in Date *</label>
                          <input
                            type="date"
                            required
                            value={manualBookingForm.date_from}
                            onChange={(e) => setManualBookingForm(prev => ({ ...prev, date_from: e.target.value }))}
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Check-out Date *</label>
                          <input
                            type="date"
                            required
                            value={manualBookingForm.date_to}
                            min={manualBookingForm.date_from || undefined}
                            onChange={(e) => setManualBookingForm(prev => ({ ...prev, date_to: e.target.value }))}
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Guest Name (optional)</label>
                        <input
                          type="text"
                          placeholder="e.g., Juan dela Cruz"
                          value={manualBookingForm.guest_name}
                          onChange={(e) => setManualBookingForm(prev => ({ ...prev, guest_name: e.target.value }))}
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Number of Guests</label>
                        <input
                          type="number"
                          min="1"
                          value={manualBookingForm.guest_count}
                          onChange={(e) => setManualBookingForm(prev => ({ ...prev, guest_count: parseInt(e.target.value) || 1 }))}
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Notes (optional)</label>
                        <textarea
                          rows={2}
                          placeholder="Any additional details about this booking"
                          value={manualBookingForm.notes}
                          onChange={(e) => setManualBookingForm(prev => ({ ...prev, notes: e.target.value }))}
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl resize-none"
                        />
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                        💡 <strong>Note:</strong> This booking will be marked as confirmed and will block the selected dates on your calendar. Use this for reservations made outside this platform.
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowManualBookingModal(false)}
                          className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl font-semibold hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={manualBookingSubmitting || !manualBookingForm.resort_id || !manualBookingForm.date_from || !manualBookingForm.date_to}
                          className="flex-1 px-4 py-3 bg-gradient-to-r from-resort-500 to-blue-500 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {manualBookingSubmitting ? 'Adding...' : 'Add Booking'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className="bg-white border-2 border-slate-200 rounded-2xl p-4">
                <div ref={calendarRef} className="relative calendar-custom two-months">
                  <DayPicker
                    numberOfMonths={2}
                    mode="single"
                    modifiers={{ booked: bookedDatesForCalendar }}
                    modifiersClassNames={{ booked: 'day-booked' }}
                    onDayClick={(day, modifiers: any) => {
                      const key = day.toISOString().slice(0,10)
                      const bookingsForDay = dateToBookings.get(key) || []
                      if (!modifiers.booked || bookingsForDay.length === 0) return
                      setSelectedDate(day)
                      setSelectedDayBookings(bookingsForDay)
                    }}
                    onDayMouseEnter={(day: Date, modifiers: any, e: any) => {
                      const key = day.toISOString().slice(0,10)
                      const bookingsForDay = dateToBookings.get(key) || []
                      if (!modifiers.booked || bookingsForDay.length === 0) {
                        setHoverTooltip(null)
                        return
                      }
                      const summary = bookingsForDay.slice(0,3).map((b: any) => `${b.resort?.name || 'Resort'} — ${b.guest?.full_name || 'Guest'} (${b.date_from} → ${b.date_to})`).join('\n')
                      const rect = calendarRef.current?.getBoundingClientRect()
                      const x = rect ? e.clientX - rect.left + 12 : 0
                      const y = rect ? e.clientY - rect.top + 12 : 0
                      setHoverTooltip({ x, y, text: summary })
                    }}
                    onDayMouseLeave={() => setHoverTooltip(null)}
                  />
                  {hoverTooltip && (
                    <div
                      className="absolute z-50 pointer-events-none bg-slate-900 text-white text-xs rounded-md px-2 py-1 shadow"
                      style={{ left: hoverTooltip.x, top: hoverTooltip.y, whiteSpace: 'pre-line' }}
                    >
                      {hoverTooltip.text}
                    </div>
                  )}
                </div>
                <p className="text-sm text-slate-600 mt-2">Upcoming red-marked dates are already booked.</p>
                {selectedDate && selectedDayBookings.length > 0 && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={() => { setSelectedDate(null); setSelectedDayBookings([]) }} />
                    <div className="relative bg-white rounded-2xl border-2 border-slate-200 shadow-xl w-[95%] max-w-2xl p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-2xl font-bold text-slate-900">Bookings on {selectedDate.toLocaleDateString()}</h3>
                          <p className="text-slate-600">Click a booking to open chat</p>
                        </div>
                        <button
                          className="px-3 py-2 rounded-lg border-2 border-slate-200 hover:bg-slate-50"
                          onClick={() => { setSelectedDate(null); setSelectedDayBookings([]) }}
                        >✖ Close</button>
                      </div>
                      <div className="space-y-4">
                        {selectedDayBookings.map((b: any) => (
                          <div key={b.id} className="border-2 border-slate-200 rounded-xl p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-sm text-slate-600">Resort</p>
                                <p className="text-lg font-bold text-slate-900">{b.resort?.name}</p>
                                <p className="text-sm text-slate-600 mt-1">👤 {b.guest?.full_name} — 📧 {b.guest?.email}</p>
                                <p className="text-sm text-slate-700 mt-1">📅 {b.date_from} → {b.date_to}</p>
                                <p className="text-sm text-slate-700 mt-1">👥 {b.guest_count} {b.guest_count === 1 ? 'guest' : 'guests'}{typeof b.children_count === 'number' && b.children_count > 0 ? ` · 👶 ${b.children_count}` : ''}{typeof b.pets_count === 'number' && b.pets_count > 0 ? ` · 🐾 ${b.pets_count}` : ''}</p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                  <span className={"text-xs px-2 py-1 rounded-lg border-2 " + (b.status === 'confirmed' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-yellow-100 text-yellow-800 border-yellow-300')}>{b.status}</span>
                                  {b.cancellation_status === 'requested' && (
                                    <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-lg border border-yellow-200">⚠ Cancellation requested</span>
                                  )}
                                <ChatLink bookingId={b.id} as="owner" label="Open Chat" title={b.guest?.full_name || b.guest?.email || 'Guest'} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
            )}

            {tab === 'requests' && (
            <section className="mb-8 sm:mb-12 fade-in-up">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl sm:text-3xl font-bold text-slate-900">Pending Requests ({pendingToShow.length})</h2>
                  {pendingBookings.length > 0 && (
                    <label className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pendingBookings.every(b => selectedBookings.has(b.id))}
                        onChange={() => toggleSelectAll(pendingBookings)}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                      Select All
                    </label>
                  )}
                </div>
              </div>

              {pendingToShow.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-6 sm:p-8 text-center">
                  <p className="text-base sm:text-lg font-bold text-slate-900 mb-2">No pending requests</p>
                  <p className="text-sm text-slate-600">Your pending booking queue is empty</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                  {pendingToShow.map(booking => (
                    <div key={booking.id} className={`bg-white border-2 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-lg transition-all ${booking.payment_verified_at ? 'border-emerald-300' : 'border-yellow-300'}`}>
                      <div className="flex items-start gap-2 sm:gap-3 mb-4">
                        <input
                          type="checkbox"
                          checked={selectedBookings.has(booking.id)}
                          onChange={() => toggleSelect(booking.id)}
                          className="w-5 h-5 mt-1 rounded border-slate-300 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap justify-between items-start gap-2 mb-4">
                            <div className="min-w-0">
                              <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">{booking.resort?.name}</h3>
                              <p className="text-xs sm:text-sm text-slate-600 mt-1">👤 {booking.guest?.full_name}</p>
                              <p className="text-xs sm:text-sm text-slate-600 break-all">📧 {booking.guest?.email}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="text-[10px] sm:text-xs bg-yellow-100 text-yellow-800 px-2 sm:px-3 py-1 rounded-lg font-bold border-2 border-yellow-300">⏳ Pending</span>
                              {booking.payment_verified_at && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-lg border border-emerald-200">✔ Verified</span>
                              )}
                            </div>
                          </div>

                          <div className="bg-yellow-50 rounded-xl p-3 sm:p-4 mb-4 border border-yellow-100">
                            <p className="text-xs sm:text-sm text-slate-700 mb-2">
                              📅 <span className="font-bold">{booking.date_from}</span> → <span className="font-bold">{booking.date_to}</span>
                            </p>
                            <p className="text-sm text-slate-700">
                              👥 <span className="font-bold">{booking.guest_count} {booking.guest_count === 1 ? 'guest' : 'guests'}</span>
                              {typeof booking.children_count === 'number' && (
                                <span className="ml-2 text-slate-700">👶 {booking.children_count}</span>
                              )}
                              {typeof booking.pets_count === 'number' && (
                                <span className="ml-2 text-slate-700">🐾 {booking.pets_count}</span>
                              )}
                            </p>
                            <p className="text-sm text-slate-600 mt-2 italic">
                              Requested: {new Date(booking.created_at).toLocaleDateString()}
                            </p>
                          </div>

                          <div className="flex gap-3 items-center">
                            <button
                              onClick={() => confirmBooking(booking.id)}
                              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all border-2 border-green-400"
                            >
                              ✅ Confirm
                            </button>
                            <button
                              onClick={() => rejectBooking(booking.id)}
                              className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all border-2 border-red-400"
                            >
                              ❌ Reject
                            </button>
                            <button
                              onClick={() => deleteBooking(booking.id)}
                              className="px-4 py-3 bg-slate-100 text-slate-900 rounded-xl font-semibold hover:bg-slate-200 transition-all border-2 border-slate-300"
                              title="Delete pending request"
                            >
                              Delete
                            </button>
                            <ChatLink bookingId={booking.id} as="owner" label="Open Chat" title={booking.guest?.full_name || booking.guest?.email || 'Guest'} />
                          </div>
                          <p className="text-xs text-slate-500 mt-2">Coordinate payment in chat; confirm only after verifying proof.</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                              <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-slate-300"
                                checked={!!booking.payment_verified_at}
                                onChange={(e) => togglePaymentVerified(booking.id, e.target.checked)}
                              />
                              Mark payment verified
                              {booking.payment_verified_at && (
                                <span className="ml-1 text-[10px] text-slate-500">({new Date(booking.payment_verified_at).toLocaleDateString()})</span>
                              )}
                            </label>
                            <button
                              onClick={() => setPaymentModalBookingId(booking.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-cyan-700 bg-cyan-50 border border-cyan-200 rounded-lg hover:bg-cyan-100 transition-colors"
                            >
                              <FiCreditCard className="w-3 h-3" />
                              View Submissions
                            </button>
                          </div>
                          <details className="mt-3">
                            <summary className="text-xs text-slate-700 cursor-pointer select-none">Verification details</summary>
                            <div className="mt-2 grid sm:grid-cols-3 gap-2">
                            <select
                              className="px-2 py-2 rounded-lg border border-slate-300 text-xs appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem] bg-[right_0.5rem_center] bg-no-repeat pr-7 bg-white focus:outline-none focus:ring-2 focus:ring-resort-500/20 focus:border-resort-500 transition-all hover:border-slate-400"
                              value={verificationEdits[booking.id]?.method ?? booking.payment_method ?? ''}
                              onChange={(e) => setEdit(booking.id, 'method', e.target.value)}
                            >
                              <option value="">Method</option>
                              <option value="GCash">GCash</option>
                              <option value="Bank Transfer">Bank Transfer</option>
                              <option value="Other">Other</option>
                            </select>
                            <input
                              type="text"
                              className="px-2 py-2 rounded-lg border border-slate-300 text-xs"
                              placeholder="Reference #"
                              value={verificationEdits[booking.id]?.reference ?? booking.payment_reference ?? ''}
                              onChange={(e) => setEdit(booking.id, 'reference', e.target.value)}
                            />
                            <input
                              type="text"
                              className="px-2 py-2 rounded-lg border border-slate-300 text-xs"
                              placeholder="Notes"
                              value={verificationEdits[booking.id]?.notes ?? booking.verified_notes ?? ''}
                              onChange={(e) => setEdit(booking.id, 'notes', e.target.value)}
                            />
                            <div className="sm:col-span-3 flex justify-end">
                              <button
                                className="text-xs px-3 py-2 rounded-lg border-2 border-slate-300 bg-white hover:bg-slate-50"
                                onClick={() => updateVerificationDetails(booking.id, {
                                  method: verificationEdits[booking.id]?.method ?? booking.payment_method ?? undefined,
                                  reference: verificationEdits[booking.id]?.reference ?? booking.payment_reference ?? undefined,
                                  notes: verificationEdits[booking.id]?.notes ?? booking.verified_notes ?? undefined,
                                })}
                              >
                                Save verification details
                              </button>
                            </div>
                            </div>
                          </details>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
            )}

            {tab === 'confirmed' && (
            <section className="mb-8 sm:mb-12 fade-in-up">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-3xl font-bold text-slate-900">Confirmed Bookings ({upcomingToShow.length})</h2>
              </div>

              {upcomingToShow.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center">
                  <p className="text-base sm:text-lg font-bold text-slate-900 mb-2">No upcoming confirmed bookings</p>
                  <p className="text-sm text-slate-600">Future confirmed stays will appear here</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                  {upcomingToShow.map(booking => (
                    <div key={booking.id} className={`bg-gradient-to-br from-green-50 to-emerald-50 border-2 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-lg transition-all ${booking.payment_verified_at ? 'border-emerald-400' : 'border-green-300'}`}>
                      <div className="flex flex-wrap justify-between items-start gap-2 mb-4">
                        <div className="min-w-0">
                          <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">{booking.resort?.name}</h3>
                          <p className="text-xs sm:text-sm text-slate-600 mt-1">👤 {booking.guest?.full_name}</p>
                          <p className="text-xs sm:text-sm text-slate-600 break-all">📧 {booking.guest?.email}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-[10px] sm:text-xs bg-green-100 text-green-800 px-2 sm:px-3 py-1 rounded-lg font-bold border-2 border-green-300">✅ Confirmed</span>
                          {booking.payment_verified_at && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-lg border border-emerald-200">✔ Verified</span>
                          )}
                          {booking.cancellation_status === 'requested' && (
                            <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-lg border border-yellow-200">⚠ Cancellation requested</span>
                          )}
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-3 sm:p-4 border border-green-100">
                        <p className="text-xs sm:text-sm text-slate-700 mb-2">
                          📅 <span className="font-bold">{booking.date_from}</span> → <span className="font-bold">{booking.date_to}</span>
                        </p>
                        <p className="text-xs sm:text-sm text-slate-700">
                          👥 <span className="font-bold">{booking.guest_count} {booking.guest_count === 1 ? 'guest' : 'guests'}</span>
                          {typeof booking.children_count === 'number' && (
                            <span className="ml-2">👶 {booking.children_count}</span>
                          )}
                          {typeof booking.pets_count === 'number' && (
                            <span className="ml-2">🐾 {booking.pets_count}</span>
                          )}
                        </p>
                        {booking.cancellation_status === 'requested' && (
                          <p className="text-xs sm:text-sm text-yellow-700 mt-2">Guest requested cancellation{booking.cancellation_reason ? ` — ${booking.cancellation_reason}` : ''}.</p>
                        )}
                        <p className="text-xs text-slate-600 mt-2 italic">
                          ✓ Confirmed: {new Date(booking.created_at).toLocaleDateString()}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <ChatLink bookingId={booking.id} as="owner" label="Open Chat" title={booking.guest?.full_name || booking.guest?.email || 'Guest'} />
                          <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-slate-300"
                              checked={!!booking.payment_verified_at}
                              onChange={(e) => togglePaymentVerified(booking.id, e.target.checked)}
                            />
                            Payment verified
                            {booking.payment_verified_at && (
                              <span className="ml-1 text-[10px] text-slate-500">({new Date(booking.payment_verified_at).toLocaleDateString()})</span>
                            )}
                          </label>
                        </div>
                        {booking.cancellation_status === 'requested' && (
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              onClick={() => approveCancellation(booking.id)}
                              className="px-3 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg border-2 border-red-500"
                            >Approve Cancellation</button>
                            <button
                              onClick={() => declineCancellation(booking.id)}
                              className="px-3 py-2 text-xs font-semibold bg-slate-100 text-slate-900 rounded-lg border-2 border-slate-300 hover:bg-slate-200"
                            >Decline</button>
                          </div>
                        )}
                        {booking.status === 'confirmed' && booking.cancellation_status !== 'requested' && (
                          <div className="mt-3">
                            <button
                              onClick={() => cancelBooking(booking.id)}
                              className="px-3 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg border-2 border-red-500"
                            >Cancel Booking</button>
                          </div>
                        )}
                        {booking.cancellation_status === 'requested' && (
                          <p className="mt-2 text-[10px] text-slate-600">Approve only after reviewing payment/refund conditions coordinated in chat.</p>
                        )}
                        <details className="mt-3">
                          <summary className="text-xs text-slate-700 cursor-pointer select-none">Verification details</summary>
                          <div className="mt-2 grid sm:grid-cols-3 gap-2">
                          <select
                            className="px-2 py-2 rounded-lg border border-slate-300 text-xs appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem] bg-[right_0.5rem_center] bg-no-repeat pr-7 bg-white focus:outline-none focus:ring-2 focus:ring-resort-500/20 focus:border-resort-500 transition-all hover:border-slate-400"
                            value={verificationEdits[booking.id]?.method ?? booking.payment_method ?? ''}
                            onChange={(e) => setEdit(booking.id, 'method', e.target.value)}
                          >
                            <option value="">Method</option>
                            <option value="GCash">GCash</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Other">Other</option>
                          </select>
                          <input
                            type="text"
                            className="px-2 py-2 rounded-lg border border-slate-300 text-xs"
                            placeholder="Reference #"
                            value={verificationEdits[booking.id]?.reference ?? booking.payment_reference ?? ''}
                            onChange={(e) => setEdit(booking.id, 'reference', e.target.value)}
                          />
                          <input
                            type="text"
                            className="px-2 py-2 rounded-lg border border-slate-300 text-xs"
                            placeholder="Notes"
                            value={verificationEdits[booking.id]?.notes ?? booking.verified_notes ?? ''}
                            onChange={(e) => setEdit(booking.id, 'notes', e.target.value)}
                          />
                          <div className="sm:col-span-3 flex justify-end">
                            <button
                              className="text-xs px-3 py-2 rounded-lg border-2 border-slate-300 bg-white hover:bg-slate-50"
                              onClick={() => updateVerificationDetails(booking.id, {
                                method: verificationEdits[booking.id]?.method ?? booking.payment_method ?? undefined,
                                reference: verificationEdits[booking.id]?.reference ?? booking.payment_reference ?? undefined,
                                notes: verificationEdits[booking.id]?.notes ?? booking.verified_notes ?? undefined,
                              })}
                            >
                              Save verification details
                            </button>
                          </div>
                          </div>
                        </details>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
            )}

            {/* Cancellations Tab */}
            {tab === 'cancellations' && (
            <section className="mb-8 sm:mb-12 fade-in-up">
              {(() => {
                const isRequested = (b: any) => (b.cancellation_status === 'requested') || (!!b.cancellation_requested_at) || (!!b.cancellation_reason && b.cancellation_reason.length > 0)
                const cancellationList = [...upcomingConfirmed, ...pastConfirmed].filter(isRequested)
                return (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl sm:text-3xl font-bold text-slate-900">Cancellation Requests ({cancellationList.length})</h2>
                        {cancellationList.length > 0 && (
                          <label className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={cancellationList.every(b => selectedBookings.has(b.id))}
                              onChange={() => toggleSelectAll(cancellationList)}
                              className="w-4 h-4 rounded border-slate-300"
                            />
                            Select All
                          </label>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={bulkApproveCancellations}
                          disabled={[...selectedBookings].filter(id => cancellationList.some(b => b.id === id)).length === 0}
                          className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border-2 transition-all ${[...selectedBookings].filter(id => cancellationList.some(b => b.id === id)).length === 0 ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white border-red-500'}`}
                        >Approve Selected</button>
                        <button
                          onClick={bulkDeclineCancellations}
                          disabled={[...selectedBookings].filter(id => cancellationList.some(b => b.id === id)).length === 0}
                          className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border-2 transition-all ${[...selectedBookings].filter(id => cancellationList.some(b => b.id === id)).length === 0 ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-slate-100 text-slate-900 border-slate-300 hover:bg-slate-200'}`}
                        >Decline Selected</button>
                      </div>
                    </div>

                    {cancellationList.length === 0 ? (
                      <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center">
                        <p className="text-base sm:text-lg font-bold text-slate-900 mb-2">No cancellation requests</p>
                        <p className="text-sm text-slate-600">Guests' cancellation requests will appear here</p>
                      </div>
                    ) : (
                      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                        {cancellationList.map(booking => (
                          <div key={booking.id} className="bg-white border-2 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
                            <div className="flex items-start gap-2 sm:gap-3 mb-4">
                              <input
                                type="checkbox"
                                checked={selectedBookings.has(booking.id)}
                                onChange={() => toggleSelect(booking.id)}
                                className="w-5 h-5 mt-1 rounded border-slate-300 cursor-pointer"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                                  <div className="min-w-0">
                                    <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">{booking.resort?.name}</h3>
                                    <p className="text-xs sm:text-sm text-slate-600">👤 {booking.guest?.full_name}</p>
                                    <p className="text-xs sm:text-sm text-slate-600 break-all">📧 {booking.guest?.email}</p>
                                  </div>
                                  <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-lg border border-yellow-200">⚠ Cancellation requested</span>
                                </div>
                                <p className="text-xs sm:text-sm text-slate-700 mb-2">📅 {booking.date_from} → {booking.date_to}</p>
                                {booking.cancellation_reason && (
                                  <p className="text-xs sm:text-sm text-slate-700">Reason: {booking.cancellation_reason}</p>
                                )}
                                <div className="mt-3 flex flex-wrap items-center gap-2 justify-end">
                                  <button
                                    onClick={() => approveCancellation(booking.id)}
                                    className="px-3 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg border-2 border-red-500"
                                  >Approve</button>
                                  <button
                                    onClick={() => declineCancellation(booking.id)}
                                    className="px-3 py-2 text-xs font-semibold bg-slate-100 text-slate-900 rounded-lg border-2 border-slate-300 hover:bg-slate-200"
                                  >Decline</button>
                                  <ChatLink bookingId={booking.id} as="owner" label="Open Chat" title={booking.guest?.full_name || booking.guest?.email || 'Guest'} />
                                </div>
                                <p className="mt-2 text-[10px] text-slate-600">If payment was collected, follow your refund policy and coordinate details in chat before approving.</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )
              })()}
            </section>
            )}

            {tab === 'history' && rejectedBookings.length > 0 && (
              <section className="fade-in-up">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-6">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl sm:text-3xl font-bold text-slate-900">Rejected Bookings ({rejectedBookings.length})</h2>
                    <label className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rejectedBookings.every(b => selectedBookings.has(b.id))}
                        onChange={() => toggleSelectAll(rejectedBookings)}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                      Select All
                    </label>
                  </div>
                </div>

                <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                  {rejectedBookings.map(booking => (
                    <div key={booking.id} className="bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
                      <div className="flex items-start gap-2 sm:gap-3 mb-4">
                        <input
                          type="checkbox"
                          checked={selectedBookings.has(booking.id)}
                          onChange={() => toggleSelect(booking.id)}
                          className="w-5 h-5 mt-1 rounded border-slate-300 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap justify-between items-start gap-2 mb-4">
                            <div className="min-w-0">
                              <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">{booking.resort?.name}</h3>
                              <p className="text-xs sm:text-sm text-slate-600 mt-1">{booking.guest?.full_name}</p>
                            </div>
                            <span className="text-[10px] sm:text-xs bg-red-100 text-red-800 px-2 sm:px-3 py-1 rounded-lg font-bold border-2 border-red-200">Rejected</span>
                          </div>

                          <p className="text-sm text-slate-700 mb-4">
                            {booking.date_from} → {booking.date_to}
                          </p>
                          <div className="flex justify-end">
                            <button
                              onClick={() => deleteBooking(booking.id)}
                              className="px-3 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg border-2 border-red-500"
                            >Delete</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Past Bookings (completed stays) */}
            {tab === 'history' && pastToShow.length > 0 && (
              <section className="fade-in-up mt-8 sm:mt-12">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-6">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl sm:text-3xl font-bold text-slate-900">Past Bookings ({pastToShow.length})</h2>
                    <label className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pastToShow.every(b => selectedBookings.has(b.id))}
                        onChange={() => toggleSelectAll(pastToShow)}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                      Select All
                    </label>
                  </div>
                  <div className="text-xs text-slate-600">Use bulk delete at top to remove selected</div>
                </div>
                <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                  {pastToShow.map(booking => (
                    <div key={booking.id} className={`bg-gradient-to-br from-slate-50 to-slate-100 border-2 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm ${booking.payment_verified_at ? 'border-emerald-300' : 'border-slate-200'}`}>
                      <div className="flex flex-wrap justify-between items-start gap-2 mb-4">
                        <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedBookings.has(booking.id)}
                            onChange={() => toggleSelect(booking.id)}
                            className="w-5 h-5 mt-1 rounded border-slate-300 cursor-pointer flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">{booking.resort?.name}</h3>
                            <p className="text-xs sm:text-sm text-slate-600 mt-1">👤 {booking.guest?.full_name}</p>
                            <p className="text-xs sm:text-sm text-slate-600 break-all">📧 {booking.guest?.email}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-[10px] sm:text-xs bg-slate-200 text-slate-800 px-2 sm:px-3 py-1 rounded-lg font-bold border-2 border-slate-300">Completed</span>
                          {booking.payment_verified_at && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-lg border border-emerald-200">✔ Verified</span>
                          )}
                        </div>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-slate-200">
                        <p className="text-sm text-slate-700 mb-2">📅 <span className="font-bold">{booking.date_from}</span> → <span className="font-bold">{booking.date_to}</span></p>
                        <p className="text-sm text-slate-700">👥 <span className="font-bold">{booking.guest_count} {booking.guest_count === 1 ? 'guest' : 'guests'}</span>{typeof booking.children_count === 'number' && booking.children_count > 0 ? ` · 👶 ${booking.children_count}` : ''}{typeof booking.pets_count === 'number' && booking.pets_count > 0 ? ` · 🐾 ${booking.pets_count}` : ''}</p>
                        <div className="mt-3 flex justify-end">
                          <ChatLink bookingId={booking.id} as="owner" label="Open Chat" title={booking.guest?.full_name || booking.guest?.email || 'Guest'} />
                        </div>
                        {booking.cancellation_status === 'requested' && (
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              onClick={() => approveCancellation(booking.id)}
                              className="px-3 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg border-2 border-red-500"
                            >Approve Cancellation</button>
                            <button
                              onClick={() => declineCancellation(booking.id)}
                              className="px-3 py-2 text-xs font-semibold bg-slate-100 text-slate-900 rounded-lg border-2 border-slate-300 hover:bg-slate-200"
                            >Decline</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Payment Submissions Modal */}
      {paymentModalBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-lg max-h-[80vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-white border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <FiCreditCard className="w-5 h-5 text-cyan-600" />
                Payment Submissions
              </h2>
              <button
                onClick={() => setPaymentModalBookingId(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <PaymentVerificationPanel 
                bookingId={paymentModalBookingId} 
                isOwner={true} 
                onVerify={() => {
                  // Optionally refresh bookings after verification
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
