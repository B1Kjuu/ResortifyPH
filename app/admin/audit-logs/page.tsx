'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  FiSearch,
  FiFilter,
  FiDownload,
  FiCalendar,
  FiUser,
  FiActivity,
  FiEye,
  FiChevronLeft,
  FiChevronRight,
  FiAlertCircle,
  FiCheckCircle,
  FiXCircle,
  FiEdit,
  FiTrash2,
  FiShield
} from 'react-icons/fi';

interface AuditLog {
  id: string;
  admin_id: string;
  admin_email?: string;
  admin_name?: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, any>;
  ip_address: string | null;
  created_at: string;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  approve: <FiCheckCircle className="w-4 h-4 text-green-500" />,
  reject: <FiXCircle className="w-4 h-4 text-red-500" />,
  suspend: <FiAlertCircle className="w-4 h-4 text-amber-500" />,
  delete: <FiTrash2 className="w-4 h-4 text-red-500" />,
  edit: <FiEdit className="w-4 h-4 text-blue-500" />,
  view: <FiEye className="w-4 h-4 text-gray-500" />,
  default: <FiActivity className="w-4 h-4 text-gray-500" />
};

const ACTION_COLORS: Record<string, string> = {
  approve: 'bg-green-100 text-green-800',
  reject: 'bg-red-100 text-red-800',
  suspend: 'bg-amber-100 text-amber-800',
  delete: 'bg-red-100 text-red-800',
  edit: 'bg-blue-100 text-blue-800',
  create: 'bg-purple-100 text-purple-800',
  login: 'bg-gray-100 text-gray-800',
  default: 'bg-gray-100 text-gray-800'
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const pageSize = 20;

  const uniqueActions = ['approve_resort', 'reject_resort', 'suspend_user', 'unsuspend_user', 'delete_resort', 'edit_resort', 'resolve_dispute', 'verify_user'];
  const uniqueEntities = ['resort', 'user', 'booking', 'dispute', 'review', 'message'];

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          profiles:admin_id (
            email,
            full_name
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (filterAction) {
        query = query.eq('action', filterAction);
      }

      if (filterEntity) {
        query = query.eq('entity_type', filterEntity);
      }

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }

      if (dateTo) {
        query = query.lte('created_at', dateTo + 'T23:59:59');
      }

      if (searchQuery) {
        query = query.or(`action.ilike.%${searchQuery}%,entity_type.ilike.%${searchQuery}%`);
      }

      const { data, count, error } = await query;

      if (error) throw error;

      const formattedLogs = data?.map((log: any) => ({
        ...log,
        admin_email: log.profiles?.email,
        admin_name: log.profiles?.full_name
      })) || [];

      setLogs(formattedLogs);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, filterAction, filterEntity, dateFrom, dateTo]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const exportLogs = () => {
    const csv = [
      ['Date', 'Admin', 'Action', 'Entity Type', 'Entity ID', 'Details', 'IP Address'].join(','),
      ...logs.map(log => [
        new Date(log.created_at).toISOString(),
        log.admin_email || log.admin_id,
        log.action,
        log.entity_type,
        log.entity_id || '',
        JSON.stringify(log.details).replace(/,/g, ';'),
        log.ip_address || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionIcon = (action: string) => {
    for (const key of Object.keys(ACTION_ICONS)) {
      if (action.toLowerCase().includes(key)) {
        return ACTION_ICONS[key];
      }
    }
    return ACTION_ICONS.default;
  };

  const getActionColor = (action: string) => {
    for (const key of Object.keys(ACTION_COLORS)) {
      if (action.toLowerCase().includes(key)) {
        return ACTION_COLORS[key];
      }
    }
    return ACTION_COLORS.default;
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8 pb-24 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FiShield className="w-7 h-7 text-blue-600" />
            Audit Logs
          </h1>
          <p className="text-gray-600 text-sm mt-1">Track all administrative actions</p>
        </div>
        <button
          onClick={exportLogs}
          className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 text-sm font-medium"
        >
          <FiDownload className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="relative sm:col-span-2 lg:col-span-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </form>

          {/* Action Filter */}
          <div className="relative">
            <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={filterAction}
              onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
            >
              <option value="">All Actions</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{action.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          {/* Entity Filter */}
          <div className="relative">
            <FiActivity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={filterEntity}
              onChange={(e) => { setFilterEntity(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
            >
              <option value="">All Entities</option>
              {uniqueEntities.map(entity => (
                <option key={entity} value={entity}>{entity}</option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div className="relative">
            <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date To */}
          <div className="relative">
            <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <FiActivity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No audit logs found</p>
            <p className="text-gray-400 text-sm mt-1">Logs will appear here when admin actions occur</p>
          </div>
        ) : (
          <>
            {/* Mobile View */}
            <div className="lg:hidden divide-y">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-100 rounded-full">
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-gray-400">
                          {log.entity_type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        by {log.admin_name || log.admin_email || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(log.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View */}
            <table className="hidden lg:table w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <FiUser className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                            {log.admin_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500 truncate max-w-[150px]">
                            {log.admin_email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                        {getActionIcon(log.action)}
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 capitalize">{log.entity_type}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[100px]">{log.entity_id?.slice(0, 8)}...</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">
                      {log.details ? JSON.stringify(log.details).slice(0, 50) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {log.ip_address || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedLog(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Audit Log Details</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Date & Time</label>
                <p className="text-sm text-gray-900">{formatDate(selectedLog.created_at)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Admin</label>
                <p className="text-sm text-gray-900">{selectedLog.admin_name || 'Unknown'}</p>
                <p className="text-xs text-gray-500">{selectedLog.admin_email}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Action</label>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getActionColor(selectedLog.action)}`}>
                  {getActionIcon(selectedLog.action)}
                  {selectedLog.action.replace(/_/g, ' ')}
                </span>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Entity</label>
                <p className="text-sm text-gray-900 capitalize">{selectedLog.entity_type}</p>
                <p className="text-xs text-gray-500 font-mono">{selectedLog.entity_id}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Details</label>
                <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-auto max-h-40">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">IP Address</label>
                <p className="text-sm text-gray-900">{selectedLog.ip_address || 'Not recorded'}</p>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
