'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  FiFlag,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiToggleLeft,
  FiToggleRight,
  FiUsers,
  FiPercent,
  FiSearch,
  FiSave,
  FiXCircle,
  FiSettings,
  FiCode,
  FiZap
} from 'react-icons/fi';

interface FeatureFlag {
  id: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  rollout_percentage: number;
  target_users: string[];
  target_roles: string[];
  metadata: Record<string, any>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    is_enabled: false,
    rollout_percentage: 100,
    target_roles: [] as string[]
  });

  const fetchFlags = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setFlags(data || []);
    } catch (error) {
      console.error('Error fetching feature flags:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      is_enabled: false,
      rollout_percentage: 100,
      target_roles: []
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (flag: FeatureFlag) => {
    setForm({
      name: flag.name,
      description: flag.description || '',
      is_enabled: flag.is_enabled,
      rollout_percentage: flag.rollout_percentage,
      target_roles: flag.target_roles || []
    });
    setEditingId(flag.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const flagData = {
        name: form.name.trim().toLowerCase().replace(/\s+/g, '_'),
        description: form.description.trim() || null,
        is_enabled: form.is_enabled,
        rollout_percentage: form.rollout_percentage,
        target_roles: form.target_roles,
        created_by: user?.id
      };

      if (editingId) {
        const { error } = await supabase
          .from('feature_flags')
          .update(flagData)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('feature_flags')
          .insert(flagData);

        if (error) throw error;
      }

      // Log audit
      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        action: editingId ? 'edit_feature_flag' : 'create_feature_flag',
        entity_type: 'feature_flag',
        entity_id: editingId || undefined,
        details: { name: form.name, is_enabled: form.is_enabled }
      });

      resetForm();
      fetchFlags();
    } catch (error) {
      console.error('Error saving feature flag:', error);
    } finally {
      setProcessing(false);
    }
  };

  const toggleFlag = async (id: string, isEnabled: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('feature_flags')
        .update({ is_enabled: !isEnabled, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      // Log audit
      const flag = flags.find(f => f.id === id);
      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        action: 'toggle_feature_flag',
        entity_type: 'feature_flag',
        entity_id: id,
        details: { name: flag?.name, enabled: !isEnabled }
      });

      fetchFlags();
    } catch (error) {
      console.error('Error toggling flag:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this feature flag?')) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const flag = flags.find(f => f.id === id);
      const { error } = await supabase
        .from('feature_flags')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        action: 'delete_feature_flag',
        entity_type: 'feature_flag',
        entity_id: id,
        details: { name: flag?.name }
      });

      fetchFlags();
    } catch (error) {
      console.error('Error deleting flag:', error);
    }
  };

  const toggleRole = (role: string) => {
    if (form.target_roles.includes(role)) {
      setForm({ ...form, target_roles: form.target_roles.filter(r => r !== role) });
    } else {
      setForm({ ...form, target_roles: [...form.target_roles, role] });
    }
  };

  const filteredFlags = flags.filter(f => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      f.name.toLowerCase().includes(query) ||
      f.description?.toLowerCase().includes(query)
    );
  });

  const enabledCount = flags.filter(f => f.is_enabled).length;

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8 pb-24 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FiFlag className="w-7 h-7 text-purple-600" />
            Feature Flags
          </h1>
          <p className="text-gray-600 text-sm mt-1">Control feature rollouts and A/B testing</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
        >
          <FiPlus className="w-4 h-4" />
          New Flag
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FiFlag className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{flags.length}</p>
              <p className="text-xs text-gray-600">Total Flags</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FiZap className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{enabledCount}</p>
              <p className="text-xs text-gray-600">Enabled</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <FiSettings className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{flags.length - enabledCount}</p>
              <p className="text-xs text-gray-600">Disabled</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl p-4 shadow-sm border mb-6">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search flags..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Flags List */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm border animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : filteredFlags.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-sm border text-center">
            <FiFlag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No feature flags</p>
            <p className="text-gray-400 text-sm mt-1">Create your first feature flag</p>
          </div>
        ) : (
          filteredFlags.map((flag) => (
            <div
              key={flag.id}
              className={`bg-white rounded-xl shadow-sm border overflow-hidden ${!flag.is_enabled ? 'opacity-70' : ''}`}
            >
              <div className="p-4 lg:p-6">
                <div className="flex items-start gap-4">
                  {/* Toggle */}
                  <button
                    onClick={() => toggleFlag(flag.id, flag.is_enabled)}
                    className="mt-0.5"
                  >
                    {flag.is_enabled ? (
                      <FiToggleRight className="w-10 h-6 text-green-600" />
                    ) : (
                      <FiToggleLeft className="w-10 h-6 text-gray-400" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="font-mono text-sm font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                        {flag.name}
                      </code>
                      {flag.rollout_percentage < 100 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                          <FiPercent className="w-3 h-3" />
                          {flag.rollout_percentage}%
                        </span>
                      )}
                      {flag.target_roles.length > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                          <FiUsers className="w-3 h-3" />
                          {flag.target_roles.join(', ')}
                        </span>
                      )}
                    </div>
                    {flag.description && (
                      <p className="text-sm text-gray-600 mt-1">{flag.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(flag)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-blue-600"
                      title="Edit"
                    >
                      <FiEdit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(flag.id)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-red-600"
                      title="Delete"
                    >
                      <FiTrash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Code Snippet */}
      <div className="mt-8 bg-gray-900 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <FiCode className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">Usage Example</span>
        </div>
        <pre className="text-sm text-green-400 overflow-x-auto">
{`// Check if feature is enabled
const { data } = await supabase
  .from('feature_flags')
  .select('is_enabled, rollout_percentage')
  .eq('name', 'new_booking_flow')
  .single();

if (data?.is_enabled) {
  // Show new feature
}`}
        </pre>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => resetForm()}>
          <div className="bg-white rounded-xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? 'Edit Feature Flag' : 'New Feature Flag'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Flag Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., new_booking_flow"
                  required
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">Use snake_case for flag names</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What does this flag control?"
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Enabled */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_enabled}
                  onChange={(e) => setForm({ ...form, is_enabled: e.target.checked })}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-5 h-5"
                />
                <span className="text-sm text-gray-700">Enable this feature flag</span>
              </label>

              {/* Rollout Percentage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rollout Percentage: {form.rollout_percentage}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={form.rollout_percentage}
                  onChange={(e) => setForm({ ...form, rollout_percentage: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Target Roles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Roles (optional)</label>
                <div className="flex flex-wrap gap-2">
                  {['guest', 'owner', 'admin'].map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        form.target_roles.includes(role)
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">Leave empty to target all users</p>
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
                  disabled={processing || !form.name.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
                >
                  <FiSave className="w-4 h-4" />
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
