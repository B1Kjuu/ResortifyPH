"use client"

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import ChatLink from './ChatLink'
import type { Chat, ChatMessage, ChatParticipant } from '../types/chat'

type ChatItem = Chat & { 
  lastMessage?: ChatMessage | null
  unreadCount?: number
  resortName?: string
  participantName?: string
  participantRole?: string
  myRole?: string
}

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

      // Batch fetch all participants first to avoid N+1 queries
      const { data: allParticipants } = await supabase
        .from('chat_participants')
        .select('chat_id, user_id, role')
        .in('chat_id', chatIds)
      
      // Get unique user IDs (excluding current user)
      const otherUserIds = Array.from(new Set(
        (allParticipants || [])
          .filter(p => p.user_id !== uid)
          .map(p => p.user_id)
      ))
      
      // Batch fetch all profiles at once
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', otherUserIds)

      // Create a map for quick lookup
      const profileMap = new Map(
        (profiles || []).map(p => [p.id, p])
      )

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
        
        // Fetch resort name if available
        let resortName = ''
        if (c.booking_id) {
          const { data: booking } = await supabase
            .from('bookings')
            .select('resort_id, resorts(name)')
            .eq('id', c.booking_id)
            .single()
          const resortData = booking?.resorts as any
          if (resortData && typeof resortData === 'object' && 'name' in resortData) {
            resortName = resortData.name
          }
        } else if (c.resort_id) {
          const { data: resort } = await supabase
            .from('resorts')
            .select('name')
            .eq('id', c.resort_id)
            .single()
          if (resort?.name) resortName = resort.name
        }

        // Get participant info from pre-fetched data
        let participantName = ''
        let participantRole = ''
        const otherParticipant = (allParticipants || []).find(
          p => p.chat_id === c.id && p.user_id !== uid
        )
        const meParticipant = (allParticipants || []).find(
          p => p.chat_id === c.id && p.user_id === uid
        )
        if (otherParticipant) {
          participantRole = otherParticipant.role
          const profile = profileMap.get(otherParticipant.user_id)
          if (profile) {
            participantName = profile.full_name || profile.email || 'User'
          }
        }
        
        return { 
          ...c, 
          lastMessage: msg || null, 
          unreadCount: unreadCount || 0,
          resortName,
          participantName,
          participantRole,
          myRole: meParticipant?.role || ''
        }
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
      {items.map((c) => {
        // Build dynamic title
        // Determine title: guest sees resort name; owner sees guest name
        let title = c.myRole === 'owner' ? (c.participantName || 'Guest') : (c.resortName || 'Chat')
        let subtitle = ''
        if (c.participantName) {
          subtitle = c.participantRole === 'owner' ? `Host: ${c.participantName}` : `Guest: ${c.participantName}`
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
