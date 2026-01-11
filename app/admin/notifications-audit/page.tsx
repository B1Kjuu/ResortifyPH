'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function NotificationsAuditPage(){
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [rows, setRows] = useState<any[]>([])
  const router = useRouter()

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
        .from('notifications')
        .select('id, created_at, type, user_id, actor_id, title, body, link, metadata')
        .order('created_at', { ascending: false })
        .limit(50)

      setRows(data || [])
      setLoading(false)
    }
    load()

    const sub = supabase
      .channel('notifications_audit')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        // Simple refresh
        supabase
          .from('notifications')
          .select('id')
          .limit(1)
          .then(() => {})
      })
      .subscribe()
    return () => { sub.unsubscribe() }
  }, [router])

  if (loading) return <div className="w-full px-6 py-10 text-center">Loading…</div>
  if (!isAdmin) return <div className="w-full px-6 py-10 text-center">Unauthorized</div>

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24 lg:pb-8">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link href="/admin/command-center" className="text-sm text-resort-500 font-semibold inline-flex items-center gap-2">← Back</Link>
          <Link href="/admin/verification-report" className="text-sm font-semibold text-blue-600">Open Verification Report →</Link>
        </div>
        <h1 className="text-2xl font-bold mb-4">Notifications Audit</h1>
        <div className="bg-white border border-slate-200 rounded-xl overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-700">
                <th className="px-3 py-2 text-left">Time</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">User</th>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Email</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">{r.type}</td>
                  <td className="px-3 py-2">{r.user_id || ''}</td>
                  <td className="px-3 py-2">{r.title || ''}</td>
                  <td className="px-3 py-2">
                    <div className="space-y-0.5">
                      <div className="text-slate-900">{r?.metadata?.email?.to || ''}</div>
                      <div className="text-xs text-slate-500">{r?.metadata?.email?.status || ''}</div>
                      {r?.metadata?.email?.error ? (
                        <div className="text-xs text-red-600">{r.metadata.email.error}</div>
                      ) : null}
                    </div>
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
