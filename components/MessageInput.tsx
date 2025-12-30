"use client"

import { useRef, useState, useEffect } from 'react'
import supabase from '../lib/supabaseClient'
import { FaPaperclip, FaPaperPlane } from 'react-icons/fa'

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
    <div className="border-t border-slate-200 bg-gradient-to-t from-slate-50 to-white sticky bottom-0 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
      {uploadError && (
        <div className="px-3 py-2 text-sm text-red-700 bg-red-50 border-b border-red-200 flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
          {uploadError}
        </div>
      )}
      <div className="flex items-end gap-2 p-2.5 sm:p-3">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,.pdf,.doc,.docx,.txt"
        />
        
        {/* Stacked action buttons - attachment + template */}
        <div className="shrink-0 flex flex-col gap-1">
          <button
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading || sending}
            title="Attach file"
            aria-label="Attach file"
          >
            <FaPaperclip className="w-4 h-4 text-slate-600" />
          </button>

          {/* Role-aware payment templates */}
          {participantRole === 'owner' && (
            <button
              className="p-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
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
              <span className="text-sm">💳</span>
            </button>
          )}

          {participantRole === 'guest' && (
            <button
              className="p-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
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
              <span className="text-sm">📸</span>
            </button>
          )}

          {participantRole === 'admin' && (
            <>
              <button
                className="p-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
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
                <span className="text-sm">💳</span>
              </button>
              <button
                className="p-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
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
                <span className="text-sm">📸</span>
              </button>
            </>
          )}
        </div>

        <textarea
          className="flex-1 min-h-[44px] max-h-28 resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200"
          rows={2}
          placeholder={participantRole === 'owner' ? "Type a message to your guest…" : "Type a message to the host…"}
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
          className="h-10 shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSend}
          disabled={disabled || sending || uploading || !value.trim()}
          aria-label="Send message"
        >
          {uploading ? (
            <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span><span>Uploading</span></>
          ) : sending ? (
            <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span><span>Sending</span></>
          ) : (
            <><FaPaperPlane className="w-3.5 h-3.5" /><span>Send</span></>
          )}
        </button>
      </div>
    </div>
  )
}
