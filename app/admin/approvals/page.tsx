'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import ChatLink from '../../../components/ChatLink'
import { FiClipboard, FiUser, FiClock, FiMapPin, FiCheck, FiX, FiSearch, FiCheckCircle } from 'react-icons/fi'

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

  function evidenceCount(resort: any) {
    const fields = [
      resort.registration_number,
      resort.dti_sec_certificate_url,
      resort.business_permit_url,
      resort.gov_id_owner_url,
      resort.website_url,
      resort.facebook_url,
      resort.instagram_url,
    ]
    return fields.filter((v) => !!v).length
  }

  async function approveResort(resort: any){
    const hasVerified = [resort.contact_email_verified, resort.contact_phone_verified, resort.location_verified].filter(Boolean).length >= 2
    const hasEvidence = evidenceCount(resort) >= 2
    if (!hasVerified && !hasEvidence) {
      toast.error('Need at least 2 verified checks or 2 evidence links before approval')
      return
    }

    toast.loading('Approving resort...')
    const { error } = await supabase
      .from('resorts')
      .update({ status: 'approved' })
      .eq('id', resort.id)
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

  async function saveVerification(id: string, updates: Partial<{ contact_email_verified: boolean; contact_phone_verified: boolean; location_verified: boolean; verification_notes: string }>){
    const { error } = await supabase
      .from('resorts')
      .update(updates)
      .eq('id', id)
    if (error) {
      toast.error(`Save failed: ${error.message}`)
    } else {
      toast.success('Verification updated')
      await loadPendingResorts()
    }
  }

  if (loading) return <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center text-slate-600">Loading submissions...</div>
  if (!isAdmin) return <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center text-slate-600">Unauthorized</div>

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24 lg:pb-8">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 max-w-7xl mx-auto">
        <Link href="/admin/command-center" className="text-sm text-resort-500 font-semibold mb-8 inline-flex items-center gap-2 hover:gap-3 transition-all">← Back to Command Center</Link>
        
        {/* Inline toast banner removed due to type mismatch; Sonner handles UI toasts directly. */}

        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <FiClipboard className="w-10 h-10 text-slate-700" />
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
              <div className="flex justify-center mb-3"><FiCheckCircle className="w-10 h-10 text-green-600" /></div>
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
                      <p className="text-sm text-slate-600 mt-1 inline-flex items-center gap-1"><FiUser className="w-4 h-4" /> Owner: {resort.owner?.full_name || 'Unknown'}</p>
                    </div>
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-3 py-1 rounded-lg font-bold border-2 border-yellow-300 inline-flex items-center gap-1"><FiClock className="w-4 h-4" /> Pending</span>
                  </div>
                  
                  <div className="space-y-2 mb-4 pb-4 border-b border-slate-100">
                    <p className="text-sm text-slate-700 inline-flex items-center gap-1"><FiMapPin className="w-4 h-4" /> {resort.location}</p>
                    <p className="text-sm text-slate-700">₱{resort.price}/night · {resort.capacity} guests</p>
                    {resort.amenities && <p className="text-sm text-slate-700">Amenities: {resort.amenities.join(', ')}</p>}
                    <p className="text-sm text-slate-600 line-clamp-3 mt-2 italic">{resort.description}</p>
                    {/* Verification details */}
                    <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <p className="text-sm font-semibold text-slate-800 mb-2">Verification Details</p>
                      <div className="grid md:grid-cols-2 gap-2 text-sm">
                        {resort.registration_number && <p>Reg No.: <span className="font-mono">{resort.registration_number}</span></p>}
                        {resort.website_url && <p>Website: <a className="text-blue-600" href={resort.website_url} target="_blank" rel="noreferrer">Visit</a></p>}
                        {resort.facebook_url && <p>Facebook: <a className="text-blue-600" href={resort.facebook_url} target="_blank" rel="noreferrer">Open</a></p>}
                        {resort.instagram_url && <p>Instagram: <a className="text-blue-600" href={resort.instagram_url} target="_blank" rel="noreferrer">Open</a></p>}
                        {resort.dti_sec_certificate_url && <p>DTI/SEC: <a className="text-blue-600" href={resort.dti_sec_certificate_url} target="_blank" rel="noreferrer">View</a></p>}
                        {resort.business_permit_url && <p>Business Permit: <a className="text-blue-600" href={resort.business_permit_url} target="_blank" rel="noreferrer">View</a></p>}
                        {resort.gov_id_owner_url && <p>Owner ID: <a className="text-blue-600" href={resort.gov_id_owner_url} target="_blank" rel="noreferrer">View</a></p>}
                      </div>
                      {(resort.dti_sec_certificate_url || resort.business_permit_url || resort.gov_id_owner_url) && (
                        <div className="mt-3">
                          <div className="text-xs text-slate-500 mb-2">Evidence previews</div>
                          <div className="grid grid-cols-3 gap-3">
                            {resort.dti_sec_certificate_url && (
                              <a href={resort.dti_sec_certificate_url} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border border-slate-200 hover:border-blue-400">
                                <img src={resort.dti_sec_certificate_url} alt="DTI/SEC certificate" className="w-full h-24 object-cover" />
                              </a>
                            )}
                            {resort.business_permit_url && (
                              <a href={resort.business_permit_url} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border border-slate-200 hover:border-blue-400">
                                <img src={resort.business_permit_url} alt="Business permit" className="w-full h-24 object-cover" />
                              </a>
                            )}
                            {resort.gov_id_owner_url && (
                              <a href={resort.gov_id_owner_url} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border border-slate-200 hover:border-blue-400">
                                <img src={resort.gov_id_owner_url} alt="Owner government ID" className="w-full h-24 object-cover" />
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="mt-3 grid md:grid-cols-3 gap-2">
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input type="checkbox" defaultChecked={resort.contact_email_verified} onChange={(e) => saveVerification(resort.id, { contact_email_verified: e.target.checked })} /> Email verified
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input type="checkbox" defaultChecked={resort.contact_phone_verified} onChange={(e) => saveVerification(resort.id, { contact_phone_verified: e.target.checked })} /> Phone verified
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input type="checkbox" defaultChecked={resort.location_verified} onChange={(e) => saveVerification(resort.id, { location_verified: e.target.checked })} /> Location verified
                        </label>
                      </div>
                      <div className="mt-3">
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Verification Notes</label>
                        <textarea defaultValue={resort.verification_notes || ''} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded" onBlur={(e) => saveVerification(resort.id, { verification_notes: e.target.value })} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 items-center">
                    <button 
                      onClick={() => approveResort(resort)} 
                      disabled={!(evidenceCount(resort) >= 2 || [resort.contact_email_verified, resort.contact_phone_verified, resort.location_verified].filter(Boolean).length >= 2)}
                      className={`flex-1 px-4 py-3 text-sm font-bold rounded-xl border-2 ${ (evidenceCount(resort) >= 2 || [resort.contact_email_verified, resort.contact_phone_verified, resort.location_verified].filter(Boolean).length >= 2)
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg hover:-translate-y-0.5 transition-all border-green-400'
                        : 'bg-slate-300 text-slate-600 cursor-not-allowed border-slate-400'}`}
                      title={ (evidenceCount(resort) >= 2 || [resort.contact_email_verified, resort.contact_phone_verified, resort.location_verified].filter(Boolean).length >= 2) ? 'Approve' : 'Add at least 2 evidence links or verify 2 checks'}
                    >
                      <span className="inline-flex items-center gap-2 justify-center"><FiCheck className="w-4 h-4" /> Approve</span>
                    </button>
                    <button 
                      onClick={() => rejectResort(resort.id)} 
                      className="flex-1 px-4 py-3 text-sm font-bold bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all border-2 border-red-400"
                    >
                      <span className="inline-flex items-center gap-2 justify-center"><FiX className="w-4 h-4" /> Reject</span>
                    </button>
                    <Link 
                      href={`/admin/resorts/${resort.id}`} 
                      className="px-4 py-3 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 border-2 border-blue-500"
                      title="Open detailed view"
                    >
                      <span className="inline-flex items-center gap-2"><FiSearch className="w-4 h-4" /> Open details</span>
                    </Link>
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
