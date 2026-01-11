"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import ChatLink from '../../../../components/ChatLink'
import DisclaimerBanner from '../../../../components/DisclaimerBanner'
import { toast } from 'sonner'

export default function GuestTripDetailsPage(){
  const router = useRouter()
  const params = useParams()
  const bookingId = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string)
  const [booking, setBooking] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [requestingCancel, setRequestingCancel] = useState(false)

  useEffect(() => {
    async function load(){
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push('/auth/signin'); return }
      if (!bookingId) { router.push('/guest/trips'); return }
      // Fetch single booking with resort info and verification fields
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, resort_id, guest_id, date_from, date_to, guest_count, status, created_at,
          cancellation_status, cancellation_requested_at, cancellation_reason,
          payment_verified_at, payment_method, payment_reference, verified_by, verified_notes,
          resorts:resorts(id, slug, name, location, price, images, owner_id)
        `)
        .eq('id', bookingId)
        .eq('guest_id', session.user.id)
        .single()
      if (error) {
        console.error('Booking fetch error:', error)
        router.push('/guest/trips')
        return
      }
      setBooking(data)
      setLoading(false)
    }
    load()
  }, [router, bookingId])

  if (loading) return <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center text-slate-600">Loading…</div>
  if (!booking) return <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center text-slate-600">Booking not found.</div>

  const statusBadge = () => {
    const s = booking.status
    if (s === 'confirmed') return 'bg-green-100 text-green-800'
    if (s === 'pending') return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-10 max-w-3xl mx-auto">
      <Link href="/guest/trips" className="text-sm text-resort-500 font-semibold mb-4 inline-block">← Back to Trips</Link>
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-resort-900">{booking.resorts?.name || 'Resort'}</h1>
            <p className="text-sm text-slate-600">{booking.resorts?.location || '—'}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded font-semibold ${statusBadge()}`}>{booking.status}</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
            <div className="text-sm text-slate-700">Dates</div>
            <div className="font-semibold text-slate-900">{booking.date_from} → {booking.date_to}</div>
            <div className="mt-2 text-sm text-slate-700">Guests: <span className="font-semibold">{booking.guest_count}</span></div>
          </div>
          <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
            <div className="text-sm text-slate-700">Payment Verification</div>
            {booking.payment_verified_at ? (
              <div className="space-y-1 text-sm">
                <div className="font-semibold text-emerald-700">✔ Verified on {new Date(booking.payment_verified_at).toLocaleDateString()}</div>
                {booking.payment_method && (<div className="text-slate-700">Method: {booking.payment_method}</div>)}
                {booking.payment_reference && (<div className="text-slate-700">Reference: {booking.payment_reference}</div>)}
                {booking.verified_notes && (<div className="text-slate-700">Notes: {booking.verified_notes}</div>)}
              </div>
            ) : (
              <div className="text-sm text-slate-700">Not marked verified. Coordinate with the host in chat.</div>
            )}
          </div>
        </div>
        <div className="mt-4 p-4 border border-slate-200 rounded-xl bg-slate-50">
          <div className="text-sm text-slate-700">Cancellation</div>
          {booking.status !== 'confirmed' ? (
            <div className="text-sm text-slate-700">Only confirmed bookings support cancellation requests.</div>
          ) : booking.cancellation_status === 'requested' ? (
            <div className="text-sm text-yellow-700">Cancellation requested{booking.cancellation_reason ? ` — ${booking.cancellation_reason}` : ''}.</div>
          ) : (
            <div className="text-sm text-slate-700">No cancellation requested.</div>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Cancellation action replaces 'Ask Resort' */}
            {booking.status === 'pending' ? (
              <button
                onClick={async () => {
                  if (!confirm('Cancel this booking request?')) return
                  try {
                    setCancelling(true)
                    const { error } = await supabase
                      .from('bookings')
                      .update({ status: 'rejected' })
                      .eq('id', booking.id)
                      .eq('status', 'pending')
                    setCancelling(false)
                    if (error) {
                      toast.error(`Failed to cancel: ${error.message}`)
                    } else {
                      setBooking({ ...booking, status: 'rejected' })
                      toast.success('Booking request cancelled')
                    }
                  } catch (err: any) {
                    setCancelling(false)
                    toast.error(err?.message || 'Failed to cancel')
                  }
                }}
                disabled={cancelling}
                className="inline-flex items-center rounded-md border px-3 py-1 text-sm bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelling ? 'Cancelling…' : 'Cancel Request'}
              </button>
            ) : booking.status === 'confirmed' ? (
              booking.cancellation_status === 'requested' ? (
                <span className="inline-flex items-center rounded-md border px-3 py-1 text-sm bg-yellow-50 text-yellow-700">Cancellation requested</span>
              ) : (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="inline-flex items-center rounded-md border px-3 py-1 text-sm bg-slate-50 text-slate-700 hover:bg-slate-100"
                >
                  Request Cancellation
                </button>
              )
            ) : null}
            <ChatLink bookingId={booking.id} as="guest" label="Message Host" title={booking.resorts?.name || undefined} />
          </div>
          <Link href={`/resorts/${booking.resorts?.slug || booking.resort_id}`} className="inline-flex items-center rounded-md border px-3 py-1 text-sm bg-slate-50 text-slate-700 hover:bg-slate-100">View Resort</Link>
        </div>

        {/* Cancellation Reason Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-slate-900/40" onClick={() => { if (!requestingCancel) { setShowCancelModal(false); setCancelReason('') } }} />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-xl">
                <h2 className="text-xl font-bold text-slate-900 mb-2">Request Cancellation</h2>
                <p className="text-sm text-slate-600 mb-4">You can include a reason (optional). The host will be notified and can review your request.</p>
                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="cancel-reason">Reason (optional)</label>
                <textarea
                  id="cancel-reason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl bg-white text-slate-900 min-h-[90px]"
                  placeholder="e.g., schedule change, emergency, etc."
                  disabled={requestingCancel}
                />
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    onClick={() => { if (!requestingCancel) { setShowCancelModal(false); setCancelReason('') } }}
                    className="px-3 py-2 text-sm font-semibold bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 disabled:opacity-50"
                    disabled={requestingCancel}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        setRequestingCancel(true)
                        toast.loading('Requesting cancellation...')
                        const { error } = await supabase.rpc('request_booking_cancellation', {
                          p_booking_id: booking.id,
                          p_reason: cancelReason || '',
                        })
                        toast.dismiss()
                        setRequestingCancel(false)
                        if (error) {
                          toast.error(error.message)
                          return
                        }
                        setBooking({ ...booking, cancellation_status: 'requested', cancellation_reason: cancelReason || '' })
                        setShowCancelModal(false)
                        setCancelReason('')
                        toast.success('Cancellation request sent')
                        try {
                          const { notify } = await import('../../../../lib/notifications')
                          if (booking?.resorts?.owner_id) {
                            await notify({
                              userId: booking.resorts.owner_id,
                              type: 'cancellation_requested',
                              title: 'Guest requested a cancellation',
                              body: `${booking.resorts?.name || 'Resort'} — ${booking.date_from} to ${booking.date_to}`,
                              link: `/owner/bookings`,
                              metadata: { bookingId: booking.id }
                            })
                          }
                        } catch (e) { console.warn('Notify failed:', e) }
                      } catch (err: any) {
                        toast.dismiss()
                        setRequestingCancel(false)
                        toast.error(err?.message || 'Failed to request cancellation')
                      }
                    }}
                    className="px-3 py-2 text-sm font-semibold bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50"
                    disabled={requestingCancel}
                  >
                    Submit Request
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="mt-4">
          <DisclaimerBanner title="Payment Notice">
            Coordinate payment directly with the host in chat. ResortifyPH does not process payments.
          </DisclaimerBanner>
        </div>
      </div>
    </div>
  )
}
