'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  FiAlertTriangle,
  FiMessageSquare,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiChevronDown,
  FiChevronRight,
  FiUser,
  FiCalendar,
  FiDollarSign,
  FiImage,
  FiSend,
  FiFilter,
  FiSearch,
  FiArrowUp
} from 'react-icons/fi';

interface Dispute {
  id: string;
  booking_id: string;
  initiated_by: string;
  against_user: string;
  reason: string;
  description: string;
  evidence_urls: string[];
  status: 'open' | 'under_review' | 'resolved' | 'escalated' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  resolution: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  refund_amount: number | null;
  created_at: string;
  updated_at: string;
  initiator?: { full_name: string; email: string };
  against?: { full_name: string; email: string };
  booking?: {
    check_in: string;
    check_out: string;
    total_price: number;
    resorts?: { name: string };
  };
}

const STATUS_CONFIG = {
  open: { color: 'bg-amber-100 text-amber-800', icon: FiClock, label: 'Open' },
  under_review: { color: 'bg-blue-100 text-blue-800', icon: FiMessageSquare, label: 'Under Review' },
  resolved: { color: 'bg-green-100 text-green-800', icon: FiCheckCircle, label: 'Resolved' },
  escalated: { color: 'bg-red-100 text-red-800', icon: FiAlertTriangle, label: 'Escalated' },
  closed: { color: 'bg-gray-100 text-gray-800', icon: FiXCircle, label: 'Closed' }
};

