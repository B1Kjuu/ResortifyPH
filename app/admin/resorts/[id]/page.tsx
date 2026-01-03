'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { toast } from 'sonner'

export default function AdminResortDetail({ params }: { params: { id: string } }){
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [resort, setResort] = useState<any | null>(null)
  const [owner, setOwner] = useState<any | null>(null)

  useEffect(() => {
    async function load(){
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push('/auth/signin'); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, is_admin')
        .eq('id', session.user.id)
        .single()
      if (!profile?.is_admin) { router.push('/'); return }
      setIsAdmin(true)

      const { data: resortData, error } = await supabase
        .from('resorts')
        .select('*')
        .eq('id', params.id)
        .single()
      if (error) { toast.error(error.message); return }
      setResort(resortData)

      if (resortData?.owner_id) {
        const { data: ownerData } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone')
          .eq('id', resortData.owner_id)
          .single()
        setOwner(ownerData)
      }
      setLoading(false)
    }
    load()
  }, [params.id, router])

  async function updateVerification(updates: any){
    if (!resort) return
    const { error } = await supabase
      .from('resorts')
      .update(updates)
      .eq('id', resort.id)
    if (error) { toast.error(error.message) } else { toast.success('Updated'); setResort({ ...resort, ...updates }) }
  }

  async function approve(){
    if (!resort) return
    const checks = [resort.contact_email_verified, resort.contact_phone_verified, resort.location_verified].filter(Boolean).length
    const evidence = [resort.registration_number, resort.dti_sec_certificate_url, resort.business_permit_url, resort.gov_id_owner_url, resort.website_url, resort.facebook_url, resort.instagram_url].filter(Boolean).length
    if (checks < 2 && evidence < 2) { toast.error('Add at least 2 checks or 2 evidence links'); return }
    const { error } = await supabase
      .from('resorts')
      .update({ status: 'approved' })
      .eq('id', resort.id)
    if (error) { toast.error(error.message) } else { toast.success('Approved'); router.push('/admin/approvals') }
  }

  async function reject(){
    if (!resort) return
    const { error } = await supabase
      .from('resorts')
      .update({ status: 'rejected' })
      .eq('id', resort.id)
    if (error) { toast.error(error.message) } else { toast.success('Rejected'); router.push('/admin/approvals') }
  }

  if (loading) return <div className="w-full px-6 py-10 text-center">Loading…</div>
  if (!isAdmin || !resort) return <div className="w-full px-6 py-10 text-center">Unauthorized or not found</div>

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24 lg:pb-8">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 max-w-6xl mx-auto">
        <Link href="/admin/approvals" className="text-sm text-resort-500 font-semibold mb-6 inline-flex items-center gap-2">← Back to Approvals</Link>
        <h1 className="text-2xl font-bold mb-4">Resort Submission Details</h1>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-lg font-semibold mb-3">Core Info</h2>
            <p><span className="font-semibold">Name:</span> {resort.name}</p>
            <p><span className="font-semibold">Owner:</span> {owner?.full_name || 'Unknown'} ({owner?.email || '—'})</p>
            <p><span className="font-semibold">Location:</span> {resort.location}</p>
            <p><span className="font-semibold">Price:</span> ₱{resort.price}</p>
            <p className="mt-2 text-sm text-slate-700">{resort.description}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-lg font-semibold mb-3">Verification</h2>
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              {resort.registration_number && <p>Reg No.: <span className="font-mono">{resort.registration_number}</span></p>}
              {resort.website_url && <p>Website: <a className="text-blue-600" href={resort.website_url} target="_blank" rel="noreferrer">Visit</a></p>}
              {resort.facebook_url && <p>Facebook: <a className="text-blue-600" href={resort.facebook_url} target="_blank" rel="noreferrer">Open</a></p>}
              {resort.instagram_url && <p>Instagram: <a className="text-blue-600" href={resort.instagram_url} target="_blank" rel="noreferrer">Open</a></p>}
              {resort.dti_sec_certificate_url && <p>DTI/SEC: <a className="text-blue-600" href={resort.dti_sec_certificate_url} target="_blank" rel="noreferrer">View</a></p>}
              {resort.business_permit_url && <p>Permit: <a className="text-blue-600" href={resort.business_permit_url} target="_blank" rel="noreferrer">View</a></p>}
              {resort.gov_id_owner_url && <p>Owner ID: <a className="text-blue-600" href={resort.gov_id_owner_url} target="_blank" rel="noreferrer">View</a></p>}
            </div>
            <div className="mt-3 grid md:grid-cols-3 gap-2">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!resort.contact_email_verified} onChange={(e) => updateVerification({ contact_email_verified: e.target.checked })} /> Email verified
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!resort.contact_phone_verified} onChange={(e) => updateVerification({ contact_phone_verified: e.target.checked })} /> Phone verified
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!resort.location_verified} onChange={(e) => updateVerification({ location_verified: e.target.checked })} /> Location verified
              </label>
            </div>
            <div className="mt-3">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Verification Notes</label>
              <textarea value={resort.verification_notes || ''} rows={4} className="w-full px-3 py-2 border border-slate-300 rounded" onChange={(e) => setResort({ ...resort, verification_notes: e.target.value })} onBlur={(e) => updateVerification({ verification_notes: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={approve} className="px-4 py-2 bg-green-600 text-white rounded">Approve</button>
          <button onClick={reject} className="px-4 py-2 bg-red-600 text-white rounded">Reject</button>
        </div>
      </div>
    </div>
  )
}
