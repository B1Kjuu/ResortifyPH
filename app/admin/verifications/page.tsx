'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  FiUserCheck,
  FiSearch,
  FiFilter,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiUser,
  FiFileText,
  FiCreditCard,
  FiHome,
  FiPhone,
  FiMail,
  FiEye,
  FiDownload,
  FiChevronRight,
  FiAlertCircle,
  FiCalendar
} from 'react-icons/fi';

interface Verification {
  id: string;
  user_id: string;
  verification_type: string;
  document_url: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  rejection_reason: string | null;
  verified_by: string | null;
  verified_at: string | null;
  expires_at: string | null;
  created_at: string;
  user?: { full_name: string; email: string; avatar_url: string };
}

const VERIFICATION_TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  id: { icon: FiCreditCard, label: 'Government ID', color: 'bg-blue-100 text-blue-700' },
  business_permit: { icon: FiHome, label: 'Business Permit', color: 'bg-purple-100 text-purple-700' },
  dti_certificate: { icon: FiFileText, label: 'DTI Certificate', color: 'bg-green-100 text-green-700' },
  phone: { icon: FiPhone, label: 'Phone Number', color: 'bg-amber-100 text-amber-700' },
  email: { icon: FiMail, label: 'Email', color: 'bg-gray-100 text-gray-700' }
};

const STATUS_CONFIG = {
  pending: { color: 'bg-amber-100 text-amber-700', icon: FiClock, label: 'Pending' },
  approved: { color: 'bg-green-100 text-green-700', icon: FiCheckCircle, label: 'Approved' },
  rejected: { color: 'bg-red-100 text-red-700', icon: FiXCircle, label: 'Rejected' },
  expired: { color: 'bg-gray-100 text-gray-700', icon: FiAlertCircle, label: 'Expired' }
};

