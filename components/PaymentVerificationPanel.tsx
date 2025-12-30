"use client"

import { useState, useEffect } from 'react'
import { FiCheck, FiX, FiImage, FiClock, FiCheckCircle, FiXCircle, FiAlertCircle } from 'react-icons/fi'
import supabase from '@/lib/supabaseClient'
import { PaymentSubmission, PAYMENT_METHODS } from '@/types/payment'

type PaymentWithProfile = PaymentSubmission & {
  submitted_by_profile?: {
    full_name: string | null
    email: string | null
    avatar_url: string | null
  }
}

type Props = {
  bookingId: string
  isOwner: boolean
  onVerify?: () => void
}

export default function PaymentVerificationPanel({ bookingId, isOwner, onVerify }: Props) {
  const [submissions, setSubmissions] = useState<PaymentWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    fetchSubmissions()
  }, [bookingId])

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_submissions')
        .select(`
          *,
          submitted_by_profile:profiles!submitted_by(full_name, email, avatar_url)
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSubmissions(data || [])
    } catch (err) {
      console.error('Error fetching submissions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (submissionId: string) => {
    setProcessing(submissionId)
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error('Not authenticated')

      const res = await fetch('/api/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_id: submissionId,
          action: 'verify',
          user_id: user.user.id
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to verify')
      }

      await fetchSubmissions()
      onVerify?.()
    } catch (err: any) {
      alert(err.message || 'Failed to verify payment')
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (submissionId: string) => {
    setProcessing(submissionId)
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error('Not authenticated')

      const res = await fetch('/api/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_id: submissionId,
          action: 'reject',
          rejection_reason: rejectReason,
          user_id: user.user.id
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to reject')
      }

      await fetchSubmissions()
      setShowRejectModal(null)
      setRejectReason('')
      onVerify?.()
    } catch (err: any) {
      alert(err.message || 'Failed to reject payment')
    } finally {
      setProcessing(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
            <FiCheckCircle className="w-3 h-3" /> Verified
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            <FiXCircle className="w-3 h-3" /> Rejected
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
            <FiClock className="w-3 h-3" /> Pending
          </span>
        )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <FiClock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No payment submissions yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {submissions.map(submission => {
        const method = PAYMENT_METHODS.find(m => m.id === submission.payment_method)
        const profile = submission.submitted_by_profile
        
        return (
          <div key={submission.id} className="p-4 bg-white border border-slate-200 rounded-xl">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium">
                  {profile?.full_name?.[0] || profile?.email?.[0] || '?'}
                </div>
                <div>
                  <p className="font-medium text-sm text-slate-800">
                    {profile?.full_name || profile?.email || 'Guest'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(submission.created_at).toLocaleDateString()} at {new Date(submission.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              {getStatusBadge(submission.status)}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Amount</p>
                <p className="font-semibold text-lg text-slate-800">₱{submission.amount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Method</p>
                <p className="font-medium text-slate-700">
                  {method?.icon} {method?.label}
                </p>
              </div>
              {submission.reference_number && (
                <div className="col-span-2">
                  <p className="text-xs text-slate-500 mb-0.5">Reference #</p>
                  <p className="font-mono text-sm text-slate-700">{submission.reference_number}</p>
                </div>
              )}
            </div>

            {submission.receipt_url && (
              <button
                onClick={() => setImagePreview(submission.receipt_url!)}
                className="w-full flex items-center justify-center gap-2 p-3 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors mb-3"
              >
                <FiImage className="w-4 h-4 text-slate-600" />
                <span className="text-sm text-slate-700">View Receipt</span>
              </button>
            )}

            {submission.notes && (
              <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded-lg mb-3">
                📝 {submission.notes}
              </p>
            )}

            {submission.status === 'rejected' && submission.rejection_reason && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
                <FiAlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-red-700">Rejection Reason</p>
                  <p className="text-sm text-red-600">{submission.rejection_reason}</p>
                </div>
              </div>
            )}

            {isOwner && submission.status === 'pending' && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleVerify(submission.id)}
                  disabled={!!processing}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {processing === submission.id ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <FiCheck className="w-4 h-4" />
                  )}
                  Verify
                </button>
                <button
                  onClick={() => setShowRejectModal(submission.id)}
                  disabled={!!processing}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  <FiX className="w-4 h-4" />
                  Reject
                </button>
              </div>
            )}
          </div>
        )
      })}

      {/* Image Preview Modal */}
      {imagePreview && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          onClick={() => setImagePreview(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img
              src={imagePreview}
              alt="Receipt"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setImagePreview(null)}
              className="absolute top-2 right-2 p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Reject Payment</h3>
            <p className="text-sm text-slate-600 mb-3">Please provide a reason for rejecting this payment:</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g., Amount doesn't match, unclear receipt..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleReject(showRejectModal)}
                disabled={!!processing}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {processing === showRejectModal ? 'Rejecting...' : 'Reject Payment'}
              </button>
              <button
                onClick={() => { setShowRejectModal(null); setRejectReason('') }}
                disabled={!!processing}
                className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
