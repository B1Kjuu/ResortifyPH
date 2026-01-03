'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  FiShield,
  FiAlertTriangle,
  FiSearch,
  FiFilter,
  FiEye,
  FiXCircle,
  FiCheckCircle,
  FiUser,
  FiCalendar,
  FiMapPin,
  FiCreditCard,
  FiActivity,
  FiTrendingUp,
  FiUsers,
  FiRefreshCw,
  FiChevronRight,
  FiSlash,
  FiAlertOctagon
} from 'react-icons/fi';

interface FraudAlert {
  id: string;
  user_id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: Record<string, any>;
  status: 'new' | 'investigating' | 'confirmed' | 'dismissed';
  investigated_by: string | null;
  investigated_at: string | null;
  action_taken: string | null;
  created_at: string;
  user?: { full_name: string; email: string; created_at: string };
}

const SEVERITY_CONFIG = {
  low: { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: 'text-gray-500', dot: 'bg-gray-400' },
  medium: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: 'text-blue-500', dot: 'bg-blue-400' },
  high: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: 'text-amber-500', dot: 'bg-amber-400' },
  critical: { color: 'bg-red-100 text-red-700 border-red-200', icon: 'text-red-500', dot: 'bg-red-400' }
};

const ALERT_TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  multiple_accounts: { icon: FiUsers, label: 'Multiple Accounts', color: 'text-purple-600' },
  suspicious_booking: { icon: FiCalendar, label: 'Suspicious Booking', color: 'text-amber-600' },
  payment_anomaly: { icon: FiCreditCard, label: 'Payment Anomaly', color: 'text-red-600' },
  cancellation_abuse: { icon: FiXCircle, label: 'Cancellation Abuse', color: 'text-orange-600' },
  fake_reviews: { icon: FiAlertOctagon, label: 'Fake Reviews', color: 'text-pink-600' },
  location_mismatch: { icon: FiMapPin, label: 'Location Mismatch', color: 'text-blue-600' }
};

const STATUS_CONFIG = {
  new: { color: 'bg-red-100 text-red-700', label: 'New' },
  investigating: { color: 'bg-amber-100 text-amber-700', label: 'Investigating' },
  confirmed: { color: 'bg-purple-100 text-purple-700', label: 'Confirmed' },
  dismissed: { color: 'bg-gray-100 text-gray-700', label: 'Dismissed' }
};

