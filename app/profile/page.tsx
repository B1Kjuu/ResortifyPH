'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function ProfilePage(){
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null)
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    
    async function load(){
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) { 
          router.push('/auth/login')
          return 
        }

        const { data: userProfile, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
        if (error || !userProfile) {
          console.error('Profile error:', error)
          router.push('/')
          return
        }

        if (mounted) {
          setProfile(userProfile)
          setFullName(userProfile.full_name || '')
          setLoading(false)
        }
      } catch (err) {
        console.error('Profile page error:', err)
        if (mounted) setLoading(false)
      }
    }
    
    load()
    
    return () => { mounted = false }
  }, [])

  async function handleSave(){
    setSaving(true)
    setMessage(null)
    
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', profile.id)
    
    if (error) {
      setMessage({ text: `Error: ${error.message}`, type: 'error' })
    } else {
      setProfile({ ...profile, full_name: fullName })
      setMessage({ text: 'Profile updated successfully!', type: 'success' })
      setEditing(false)
    }
    
    setSaving(false)
  }

  if (loading) return <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center text-slate-600">Loading profile...</div>

  const getRoleBadgeColor = () => {
    if (profile.is_admin) return 'bg-purple-100 text-purple-800'
    if (profile.role === 'owner') return 'bg-blue-100 text-blue-800'
    return 'bg-green-100 text-green-800'
  }

  const getRoleLabel = () => {
    if (profile.is_admin) return 'Admin'
    if (profile.role === 'owner') return 'Resort Owner'
    return 'Guest'
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-resort-50 to-resort-100 px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-3xl mx-auto">
        <Link href={profile.is_admin ? '/admin/command-center' : profile.role === 'owner' ? '/owner/empire' : '/guest/adventure-hub'} className="text-sm text-resort-500 font-semibold mb-6 inline-block hover:text-resort-600">
          ← Back to Dashboard
        </Link>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-resort-500 to-resort-600 px-8 py-12 text-white text-center">
            <div className="w-24 h-24 bg-white rounded-full mx-auto mb-4 flex items-center justify-center text-4xl shadow-lg">
              👤
            </div>
            <h1 className="text-3xl font-bold mb-2">{profile.full_name || 'User'}</h1>
            <span className={`inline-block px-4 py-1 rounded-full text-sm font-semibold ${getRoleBadgeColor()}`}>
              {getRoleLabel()}
            </span>
          </div>

          {/* Message */}
          {message && (
            <div className={`mx-8 mt-6 px-4 py-3 rounded-lg text-sm font-semibold ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
              {message.text}
            </div>
          )}

          {/* Profile Info */}
          <div className="px-8 py-8">
            <h2 className="text-xl font-semibold text-resort-900 mb-6">Profile Information</h2>
            
            <div className="space-y-6">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                <input 
                  type="email" 
                  value={profile.email} 
                  disabled 
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
                {editing ? (
                  <input 
                    type="text" 
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 border border-resort-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-resort-500"
                    placeholder="Enter your full name"
                  />
                ) : (
                  <div className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-white text-slate-900">
                    {profile.full_name || 'Not set'}
                  </div>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Account Type</label>
                <input 
                  type="text" 
                  value={getRoleLabel()} 
                  disabled 
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 mt-1">Account type cannot be changed</p>
              </div>

              {/* Created Date */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Member Since</label>
                <input 
                  type="text" 
                  value={new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} 
                  disabled 
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-8">
              {editing ? (
                <>
                  <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 px-6 py-3 bg-resort-500 text-white rounded-lg font-semibold hover:bg-resort-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button 
                    onClick={() => {
                      setEditing(false)
                      setFullName(profile.full_name || '')
                      setMessage(null)
                    }}
                    disabled={saving}
                    className="flex-1 px-6 py-3 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setEditing(true)}
                  className="w-full px-6 py-3 bg-resort-500 text-white rounded-lg font-semibold hover:bg-resort-600 transition"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <Link href="/resorts" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition text-center">
            <div className="text-3xl mb-2">🏖️</div>
            <h3 className="font-semibold text-resort-900">Browse Resorts</h3>
          </Link>
          {profile.role === 'guest' && (
            <Link href="/guest/trips" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition text-center">
              <div className="text-3xl mb-2">🎫</div>
              <h3 className="font-semibold text-resort-900">My Trips</h3>
            </Link>
          )}
          {profile.role === 'owner' && (
            <Link href="/owner/properties" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition text-center">
              <div className="text-3xl mb-2">🏨</div>
              <h3 className="font-semibold text-resort-900">My Properties</h3>
            </Link>
          )}
          {profile.is_admin && (
            <Link href="/admin/approvals" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition text-center">
              <div className="text-3xl mb-2">✓</div>
              <h3 className="font-semibold text-resort-900">Approvals</h3>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
