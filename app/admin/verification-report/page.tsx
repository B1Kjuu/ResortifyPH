'use client'
import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function VerificationReportPage(){
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [rows, setRows] = useState<any[]>([])

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

      const { data } = await supabase
        .from('resorts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)
      setRows(data || [])
      setLoading(false)
    }
    load()
  }, [router])

  const report = useMemo(() => {
    return (rows || []).map((r: any) => {
      const evidence = [r.registration_number, r.dti_sec_certificate_url, r.business_permit_url, r.gov_id_owner_url, r.website_url, r.facebook_url, r.instagram_url].filter(Boolean).length
      const checks = [r.contact_email_verified, r.contact_phone_verified, r.location_verified].filter(Boolean).length
      const missing: string[] = []
      if (!r.registration_number) missing.push('RegNo')
      if (!r.dti_sec_certificate_url) missing.push('DTI/SEC')
      if (!r.business_permit_url) missing.push('Permit')
      if (!r.gov_id_owner_url) missing.push('OwnerID')
      if (!r.website_url) missing.push('Website')
      if (!r.facebook_url) missing.push('Facebook')
      if (!r.instagram_url) missing.push('Instagram')
      return { id: r.id, name: r.name, status: r.status, evidence, checks, missing }
    })
  }, [rows])

  if (loading) return <div className="w-full px-6 py-10 text-center">Loading…</div>
  if (!isAdmin) return <div className="w-full px-6 py-10 text-center">Unauthorized</div>

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24 lg:pb-8">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 max-w-7xl mx-auto">
        <Link href="/admin/command-center" className="text-sm text-resort-500 font-semibold mb-6 inline-flex items-center gap-2">← Back</Link>
        <h1 className="text-2xl font-bold mb-4">Verification Report</h1>
        <div className="bg-white border border-slate-200 rounded-xl overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-700">
                <th className="px-3 py-2 text-left">Resort</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Evidence</th>
                <th className="px-3 py-2 text-left">Checks</th>
                <th className="px-3 py-2 text-left">Missing</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {report.map(r => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">{r.status}</td>
                  <td className="px-3 py-2">{r.evidence}</td>
                  <td className="px-3 py-2">{r.checks}</td>
                  <td className="px-3 py-2">{r.missing.join(', ') || '—'}</td>
                  <td className="px-3 py-2">
                    <Link className="text-blue-600" href={`/admin/resorts/${r.id}`}>Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
