'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  FiVolume2,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiEye,
  FiEyeOff,
  FiCalendar,
  FiUsers,
  FiBell,
  FiInfo,
  FiAlertTriangle,
  FiCheckCircle,
  FiXCircle,
  FiSettings
} from 'react-icons/fi';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'maintenance';
  target_audience: 'all' | 'guests' | 'owners' | 'admins';
  display_type: 'banner' | 'modal' | 'toast';
  is_active: boolean;
  is_dismissible: boolean;
  starts_at: string;
  ends_at: string | null;
  created_by: string | null;
  created_at: string;
}

const TYPE_CONFIG = {
  info: { icon: FiInfo, color: 'bg-blue-100 text-blue-700 border-blue-200', preview: 'bg-blue-500' },
  warning: { icon: FiAlertTriangle, color: 'bg-amber-100 text-amber-700 border-amber-200', preview: 'bg-amber-500' },
  success: { icon: FiCheckCircle, color: 'bg-green-100 text-green-700 border-green-200', preview: 'bg-green-500' },
  error: { icon: FiXCircle, color: 'bg-red-100 text-red-700 border-red-200', preview: 'bg-red-500' },
  maintenance: { icon: FiSettings, color: 'bg-purple-100 text-purple-700 border-purple-200', preview: 'bg-purple-500' }
};

const AUDIENCE_CONFIG = {
  all: { label: 'All Users', icon: FiUsers },
  guests: { label: 'Guests Only', icon: FiUsers },
  owners: { label: 'Owners Only', icon: FiUsers },
  admins: { label: 'Admins Only', icon: FiUsers }
};

