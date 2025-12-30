'use client'
import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { FiSearch, FiUser, FiMail, FiCalendar, FiShield, FiAlertTriangle, FiCheck, FiX, FiEye, FiTrash2, FiSlash, FiUnlock, FiFilter, FiRefreshCw } from 'react-icons/fi'
import Link from 'next/link'

type User = {
  id: string
  email: string
  full_name: string | null
  role: string
  is_admin: boolean
  created_at: string
  avatar_url: string | null
  is_suspended?: boolean
  suspended_reason?: string
  suspended_at?: string
  last_login_at?: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'guest' | 'owner' | 'admin'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')
  const [processing, setProcessing] = useState(false)
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

      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single()

      if (!profile?.is_admin) {
        router.push('/')
        return
      }

      await loadUsers()
    } catch (err) {
      console.error('Admin check failed:', err)
      router.push('/')
    }
  }

  async function loadUsers() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error('Error loading users:', err)
    } finally {
      setLoading(false)
    }
  }

  async function suspendUser(userId: string) {
    if (!suspendReason.trim()) return
    setProcessing(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_suspended: true,
          suspended_reason: suspendReason,
          suspended_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error
      
      await loadUsers()
      setShowSuspendModal(false)
      setSelectedUser(null)
      setSuspendReason('')
    } catch (err) {
      console.error('Error suspending user:', err)
      alert('Failed to suspend user')
    } finally {
      setProcessing(false)
    }
  }

  async function unsuspendUser(userId: string) {
    setProcessing(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_suspended: false,
          suspended_reason: null,
          suspended_at: null
        })
        .eq('id', userId)

      if (error) throw error
      await loadUsers()
    } catch (err) {
      console.error('Error unsuspending user:', err)
      alert('Failed to unsuspend user')
    } finally {
      setProcessing(false)
    }
  }

  async function updateUserRole(userId: string, role: string) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId)

      if (error) throw error
      await loadUsers()
    } catch (err) {
      console.error('Error updating role:', err)
      alert('Failed to update role')
    }
  }

  async function toggleAdmin(userId: string, isAdmin: boolean) {
    if (!confirm(isAdmin ? 'Grant admin privileges?' : 'Revoke admin privileges?')) return
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: isAdmin })
        .eq('id', userId)

      if (error) throw error
      await loadUsers()
    } catch (err) {
      console.error('Error toggling admin:', err)
      alert('Failed to update admin status')
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.role === roleFilter || (roleFilter === 'admin' && user.is_admin)
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'suspended' && user.is_suspended) ||
      (statusFilter === 'active' && !user.is_suspended)
    return matchesSearch && matchesRole && matchesStatus
  })

  const stats = {
    total: users.length,
    guests: users.filter(u => u.role === 'guest').length,
    owners: users.filter(u => u.role === 'owner').length,
    admins: users.filter(u => u.is_admin).length,
    suspended: users.filter(u => u.is_suspended).length
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <Link href="/admin/command-center" className="text-sm text-resort-500 hover:underline mb-2 inline-block">← Back to Command Center</Link>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <FiUser className="w-6 h-6 text-slate-600" />
                User Management
              </h1>
            </div>
            <button
              onClick={loadUsers}
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
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
            <p className="text-xs text-slate-500">Total Users</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.guests}</p>
            <p className="text-xs text-slate-500">Guests</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.owners}</p>
            <p className="text-xs text-slate-500">Owners</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.admins}</p>
            <p className="text-xs text-slate-500">Admins</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.suspended}</p>
            <p className="text-xs text-slate-500">Suspended</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-resort-500 focus:border-resort-500"
              />
            </div>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value as any)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-resort-500 focus:border-resort-500"
            >
              <option value="all">All Roles</option>
              <option value="guest">Guests</option>
              <option value="owner">Owners</option>
              <option value="admin">Admins</option>
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-resort-500 focus:border-resort-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-resort-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Joined</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className={`hover:bg-slate-50 ${user.is_suspended ? 'bg-red-50/50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <FiUser className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-800 truncate">{user.full_name || 'No name'}</p>
                            <p className="text-xs text-slate-500 truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === 'owner' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {user.role}
                          </span>
                          {user.is_admin && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                              admin
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {user.is_suspended ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                            <FiSlash className="w-3 h-3" /> Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            <FiCheck className="w-3 h-3" /> Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                            title="View details"
                          >
                            <FiEye className="w-4 h-4" />
                          </button>
                          {user.is_suspended ? (
                            <button
                              onClick={() => unsuspendUser(user.id)}
                              className="p-2 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                              title="Unsuspend"
                            >
                              <FiUnlock className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => { setSelectedUser(user); setShowSuspendModal(true) }}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                              title="Suspend"
                            >
                              <FiSlash className="w-4 h-4" />
                            </button>
                          )}
                          {!user.is_admin && (
                            <button
                              onClick={() => toggleAdmin(user.id, true)}
                              className="p-2 text-purple-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg"
                              title="Make admin"
                            >
                              <FiShield className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredUsers.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                No users found matching your criteria
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {selectedUser && !showSuspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-white border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">User Details</h2>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                  {selectedUser.avatar_url ? (
                    <img src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <FiUser className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{selectedUser.full_name || 'No name'}</h3>
                  <p className="text-slate-500">{selectedUser.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">User ID</p>
                    <p className="text-sm font-mono text-slate-700 break-all">{selectedUser.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Role</p>
                    <select
                      value={selectedUser.role}
                      onChange={e => updateUserRole(selectedUser.id, e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    >
                      <option value="guest">Guest</option>
                      <option value="owner">Owner</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Joined</p>
                    <p className="text-sm text-slate-700">{new Date(selectedUser.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Admin</p>
                    <p className="text-sm text-slate-700">{selectedUser.is_admin ? 'Yes' : 'No'}</p>
                  </div>
                </div>

                {selectedUser.is_suspended && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="font-medium text-red-800 mb-1">⚠️ Account Suspended</p>
                    <p className="text-sm text-red-600">{selectedUser.suspended_reason || 'No reason provided'}</p>
                    <p className="text-xs text-red-500 mt-2">
                      Suspended on: {selectedUser.suspended_at ? new Date(selectedUser.suspended_at).toLocaleString() : 'Unknown'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Suspend User Modal */}
      {showSuspendModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <FiSlash className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Suspend User</h2>
                  <p className="text-sm text-slate-500">{selectedUser.email}</p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Reason for suspension <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={suspendReason}
                  onChange={e => setSuspendReason(e.target.value)}
                  placeholder="Explain why this user is being suspended..."
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => suspendUser(selectedUser.id)}
                  disabled={processing || !suspendReason.trim()}
                  className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {processing ? 'Suspending...' : 'Suspend User'}
                </button>
                <button
                  onClick={() => { setShowSuspendModal(false); setSuspendReason('') }}
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
