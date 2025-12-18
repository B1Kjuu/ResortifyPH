"use client"

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import ChatLink from './ChatLink'
import type { Chat, ChatMessage, ChatParticipant } from '../types/chat'

type ChatItem = Chat & { lastMessage?: ChatMessage | null, unreadCount?: number }

export default function ChatList() {
  const [items, setItems] = useState<ChatItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data: userRes } = await supabase.auth.getUser()
      const uid = userRes.user?.id
      if (!uid) {
        setLoading(false)
        return
      }

      const { data: parts, error: pErr } = await supabase
        .from('chat_participants')
        .select('*')
        .eq('user_id', uid)
      if (pErr) {
        console.error(pErr)
        setLoading(false)
        return
      }
      const chatIds = (parts || []).map((p: ChatParticipant) => p.chat_id)
      if (chatIds.length === 0) {
        setItems([])
        setLoading(false)
        return
      }
      const { data: chats } = await supabase
        .from('chats')
        .select('*')
        .in('id', chatIds)
        .order('updated_at', { ascending: false })

      const withLast = await Promise.all((chats || []).map(async (c: Chat) => {
        const { data: msg } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('chat_id', c.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        const { count: unreadCount } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', c.id)
          .is('read_at', null)
          .neq('sender_id', uid)
        return { ...c, lastMessage: msg || null, unreadCount: unreadCount || 0 }
      }))

      if (mounted) setItems(withLast)
      setLoading(false)
    })()
    return () => { mounted = false }
  }, [])

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading chats…</div>
  if (items.length === 0) return <div className="p-4 text-sm text-gray-500">No chats yet.</div>

  return (
    <ul className="divide-y">
      {items.map((c) => (
        <li key={c.id} className="flex items-center justify-between gap-4 p-3">
          <div className="min-w-0">
            <div className="font-medium">Booking Chat</div>
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
            <ChatLink bookingId={c.booking_id ?? undefined} as={'guest'} label="Open" />
          </div>
        </li>
      ))}
    </ul>
  )
}
