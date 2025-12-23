'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import ChatLink from '../../../components/ChatLink'

export default function ApprovalsPage(){
  const [pendingResorts, setPendingResorts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()

  async function loadPendingResorts(){
    const { data: resorts, error } = await supabase
      .from('resorts')
      .select('*, owner:profiles(full_name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error loading pending resorts:', error)
      toast.error(`Error: ${error.message}`)
    } else {
      const enriched = [] as any[]
      for (const r of (resorts || [])) {
        // Find latest booking for this resort, if any
        const { data: latestBooking } = await supabase
          .from('bookings')
          .select('id')
          .eq('resort_id', r.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        enriched.push({ ...r, latest_booking_id: latestBooking?.id || null })
      }
      setPendingResorts(enriched)
    }
  }

  useEffect(() => {
    async function checkAdminAndLoad(){
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push('/auth/signin'); return }

      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, is_admin')
        .eq('id', session.user.id)
        .single()
      if (!profile?.is_admin) { router.push('/'); return }

      setIsAdmin(true)
      await loadPendingResorts()
      setLoading(false)
    }
    checkAdminAndLoad()

    // Subscribe to real-time changes on all resorts
    const subscription = supabase
      .channel('pending_resorts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'resorts' },
        () => {
          loadPendingResorts()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function approveResort(id: string){
    toast.loading('Approving resort...')
    
    const { error } = await supabase
      .from('resorts')
      .update({ status: 'approved' })
      .eq('id', id)
    
    toast.dismiss()
    
    if (error) { 
      console.error('Approve error:', error)
      toast.error(`Error: ${error.message}`)
      return 
    }
    
    toast.success('Resort approved!')
    await loadPendingResorts()
  }

  async function rejectResort(id: string){
    toast.loading('Rejecting resort...')
    
    const { error } = await supabase
      .from('resorts')
      .update({ status: 'rejected' })
      .eq('id', id)
    
    toast.dismiss()
    
    if (error) { 
      console.error('Reject error:', error)
      toast.error(`Error: ${error.message}`)
      return 
    }
    
    toast.success('Resort rejected')
    await loadPendingResorts()
  }

  if (loading) return <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center text-slate-600">Loading submissions...</div>
  if (!isAdmin) return <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center text-slate-600">Unauthorized</div>

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 max-w-7xl mx-auto">
        <Link href="/admin/command-center" className="text-sm text-resort-500 font-semibold mb-8 inline-flex items-center gap-2 hover:gap-3 transition-all">← Back to Command Center</Link>
        
        {/* Inline toast banner removed due to type mismatch; Sonner handles UI toasts directly. */}

        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-5xl">📋</span>
              <div>
                <p className="text-sm text-slate-600 font-semibold">Review Queue</p>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Pending Submissions</h1>
              </div>
            </div>
            <span className="text-2xl font-bold bg-yellow-100 text-yellow-800 px-6 py-3 rounded-2xl border-2 border-yellow-300">{pendingResorts.length} submissions</span>
          </div>
        </div>

        <section className="space-y-6">
          {pendingResorts.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-600">
              <p className="font-bold text-4xl mb-3">✨</p>
              <p className="font-semibold text-xl text-slate-900 mb-1">All caught up!</p>
              <p className="text-lg">No pending submissions to review</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {pendingResorts.map(resort => (
                <div key={resort.id} className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-purple-400 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-900">{resort.name}</h3>
                      <p className="text-sm text-slate-600 mt-1">👤 Owner: {resort.owner?.full_name || 'Unknown'}</p>
                    </div>
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-3 py-1 rounded-lg font-bold border-2 border-yellow-300">⏳ Pending</span>
                  </div>
                  
                  <div className="space-y-2 mb-4 pb-4 border-b border-slate-100">
                    <p className="text-sm text-slate-700">📍 {resort.location}</p>
                    <p className="text-sm text-slate-700">💰 ₱{resort.price}/night · 👥 {resort.capacity} guests</p>
                    {resort.amenities && <p className="text-sm text-slate-700">✨ {resort.amenities.join(', ')}</p>}
                    <p className="text-sm text-slate-600 line-clamp-3 mt-2 italic">{resort.description}</p>
                  </div>
                  
                  <div className="flex gap-3 items-center">
                    <button 
                      onClick={() => approveResort(resort.id)} 
                      className="flex-1 px-4 py-3 text-sm font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all border-2 border-green-400"
                    >
                      ✅ Approve
                    </button>
                    <button 
                      onClick={() => rejectResort(resort.id)} 
                      className="flex-1 px-4 py-3 text-sm font-bold bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all border-2 border-red-400"
                    >
                      ❌ Reject
                    </button>
                    {/* If resort has a related booking, allow admin to open chat as admin by ID input or linking logic. As minimal step, show link if resort.latest_booking_id exists. */}
                    {resort.latest_booking_id && (
                      <ChatLink bookingId={resort.latest_booking_id} as="admin" label="Open Chat" title={resort.name} />
                    )}
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