export default function VerificationsPage() {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [filterType, setFilterType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fetchVerifications = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('user_verifications')
        .select(`
          *,
          user:user_id (full_name, email, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (filterStatus) query = query.eq('status', filterStatus);
      if (filterType) query = query.eq('verification_type', filterType);

      const { data, error } = await query;
      if (error) throw error;
      setVerifications(data || []);
    } catch (error) {
      console.error('Error fetching verifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, [filterStatus, filterType]);

  const handleApprove = async (verificationId: string) => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Set expiry 1 year from now for documents
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      const { error } = await supabase
        .from('user_verifications')
        .update({
          status: 'approved',
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString()
        })
        .eq('id', verificationId);

      if (error) throw error;

      // Update user's verified status
      const verification = verifications.find(v => v.id === verificationId);
      if (verification) {
        await supabase
          .from('profiles')
          .update({ is_verified: true })
          .eq('id', verification.user_id);
      }

      // Log audit
      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        action: 'approve_verification',
        entity_type: 'verification',
        entity_id: verificationId
      });

      setSelectedVerification(null);
      fetchVerifications();
    } catch (error) {
      console.error('Error approving verification:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (verificationId: string) => {
    if (!rejectionReason.trim()) return;
    setProcessing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('user_verifications')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason.trim(),
          verified_by: user?.id,
          verified_at: new Date().toISOString()
        })
        .eq('id', verificationId);

      if (error) throw error;

      // Log audit
      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        action: 'reject_verification',
        entity_type: 'verification',
        entity_id: verificationId,
        details: { reason: rejectionReason }
      });

      setRejectionReason('');
      setSelectedVerification(null);
      fetchVerifications();
    } catch (error) {
      console.error('Error rejecting verification:', error);
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const stats = {
    pending: verifications.filter(v => v.status === 'pending').length,
    approved: verifications.filter(v => v.status === 'approved').length,
    rejected: verifications.filter(v => v.status === 'rejected').length,
    expiring: verifications.filter(v => {
      if (!v.expires_at) return false;
      const expiry = new Date(v.expires_at);
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      return expiry <= thirtyDays && v.status === 'approved';
    }).length
  };

  const filteredVerifications = verifications.filter(v => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      v.user?.full_name?.toLowerCase().includes(query) ||
      v.user?.email?.toLowerCase().includes(query) ||
      v.verification_type.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <FiUserCheck className="w-7 h-7 text-green-600" />
          User Verification
        </h1>
        <p className="text-gray-600 text-sm mt-1">Review and verify user documents</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <FiClock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              <p className="text-xs text-gray-600">Pending Review</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FiCheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
              <p className="text-xs text-gray-600">Approved</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <FiXCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
              <p className="text-xs text-gray-600">Rejected</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <FiCalendar className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.expiring}</p>
              <p className="text-xs text-gray-600">Expiring Soon</p>
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
              placeholder="Search users..."
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
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              {Object.entries(VERIFICATION_TYPE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Verifications List */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl p-4 shadow-sm border animate-pulse">
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
          ) : filteredVerifications.length === 0 ? (
            <div className="bg-white rounded-xl p-12 shadow-sm border text-center">
              <FiUserCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No verifications</p>
              <p className="text-gray-400 text-sm mt-1">No pending verification requests</p>
            </div>
          ) : (
            filteredVerifications.map((verification) => {
              const TypeConfig = VERIFICATION_TYPE_CONFIG[verification.verification_type] || {
                icon: FiFileText,
                label: verification.verification_type,
                color: 'bg-gray-100 text-gray-700'
              };
              const TypeIcon = TypeConfig.icon;
              const StatusConfig = STATUS_CONFIG[verification.status];
              const StatusIcon = StatusConfig.icon;
              const isSelected = selectedVerification?.id === verification.id;

              return (
                <div
                  key={verification.id}
                  className={`bg-white rounded-xl p-4 shadow-sm border cursor-pointer transition-all ${
                    isSelected ? 'ring-2 ring-blue-500 border-blue-500' : 'hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedVerification(verification)}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {verification.user?.avatar_url ? (
                        <img
                          src={verification.user.avatar_url}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                          <FiUser className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div className={`absolute -bottom-1 -right-1 p-1 rounded-full ${TypeConfig.color}`}>
                        <TypeIcon className="w-3 h-3" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TypeConfig.color}`}>
                          {TypeConfig.label}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${StatusConfig.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {StatusConfig.label}
                        </span>
                      </div>
                      <p className="font-medium text-gray-900 truncate">
                        {verification.user?.full_name || 'Unknown User'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{verification.user?.email}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-500">{formatDate(verification.created_at)}</p>
                      <FiChevronRight className="w-5 h-5 text-gray-400 mt-1 ml-auto" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1">
          {selectedVerification ? (
            <div className="bg-white rounded-xl shadow-sm border sticky top-4">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Verification Details</h3>
                  <button
                    onClick={() => setSelectedVerification(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiXCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4 max-h-[calc(100vh-250px)] overflow-auto">
                {/* User Info */}
                <div className="flex items-center gap-3">
                  {selectedVerification.user?.avatar_url ? (
                    <img
                      src={selectedVerification.user.avatar_url}
                      alt=""
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                      <FiUser className="w-7 h-7 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{selectedVerification.user?.full_name}</p>
                    <p className="text-sm text-gray-500">{selectedVerification.user?.email}</p>
                  </div>
                </div>

                {/* Verification Type */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Verification Type</label>
                  <div className="mt-1">
                    {(() => {
                      const Config = VERIFICATION_TYPE_CONFIG[selectedVerification.verification_type] || {
                        icon: FiFileText,
                        label: selectedVerification.verification_type,
                        color: 'bg-gray-100 text-gray-700'
                      };
                      const Icon = Config.icon;
                      return (
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${Config.color}`}>
                          <Icon className="w-4 h-4" />
                          {Config.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Document Preview */}
                {selectedVerification.document_url && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Document</label>
                    <div className="mt-2 border rounded-lg overflow-hidden">
                      <img
                        src={selectedVerification.document_url}
                        alt="Verification Document"
                        className="w-full h-48 object-cover cursor-pointer hover:opacity-90"
                        onClick={() => setPreviewUrl(selectedVerification.document_url)}
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => setPreviewUrl(selectedVerification.document_url)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                      >
                        <FiEye className="w-4 h-4" />
                        View
                      </button>
                      <a
                        href={selectedVerification.document_url}
                        download
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                      >
                        <FiDownload className="w-4 h-4" />
                        Download
                      </a>
                    </div>
                  </div>
                )}

                {/* Status */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Status</label>
                  <div className="mt-1">
                    {(() => {
                      const Config = STATUS_CONFIG[selectedVerification.status];
                      const Icon = Config.icon;
                      return (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${Config.color}`}>
                          <Icon className="w-3 h-3" />
                          {Config.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Rejection Reason (if rejected) */}
                {selectedVerification.status === 'rejected' && selectedVerification.rejection_reason && (
                  <div className="bg-red-50 rounded-lg p-3">
                    <label className="text-xs font-medium text-red-700 uppercase">Rejection Reason</label>
                    <p className="text-sm text-red-800 mt-1">{selectedVerification.rejection_reason}</p>
                  </div>
                )}

                {/* Expiry Date */}
                {selectedVerification.expires_at && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Expires</label>
                    <p className="text-sm text-gray-700 mt-1">{formatDate(selectedVerification.expires_at)}</p>
                  </div>
                )}

                {/* Timestamps */}
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Submitted: {formatDate(selectedVerification.created_at)}</p>
                  {selectedVerification.verified_at && (
                    <p>Reviewed: {formatDate(selectedVerification.verified_at)}</p>
                  )}
                </div>

                {/* Actions */}
                {selectedVerification.status === 'pending' && (
                  <div className="border-t pt-4 space-y-3">
                    <button
                      onClick={() => handleApprove(selectedVerification.id)}
                      disabled={processing}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                    >
                      <FiCheckCircle className="w-4 h-4" />
                      Approve Verification
                    </button>

                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Rejection Reason</label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Why is this document being rejected?"
                        rows={2}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <button
                      onClick={() => handleReject(selectedVerification.id)}
                      disabled={processing || !rejectionReason.trim()}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                    >
                      <FiXCircle className="w-4 h-4" />
                      Reject Verification
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-8 shadow-sm border text-center">
              <FiEye className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Select a verification</p>
              <p className="text-gray-400 text-sm mt-1">Click to review documents</p>
            </div>
          )}
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={previewUrl}
              alt="Document Preview"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
            >
              <FiXCircle className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
