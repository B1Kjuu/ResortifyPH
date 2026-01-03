'use client'
import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { FiMessageSquare, FiStar, FiTrash2, FiEye, FiX, FiFilter, FiRefreshCw, FiAlertCircle, FiCheck, FiFlag, FiUser } from 'react-icons/fi'
import Link from 'next/link'

type Review = {
  id: string
  resort_id: string
  user_id: string
  rating: number
  comment: string
  created_at: string
  is_hidden?: boolean
  resorts?: { name: string }
  profiles?: { full_name: string; email: string }
}

type Message = {
  id: string
  chat_id: string
  sender_id: string
  content: string
  created_at: string
  is_hidden?: boolean
  chats?: { resort_id: string; booking_id: string }
  profiles?: { full_name: string; email: string }
}

type Report = {
  id: string
  reporter_id: string
  reported_type: 'review' | 'message' | 'user' | 'resort'
  reported_id: string
  reason: string
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
  created_at: string
  resolved_at?: string
  admin_notes?: string
  profiles?: { full_name: string; email: string }
}

export default function ContentModerationPage() {
  const [activeTab, setActiveTab] = useState<'reviews' | 'messages' | 'reports'>('reports')
  const [reviews, setReviews] = useState<Review[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [processing, setProcessing] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAdminAndLoad()
  }, [])

  useEffect(() => {
    if (!loading) {
      loadTabData()
    }
  }, [activeTab])

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

      await loadTabData()
    } catch (err) {
      console.error('Admin check failed:', err)
      router.push('/')
    }
  }

  async function loadTabData() {
    setLoading(true)
    try {
      if (activeTab === 'reviews') {
        await loadReviews()
      } else if (activeTab === 'messages') {
        await loadMessages()
      } else {
        await loadReports()
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadReviews() {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        resorts:resort_id (name),
        profiles:user_id (full_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error loading reviews:', error)
      return
    }
    setReviews(data || [])
  }

  async function loadMessages() {
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        chats:chat_id (resort_id, booking_id),
        profiles:sender_id (full_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error loading messages:', error)
      return
    }
    setMessages(data || [])
  }

  async function loadReports() {
    const { data, error } = await supabase
      .from('reports')
      .select(`
        *,
        profiles:reporter_id (full_name, email)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading reports:', error)
      return
    }
    setReports(data || [])
  }

  async function hideReview(reviewId: string, hide: boolean) {
    setProcessing(true)
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ is_hidden: hide })
        .eq('id', reviewId)

      if (error) throw error
      await loadReviews()
    } catch (err) {
      console.error('Error hiding review:', err)
      alert('Failed to update review')
    } finally {
      setProcessing(false)
    }
  }

  async function deleteReview(reviewId: string) {
    setProcessing(true)
    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId)

      if (error) throw error
      await loadReviews()
      setShowDeleteConfirm(false)
      setSelectedItem(null)
    } catch (err) {
      console.error('Error deleting review:', err)
      alert('Failed to delete review')
    } finally {
      setProcessing(false)
    }
  }

  async function hideMessage(messageId: string, hide: boolean) {
    setProcessing(true)
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_hidden: hide })
        .eq('id', messageId)

      if (error) throw error
      await loadMessages()
    } catch (err) {
      console.error('Error hiding message:', err)
      alert('Failed to update message')
    } finally {
      setProcessing(false)
    }
  }

  async function updateReportStatus(reportId: string, status: Report['status']) {
    setProcessing(true)
    try {
      const { error } = await supabase
        .from('reports')
        .update({ 
          status,
          resolved_at: status === 'resolved' || status === 'dismissed' ? new Date().toISOString() : null,
          admin_notes: adminNotes || null
        })
        .eq('id', reportId)

      if (error) throw error
      await loadReports()
      setSelectedItem(null)
      setAdminNotes('')
    } catch (err) {
      console.error('Error updating report:', err)
      alert('Failed to update report')
    } finally {
      setProcessing(false)
    }
  }

  const pendingReports = reports.filter(r => r.status === 'pending').length

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24 lg:pb-8">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <Link href="/admin/command-center" className="text-sm text-resort-500 hover:underline mb-2 inline-block">← Back to Command Center</Link>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <FiMessageSquare className="w-6 h-6 text-slate-600" />
                Reports & Content Review
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Handle user reports from the Report Button, moderate reviews, and monitor chat messages for policy violations.
              </p>
            </div>
            <button
              onClick={loadTabData}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <FiRefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'reports' 
                ? 'bg-red-100 text-red-700' 
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FiFlag className="w-4 h-4" />
            Reports
            {pendingReports > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{pendingReports}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'reviews' 
                ? 'bg-amber-100 text-amber-700' 
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FiStar className="w-4 h-4" />
            Reviews ({reviews.length})
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'messages' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FiMessageSquare className="w-4 h-4" />
            Messages ({messages.length})
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-resort-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Reports Tab */}
            {activeTab === 'reports' && (
              <div className="space-y-4">
                {reports.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                    <FiFlag className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No reports found</p>
                  </div>
                ) : (
                  reports.map(report => (
                    <div key={report.id} className={`bg-white rounded-xl border p-4 ${
                      report.status === 'pending' ? 'border-red-200 bg-red-50/50' : 'border-slate-200'
                    }`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              report.status === 'pending' ? 'bg-red-100 text-red-700' :
                              report.status === 'reviewed' ? 'bg-amber-100 text-amber-700' :
                              report.status === 'resolved' ? 'bg-green-100 text-green-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {report.status}
                            </span>
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                              {report.reported_type}
                            </span>
                          </div>
                          <p className="text-slate-800 mb-2">{report.reason}</p>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <FiUser className="w-3 h-3" />
                              {report.profiles?.full_name || report.profiles?.email || 'Unknown'}
                            </span>
                            <span>{new Date(report.created_at).toLocaleString()}</span>
                          </div>
                          {report.admin_notes && (
                            <div className="mt-2 p-2 bg-slate-100 rounded-lg text-sm text-slate-600">
                              <strong>Admin notes:</strong> {report.admin_notes}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setSelectedItem(report); setAdminNotes(report.admin_notes || '') }}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                            title="Review report"
                          >
                            <FiEye className="w-4 h-4" />
                          </button>
                          {report.status === 'pending' && (
                            <>
                              <button
                                onClick={() => updateReportStatus(report.id, 'resolved')}
                                className="p-2 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-lg"
                                title="Resolve"
                              >
                                <FiCheck className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => updateReportStatus(report.id, 'dismissed')}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                                title="Dismiss"
                              >
                                <FiX className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                    <FiStar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No reviews found</p>
                  </div>
                ) : (
                  reviews.map(review => (
                    <div key={review.id} className={`bg-white rounded-xl border p-4 ${
                      review.is_hidden ? 'border-red-200 opacity-60' : 'border-slate-200'
                    }`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex">
                              {[1,2,3,4,5].map(i => (
                                <FiStar key={i} className={`w-4 h-4 ${i <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                              ))}
                            </div>
                            {review.is_hidden && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-xs">Hidden</span>
                            )}
                          </div>
                          <p className="text-slate-800 mb-2">{review.comment}</p>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <FiUser className="w-3 h-3" />
                              {review.profiles?.full_name || review.profiles?.email || 'Unknown'}
                            </span>
                            <span>Resort: {review.resorts?.name || 'Unknown'}</span>
                            <span>{new Date(review.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {review.is_hidden ? (
                            <button
                              onClick={() => hideReview(review.id, false)}
                              className="p-2 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-lg"
                              title="Show review"
                            >
                              <FiCheck className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => hideReview(review.id, true)}
                              className="p-2 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg"
                              title="Hide review"
                            >
                              <FiAlertCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => { setSelectedItem(review); setShowDeleteConfirm(true) }}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                            title="Delete"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Messages Tab */}
            {activeTab === 'messages' && (
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                    <FiMessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No messages found</p>
                  </div>
                ) : (
                  messages.map(message => (
                    <div key={message.id} className={`bg-white rounded-xl border p-4 ${
                      message.is_hidden ? 'border-red-200 opacity-60' : 'border-slate-200'
                    }`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {message.is_hidden && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-xs mb-2 inline-block">Hidden</span>
                          )}
                          <p className="text-slate-800 mb-2">{message.content}</p>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <FiUser className="w-3 h-3" />
                              {message.profiles?.full_name || message.profiles?.email || 'Unknown'}
                            </span>
                            <span>{new Date(message.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {message.is_hidden ? (
                            <button
                              onClick={() => hideMessage(message.id, false)}
                              className="p-2 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-lg"
                              title="Show message"
                            >
                              <FiCheck className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => hideMessage(message.id, true)}
                              className="p-2 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg"
                              title="Hide message"
                            >
                              <FiAlertCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Report Details Modal */}
      {selectedItem && activeTab === 'reports' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-white border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">Report Details</h2>
              <button
                onClick={() => { setSelectedItem(null); setAdminNotes('') }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Report Type</p>
                <p className="font-medium text-slate-800 capitalize">{selectedItem.reported_type}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Reported ID</p>
                <p className="font-mono text-sm text-slate-700">{selectedItem.reported_id}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Reason</p>
                <p className="text-slate-800">{selectedItem.reason}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Reporter</p>
                <p className="text-slate-700">{selectedItem.profiles?.full_name || selectedItem.profiles?.email || 'Unknown'}</p>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Admin Notes</label>
                <textarea
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this report..."
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-resort-500 focus:border-resort-500 resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => updateReportStatus(selectedItem.id, 'resolved')}
                  disabled={processing}
                  className="flex-1 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  Resolve
                </button>
                <button
                  onClick={() => updateReportStatus(selectedItem.id, 'dismissed')}
                  disabled={processing}
                  className="flex-1 py-3 bg-slate-600 text-white font-semibold rounded-xl hover:bg-slate-700 disabled:opacity-50 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <FiTrash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Delete Review</h2>
                  <p className="text-sm text-slate-500">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-slate-600 mb-4">
                Are you sure you want to permanently delete this review?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => deleteReview(selectedItem.id)}
                  disabled={processing}
                  className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {processing ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  onClick={() => { setShowDeleteConfirm(false); setSelectedItem(null) }}
                  disabled={processing}
                  className="px-6 py-3 border border-slate-300 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
