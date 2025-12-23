"use client"

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
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

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading chats…</div>
  if (items.length === 0) return <div className="p-4 text-sm text-gray-500">No chats yet.</div>

  return (
    <ul className="divide-y">
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
          <li key={c.id} className="flex items-center justify-between gap-4 p-3 hover:bg-gray-50 transition-colors">
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-900">{title}</div>
              {subtitle && (
                <div className="text-xs text-gray-500 mb-1">{subtitle}</div>
              )}
              {c.lastMessage ? (
                <div className="truncate text-sm text-gray-600">
                  {c.lastMessage.content}
                </div>
              ) : (
                <div className="text-sm text-gray-400">No messages yet</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {c.unreadCount ? (
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-600 px-2 text-xs font-bold text-white">
                  {c.unreadCount}
                </span>
              ) : null}
              {c.booking_id ? (
                <ChatLink bookingId={c.booking_id || undefined} as={(c.myRole as any) || 'guest'} label="Open" title={title} />
              ) : (
                <ChatLink resortId={c.resort_id || undefined} as={(c.myRole as any) || 'guest'} label="Open" title={title} />
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
