'use client'
import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { FiDollarSign, FiCreditCard, FiImage, FiCheck, FiX, FiClock, FiAlertCircle, FiEye, FiRefreshCw, FiFilter, FiUser, FiHome, FiCalendar } from 'react-icons/fi'
import Link from 'next/link'

type PaymentSubmission = {
  id: string
  booking_id: string
  guest_id: string
  amount: number
  payment_method: string
  reference_number: string | null
  receipt_url: string | null
  status: 'pending' | 'verified' | 'rejected'
  submitted_at: string
  verified_at: string | null
  verified_by: string | null
  rejection_reason: string | null
  bookings?: {
    id: string
    check_in_date: string
    check_out_date: string
    total_price: number
    resort_id: string
    resorts?: { name: string; owner_id: string }
  }
  profiles?: { full_name: string; email: string }
}

type PaymentStats = {
  total: number
  pending: number
  verified: number
  rejected: number
  totalAmount: number
  verifiedAmount: number
}

export default function PaymentOversightPage() {
  const [submissions, setSubmissions] = useState<PaymentSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all')
  const [selectedSubmission, setSelectedSubmission] = useState<PaymentSubmission | null>(null)
  const [showImageModal, setShowImageModal] = useState(false)
  const [stats, setStats] = useState<PaymentStats>({
    total: 0, pending: 0, verified: 0, rejected: 0, totalAmount: 0, verifiedAmount: 0
  })
  const router = useRouter()

  useEffect(() => {
    checkAdminAndLoad()
  }, [])

  async function checkAdminAndLoad() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.push('/auth/signin')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single()

      if (!profile?.is_admin) {
        router.push('/')
        return
      }

      await loadSubmissions()
    } catch (err) {
      console.error('Admin check failed:', err)
      router.push('/')
    }
  }

  async function loadSubmissions() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('payment_submissions')
        .select(`
          *,
          bookings:booking_id (
            id,
            check_in_date,
            check_out_date,
            total_price,
            resort_id,
            resorts:resort_id (name, owner_id)
          ),
          profiles:guest_id (full_name, email)
        `)
        .order('submitted_at', { ascending: false })

      if (error) throw error

      const allSubmissions = data || []
      setSubmissions(allSubmissions)

      // Calculate stats
      setStats({
        total: allSubmissions.length,
        pending: allSubmissions.filter(s => s.status === 'pending').length,
        verified: allSubmissions.filter(s => s.status === 'verified').length,
        rejected: allSubmissions.filter(s => s.status === 'rejected').length,
        totalAmount: allSubmissions.reduce((sum, s) => sum + (s.amount || 0), 0),
        verifiedAmount: allSubmissions.filter(s => s.status === 'verified').reduce((sum, s) => sum + (s.amount || 0), 0)
      })
    } catch (err) {
      console.error('Error loading submissions:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredSubmissions = submissions.filter(s => 
    statusFilter === 'all' || s.status === statusFilter
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { 
      style: 'currency', 
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <FiClock className="w-4 h-4 text-amber-500" />
      case 'verified': return <FiCheck className="w-4 h-4 text-green-500" />
      case 'rejected': return <FiX className="w-4 h-4 text-red-500" />
      default: return null
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700'
      case 'verified': return 'bg-green-100 text-green-700'
      case 'rejected': return 'bg-red-100 text-red-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24 lg:pb-8">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <Link href="/admin/command-center" className="text-sm text-resort-500 hover:underline mb-2 inline-block">← Back to Command Center</Link>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <FiDollarSign className="w-6 h-6 text-slate-600" />
                Payment Oversight
              </h1>
            </div>
            <button
              onClick={loadSubmissions}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <FiRefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
            <p className="text-xs text-slate-500">Total Submissions</p>
          </div>
          <div className="bg-white border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            <p className="text-xs text-slate-500">Pending</p>
          </div>
          <div className="bg-white border border-green-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
            <p className="text-xs text-slate-500">Verified</p>
          </div>
          <div className="bg-white border border-red-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            <p className="text-xs text-slate-500">Rejected</p>
          </div>
          <div className="bg-white border border-blue-200 rounded-xl p-4 text-center">
            <p className="text-lg font-bold text-blue-600">{formatCurrency(stats.totalAmount)}</p>
            <p className="text-xs text-slate-500">Total Amount</p>
          </div>
          <div className="bg-white border border-emerald-200 rounded-xl p-4 text-center">
            <p className="text-lg font-bold text-emerald-600">{formatCurrency(stats.verifiedAmount)}</p>
            <p className="text-xs text-slate-500">Verified Amount</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {(['all', 'pending', 'verified', 'rejected'] as const).map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                  statusFilter === status
                    ? status === 'all' ? 'bg-slate-800 text-white' :
                      status === 'pending' ? 'bg-amber-500 text-white' :
                      status === 'verified' ? 'bg-green-500 text-white' :
                      'bg-red-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {status === 'all' ? `All (${stats.total})` :
                 status === 'pending' ? `Pending (${stats.pending})` :
                 status === 'verified' ? `Verified (${stats.verified})` :
                 `Rejected (${stats.rejected})`}
              </button>
            ))}
          </div>
        </div>

        {/* Submissions List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-resort-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <FiDollarSign className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No payment submissions found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSubmissions.map(submission => (
              <div key={submission.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(submission.status)}`}>
                        {getStatusIcon(submission.status)}
                        {submission.status}
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        {submission.payment_method}
                      </span>
                      <span className="text-lg font-bold text-slate-800">
                        {formatCurrency(submission.amount)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <FiUser className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{submission.profiles?.full_name || submission.profiles?.email || 'Unknown guest'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FiHome className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{submission.bookings?.resorts?.name || 'Unknown resort'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FiCalendar className="w-3 h-3 text-slate-400" />
                        <span>{new Date(submission.submitted_at).toLocaleString()}</span>
                      </div>
                    </div>

                    {submission.reference_number && (
                      <p className="text-xs text-slate-500 mt-1">
                        Ref: <span className="font-mono">{submission.reference_number}</span>
                      </p>
                    )}

                    {submission.rejection_reason && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                        <strong>Rejection reason:</strong> {submission.rejection_reason}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {submission.receipt_url && (
                      <button
                        onClick={() => { setSelectedSubmission(submission); setShowImageModal(true) }}
                        className="inline-flex items-center gap-1 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm"
                      >
                        <FiImage className="w-4 h-4" />
                        View Receipt
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedSubmission(submission)}
                      className="inline-flex items-center gap-1 px-3 py-2 bg-resort-500 text-white rounded-lg hover:bg-resort-600 transition-colors text-sm"
                    >
                      <FiEye className="w-4 h-4" />
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Modal */}
      {showImageModal && selectedSubmission?.receipt_url && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-auto">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
            >
              <FiX className="w-6 h-6" />
            </button>
            <img 
              src={selectedSubmission.receipt_url} 
              alt="Payment receipt" 
              className="max-w-full h-auto rounded-lg"
              onClick={e => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedSubmission && !showImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-white border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">Payment Details</h2>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusStyle(selectedSubmission.status)}`}>
                  {getStatusIcon(selectedSubmission.status)}
                  {selectedSubmission.status}
                </span>
                <span className="text-2xl font-bold text-slate-800">
                  {formatCurrency(selectedSubmission.amount)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Payment Method</p>
                  <p className="font-medium text-slate-800">{selectedSubmission.payment_method}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Reference Number</p>
                  <p className="font-mono text-slate-800">{selectedSubmission.reference_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Guest</p>
                  <p className="text-slate-800">{selectedSubmission.profiles?.full_name || 'Unknown'}</p>
                  <p className="text-xs text-slate-500">{selectedSubmission.profiles?.email}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Resort</p>
                  <p className="text-slate-800">{selectedSubmission.bookings?.resorts?.name || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Submitted</p>
                  <p className="text-slate-800">{new Date(selectedSubmission.submitted_at).toLocaleString()}</p>
                </div>
                {selectedSubmission.verified_at && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Verified/Rejected</p>
                    <p className="text-slate-800">{new Date(selectedSubmission.verified_at).toLocaleString()}</p>
                  </div>
                )}
              </div>

              {selectedSubmission.bookings && (
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-500 mb-2">Booking Details</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-slate-500">Check-in:</span>
                      <span className="ml-1 text-slate-800">{new Date(selectedSubmission.bookings.check_in_date).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Check-out:</span>
                      <span className="ml-1 text-slate-800">{new Date(selectedSubmission.bookings.check_out_date).toLocaleDateString()}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500">Total Price:</span>
                      <span className="ml-1 font-medium text-slate-800">{formatCurrency(selectedSubmission.bookings.total_price)}</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedSubmission.rejection_reason && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-xs text-red-500 mb-1">Rejection Reason</p>
                  <p className="text-red-700">{selectedSubmission.rejection_reason}</p>
                </div>
              )}

              {selectedSubmission.receipt_url && (
                <button
                  onClick={() => setShowImageModal(true)}
                  className="w-full py-3 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                >
                  <FiImage className="w-5 h-5" />
                  View Receipt Image
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
