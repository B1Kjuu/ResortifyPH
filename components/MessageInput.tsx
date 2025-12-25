"use client"

import { useRef, useState, useEffect } from 'react'
import supabase from '../lib/supabaseClient'

type Props = {
  onSend: (message: string, attachmentData?: { url: string; type: string; name: string; size: number }) => Promise<void> | void
  disabled?: boolean
  chatId?: string
  onTyping?: () => void
  participantRole?: 'guest' | 'owner' | 'admin'
}

export default function MessageInput({ onSend, disabled, chatId, onTyping, participantRole = 'guest' }: Props) {
  const [value, setValue] = useState("")
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [])

  const handleTyping = () => {
    onTyping?.()
    
    // Update typing status in database
    if (chatId) {
      const updateTyping = async () => {
        const { data: user } = await supabase.auth.getUser()
        if (user.user) {
          await supabase.from('chat_typing').upsert({
            chat_id: chatId,
            user_id: user.user.id,
            updated_at: new Date().toISOString(),
          })
        }
      }
      updateTyping()

      // Clear typing after 3 seconds of no activity
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(async () => {
        const { data: user } = await supabase.auth.getUser()
        if (user.user && chatId) {
          await supabase.from('chat_typing').delete().match({
            chat_id: chatId,
            user_id: user.user.id,
          })
        }
      }, 3000)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB')
      return
    }

    setUploading(true)
    setUploadError(null)

    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error('Not authenticated')

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.user.id}/${Date.now()}.${fileExt}`
      
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(data.path)

      await onSend(value.trim() || `Sent ${file.name}`, {
        url: publicUrl,
        type: file.type,
        name: file.name,
        size: file.size,
      })

      setValue("")
    } catch (error: any) {
      console.error('Upload error:', error)
      setUploadError(error.message || 'Failed to upload file')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSend = async () => {
    const content = value.trim()
    if (!content || sending || disabled) return
    
    setSending(true)
    try {
      await onSend(content)
      setValue("")
      
      // Clear typing status
      if (chatId) {
        const { data: user } = await supabase.auth.getUser()
        if (user.user) {
          await supabase.from('chat_typing').delete().match({
            chat_id: chatId,
            user_id: user.user.id,
          })
        }
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="border-t bg-white">
      {uploadError && (
        <div className="px-3 py-2 text-xs text-red-600 bg-red-50 border-b border-red-200">
          {uploadError}
        </div>
      )}
      <div className="flex items-end gap-2 p-2">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,.pdf,.doc,.docx,.txt"
        />
        
        <button
          className="shrink-0 p-2 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading || sending}
          title="Attach file"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>

        {/* Role-aware payment templates */}
        {participantRole === 'owner' && (
          <button
            className="shrink-0 px-2 py-1.5 rounded-md border border-amber-300 bg-amber-50 text-amber-800 text-xs hover:bg-amber-100 transition-colors disabled:opacity-50"
            onClick={() => {
              const template = [
                'Here are my payment details:',
                '- Method: GCash / Bank Transfer',
                '- Account Name: [Your Name]',
                '- Account Number: [GCash/Bank #]',
                '- Amount: ₱[amount]',
                '',
                'Please send a receipt screenshot here and include your booking dates.'
              ].join('\n')
              setValue((prev) => prev?.trim() ? prev + '\n\n' + template : template)
              handleTyping()
            }}
            disabled={disabled || sending || uploading}
            title="Insert payment details"
            aria-label="Insert payment details"
          >
            💳 Share payment details
          </button>
        )}

        {participantRole === 'guest' && (
          <button
            className="shrink-0 px-2 py-1.5 rounded-md border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs hover:bg-emerald-100 transition-colors disabled:opacity-50"
            onClick={() => {
              const template = [
                'Payment sent via [GCash/Bank].',
                'Amount: ₱[amount]',
                'Reference #: [GCash ref / bank txn]',
                '',
                'Attached is my receipt screenshot.'
              ].join('\n')
              setValue((prev) => prev?.trim() ? prev + '\n\n' + template : template)
              handleTyping()
            }}
            disabled={disabled || sending || uploading}
            title="Insert receipt note"
            aria-label="Insert receipt note"
          >
            📸 Receipt note
          </button>
        )}

        {participantRole === 'admin' && (
          <div className="flex items-center gap-1">
            <button
              className="shrink-0 px-2 py-1.5 rounded-md border border-amber-300 bg-amber-50 text-amber-800 text-xs hover:bg-amber-100 transition-colors disabled:opacity-50"
              onClick={() => {
                const template = [
                  'Here are my payment details:',
                  '- Method: GCash / Bank Transfer',
                  '- Account Name: [Your Name]',
                  '- Account Number: [GCash/Bank #]',
                  '- Amount: ₱[amount]',
                  '',
                  'Please send a receipt screenshot here and include your booking dates.'
                ].join('\n')
                setValue((prev) => prev?.trim() ? prev + '\n\n' + template : template)
                handleTyping()
              }}
              disabled={disabled || sending || uploading}
              title="Insert payment details"
              aria-label="Insert payment details"
            >
              💳 Share payment details
            </button>
            <button
              className="shrink-0 px-2 py-1.5 rounded-md border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs hover:bg-emerald-100 transition-colors disabled:opacity-50"
              onClick={() => {
                const template = [
                  'Payment sent via [GCash/Bank].',
                  'Amount: ₱[amount]',
                  'Reference #: [GCash ref / bank txn]',
                  '',
                  'Attached is my receipt screenshot.'
                ].join('\n')
                setValue((prev) => prev?.trim() ? prev + '\n\n' + template : template)
                handleTyping()
              }}
              disabled={disabled || sending || uploading}
              title="Insert receipt note"
              aria-label="Insert receipt note"
            >
              📸 Receipt note
            </button>
          </div>
        )}

        <textarea
          className="flex-1 resize-none rounded-md border border-gray-300 p-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          rows={2}
          placeholder="Type your message…"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            handleTyping()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          disabled={disabled || sending || uploading}
        />
        
        <button
          className="h-10 shrink-0 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSend}
          disabled={disabled || sending || uploading || !value.trim()}
        >
          {uploading ? 'Uploading…' : sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  )
}
