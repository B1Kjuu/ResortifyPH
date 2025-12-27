"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'

type AuditRow = {
  id: number
  message_id: string | null
  chat_id: string | null
  sender_id: string | null
  content: string | null
  attachment_url: string | null
  attachment_type: string | null
  attachment_name: string | null
  attachment_size: number | null
  action: 'insert' | 'update' | 'delete'
  acted_by: string | null
  acted_at: string
  previous_content: string | null
  previous_attachment_url: string | null
  previous_attachment_type: string | null
  previous_attachment_name: string | null
  previous_attachment_size: number | null
}

export default function ChatAuditPage(){
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<AuditRow[]>([])
  const [filters, setFilters] = useState({
    chatId: '',
    messageId: '',
    senderId: '',
    actedBy: '',
    fromDate: '',
    toDate: '',
    action: '',
  })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { setLoading(false); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single()
      const admin = !!profile?.is_admin
      if (mounted) setIsAdmin(admin)
      setLoading(false)
      if (admin) await fetchRows()
    })()
    return () => { mounted = false }
  }, [])

  async function fetchRows(){
    const q = supabase.from('chat_message_audit').select('*').order('acted_at', { ascending: false }).limit(500)
    if (filters.chatId) q.eq('chat_id', filters.chatId)
    if (filters.messageId) q.eq('message_id', filters.messageId)
    if (filters.senderId) q.eq('sender_id', filters.senderId)
    if (filters.actedBy) q.eq('acted_by', filters.actedBy)
    if (filters.action) q.eq('action', filters.action)
    if (filters.fromDate) q.gte('acted_at', new Date(filters.fromDate).toISOString())
    if (filters.toDate) q.lte('acted_at', new Date(filters.toDate).toISOString())
    const { data, error } = await q
    if (error) {
      console.error('Audit fetch error:', error)
      setRows([])
    } else {
      setRows((data || []) as AuditRow[])
    }
  }

  if (loading) return <div className="w-full px-4 sm:px-6 lg:px-8 py-10">Loading…</div>
  if (!isAdmin) return <div className="w-full px-4 sm:px-6 lg:px-8 py-10">Unauthorized</div>

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-10 max-w-6xl mx-auto">
        <Link href="/admin/command-center" className="text-sm text-blue-600 font-semibold mb-6 inline-block">← Back to Command Center</Link>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-5xl">🧾</span>
          <h1 className="text-3xl font-bold text-slate-900">Chat Audit Logs</h1>
        </div>

        <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm mb-8">
          <div className="grid md:grid-cols-3 gap-4">
            <input className="px-3 py-2 rounded-lg border-2 border-slate-200" placeholder="Chat ID" value={filters.chatId} onChange={(e)=>setFilters({...filters, chatId: e.target.value})} />
            <input className="px-3 py-2 rounded-lg border-2 border-slate-200" placeholder="Message ID" value={filters.messageId} onChange={(e)=>setFilters({...filters, messageId: e.target.value})} />
            <input className="px-3 py-2 rounded-lg border-2 border-slate-200" placeholder="Sender ID" value={filters.senderId} onChange={(e)=>setFilters({...filters, senderId: e.target.value})} />
            <input className="px-3 py-2 rounded-lg border-2 border-slate-200" placeholder="Acted By" value={filters.actedBy} onChange={(e)=>setFilters({...filters, actedBy: e.target.value})} />
            <select className="px-3 py-2 rounded-lg border-2 border-slate-200" value={filters.action} onChange={(e)=>setFilters({...filters, action: e.target.value})}>
              <option value="">Any Action</option>
              <option value="insert">insert</option>
              <option value="update">update</option>
              <option value="delete">delete</option>
            </select>
            <input type="date" className="px-3 py-2 rounded-lg border-2 border-slate-200" value={filters.fromDate} onChange={(e)=>setFilters({...filters, fromDate: e.target.value})} />
            <input type="date" className="px-3 py-2 rounded-lg border-2 border-slate-200" value={filters.toDate} onChange={(e)=>setFilters({...filters, toDate: e.target.value})} />
          </div>
          <div className="mt-4 flex gap-2">
            <button className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold" onClick={fetchRows}>Apply Filters</button>
            <button className="px-3 py-2 rounded-lg border-2 border-slate-200 text-sm font-semibold" onClick={()=>{setFilters({chatId:'',messageId:'',senderId:'',actedBy:'',fromDate:'',toDate:'',action:''}); fetchRows();}}>Clear</button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-600">
                <th className="px-2 py-1">Time</th>
                <th className="px-2 py-1">Action</th>
                <th className="px-2 py-1">Chat</th>
                <th className="px-2 py-1">Message</th>
                <th className="px-2 py-1">Sender</th>
                <th className="px-2 py-1">Acted By</th>
                <th className="px-2 py-1">Content</th>
                <th className="px-2 py-1">Prev Content</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={8} className="px-2 py-3 text-slate-500">No audit logs found for filters.</td></tr>
              ) : rows.map(r => (
                <tr key={r.id} className="border-t">
                  <td className="px-2 py-1 whitespace-nowrap">{new Date(r.acted_at).toLocaleString()}</td>
                  <td className="px-2 py-1">{r.action}</td>
                  <td className="px-2 py-1">{r.chat_id?.slice(0,8)}</td>
                  <td className="px-2 py-1">{r.message_id?.slice(0,8)}</td>
                  <td className="px-2 py-1">{r.sender_id?.slice(0,8)}</td>
                  <td className="px-2 py-1">{r.acted_by?.slice(0,8)}</td>
                  <td className="px-2 py-1 max-w-[300px] truncate" title={r.content || ''}>{r.content}</td>
                  <td className="px-2 py-1 max-w-[300px] truncate" title={r.previous_content || ''}>{r.previous_content}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
