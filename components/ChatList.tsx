"use client"

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { toast } from 'sonner'
import ChatLink from './ChatLink'

type ChatListProps = {
  roleFilter?: 'guest' | 'owner' | 'admin'
}

type RpcChatRow = {
  chat_id: string
  booking_id: string | null
  resort_id: string | null
  my_role: 'guest' | 'owner' | 'admin'
  other_participant_name: string | null
  resort_name: string | null
  last_message: string | null
  last_message_at: string | null
  unread_count: number | null
}

type ChatItem = {
  id: string
  booking_id: string | null
  resort_id: string | null
  lastMessage?: { content: string | null; created_at: string | null } | null
  unreadCount?: number
  resortName?: string
  participantName?: string
  myRole?: 'guest' | 'owner' | 'admin'
}

export default function ChatList({ roleFilter }: ChatListProps) {
  const [items, setItems] = useState<ChatItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Format timestamp to relative or absolute time
  const formatMessageTime = (timestamp: string | null): string => {
    if (!timestamp) return ''
    
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    
    // Format as date for older messages
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data: rpcData, error } = await supabase.rpc('get_user_chats')
      if (error) {
        console.error('get_user_chats RPC error:', error)
        setItems([])
        setLoading(false)
        return
      }

      let mapped: ChatItem[] = (rpcData as RpcChatRow[] | null || []).map((r) => ({
        id: r.chat_id,
        booking_id: r.booking_id,
        resort_id: r.resort_id,
        lastMessage: { content: r.last_message, created_at: r.last_message_at },
        unreadCount: r.unread_count || 0,
        resortName: r.resort_name || undefined,
        participantName: r.other_participant_name || undefined,
        myRole: r.my_role,
      }))

      if (roleFilter) mapped = mapped.filter(i => i.myRole === roleFilter)

      if (mounted) setItems(mapped)
      setLoading(false)
    })()
    return () => { mounted = false }
  }, [roleFilter])

  if (loading) return (
    <div className="p-8 text-center">
      <div className="animate-spin w-8 h-8 border-3 border-resort-500 border-t-transparent rounded-full mx-auto mb-3" />
      <p className="text-sm text-gray-500">Loading conversations…</p>
    </div>
  )
  if (items.length === 0) return (
    <div className="p-8 text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <p className="text-slate-600 font-medium">No conversations yet</p>
      <p className="text-sm text-slate-400 mt-1">Start chatting with a resort host</p>
    </div>
  )

  return (
    <ul className="divide-y divide-slate-100">
      {items.map((c) => {
        // Build dynamic title
        // Determine title: guest sees resort name; owner sees guest name
        let title = c.myRole === 'owner' ? (c.participantName || 'Guest') : (c.resortName || 'Chat')
        let subtitle = ''
        if (c.participantName) {
          subtitle = c.myRole === 'owner'
            ? `Guest: ${c.participantName}`
            : c.myRole === 'guest'
              ? `Host: ${c.participantName}`
              : `${c.participantName}`
        }

        return (
          <li key={c.id} className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50 transition-all duration-200 group">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 group-hover:text-resort-600 transition-colors">{title}</span>
                {c.unreadCount ? (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-resort-500 px-1.5 text-xs font-bold text-white">
                    {c.unreadCount}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {subtitle && (
                  <div className="text-xs text-slate-500">{subtitle}</div>
                )}
                {c.lastMessage?.created_at && (
                  <>
                    {subtitle && <span className="text-slate-300">•</span>}
                    <div className="text-xs text-slate-400">
                      {formatMessageTime(c.lastMessage.created_at)}
                    </div>
                  </>
                )}
              </div>
              {c.lastMessage ? (
                <div className="truncate text-sm text-slate-600 mt-1">
                  {c.lastMessage.content}
                </div>
              ) : (
                <div className="text-sm text-slate-400 mt-1 italic">No messages yet</div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {c.booking_id ? (
                <ChatLink bookingId={c.booking_id || undefined} as={(c.myRole as any) || 'guest'} label="Open" title={title} />
              ) : (
                <ChatLink resortId={c.resort_id || undefined} as={(c.myRole as any) || 'guest'} label="Open" title={title} />
              )}
              <button
                className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-red-50 text-red-600 border-red-200 disabled:opacity-50 transition-colors"
                disabled={deletingId === c.id}
                onClick={async () => {
                  if (!confirm('Delete this chat from your view? Messages remain available for moderation.')) return
                  try {
                    setDeletingId(c.id)
                    const { data: { session } } = await supabase.auth.getSession()
                    const uid = session?.user?.id
                    if (!uid) throw new Error('Not signed in')
                    await supabase
                      .from('chat_participants')
                      .update({ deleted_at: new Date().toISOString() })
                      .match({ chat_id: c.id, user_id: uid })
                    // Refresh list
                    const { data: rpcData, error } = await supabase.rpc('get_user_chats')
                    if (!error) {
                      const mapped: ChatItem[] = (rpcData as RpcChatRow[] | null || []).map((r) => ({
                        id: r.chat_id,
                        booking_id: r.booking_id,
                        resort_id: r.resort_id,
                        lastMessage: { content: r.last_message, created_at: r.last_message_at },
                        unreadCount: r.unread_count || 0,
                        resortName: r.resort_name || undefined,
                        participantName: r.other_participant_name || undefined,
                        myRole: r.my_role,
                      }))
                      setItems(roleFilter ? mapped.filter(i => i.myRole === roleFilter) : mapped)
                    }
                  toast.success('Chat deleted successfully')
                  } catch (e) {
                    console.error('Failed to delete chat:', e)
                    toast.error('Failed to delete chat')
                  } finally {
                    setDeletingId(null)
                  }
                }}
                title="Delete chat from your view"
              >
                Delete
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
