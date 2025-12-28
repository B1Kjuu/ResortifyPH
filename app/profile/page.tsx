'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { sanitizeText } from '../../lib/sanitize'
import { FiArrowLeft, FiMail, FiUser, FiTag, FiPhone, FiMapPin, FiEdit3, FiLock, FiClock, FiLink, FiCheckCircle } from 'react-icons/fi'
import { FaUmbrellaBeach, FaHotel, FaTicketAlt, FaSuitcase, FaHeart, FaStar } from 'react-icons/fa'

export default function ProfilePage(){
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')
  const [locationText, setLocationText] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null)
  const [activeTab, setActiveTab] = useState<'personal' | 'account' | 'travel'>('personal')
  const [bookings, setBookings] = useState<any[]>([])
  const [favorites, setFavorites] = useState<any[]>([])
  const [favoritesLoading, setFavoritesLoading] = useState<boolean>(true)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [authUser, setAuthUser] = useState<any>(null)
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [linking, setLinking] = useState<'google' | 'facebook' | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const requireEmail = searchParams.get('requireEmail') === '1'
  const [emailEditOpen, setEmailEditOpen] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [updatingEmail, setUpdatingEmail] = useState(false)

  useEffect(() => {
    let mounted = true
    
    async function load(){
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) { 
          router.push('/auth/signin')
          return 
        }
        setSessionInfo(session)

        const { data: userData } = await supabase.auth.getUser()
        setAuthUser(userData?.user || null)

        const { data: userProfile, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, is_admin, created_at, avatar_url, phone, bio, location')
          .eq('id', session.user.id)
          .maybeSingle()
        if (error || !userProfile) {
          console.error('Profile error:', error)
          router.push('/')
          return
        }

        if (mounted) {
          setProfile(userProfile)
          setFullName(userProfile.full_name || '')
          setPhone(userProfile.phone || '')
          setBio(userProfile.bio || '')
          setLocationText(userProfile.location || '')
          
          const { data: userBookings } = await supabase
            .from('bookings')
            .select('id, date_from, date_to, status, created_at, resort:resorts(id, name, location)')
            .eq('guest_id', session.user.id)
            .order('created_at', { ascending: false })
          setBookings(userBookings || [])

          // Load favorites joined with resorts
          const { data: favs, error: favError } = await supabase
            .from('favorites')
            .select('resort:resorts(id, name, location, price, images)')
            .eq('user_id', session.user.id)
          if (favError) {
            console.error('Favorites error:', favError)
            setFavorites([])
          } else {
            // Flatten and filter valid resorts
            const resorts = (favs || [])
              .map((f: any) => f.resort)
              .filter((r: any) => r && r.id)
            setFavorites(resorts)
          }
          setFavoritesLoading(false)
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
    if (!fullName || fullName.length < 2) {
      toast.error('Full name must be at least 2 characters')
      return
    }

    setSaving(true)
    toast.loading('Saving profile...')
    
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: sanitizeText(fullName, 120),
        phone: sanitizeText(phone, 30),
        bio: sanitizeText(bio, 500),
        location: sanitizeText(locationText, 120)
      })
      .eq('id', profile.id)
    
    setSaving(false)
    toast.dismiss()
    
    if (error) {
      toast.error(`Error: ${error.message}`)
    } else {
      setProfile({ ...profile, full_name: fullName })
      toast.success('Profile updated successfully!')
      setEditing(false)
    }
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
      <div className="max-w-4xl mx-auto">
        <Link href={profile.is_admin ? '/admin/command-center' : profile.role === 'owner' ? '/owner/empire' : '/guest/adventure-hub'} className="inline-flex items-center gap-2 text-resort-600 hover:text-resort-700 font-semibold mb-8 transition-colors">
          <FiArrowLeft aria-hidden />
          <span>Back to Dashboard</span>
        </Link>

        <div className="bg-white rounded-3xl shadow-2xl border-2 border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-resort-500 via-blue-500 to-resort-600 px-8 py-16 text-white text-center relative overflow-hidden flex flex-col items-center">
            <div className="absolute top-4 right-4 text-5xl opacity-20"><FaHotel aria-hidden /></div>
            <div className="relative w-28 h-28 bg-white/20 backdrop-blur-sm rounded-full mx-auto mb-6 flex items-center justify-center text-6xl shadow-2xl border-2 border-white/20 overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile avatar" className="w-full h-full object-cover" />
              ) : (
                <FiUser aria-hidden />
              )}
              {/* Avatar upload trigger */}
              <input
                id="avatar-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  try {
                    if (!file.type.startsWith('image/')) {
                      toast.error('Please upload an image file')
                      return
                    }
                    if (file.size > 2 * 1024 * 1024) { // 2MB limit
                      toast.error('Image must be under 2MB')
                      return
                    }
                    const safeName = file.name.toLowerCase().replace(/[^a-z0-9\.\-]+/g, '-')
                    const filePath = `${profile.id}/${Date.now()}_${safeName}`
                    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { contentType: file.type })
                    if (uploadError) throw uploadError
                    const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filePath)
                    const publicUrl = publicData.publicUrl
                    const { error: updateError } = await supabase
                      .from('profiles')
                      .update({ avatar_url: publicUrl })
                      .eq('id', profile.id)
                    if (updateError) throw updateError
                    setProfile({ ...profile, avatar_url: publicUrl })
                    toast.success('Profile photo updated!')
                  } catch (err: any) {
                    console.error('Avatar upload error:', err)
                    toast.error(`Failed to upload: ${err?.message || 'Unknown error'}`)
                  }
                }}
              />
              <label
                htmlFor="avatar-input"
                className="absolute bottom-3 right-3 z-10 w-8 h-8 rounded-full bg-resort-600 text-white flex items-center justify-center shadow-none cursor-pointer hover:bg-resort-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-resort-300"
                aria-label="Change profile photo"
                title="Change photo"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 5v14M5 12h14" />
                </svg>
              </label>
            </div>
            <h1 className="text-4xl font-bold mb-3">{profile.full_name || 'User'}</h1>
            <div className="flex items-center justify-center gap-3">
              <span className={`inline-block px-6 py-2 rounded-full text-sm font-bold ${getRoleBadgeColor()} border-2 border-current`}>
                {getRoleLabel()}
              </span>
              <span className="text-white/80 font-semibold">•</span>
              <span className="text-white/90 font-medium">Member since {new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`mx-8 mt-6 px-4 py-3 rounded-lg text-sm font-semibold ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
              {message.text}
            </div>
          )}

          {/* Profile Info */}
          <div className="px-8 py-10">
            {/* Email requirement notice */}
            {!profile.email && (
              <div className="mb-6 px-4 py-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm font-semibold">
                Email missing: You’ll receive in-app notifications only. Add an email to ensure booking and review emails reach you.
              </div>
            )}
            {/* Tabs */}
            <div className="mb-6 flex items-center justify-center gap-2">
              <button onClick={() => setActiveTab('personal')} className={`px-4 py-2 rounded-full text-sm font-semibold border ${activeTab==='personal' ? 'bg-resort-600 text-white border-resort-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>Personal Info</button>
              <button onClick={() => setActiveTab('account')} className={`px-4 py-2 rounded-full text-sm font-semibold border ${activeTab==='account' ? 'bg-resort-600 text-white border-resort-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>Account</button>
              <button onClick={() => setActiveTab('travel')} className={`px-4 py-2 rounded-full text-sm font-semibold border ${activeTab==='travel' ? 'bg-resort-600 text-white border-resort-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>Travel</button>
            </div>
            
            {activeTab === 'personal' && (
            <div className="space-y-6">
              {/* Email */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                  <FiMail aria-hidden />
                  <span>Email Address</span>
                </label>
                <input 
                  type="email" 
                  value={profile.email} 
                  disabled 
                  className="w-full px-5 py-3 border-2 border-slate-200 rounded-xl bg-slate-50 text-slate-600 cursor-not-allowed font-medium"
                />
                {requireEmail && (
                  <div className="mt-3 p-4 border-2 border-yellow-200 bg-yellow-50 rounded-xl">
                    <p className="text-sm font-semibold text-yellow-800 mb-2">An email is required to receive booking and review notifications.</p>
                    {!emailEditOpen ? (
                      <button
                        type="button"
                        onClick={() => { setEmailEditOpen(true); setNewEmail('') }}
                        className="px-4 py-2 rounded-lg bg-resort-600 text-white font-semibold hover:bg-resort-700"
                      >
                        Add Email
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="flex-1 px-4 py-2 border-2 border-slate-200 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            if (!newEmail || !newEmail.includes('@')) { toast.error('Enter a valid email'); return }
                            try {
                              setUpdatingEmail(true)
                              toast.loading('Updating email…')
                              const { error } = await supabase.auth.updateUser({ email: newEmail })
                              toast.dismiss()
                              if (error) { toast.error(error.message); setUpdatingEmail(false); return }
                              toast.success('Check your new email for a confirmation link!')
                              setUpdatingEmail(false)
                            } catch (e: any) {
                              toast.dismiss(); setUpdatingEmail(false);
                              toast.error(e?.message || 'Failed to update email')
                            }
                          }}
                          disabled={updatingEmail}
                          className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50"
                        >
                          {updatingEmail ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    )}
                    <p className="mt-2 text-xs text-slate-600">We’ll send a confirmation link to the new address. Once confirmed, dashboards will be accessible.</p>
                  </div>
                )}
              </div>

              {/* Full Name */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                  <FiUser aria-hidden />
                  <span>Full Name</span>
                </label>
                {editing ? (
                  <input 
                    type="text" 
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-5 py-3 border-2 border-resort-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm"
                    placeholder="Enter your full name"
                  />
                ) : (
                  <div className="w-full px-5 py-3 border-2 border-slate-200 rounded-xl bg-white text-slate-900 font-semibold">
                    {profile.full_name || 'Not set'}
                  </div>
                )}
              </div>
              {/* Role */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                  <FiTag aria-hidden />
                  <span>Account Type</span>
                </label>
                <input 
                  type="text" 
                  value={getRoleLabel()} 
                  disabled 
                  className="w-full px-5 py-3 border-2 border-slate-200 rounded-xl bg-slate-50 text-slate-600 cursor-not-allowed font-medium"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                  <FiPhone aria-hidden />
                  <span>Phone</span>
                </label>
                {editing ? (
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" className="w-full px-5 py-3 border-2 border-resort-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm" />
                ) : (
                  <div className="w-full px-5 py-3 border-2 border-slate-200 rounded-xl bg-white text-slate-900">{phone || 'Not set'}</div>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                  <FiMapPin aria-hidden />
                  <span>Location</span>
                </label>
                {editing ? (
                  <input type="text" value={locationText} onChange={(e) => setLocationText(e.target.value)} placeholder="City, Province" className="w-full px-5 py-3 border-2 border-resort-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm" />
                ) : (
                  <div className="w-full px-5 py-3 border-2 border-slate-200 rounded-xl bg-white text-slate-900">{locationText || 'Not set'}</div>
                )}
              </div>

              {/* Bio */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                  <FiEdit3 aria-hidden />
                  <span>Bio</span>
                </label>
                {editing ? (
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell guests a little about you" className="w-full px-5 py-3 border-2 border-resort-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 shadow-sm min-h-[90px]" />
                ) : (
                  <div className="w-full px-5 py-3 border-2 border-slate-200 rounded-xl bg-white text-slate-900">{bio || 'Not set'}</div>
                )}
              </div>
            </div>
            )}

            {activeTab === 'account' && (
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                  <FiLock aria-hidden />
                  <span>Password</span>
                </label>
                <div className="space-y-3">
                  <span className="block text-slate-600 text-sm">Manage your password and security settings.</span>
                  <div className="grid md:grid-cols-3 gap-3">
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Current password"
                      className="w-full px-5 py-3 border-2 border-slate-200 rounded-xl bg-white text-slate-900"
                    />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password (min 8 chars)"
                      className="w-full px-5 py-3 border-2 border-slate-200 rounded-xl bg-white text-slate-900"
                    />
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full px-5 py-3 border-2 border-slate-200 rounded-xl bg-white text-slate-900"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={async () => {
                        if (!currentPassword || !newPassword || !confirmNewPassword) {
                          toast.error('Please fill out all password fields')
                          return
                        }
                        if (newPassword.length < 8) {
                          toast.error('New password must be at least 8 characters')
                          return
                        }
                        if (newPassword !== confirmNewPassword) {
                          toast.error('New passwords do not match')
                          return
                        }
                        try {
                          setChangingPassword(true)
                          // Re-authenticate using current password to confirm identity
                          const email = profile.email as string
                          const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: currentPassword })
                          if (reauthError) {
                            toast.error('Current password is incorrect')
                            setChangingPassword(false)
                            return
                          }
                          const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
                          setChangingPassword(false)
                          if (updateError) {
                            toast.error(updateError.message)
                          } else {
                            setCurrentPassword('')
                            setNewPassword('')
                            setConfirmNewPassword('')
                            toast.success('Password updated successfully')
                          }
                        } catch (err: any) {
                          setChangingPassword(false)
                          toast.error(err?.message || 'Failed to change password')
                        }
                      }}
                      disabled={changingPassword}
                      className="px-5 py-2 rounded-xl bg-resort-600 text-white font-semibold hover:bg-resort-700 disabled:opacity-50"
                    >
                      {changingPassword ? 'Updating...' : 'Change password'}
                    </button>
                    <button
                      onClick={() => { setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword('') }}
                      className="px-5 py-2 rounded-xl bg-slate-200 text-slate-700 font-semibold hover:bg-slate-300"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                  <FiClock aria-hidden />
                  <span>Login Activity</span>
                </label>
                <div className="w-full px-5 py-3 border-2 border-slate-200 rounded-xl bg-white text-slate-900">
                  <div className="grid md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="font-semibold text-slate-700">Last sign-in</div>
                      <div className="text-slate-600">{authUser?.last_sign_in_at ? new Date(authUser.last_sign_in_at).toLocaleString() : '—'}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-700">Session expires</div>
                      <div className="text-slate-600">{sessionInfo?.expires_at ? new Date(sessionInfo.expires_at * 1000).toLocaleString() : '—'}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-700">Primary sign-in</div>
                      <div className="text-slate-600">{authUser?.app_metadata?.provider ? (authUser.app_metadata.provider[0].toUpperCase() + authUser.app_metadata.provider.slice(1)) : 'Email'}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                  <FiLink aria-hidden />
                  <span>Linked Accounts</span>
                </label>
                <div className="w-full px-5 py-3 border-2 border-slate-200 rounded-xl bg-white">
                  <ul className="space-y-3">
                    {['google','facebook'].map((p) => {
                      const connected = authUser?.identities?.some((i: any) => i.provider === p)
                      return (
                        <li key={p} className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-slate-800">{p === 'google' ? 'Google' : 'Facebook'}</div>
                            <div className={`inline-block mt-1 px-2 py-1 rounded text-xs font-semibold ${connected ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>{connected ? 'Connected' : 'Not connected'}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!connected ? (
                              <button
                                onClick={async () => {
                                  try {
                                    setLinking(p as 'google' | 'facebook')
                                    const { error } = await supabase.auth.linkIdentity({ provider: p as any, options: { redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/profile` : undefined } })
                                    if (error) throw error
                                    const { data: userData } = await supabase.auth.getUser()
                                    setAuthUser(userData?.user || null)
                                    toast.success(`${p === 'google' ? 'Google' : 'Facebook'} linked`)
                                  } catch (err: any) {
                                    toast.error(err?.message || 'Failed to link account')
                                  } finally {
                                    setLinking(null)
                                  }
                                }}
                                disabled={linking === (p as any)}
                                className="px-4 py-2 rounded-xl bg-resort-600 text-white font-semibold hover:bg-resort-700 disabled:opacity-50"
                              >
                                {linking === p ? 'Linking…' : 'Connect'}
                              </button>
                            ) : (
                              <button
                                onClick={async () => {
                                  try {
                                    const identity = authUser?.identities?.find((i: any) => i.provider === p)
                                    if (!identity) return
                                    const { error } = await supabase.auth.unlinkIdentity(identity)
                                    if (error) throw error
                                    const { data: userData } = await supabase.auth.getUser()
                                    setAuthUser(userData?.user || null)
                                    toast.success(`${p === 'google' ? 'Google' : 'Facebook'} disconnected`)
                                  } catch (err: any) {
                                    toast.error(err?.message || 'Failed to disconnect')
                                  }
                                }}
                                className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 font-semibold hover:bg-slate-300"
                              >
                                Disconnect
                              </button>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                  <div className="mt-3 text-xs text-slate-500">Apple linking coming soon.</div>
                </div>
              </div>
            </div>
            )}

            {activeTab === 'travel' && (
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                  <FaSuitcase aria-hidden />
                  <span>Past Bookings</span>
                </label>
                {bookings.length === 0 ? (
                  <div className="w-full px-5 py-3 border-2 border-slate-200 rounded-xl bg-white text-slate-600">No bookings yet.</div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {bookings.map((b) => (
                      <div key={b.id} className="p-4 border-2 border-slate-200 rounded-xl bg-white">
                        <div className="font-semibold text-resort-900">{b.resort?.name || 'Resort'}</div>
                        <div className="text-sm text-slate-600">{b.resort?.location || ''}</div>
                        <div className="mt-2 text-sm">
                          {new Date(b.date_from).toLocaleDateString()} → {new Date(b.date_to).toLocaleDateString()} • {b.status}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                  <FaHeart aria-hidden />
                  <span>Favorites</span>
                </label>
                {favoritesLoading ? (
                  <div className="w-full px-5 py-3 border-2 border-slate-200 rounded-xl bg-white text-slate-600">Loading favorites…</div>
                ) : favorites.length === 0 ? (
                  <div className="w-full px-5 py-3 border-2 border-slate-200 rounded-xl bg-white text-slate-600">No favorites yet. Tap the heart on a resort to add it.</div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {favorites.map((r: any) => (
                      <Link key={r.id} href={`/resorts/${r.id}`} className="flex items-center gap-3 p-4 border-2 border-slate-200 rounded-xl bg-white hover:border-resort-300 transition">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                          {Array.isArray(r.images) && r.images.length > 0 ? (
                            <img src={r.images[0]} alt={r.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400"><FaUmbrellaBeach aria-hidden /></div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-resort-900 truncate">{r.name}</div>
                          <div className="text-sm text-slate-600 truncate">{r.location || '—'}</div>
                          {r.price != null && (
                            <div className="text-xs text-slate-500">From ₱{r.price}</div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                  <FaStar aria-hidden />
                  <span>Reviews</span>
                </label>
                <div className="w-full px-5 py-3 border-2 border-slate-200 rounded-xl bg-white text-slate-600">Your reviews will appear here.</div>
              </div>
            </div>
            )}

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
                      setPhone(profile.phone || '')
                      setBio(profile.bio || '')
                      setLocationText(profile.location || '')
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
            <div className="text-3xl mb-2"><FaUmbrellaBeach aria-hidden /></div>
            <h3 className="font-semibold text-resort-900">Browse Resorts</h3>
          </Link>
          {profile.role === 'guest' && (
            <Link href="/guest/trips" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition text-center">
              <div className="text-3xl mb-2"><FaTicketAlt aria-hidden /></div>
              <h3 className="font-semibold text-resort-900">My Trips</h3>
            </Link>
          )}
          {profile.role === 'owner' && (
            <Link href="/owner/properties" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition text-center">
              <div className="text-3xl mb-2"><FaHotel aria-hidden /></div>
              <h3 className="font-semibold text-resort-900">My Properties</h3>
            </Link>
          )}
          {profile.is_admin && (
            <Link href="/admin/approvals" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition text-center">
              <div className="text-3xl mb-2"><FiCheckCircle aria-hidden /></div>
              <h3 className="font-semibold text-resort-900">Approvals</h3>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