export default function FraudDetectionPage() {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('fraud_alerts')
        .select(`
          *,
          user:user_id (full_name, email, created_at)
        `)
        .order('created_at', { ascending: false });

      if (filterSeverity) query = query.eq('severity', filterSeverity);
      if (filterStatus) query = query.eq('status', filterStatus);
      if (filterType) query = query.eq('alert_type', filterType);

      const { data, error } = await query;
      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching fraud alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [filterSeverity, filterStatus, filterType]);

  const updateAlertStatus = async (alertId: string, newStatus: string, action?: string) => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const updateData: any = {
        status: newStatus,
        investigated_by: user?.id,
        investigated_at: new Date().toISOString()
      };

      if (action) {
        updateData.action_taken = action;
      }

      const { error } = await supabase
        .from('fraud_alerts')
        .update(updateData)
        .eq('id', alertId);

      if (error) throw error;

      // Log audit
      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        action: `fraud_alert_${newStatus}`,
        entity_type: 'fraud_alert',
        entity_id: alertId,
        details: { status: newStatus, action }
      });

      setSelectedAlert(null);
      setActionNote('');
      fetchAlerts();
    } catch (error) {
      console.error('Error updating alert:', error);
    } finally {
      setProcessing(false);
    }
  };

  const suspendUser = async (userId: string, alertId: string) => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Update user status
      await supabase
        .from('profiles')
        .update({ is_suspended: true })
        .eq('id', userId);

      // Update alert
      await supabase
        .from('fraud_alerts')
        .update({
          status: 'confirmed',
          action_taken: 'User suspended',
          investigated_by: user?.id,
          investigated_at: new Date().toISOString()
        })
        .eq('id', alertId);

      // Log audit
      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        action: 'suspend_user_fraud',
        entity_type: 'user',
        entity_id: userId,
        details: { fraud_alert_id: alertId }
      });

      setSelectedAlert(null);
      fetchAlerts();
    } catch (error) {
      console.error('Error suspending user:', error);
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const stats = {
    critical: alerts.filter(a => a.severity === 'critical' && a.status !== 'dismissed').length,
    new: alerts.filter(a => a.status === 'new').length,
    investigating: alerts.filter(a => a.status === 'investigating').length,
    confirmed: alerts.filter(a => a.status === 'confirmed').length
  };

  const filteredAlerts = alerts.filter(a => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      a.description?.toLowerCase().includes(query) ||
      a.alert_type.toLowerCase().includes(query) ||
      a.user?.full_name?.toLowerCase().includes(query) ||
      a.user?.email?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FiShield className="w-7 h-7 text-red-600" />
            Fraud Detection
          </h1>
          <p className="text-gray-600 text-sm mt-1">Monitor and investigate suspicious activity</p>
        </div>
        <button
          onClick={fetchAlerts}
          className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 text-sm"
        >
          <FiRefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-red-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <FiAlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
              <p className="text-xs text-gray-600">Critical</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <FiActivity className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.new}</p>
              <p className="text-xs text-gray-600">New Alerts</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FiEye className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.investigating}</p>
              <p className="text-xs text-gray-600">Investigating</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FiSlash className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.confirmed}</p>
              <p className="text-xs text-gray-600">Confirmed Fraud</p>
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
              placeholder="Search alerts..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 flex-wrap">
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Severity</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="new">New</option>
              <option value="investigating">Investigating</option>
              <option value="confirmed">Confirmed</option>
              <option value="dismissed">Dismissed</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              {Object.entries(ALERT_TYPE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts List */}
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
          ) : filteredAlerts.length === 0 ? (
            <div className="bg-white rounded-xl p-12 shadow-sm border text-center">
              <FiShield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No fraud alerts</p>
              <p className="text-gray-400 text-sm mt-1">System is running smoothly</p>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const TypeConfig = ALERT_TYPE_CONFIG[alert.alert_type] || { icon: FiAlertTriangle, label: alert.alert_type, color: 'text-gray-600' };
              const TypeIcon = TypeConfig.icon;
              const isSelected = selectedAlert?.id === alert.id;

              return (
                <div
                  key={alert.id}
                  className={`bg-white rounded-xl p-4 shadow-sm border cursor-pointer transition-all ${
                    SEVERITY_CONFIG[alert.severity].color
                  } ${isSelected ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}`}
                  onClick={() => setSelectedAlert(alert)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full bg-white shadow-sm`}>
                      <TypeIcon className={`w-5 h-5 ${TypeConfig.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase ${SEVERITY_CONFIG[alert.severity].color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${SEVERITY_CONFIG[alert.severity].dot}`} />
                          {alert.severity}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[alert.status].color}`}>
                          {STATUS_CONFIG[alert.status].label}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900">{TypeConfig.label}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2 mt-1">{alert.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <FiUser className="w-3 h-3" />
                          {alert.user?.full_name || 'Unknown'}
                        </span>
                        <span>{formatDate(alert.created_at)}</span>
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
          {selectedAlert ? (
            <div className="bg-white rounded-xl shadow-sm border sticky top-4">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Alert Details</h3>
                  <button
                    onClick={() => setSelectedAlert(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiXCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4 max-h-[calc(100vh-250px)] overflow-auto">
                {/* Severity Badge */}
                <div className={`p-3 rounded-lg ${SEVERITY_CONFIG[selectedAlert.severity].color}`}>
                  <div className="flex items-center gap-2">
                    <FiAlertTriangle className={`w-5 h-5 ${SEVERITY_CONFIG[selectedAlert.severity].icon}`} />
                    <span className="font-bold uppercase">{selectedAlert.severity} Severity</span>
                  </div>
                </div>

                {/* Alert Type */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Alert Type</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {ALERT_TYPE_CONFIG[selectedAlert.alert_type]?.label || selectedAlert.alert_type}
                  </p>
                </div>

                {/* User Info */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <label className="text-xs font-medium text-gray-500 uppercase">User</label>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <FiUser className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{selectedAlert.user?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{selectedAlert.user?.email}</p>
                    </div>
                  </div>
                  {selectedAlert.user?.created_at && (
                    <p className="text-xs text-gray-400 mt-2">
                      Account created: {formatDate(selectedAlert.user.created_at)}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Description</label>
                  <p className="text-sm text-gray-700 mt-1">{selectedAlert.description}</p>
                </div>

                {/* Evidence */}
                {selectedAlert.evidence && Object.keys(selectedAlert.evidence).length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Evidence</label>
                    <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-auto max-h-32 mt-1">
                      {JSON.stringify(selectedAlert.evidence, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Status */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Status</label>
                  <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[selectedAlert.status].color}`}>
                    {STATUS_CONFIG[selectedAlert.status].label}
                  </span>
                </div>

                {/* Action Taken */}
                {selectedAlert.action_taken && (
                  <div className="bg-purple-50 rounded-lg p-3">
                    <label className="text-xs font-medium text-purple-700 uppercase">Action Taken</label>
                    <p className="text-sm text-purple-800 mt-1">{selectedAlert.action_taken}</p>
                  </div>
                )}

                {/* Actions */}
                {(selectedAlert.status === 'new' || selectedAlert.status === 'investigating') && (
                  <div className="border-t pt-4 space-y-3">
                    {selectedAlert.status === 'new' && (
                      <button
                        onClick={() => updateAlertStatus(selectedAlert.id, 'investigating')}
                        disabled={processing}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                      >
                        <FiEye className="w-4 h-4" />
                        Start Investigation
                      </button>
                    )}
                    
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Action Note</label>
                      <textarea
                        value={actionNote}
                        onChange={(e) => setActionNote(e.target.value)}
                        placeholder="Describe action taken..."
                        rows={2}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => updateAlertStatus(selectedAlert.id, 'dismissed', actionNote)}
                        disabled={processing}
                        className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm font-medium"
                      >
                        <FiCheckCircle className="w-4 h-4" />
                        Dismiss
                      </button>
                      <button
                        onClick={() => updateAlertStatus(selectedAlert.id, 'confirmed', actionNote)}
                        disabled={processing}
                        className="flex items-center justify-center gap-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
                      >
                        <FiAlertTriangle className="w-4 h-4" />
                        Confirm
                      </button>
                    </div>

                    <button
                      onClick={() => suspendUser(selectedAlert.user_id, selectedAlert.id)}
                      disabled={processing}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                    >
                      <FiSlash className="w-4 h-4" />
                      Suspend User
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-8 shadow-sm border text-center">
              <FiEye className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Select an alert</p>
              <p className="text-gray-400 text-sm mt-1">Click on an alert to investigate</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
