"use client"

import { useEffect, useRef, useState } from 'react'
import supabase from '../lib/supabaseClient'
import type { ChatMessage, MessageReaction, UserProfile } from '../types/chat'

type Props = {
  messages: ChatMessage[]
  currentUserId?: string
  onReact?: (messageId: string, emoji: string) => void
  ownerId?: string
  guestId?: string
}

export default function MessageList({ messages, currentUserId, onReact, ownerId, guestId }: Props) {
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({})
  const [reactions, setReactions] = useState<Record<string, MessageReaction[]>>({})
  const [expandedImage, setExpandedImage] = useState<string | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Fetch user profiles for all senders
  useEffect(() => {
    const senderIds = Array.from(new Set(messages.map(m => m.sender_id)))
    if (senderIds.length === 0) return

    const fetchProfiles = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', senderIds)
      
      if (data) {
        const profileMap: Record<string, UserProfile> = {}
        data.forEach((p: any) => {
          profileMap[p.id] = p as UserProfile
        })
        setProfiles(profileMap)
      }
    }
    fetchProfiles()
  }, [messages])

  // Fetch reactions for all messages
  useEffect(() => {
    const messageIds = messages.map(m => m.id)
    if (messageIds.length === 0) return

    const fetchReactions = async () => {
      const { data } = await supabase
        .from('message_reactions')
        .select('*')
        .in('message_id', messageIds)
      
      if (data) {
        const reactionsMap: Record<string, MessageReaction[]> = {}
        data.forEach((r: any) => {
          if (!reactionsMap[r.message_id]) reactionsMap[r.message_id] = []
          reactionsMap[r.message_id].push(r as MessageReaction)
        })
        setReactions(reactionsMap)
      }
    }
    fetchReactions()

    // Subscribe to reaction changes
    const channel = supabase
      .channel('message-reactions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'message_reactions',
        filter: `message_id=in.(${messageIds.join(',')})`,
      }, () => {
        fetchReactions()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [messages])

  const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🎉']

  const renderReactions = (messageId: string) => {
    const msgReactions = reactions[messageId] || []
    if (msgReactions.length === 0) return null

    // Group by emoji
    const grouped: Record<string, MessageReaction[]> = {}
    msgReactions.forEach(r => {
      if (!grouped[r.emoji]) grouped[r.emoji] = []
      grouped[r.emoji].push(r)
    })

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {Object.entries(grouped).map(([emoji, reacts]) => {
          const userReacted = reacts.some(r => r.user_id === currentUserId)
          return (
            <button
              key={emoji}
              onClick={() => onReact?.(messageId, emoji)}
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-colors ${
                userReacted
                  ? 'bg-blue-100 border border-blue-300'
                  : 'bg-gray-100 border border-gray-200 hover:bg-gray-200'
              }`}
              title={reacts.map(r => profiles[r.user_id]?.full_name || 'User').join(', ')}
            >
              <span>{emoji}</span>
              <span className="text-[10px] font-medium">{reacts.length}</span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <>
      <div className="h-full overflow-y-auto p-4 space-y-4">
        {messages.map((m, idx) => {
          const mine = m.sender_id === currentUserId
          const isOwnerSender = ownerId ? m.sender_id === ownerId : false
          const isGuestSender = guestId ? m.sender_id === guestId : false
          const profile = profiles[m.sender_id]
          const showAvatar = !mine && (idx === 0 || messages[idx - 1]?.sender_id !== m.sender_id)
          const isImage = m.attachment_url && m.attachment_type?.startsWith('image/')
          const isSystem = typeof m.content === 'string' && (
            m.content.startsWith('📌') ||
            m.content.toLowerCase().startsWith('📌 system') ||
            m.content.toLowerCase().includes('system:')
          )

          if (isSystem) {
            // Skip rendering if it's the pinned one
            const systems = messages.filter(mm => typeof mm.content === 'string' && (mm.content.startsWith('📌') || mm.content.toLowerCase().includes('system:')))
            const pinned = systems.length ? systems[systems.length - 1] : null
            if (pinned && pinned.id === m.id) return null
            return (
              <div key={m.id} className="flex justify-center">
                <div className="w-full max-w-[95%] rounded-md border border-amber-200 bg-amber-50 text-amber-900 px-3 py-2 text-xs">
                  <div className="flex items-start gap-2">
                    <span aria-hidden>📌</span>
                    <div className="whitespace-pre-wrap break-words">{m.content.replace(/^📌\s*/, '')}</div>
                  </div>
                </div>
              </div>
            )
          }

          const canDelete = mine
          const deleted = (m as any).deleted_at != null
          return (
            <div key={m.id} className={`flex gap-2 group ${mine ? 'justify-end' : 'justify-start'}`}>
              {!mine && (
                <div className="w-8 h-8 shrink-0">
                  {showAvatar && (
                    profile?.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt={profile.full_name || 'User'} 
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-semibold text-gray-700">
                        {profile?.full_name?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )
                  )}
                </div>
              )}
              
              <div className={`max-w-[75%] flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                {!mine && showAvatar && (
                  <div className="text-xs font-medium text-gray-700 mb-0.5 px-1">
                    {profile?.full_name || profile?.email || 'User'}
                  </div>
                )}
                
                <div className={`rounded-2xl px-3 py-2 text-sm shadow-sm ${deleted 
                  ? 'bg-gray-50 text-gray-400 italic'
                  : mine
                    ? (isOwnerSender ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white')
                    : (isOwnerSender ? 'bg-emerald-50 text-emerald-900' : 'bg-gray-100 text-gray-900')
                }`}>
                  {deleted ? (
                    <div className="whitespace-pre-wrap break-words">Message deleted</div>
                  ) : (
                    m.content && <div className="whitespace-pre-wrap break-words">{m.content}</div>
                  )}
                  
                  {isImage && (
                    <div className="mt-2">
                      <img
                        src={m.attachment_url!}
                        alt={m.attachment_name || 'Attachment'}
                        className="max-w-full rounded cursor-pointer hover:opacity-90 transition-opacity"
                        style={{ maxHeight: '300px' }}
                        onClick={() => setExpandedImage(m.attachment_url!)}
                      />
                    </div>
                  )}
                  
                  {m.attachment_url && !isImage && (
                    <a
                      href={m.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`mt-2 flex items-center gap-2 p-2 rounded border ${
                        mine ? 'border-blue-400 bg-blue-500/20' : 'border-gray-300 bg-white'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{m.attachment_name}</div>
                        {m.attachment_size && (
                          <div className="text-[10px] opacity-70">
                            {(m.attachment_size / 1024).toFixed(1)} KB
                          </div>
                        )}
                      </div>
                    </a>
                  )}
                  
                  <div className={`flex items-center gap-1.5 mt-1 text-[10px] ${deleted ? 'text-gray-300' : mine ? (isOwnerSender ? 'text-emerald-100' : 'text-blue-100') : (isOwnerSender ? 'text-emerald-600' : 'text-gray-500')}` }>
                    <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {mine && m.read_at && (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <title>Read</title>
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        <path fillRule="evenodd" d="M14.707 5.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L8 10.586l5.293-5.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    )}
                  </div>
                </div>

                {renderReactions(m.id)}
                
                {/* Quick reaction bar */}
                {onReact && !deleted && (
                  <div className="flex gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {quickReactions.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => onReact(m.id, emoji)}
                        className="text-sm hover:scale-125 transition-transform"
                        title={`React with ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* Delete message (self) */}
                {canDelete && !deleted && (
                  <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="text-[11px] text-red-700 hover:underline"
                      title="Delete message"
                      onClick={async () => {
                        try {
                          await supabase
                            .from('chat_messages')
                            .update({ deleted_at: new Date().toISOString() })
                            .eq('id', m.id)
                        } catch (e) {
                          console.error('Message delete failed:', e)
                          alert('Failed to delete message')
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Image preview modal */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setExpandedImage(null)}
        >
          <img
            src={expandedImage}
            alt="Full size"
            className="max-w-full max-h-full object-contain"
          />
          <button
            className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300"
            onClick={() => setExpandedImage(null)}
          >
            ×
          </button>
        </div>
      )}
    </>
  )
}
