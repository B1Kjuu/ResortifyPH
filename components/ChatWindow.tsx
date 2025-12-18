"use client"

import { useEffect, useMemo, useState } from 'react'
import supabase from '../lib/supabaseClient'
import MessageInput from './MessageInput'
import MessageList from './MessageList'
import type { Chat, ChatMessage } from '../types/chat'

type Props = {
  bookingId?: string
  resortId?: string
  participantRole: 'guest' | 'owner' | 'admin'
  title?: string
}

export default function ChatWindow({ bookingId, resortId, participantRole, title }: Props) {
  const [chat, setChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [userId, setUserId] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [markingRead, setMarkingRead] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data: userRes } = await supabase.auth.getUser()
      const uid = userRes.user?.id
      setUserId(uid)
      if (!uid) {
        setLoading(false)
        return
      }
      let chatRow: Chat | null = null

      if (bookingId) {
        // Booking-based chat
        const { data: existing, error: sErr } = await supabase
          .from('chats')
          .select('*')
          .eq('booking_id', bookingId)
          .limit(1)
          .maybeSingle()
        if (sErr) console.error(sErr)
        chatRow = existing as Chat | null
        if (!chatRow) {
          const { data: created, error: cErr } = await supabase
            .from('chats')
            .insert({ booking_id: bookingId, creator_id: uid })
            .select('*')
            .single()
          if (cErr) {
            console.error(cErr)
            // Duplicate chat for this booking: select existing and continue
            if ((cErr as any)?.code === '23505') {
              const { data: existing2, error: sErr2 } = await supabase
                .from('chats')
                .select('*')
                .eq('booking_id', bookingId)
                .limit(1)
                .maybeSingle()
              if (!sErr2 && existing2) chatRow = existing2 as Chat
            }
          } else {
            chatRow = created as Chat
          }
        }
      } else if (resortId) {
        // Resort-based chat: try to find chat where current user is participant
        const { data: existingParts } = await supabase
          .from('chat_participants')
          .select('chat_id, chat:chats(*)')
          .eq('user_id', uid)
        const found = (existingParts || []).map((p: any) => p.chat).find((c: Chat) => c?.resort_id === resortId) || null
        chatRow = found
        if (!chatRow) {
          const { data: created, error: cErr } = await supabase
            .from('chats')
            .insert({ resort_id: resortId, creator_id: uid })
            .select('*')
            .single()
          if (cErr) {
            console.error(cErr)
            // If a unique constraint exists and we hit a duplicate, select existing
            if ((cErr as any)?.code === '23505') {
              const { data: existing2, error: sErr2 } = await supabase
                .from('chats')
                .select('*')
                .eq('resort_id', resortId)
                .limit(1)
                .maybeSingle()
              if (!sErr2 && existing2) chatRow = existing2 as Chat
            }
          } else {
            chatRow = created as Chat
          }
          // Owner will join when they open the chat (self-join policy)
        }
      }

      if (!mounted || !chatRow) {
        setLoading(false)
        return
      }
      setChat(chatRow)

      // Ensure current user is a participant
      await supabase.from('chat_participants').upsert({
        chat_id: chatRow.id,
        user_id: uid,
        role: participantRole,
      } as any, { onConflict: 'chat_id,user_id', ignoreDuplicates: true })

      // Fetch messages
      const { data: msgs } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatRow.id)
        .order('created_at', { ascending: true })
      if (mounted) setMessages((msgs || []) as ChatMessage[])
      // Mark unread as read for this user
      if (uid) {
        const unread = (msgs || []).filter(m => !m.read_at && m.sender_id !== uid)
        if (unread.length) {
          setMarkingRead(true)
          const ids = unread.map(m => m.id)
          await supabase.from('chat_messages').update({ read_at: new Date().toISOString() }).in('id', ids)
          setMarkingRead(false)
        }
      }

      // Realtime subscription
      const channel = supabase
        .channel(`chat:${chatRow.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chatRow.id}`,
        }, (payload) => {
          const record = payload.new as ChatMessage
          setMessages((prev) => [...prev, record])
          // Mark read if incoming from others while viewing
          if (userId && record.sender_id !== userId) {
            supabase.from('chat_messages').update({ read_at: new Date().toISOString() }).eq('id', record.id)
          }
        })
        .subscribe()

      setLoading(false)

      return () => {
        mounted = false
        supabase.removeChannel(channel)
      }
    })()
  }, [bookingId, resortId, participantRole])

  const handleSend = useMemo(() => {
    return async (content: string) => {
      setSendError(null)
      if (!chat || !userId) {
        setSendError('Not ready to send. Try reloading.')
        return
      }
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          chat_id: chat.id,
          sender_id: userId,
          content,
        } as any)
        .select('*')
        .single()
      if (error) {
        console.error('Send error:', error)
        setSendError(error.message)
        return
      }
      if (data) {
        // Optimistically append; realtime will also deliver
        setMessages((prev) => [...prev, data as ChatMessage])
      }
    }
  }, [chat, userId])

  return (
    <div className="flex h-full min-h-[400px] w-full flex-col rounded-md border">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h3 className="font-semibold">{title || 'Booking Chat'}</h3>
        {chat && (
          <div className="text-xs text-gray-500">Chat ID: {chat.id.slice(0, 8)}</div>
        )}
      </div>
      {sendError && (
        <div className="mx-4 mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 border border-red-200">
          Failed to send: {sendError}
        </div>
      )}
      {loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-gray-500">Loading chat…</div>
      ) : !userId ? (
        <div className="flex flex-1 items-center justify-center text-sm text-gray-500">Sign in to chat.</div>
      ) : (
        <>
          <MessageList messages={messages} currentUserId={userId} />
          <MessageInput onSend={handleSend} />
        </>
      )}
    </div>
  )
}
