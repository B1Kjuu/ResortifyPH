"use client"

import { useEffect, useMemo, useState } from 'react'
import supabase from '../lib/supabaseClient'
import MessageInputEnhanced from './MessageInputEnhanced'
import MessageList from './MessageList'
import ReportButton from './ReportButton'
import PaymentSubmissionModal from './PaymentSubmissionModal'
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
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [bookingAmount, setBookingAmount] = useState<number | undefined>()

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
          .select('resort_id, guest_id, total_amount, resorts(name, owner_id, price)')
          .eq('id', bookingId)
          .single()
        const resortData = booking?.resorts as any
        setGuestId(booking?.guest_id)
        setOwnerId(resortData?.owner_id)
        // Set booking amount for payment modal
        if (booking?.total_amount) {
          setBookingAmount(booking.total_amount)
        } else if (resortData?.price) {
          setBookingAmount(resortData.price)
        }
        
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
          // Only add if not already in state (prevent duplicates from optimistic updates)
          setMessages((prev) => {
            if (prev.some(m => m.id === record.id)) return prev
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
          setMessages((prev) => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m).filter(m => !m.deleted_at))
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
          if (status === 'SUBSCRIBED') {
            if (mounted) setLoading(false)
          } else if (status === 'CHANNEL_ERROR') {
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
        .subscribe()

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
      if (error) {
        setSendError(error.message)
        return
      }
      if (data) {
        // Optimistically append; realtime will also deliver
        setMessages((prev) => {
          // Prevent duplicate from realtime if it arrives before optimistic update completes
          if (prev.some(m => m.id === (data as ChatMessage).id)) return prev
          return [...prev, data as ChatMessage]
        })
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
    <div className="flex h-full w-full flex-col rounded-xl sm:rounded-2xl border border-slate-200 bg-white shadow-lg sm:shadow-xl overflow-hidden min-h-0">
      {/* Chat Header - Modern gradient with better spacing */}
      <div className="flex items-center justify-between border-b border-slate-100 px-3 sm:px-4 py-3 sm:py-4 bg-gradient-to-r from-blue-50 via-slate-50 to-white shrink-0">
        {/* Back button */}
        <button
          onClick={() => window.history.back()}
          className="shrink-0 p-2 -ml-1 mr-2 rounded-xl hover:bg-slate-100 active:bg-slate-200 transition-all duration-200 touch-manipulation"
          title="Go back"
          aria-label="Go back"
        >
          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-900 truncate text-base sm:text-lg">{title || dynamicTitle || 'Chat'}</h3>
          <div className="flex items-center gap-2 sm:gap-3 mt-1">
            {onlineUsers.length > 0 && (
              <div className="text-xs sm:text-sm text-emerald-600 flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-500/50"></span>
                {onlineUsers.length} online
              </div>
            )}
            <div className="text-xs text-amber-600 flex items-center gap-1.5 bg-amber-50 px-2 py-0.5 rounded-full">
              <span aria-hidden>💳</span>
              <span className="hidden sm:inline font-medium">Share payment & receipt here</span>
              <span className="sm:hidden font-medium">Payment</span>
            </div>
          </div>
        </div>
        {chat && (
          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
            <span className="hidden lg:inline text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-md">ID: {chat.id.slice(0, 8)}</span>
            
            {/* Payment Settings button - Owner only */}
            {participantRole === 'owner' && (
              <a
                href="/owner/payment-settings"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs rounded-lg border border-amber-200 px-2.5 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-300 active:bg-amber-200 transition-all duration-200 font-medium flex items-center gap-1"
                title="Manage payment templates"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden sm:inline">Payment</span>
              </a>
            )}
            
            <ReportButton chatId={chat.id} />
            <button
              className="text-xs rounded-lg border border-red-200 px-2.5 py-1.5 text-red-600 hover:bg-red-50 hover:border-red-300 active:bg-red-100 transition-all duration-200 font-medium"
              onClick={async () => {
                if (!confirm('Delete this chat from your view? You can rejoin later if the conversation continues.')) {
                  return
                }
                try {
                  const { data: userRes } = await supabase.auth.getUser()
                  const uid2 = userRes.user?.id
                  if (!uid2 || !chat?.id) return
                  const { error } = await supabase
                    .from('chat_participants')
                    .update({ deleted_at: new Date().toISOString() })
                    .match({ chat_id: chat.id, user_id: uid2 })
                  if (error) {
                    alert('Failed to delete chat: ' + error.message)
                    return
                  }
                  // Navigate back after successful deletion
                  window.history.back()
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
            <div className="border-b bg-amber-100 text-amber-900 px-4 py-2 text-xs shrink-0">
              <div className="flex items-start gap-2">
                <span aria-hidden>📌</span>
                <div className="whitespace-pre-wrap break-words font-medium">{pinnedGuidance.text}</div>
              </div>
            </div>
          )}
          <div className="flex-1 min-h-0 overflow-hidden">
            <MessageList messages={messages} currentUserId={userId} onReact={handleReaction} ownerId={ownerId} guestId={guestId} />
          </div>
          {typingUsers.length > 0 && (
            <div className="px-4 py-2 text-xs text-gray-500 italic border-t shrink-0">
              {typingUsers.length === 1 ? 'Someone is' : `${typingUsers.length} people are`} typing...
            </div>
          )}
          <div className="shrink-0">
            <MessageInputEnhanced 
              onSend={handleSend} 
              chatId={chat?.id} 
              bookingId={bookingId}
              participantRole={participantRole} 
              onOpenPaymentModal={bookingId ? () => setShowPaymentModal(true) : undefined}
            />
          </div>
        </>
      )}

      {/* Payment Submission Modal for Guests */}
      {bookingId && (
        <PaymentSubmissionModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          bookingId={bookingId}
          chatId={chat?.id}
          expectedAmount={bookingAmount}
          onSuccess={(submission) => {
            // Send a message about the payment submission
            handleSend(
              `💰 Payment submitted!\n• Amount: ₱${submission.amount.toLocaleString()}\n• Method: ${submission.payment_method}\n${submission.reference_number ? `• Ref #: ${submission.reference_number}` : ''}\n\nAwaiting host verification.`,
              submission.receipt_url ? {
                url: submission.receipt_url,
                type: 'image/jpeg',
                name: 'payment-receipt.jpg',
                size: 0
              } : undefined
            )
          }}
        />
      )}
    </div>
  )
}
