'use client'
import React, { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function AdminResortsPage(){
  const [pendingResorts, setPendingResorts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | '' }>({ message: '', type: '' })
  const router = useRouter()

  async function loadPendingResorts(){
    const { data: resorts, error } = await supabase
      .from('resorts')
      .select('*, owner:profiles(full_name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error loading pending resorts:', error)
      setToast({ message: `Error: ${error.message}`, type: 'error' })
    } else {
      setPendingResorts(resorts || [])
    }
  }

  useEffect(() => {
    async function checkAdminAndLoad(){
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push('/auth/login'); return }

      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, is_admin')
        .eq('id', session.user.id)
        .maybeSingle()
      if (!profile?.is_admin) { router.push('/'); return }
      if (!profile?.email) { router.push('/profile?requireEmail=1'); return }

      setIsAdmin(true)
      await loadPendingResorts()
      setLoading(false)
    }
    checkAdminAndLoad()

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('pending_resorts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'resorts', filter: 'status=eq.pending' },
        () => {
          loadPendingResorts()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  async function approveResort(id: string){
    const { error } = await supabase
      .from('resorts')
      .update({ status: 'approved' })
      .eq('id', id)
    if (error) { setToast({ message: error.message, type: 'error' }); return }
    setPendingResorts(pendingResorts.filter(r => r.id !== id))
    setToast({ message: 'Resort approved!', type: 'success' })
  }

  async function rejectResort(id: string){
    const { error } = await supabase
      .from('resorts')
      .update({ status: 'rejected' })
      .eq('id', id)
    if (error) { setToast({ message: error.message, type: 'error' }); return }
    setPendingResorts(pendingResorts.filter(r => r.id !== id))
    setToast({ message: 'Resort rejected.', type: 'success' })
  }

  if (loading) return <div className="w-full px-4 py-10 text-center text-slate-600">Loading approvals...</div>
  if (!isAdmin) return <div className="w-full px-4 py-10 text-center text-slate-600">Unauthorized</div>

  return (
    <div className="w-full px-4 py-6 lg:py-10 bg-gradient-to-br from-resort-50 to-resort-100 min-h-screen pb-20 lg:pb-10">
      {toast.message && (
        <div className={`mb-4 max-w-5xl mx-auto rounded-lg px-4 py-3 text-sm font-semibold ${toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          {toast.message}
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <div>
            <p className="text-xs lg:text-sm font-semibold text-resort-500">Moderation</p>
            <h1 className="text-xl lg:text-3xl font-bold text-resort-900">Resort Approvals</h1>
          </div>
          <span className="text-xs lg:text-sm bg-yellow-100 text-yellow-800 px-2 lg:px-3 py-1 rounded-lg font-semibold">Pending: {pendingResorts.length}</span>
        </div>

        <section className="space-y-3 lg:space-y-4">
          {pendingResorts.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-xl p-6 lg:p-8 text-center text-slate-600">
              <p className="font-semibold text-resort-900 mb-1">No pending resorts</p>
              <p className="text-sm">New submissions will appear here for approval.</p>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
              {pendingResorts.map(resort => (
                <div key={resort.id} className="bg-white border border-slate-200 rounded-xl p-4 lg:p-6 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="min-w-0 flex-1 mr-2">
                      <h3 className="text-base lg:text-xl font-semibold text-resort-900 truncate">{resort.name}</h3>
                      <p className="text-xs lg:text-sm text-slate-600">Owner: {resort.owner?.full_name || 'Unknown'}</p>
                    </div>
                    <span className="text-[10px] lg:text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded flex-shrink-0">Pending</span>
                  </div>
                  <p className="text-xs lg:text-sm text-slate-600 mb-1 truncate">{resort.location}</p>
                  <p className="text-xs lg:text-sm text-slate-600 mb-1">₱{resort.price?.toLocaleString()}/night · {resort.capacity} guests</p>
                  {resort.amenities && <p className="text-xs lg:text-sm text-slate-600 mb-1 truncate">Amenities: {resort.amenities.slice(0, 3).join(', ')}{resort.amenities.length > 3 ? '...' : ''}</p>}
                  <p className="text-xs lg:text-sm text-slate-700 mb-3 lg:mb-4 line-clamp-2 lg:line-clamp-3">{resort.description}</p>
                  <div className="flex gap-2">
                    <button onClick={() => approveResort(resort.id)} className="flex-1 px-3 lg:px-4 py-2 text-xs lg:text-sm bg-resort-500 text-white rounded-lg hover:bg-resort-600 transition font-medium">Approve</button>
                    <button onClick={() => rejectResort(resort.id)} className="flex-1 px-3 lg:px-4 py-2 text-xs lg:text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