const DISPLAY_CONFIG = {
  banner: { label: 'Banner', description: 'Shows at top of page' },
  modal: { label: 'Modal', description: 'Popup dialog box' },
  toast: { label: 'Toast', description: 'Corner notification' }
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [form, setForm] = useState<{
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'error' | 'maintenance';
    target_audience: 'all' | 'guests' | 'owners' | 'admins';
    display_type: 'banner' | 'modal' | 'toast';
    is_dismissible: boolean;
    starts_at: string;
    ends_at: string;
  }>({
    title: '',
    message: '',
    type: 'info',
    target_audience: 'all',
    display_type: 'banner',
    is_dismissible: true,
    starts_at: new Date().toISOString().slice(0, 16),
    ends_at: ''
  });

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const resetForm = () => {
    setForm({
      title: '',
      message: '',
      type: 'info',
      target_audience: 'all',
      display_type: 'banner',
      is_dismissible: true,
      starts_at: new Date().toISOString().slice(0, 16),
      ends_at: ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (announcement: Announcement) => {
    setForm({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type,
      target_audience: announcement.target_audience,
      display_type: announcement.display_type,
      is_dismissible: announcement.is_dismissible,
      starts_at: announcement.starts_at.slice(0, 16),
      ends_at: announcement.ends_at ? announcement.ends_at.slice(0, 16) : ''
    });
    setEditingId(announcement.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return;
    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const announcementData = {
        title: form.title.trim(),
        message: form.message.trim(),
        type: form.type,
        target_audience: form.target_audience,
        display_type: form.display_type,
        is_dismissible: form.is_dismissible,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        created_by: user?.id
      };

      if (editingId) {
        const { error } = await supabase
          .from('announcements')
          .update(announcementData)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('announcements')
          .insert(announcementData);

        if (error) throw error;
      }

      // Log audit
      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        action: editingId ? 'edit_announcement' : 'create_announcement',
        entity_type: 'announcement',
        entity_id: editingId || undefined,
        details: { title: form.title }
      });

      resetForm();
      fetchAnnouncements();
    } catch (error) {
      console.error('Error saving announcement:', error);
    } finally {
      setProcessing(false);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      fetchAnnouncements();
    } catch (error) {
      console.error('Error toggling announcement:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        action: 'delete_announcement',
        entity_type: 'announcement',
        entity_id: id
      });

      fetchAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
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

  const isAnnouncementActive = (announcement: Announcement) => {
    if (!announcement.is_active) return false;
    const now = new Date();
    const start = new Date(announcement.starts_at);
    if (now < start) return false;
    if (announcement.ends_at && now > new Date(announcement.ends_at)) return false;
    return true;
  };

  const stats = {
    active: announcements.filter(isAnnouncementActive).length,
    scheduled: announcements.filter(a => a.is_active && new Date(a.starts_at) > new Date()).length,
    total: announcements.length
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FiVolume2 className="w-7 h-7 text-blue-600" />
            System Announcements
          </h1>
          <p className="text-gray-600 text-sm mt-1">Create and manage platform-wide notifications</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <FiPlus className="w-4 h-4" />
          New Announcement
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FiBell className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              <p className="text-xs text-gray-600">Active Now</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FiCalendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.scheduled}</p>
              <p className="text-xs text-gray-600">Scheduled</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <FiVolume2 className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-600">Total</p>
            </div>
          </div>
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm border animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-sm border text-center">
            <FiVolume2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No announcements</p>
            <p className="text-gray-400 text-sm mt-1">Create your first announcement</p>
          </div>
        ) : (
          announcements.map((announcement) => {
            const TypeConfig = TYPE_CONFIG[announcement.type];
            const TypeIcon = TypeConfig.icon;
            const isActive = isAnnouncementActive(announcement);

            return (
              <div
                key={announcement.id}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden ${!announcement.is_active ? 'opacity-60' : ''}`}
              >
                {/* Preview Banner */}
                <div className={`h-1 ${TypeConfig.preview}`} />

                <div className="p-4 lg:p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${TypeConfig.color}`}>
                      <TypeIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-gray-900">{announcement.title}</h3>
                        {isActive ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            Active
                          </span>
                        ) : announcement.is_active && new Date(announcement.starts_at) > new Date() ? (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                            Scheduled
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{announcement.message}</p>

                      <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500">
                        <span className={`px-2 py-0.5 rounded ${TypeConfig.color}`}>
                          {announcement.type}
                        </span>
                        <span className="capitalize">{announcement.target_audience}</span>
                        <span className="capitalize">{announcement.display_type}</span>
                        <span className="flex items-center gap-1">
                          <FiCalendar className="w-3 h-3" />
                          {formatDate(announcement.starts_at)}
                          {announcement.ends_at && ` - ${formatDate(announcement.ends_at)}`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => toggleActive(announcement.id, announcement.is_active)}
                        className={`p-2 rounded-lg hover:bg-gray-100 ${announcement.is_active ? 'text-green-600' : 'text-gray-400'}`}
                        title={announcement.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {announcement.is_active ? <FiEye className="w-5 h-5" /> : <FiEyeOff className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => handleEdit(announcement)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-blue-600"
                        title="Edit"
                      >
                        <FiEdit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(announcement.id)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-red-600"
                        title="Delete"
                      >
                        <FiTrash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => resetForm()}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? 'Edit Announcement' : 'New Announcement'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Announcement title"
                  required
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Announcement message"
                  rows={4}
                  required
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Type & Display */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="success">Success</option>
                    <option value="error">Error</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Type</label>
                  <select
                    value={form.display_type}
                    onChange={(e) => setForm({ ...form, display_type: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="banner">Banner</option>
                    <option value="modal">Modal</option>
                    <option value="toast">Toast</option>
                  </select>
                </div>
              </div>

              {/* Audience */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
                <select
                  value={form.target_audience}
                  onChange={(e) => setForm({ ...form, target_audience: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Users</option>
                  <option value="guests">Guests Only</option>
                  <option value="owners">Owners Only</option>
                  <option value="admins">Admins Only</option>
                </select>
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                    required
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date (Optional)</label>
                  <input
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Dismissible */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_dismissible}
                  onChange={(e) => setForm({ ...form, is_dismissible: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Allow users to dismiss</span>
              </label>

              {/* Preview */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                <div className={`p-4 rounded-lg ${TYPE_CONFIG[form.type].color}`}>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const Icon = TYPE_CONFIG[form.type].icon;
                      return <Icon className="w-5 h-5" />;
                    })()}
                    <span className="font-medium">{form.title || 'Title'}</span>
                  </div>
                  <p className="text-sm mt-1 opacity-90">{form.message || 'Message will appear here'}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing || !form.title.trim() || !form.message.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                >
                  {processing ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