const PRIORITY_CONFIG = {
  low: { color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' },
  medium: { color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400' },
  high: { color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
  urgent: { color: 'bg-red-100 text-red-700', dot: 'bg-red-400' }
};

const REASON_OPTIONS = [
  'Payment not received',
  'Property misrepresentation',
  'Host no-show',
  'Guest no-show',
  'Cancellation dispute',
  'Damage claim',
  'Safety concern',
  'Harassment',
  'Other'
];

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'priority' | 'updated_at'>('created_at');
  const [resolution, setResolution] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('disputes')
        .select(`
          *,
          initiator:initiated_by (full_name, email),
          against:against_user (full_name, email),
          booking:booking_id (
            check_in,
            check_out,
            total_price,
            resorts (name)
          )
        `)
        .order(sortBy, { ascending: false });

      if (filterStatus) {
        query = query.eq('status', filterStatus);
      }

      if (filterPriority) {
        query = query.eq('priority', filterPriority);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDisputes(data || []);
    } catch (error) {
      console.error('Error fetching disputes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, [filterStatus, filterPriority, sortBy]);

  const updateStatus = async (disputeId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('disputes')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', disputeId);

      if (error) throw error;
      fetchDisputes();
      if (selectedDispute?.id === disputeId) {
        setSelectedDispute(prev => prev ? { ...prev, status: newStatus as any } : null);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const updatePriority = async (disputeId: string, newPriority: string) => {
    try {
      const { error } = await supabase
        .from('disputes')
        .update({ priority: newPriority, updated_at: new Date().toISOString() })
        .eq('id', disputeId);

      if (error) throw error;
      fetchDisputes();
    } catch (error) {
      console.error('Error updating priority:', error);
    }
  };

  const resolveDispute = async () => {
    if (!selectedDispute || !resolution.trim()) return;
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('disputes')
        .update({
          status: 'resolved',
          resolution: resolution.trim(),
          refund_amount: refundAmount ? parseFloat(refundAmount) : null,
          resolved_by: user?.id,
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedDispute.id);

      if (error) throw error;

      // Log audit
      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        action: 'resolve_dispute',
        entity_type: 'dispute',
        entity_id: selectedDispute.id,
        details: { resolution, refund_amount: refundAmount || null }
      });

      setResolution('');
      setRefundAmount('');
      setSelectedDispute(null);
      fetchDisputes();
    } catch (error) {
      console.error('Error resolving dispute:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const filteredDisputes = disputes.filter(d => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      d.reason.toLowerCase().includes(query) ||
      d.description?.toLowerCase().includes(query) ||
      d.initiator?.full_name?.toLowerCase().includes(query) ||
      d.against?.full_name?.toLowerCase().includes(query) ||
      d.booking?.resorts?.name?.toLowerCase().includes(query)
    );
  });

  const stats = {
    open: disputes.filter(d => d.status === 'open').length,
    underReview: disputes.filter(d => d.status === 'under_review').length,
    urgent: disputes.filter(d => d.priority === 'urgent' && d.status !== 'resolved' && d.status !== 'closed').length,
    resolved: disputes.filter(d => d.status === 'resolved').length
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8 pb-24 lg:pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <FiAlertTriangle className="w-7 h-7 text-amber-600" />
          Booking Dispute Resolution
        </h1>
        <p className="text-gray-600 text-sm mt-1">
          Resolve conflicts between guests and hosts related to bookings. This includes payment issues, 
          property misrepresentation, cancellations, damage claims, and refund requests.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <FiClock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.open}</p>
              <p className="text-xs text-gray-600">Open</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FiMessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.underReview}</p>
              <p className="text-xs text-gray-600">Under Review</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <FiAlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.urgent}</p>
              <p className="text-xs text-gray-600">Urgent</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FiCheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.resolved}</p>
              <p className="text-xs text-gray-600">Resolved</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search disputes..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              {Object.keys(STATUS_CONFIG).map(status => (
                <option key={status} value={status}>{STATUS_CONFIG[status as keyof typeof STATUS_CONFIG].label}</option>
              ))}
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="created_at">Newest</option>
              <option value="updated_at">Recently Updated</option>
              <option value="priority">Priority</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Disputes List */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm border animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredDisputes.length === 0 ? (
            <div className="bg-white rounded-xl p-12 shadow-sm border text-center">
              <FiAlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No disputes found</p>
              <p className="text-gray-400 text-sm mt-1">Great news! No active disputes to resolve.</p>
            </div>
          ) : (
            filteredDisputes.map((dispute) => {
              const StatusIcon = STATUS_CONFIG[dispute.status].icon;
              const isSelected = selectedDispute?.id === dispute.id;

              return (
                <div
                  key={dispute.id}
                  className={`bg-white rounded-xl p-4 lg:p-6 shadow-sm border cursor-pointer transition-all ${
                    isSelected ? 'ring-2 ring-blue-500 border-blue-500' : 'hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedDispute(dispute)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-full ${STATUS_CONFIG[dispute.status].color}`}>
                      <StatusIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_CONFIG[dispute.priority].color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_CONFIG[dispute.priority].dot}`} />
                          {dispute.priority}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[dispute.status].color}`}>
                          {STATUS_CONFIG[dispute.status].label}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900">{dispute.reason}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2 mt-1">{dispute.description}</p>
                      
                      <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <FiUser className="w-3 h-3" />
                          {dispute.initiator?.full_name || 'Unknown'}
                        </span>
                        <span className="flex items-center gap-1">
                          <FiCalendar className="w-3 h-3" />
                          {formatDate(dispute.created_at)}
                        </span>
                        {dispute.booking && (
                          <span className="flex items-center gap-1">
                            <FiDollarSign className="w-3 h-3" />
                            {formatCurrency(dispute.booking.total_price)}
                          </span>
                        )}
                      </div>
                    </div>
                    <FiChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1">
          {selectedDispute ? (
            <div className="bg-white rounded-xl shadow-sm border sticky top-4">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Dispute Details</h3>
                  <button
                    onClick={() => setSelectedDispute(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiXCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-auto">
                {/* Status & Priority */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Status</label>
                    <select
                      value={selectedDispute.status}
                      onChange={(e) => updateStatus(selectedDispute.id, e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.keys(STATUS_CONFIG).map(status => (
                        <option key={status} value={status}>
                          {STATUS_CONFIG[status as keyof typeof STATUS_CONFIG].label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Priority</label>
                    <select
                      value={selectedDispute.priority}
                      onChange={(e) => updatePriority(selectedDispute.id, e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                {/* Parties */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Initiated By</label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <FiUser className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{selectedDispute.initiator?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">{selectedDispute.initiator?.email}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Against</label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <FiUser className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{selectedDispute.against?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">{selectedDispute.against?.email}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Booking Info */}
                {selectedDispute.booking && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <label className="text-xs font-medium text-gray-500 uppercase">Booking</label>
                    <p className="text-sm font-medium text-gray-900 mt-1">{selectedDispute.booking.resorts?.name}</p>
                    <p className="text-xs text-gray-600">
                      {formatDate(selectedDispute.booking.check_in)} - {formatDate(selectedDispute.booking.check_out)}
                    </p>
                    <p className="text-sm font-bold text-gray-900 mt-1">
                      {formatCurrency(selectedDispute.booking.total_price)}
                    </p>
                  </div>
                )}

                {/* Description */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Description</label>
                  <p className="text-sm text-gray-700 mt-1">{selectedDispute.description || 'No description provided'}</p>
                </div>

                {/* Evidence */}
                {selectedDispute.evidence_urls?.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Evidence</label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {selectedDispute.evidence_urls.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200"
                        >
                          <FiImage className="w-6 h-6 text-gray-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resolution Form */}
                {selectedDispute.status !== 'resolved' && selectedDispute.status !== 'closed' && (
                  <div className="border-t pt-4 space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Resolution</label>
                      <textarea
                        value={resolution}
                        onChange={(e) => setResolution(e.target.value)}
                        placeholder="Describe the resolution..."
                        rows={3}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Refund Amount (Optional)</label>
                      <input
                        type="number"
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      onClick={resolveDispute}
                      disabled={!resolution.trim() || submitting}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                    >
                      <FiCheckCircle className="w-4 h-4" />
                      {submitting ? 'Resolving...' : 'Resolve Dispute'}
                    </button>
                  </div>
                )}

                {/* Resolved Info */}
                {selectedDispute.status === 'resolved' && selectedDispute.resolution && (
                  <div className="bg-green-50 rounded-lg p-3">
                    <label className="text-xs font-medium text-green-700 uppercase">Resolution</label>
                    <p className="text-sm text-green-800 mt-1">{selectedDispute.resolution}</p>
                    {selectedDispute.refund_amount && (
                      <p className="text-sm font-bold text-green-800 mt-2">
                        Refund: {formatCurrency(selectedDispute.refund_amount)}
                      </p>
                    )}
                    <p className="text-xs text-green-600 mt-2">
                      Resolved on {formatDate(selectedDispute.resolved_at!)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-8 shadow-sm border text-center">
              <FiMessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Select a dispute</p>
              <p className="text-gray-400 text-sm mt-1">Click on a dispute to view details and take action</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
