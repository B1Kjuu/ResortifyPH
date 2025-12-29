"use client"

import { useEffect, useMemo, useState } from 'react'
import supabase from '../lib/supabaseClient'
import MessageInput from './MessageInput'
import MessageList from './MessageList'
import ReportButton from './ReportButton'
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
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [dynamicTitle, setDynamicTitle] = useState<string>('')
  const [ownerId, setOwnerId] = useState<string | undefined>()
  const [guestId, setGuestId] = useState<string | undefined>()

  useEffect(() => {
    let mounted = true
    // Fallback timer: ensure loading doesn't get stuck forever
    const loadingFallback = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 3000)
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
            // Add system guidance once on creation
            await supabase.from('chat_messages').insert({
              chat_id: (chatRow as Chat).id,
              sender_id: uid,
              content: '📌 System: Coordinate payment in chat; share payment details and receipt here.'
            })
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
            // Add system guidance once on creation
            await supabase.from('chat_messages').insert({
              chat_id: (chatRow as Chat).id,
              sender_id: uid,
              content: '📌 System: Coordinate payment in chat; share payment details and receipt here.'
            })
          }
          // Owner will join when they open the chat (self-join policy)
        }
      }

      if (!mounted || !chatRow) {
        setLoading(false)
        return
      }
      setChat(chatRow)

      // Fetch dynamic title based on booking or resort AND user role
      if (bookingId && chatRow.booking_id) {
        const { data: booking } = await supabase
          .from('bookings')
          .select('resort_id, guest_id, resorts(name, owner_id)')
          .eq('id', bookingId)
          .single()
        const resortData = booking?.resorts as any
        setGuestId(booking?.guest_id)
        setOwnerId(resortData?.owner_id)
        
        if (participantRole === 'guest' && resortData && typeof resortData === 'object' && 'name' in resortData) {
          // Guest sees resort name
          setDynamicTitle(resortData.name)
        } else if (participantRole === 'owner' && booking?.guest_id) {
          // Owner sees guest name
          const { data: guestProfiles } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', booking.guest_id)
            .limit(1)
          const guestProfile = guestProfiles?.[0]
          if (guestProfile) {
            setDynamicTitle(guestProfile.full_name || guestProfile.email || 'Guest')
          }
        }
      } else if (resortId && chatRow.resort_id) {
        const { data: resort } = await supabase
          .from('resorts')
          .select('name, owner_id')
          .eq('id', resortId)
          .single()
        if (resort?.name) {
          setDynamicTitle(resort.name)
        }
        setOwnerId((resort as any)?.owner_id)
        setGuestId(userId)
      }

      // Ensure current user is a participant
      await supabase.from('chat_participants').upsert({
        chat_id: chatRow.id,
        user_id: uid,
        role: participantRole,
      } as any, { onConflict: 'chat_id,user_id', ignoreDuplicates: true })
        // restore visibility if previously deleted by this user
      await supabase
        .from('chat_participants')
        .update({ deleted_at: null })
        .match({ chat_id: chatRow.id, user_id: uid })

      // Fetch messages
      const { data: msgs } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatRow.id)
        .is('deleted_at', null)
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
        .channel(`chat:${chatRow.id}`, {
          config: {
            broadcast: { self: false },
            presence: { key: uid }
          }
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chatRow.id}`,
        }, (payload) => {
          const record = payload.new as ChatMessage
          console.log('📨 New message received:', record.id)
          // Only add if not already in state (prevent duplicates from optimistic updates)
          setMessages((prev) => {
            if (prev.some(m => m.id === record.id)) {
              console.log('⚠️ Message already exists, skipping')
              return prev
            }
            console.log('✅ Adding new message to state')
            return [...prev, record]
          })
          // Mark read if incoming from others while viewing
          if (userId && record.sender_id !== userId) {
            supabase.from('chat_messages').update({ read_at: new Date().toISOString() }).eq('id', record.id)
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chatRow.id}`,
        }, (payload) => {
          const updated = payload.new as any
          const wasDeleted = !!updated.deleted_at
          setMessages((prev) => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m).filter(m => !m.deleted_at))
          if (wasDeleted) {
            console.log('🗑️ Message marked deleted:', updated.id)
          }
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'chat_typing',
          filter: `chat_id=eq.${chatRow.id}`,
        }, (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const record = payload.new as any
            if (record.user_id !== userId) {
              setTypingUsers((prev) => Array.from(new Set([...prev, record.user_id])))
            }
          } else if (payload.eventType === 'DELETE') {
            const record = payload.old as any
            setTypingUsers((prev) => prev.filter((id) => id !== record.user_id))
          }
        })
        .subscribe((status) => {
          console.log('🔌 Chat channel subscription status:', status)
          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to chat channel')
            // Only hide loading once subscription is active
            if (mounted) setLoading(false)
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Chat channel subscription error')
            if (mounted) setLoading(false)
          }
        })

      // Subscribe to presence updates for participants
      const presenceChannel = supabase
        .channel('user-presence')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'user_presence',
        }, (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const record = payload.new as any
            if (record.status === 'online') {
              setOnlineUsers((prev) => Array.from(new Set([...prev, record.user_id])))
            } else {
              setOnlineUsers((prev) => prev.filter((id) => id !== record.user_id))
            }
          }
        })
        .subscribe((status) => {
          console.log('🔌 Presence channel subscription status:', status)
        })

      // Set current user as online
      if (uid) {
        await supabase.from('user_presence').upsert({
          user_id: uid,
          status: 'online',
          last_seen: new Date().toISOString(),
        })
      }

      return () => {
        mounted = false
        clearTimeout(loadingFallback)
        supabase.removeChannel(channel)
        supabase.removeChannel(presenceChannel)
        // Set user offline on unmount
        if (uid) {
          supabase.from('user_presence').update({
            status: 'offline',
            last_seen: new Date().toISOString(),
          }).eq('user_id', uid)
        }
      }
    })()
  }, [bookingId, resortId, participantRole])

  const handleSend = useMemo(() => {
    return async (content: string, attachmentData?: { url: string; type: string; name: string; size: number }) => {
      setSendError(null)
      if (!chat || !userId) {
        setSendError('Not ready to send. Try reloading.')
        return
      }
      console.log('📤 Sending message...')
      const startTime = Date.now()
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          chat_id: chat.id,
          sender_id: userId,
          content,
          attachment_url: attachmentData?.url || null,
          attachment_type: attachmentData?.type || null,
          attachment_name: attachmentData?.name || null,
          attachment_size: attachmentData?.size || null,
        } as any)
        .select('*')
        .single()
      const endTime = Date.now()
      console.log(`⏱️ Message insert took ${endTime - startTime}ms`)
      if (error) {
        console.error('❌ Send error:', error)
        setSendError(error.message)
        return
      }
      if (data) {
        console.log('✅ Message sent successfully, ID:', (data as ChatMessage).id)
        // Optimistically append; realtime will also deliver
        setMessages((prev) => [...prev, data as ChatMessage])
        // Notify owner via email for guest messages
        try {
          if (participantRole === 'guest') {
            // Try to fetch owner email client-side to improve delivery reliability
            let to: string | undefined
            if (bookingId) {
              const { data: b } = await supabase
                .from('bookings')
                .select('resort_id, resorts(owner_id, name)')
                .eq('id', bookingId)
                .single()
              const ownerId = (b as any)?.resorts?.owner_id
              if (ownerId) {
                const { data: owner } = await supabase
                  .from('profiles')
                  .select('email')
                  .eq('id', ownerId)
                  .maybeSingle()
                to = (owner as any)?.email
              }
            } else if (resortId) {
              const { data: r } = await supabase
                .from('resorts')
                .select('owner_id, name')
                .eq('id', resortId)
                .single()
              const ownerId = (r as any)?.owner_id
              if (ownerId) {
                const { data: owner } = await supabase
                  .from('profiles')
                  .select('email')
                  .eq('id', ownerId)
                  .maybeSingle()
                to = (owner as any)?.email
              }
            }

            await fetch('/api/notifications/chat-message', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                bookingId,
                resortId,
                senderUserId: userId,
                content,
                to,
              }),
            })
          }
        } catch (notifyErr) {
          console.warn('Notify owner (chat message) failed:', notifyErr)
        }
      }
    }
  }, [chat, userId])

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!userId) return

    // Check if user already reacted with this emoji
    const { data: existing } = await supabase
      .from('message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji)
      .maybeSingle()

    if (existing) {
      // Remove reaction
      await supabase.from('message_reactions').delete().eq('id', existing.id)
    } else {
      // Add reaction
      await supabase.from('message_reactions').insert({
        message_id: messageId,
        user_id: userId,
        emoji,
      })
    }
  }

  // Latest system guidance message to pin globally above the list
  const pinnedGuidance = useMemo(() => {
    if (!messages || messages.length === 0) return null
    const systems = messages.filter(m => typeof m.content === 'string' && (m.content.startsWith('📌') || m.content.toLowerCase().includes('system:')))
    if (systems.length === 0) return null
    const last = systems[systems.length - 1]
    const text = (last.content || '').replace(/^📌\s*/,'')
    return { id: last.id, text }
  }, [messages])

  return (
    <div className="flex h-full w-full flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-gradient-to-r from-slate-50 to-white">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900 truncate">{title || dynamicTitle || 'Chat'}</h3>
          <div className="flex items-center gap-3 mt-0.5">
            {onlineUsers.length > 0 && (
              <div className="text-xs text-green-600 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                {onlineUsers.length} online
              </div>
            )}
            <div className="text-xs text-amber-600 flex items-center gap-1">
              <span aria-hidden>💳</span>
              <span className="hidden sm:inline">Share payment instructions and receipt here.</span>
              <span className="sm:hidden">Payment in chat</span>
            </div>
          </div>
        </div>
        {chat && (
          <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
            <span className="hidden sm:inline text-xs text-slate-400">ID: {chat.id.slice(0, 8)}</span>
            <ReportButton chatId={chat.id} />
            <button
              className="text-xs rounded-lg border border-red-200 px-2 py-1.5 text-red-600 hover:bg-red-50 transition-colors"
              onClick={async () => {
                try {
                  const { data: userRes } = await supabase.auth.getUser()
                  const uid2 = userRes.user?.id
                  if (!uid2 || !chat?.id) return
                  await supabase
                    .from('chat_participants')
                    .update({ deleted_at: new Date().toISOString() })
                    .match({ chat_id: chat.id, user_id: uid2 })
                  // Optional: navigate back if embedded in a page
                  // window.history.back()
                } catch (e) {
                  console.error('Delete chat failed:', e)
                  alert('Failed to delete chat')
                }
              }}
              title="Delete chat from your view"
            >
              <span className="hidden sm:inline">Delete</span>
              <span className="sm:hidden">×</span>
            </button>
          </div>
        )}
      </div>
      {sendError && (
        <div className="mx-3 sm:mx-4 mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 border border-red-200">
          Failed to send: {sendError}
        </div>
      )}
      {loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-slate-300 border-t-resort-500 rounded-full animate-spin"></div>
            Loading chat…
          </div>
        </div>
      ) : !userId ? (
        <div className="flex flex-1 items-center justify-center text-sm text-slate-500 p-4">Sign in to chat.</div>
      ) : !chat ? (
        <div className="flex flex-1 items-center justify-center text-sm text-slate-500 p-4">
          <div className="text-center max-w-xs">
            <div className="mb-2 font-semibold text-slate-700">Chat not available</div>
            <div className="text-xs text-slate-500 mb-4">This conversation might be archived or not created yet.</div>
            <button
              className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-sm bg-white text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
              onClick={async () => {
                try {
                  const { data: userRes } = await supabase.auth.getUser()
                  const uid = userRes.user?.id
                  if (!uid) return
                  if (bookingId) {
                    const { data: created } = await supabase
                      .from('chats')
                      .insert({ booking_id: bookingId, creator_id: uid })
                      .select('*')
                      .single()
                    if (created) setChat(created as any)
                  } else if (resortId) {
                    const { data: created } = await supabase
                      .from('chats')
                      .insert({ resort_id: resortId, creator_id: uid })
                      .select('*')
                      .single()
                    if (created) setChat(created as any)
                  }
                } catch (e) {
                  console.error('Start chat failed:', e)
                  alert('Failed to start chat')
                }
              }}
            >Start Chat</button>
          </div>
        </div>
      ) : (
        <>
          {pinnedGuidance && (
            <div className="border-b bg-amber-100 text-amber-900 px-4 py-2 text-xs">
              <div className="flex items-start gap-2">
                <span aria-hidden>📌</span>
                <div className="whitespace-pre-wrap break-words font-medium">{pinnedGuidance.text}</div>
              </div>
            </div>
          )}
          <MessageList messages={messages} currentUserId={userId} onReact={handleReaction} ownerId={ownerId} guestId={guestId} />
          {typingUsers.length > 0 && (
            <div className="px-4 py-2 text-xs text-gray-500 italic border-t">
              {typingUsers.length === 1 ? 'Someone is' : `${typingUsers.length} people are`} typing...
            </div>
          )}
          <MessageInput onSend={handleSend} chatId={chat?.id} participantRole={participantRole} />
        </>
      )}
    </div>
  )
}
