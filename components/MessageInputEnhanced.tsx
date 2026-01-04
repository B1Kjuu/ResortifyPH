"use client"

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import supabase from '../lib/supabaseClient'
import { FaPaperclip, FaPaperPlane } from 'react-icons/fa'
import { FiCreditCard, FiCamera, FiX, FiChevronDown, FiSettings } from 'react-icons/fi'
import { PaymentTemplate, PAYMENT_METHODS } from '@/types/payment'
import PaymentTemplateManager from './PaymentTemplateManager'

type Props = {
  onSend: (message: string, attachmentData?: { url: string; type: string; name: string; size: number }) => Promise<void> | void
  disabled?: boolean
  chatId?: string
  bookingId?: string
  onTyping?: () => void
  participantRole?: 'guest' | 'owner' | 'admin'
  onOpenPaymentModal?: () => void  // For guests to submit payment
}

export default function MessageInputEnhanced({ 
  onSend, 
  disabled, 
  chatId, 
  bookingId,
  onTyping, 
  participantRole = 'guest',
  onOpenPaymentModal
}: Props) {
  const [value, setValue] = useState("")
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [templates, setTemplates] = useState<PaymentTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [])

  // Fetch owner's payment templates
  useEffect(() => {
    if (participantRole === 'owner' || participantRole === 'admin') {
      fetchTemplates()
    }
  }, [participantRole])

  const fetchTemplates = async () => {
    setLoadingTemplates(true)
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

      const { data, error } = await supabase
        .from('payment_templates')
        .select('*')
        .eq('owner_id', user.user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setTemplates(data || [])
    } catch (err) {
      console.error('Error fetching templates:', err)
    } finally {
      setLoadingTemplates(false)
    }
  }

  const handleTyping = () => {
    onTyping?.()
    
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

  const formatTemplateMessage = (template: PaymentTemplate): string => {
    const method = PAYMENT_METHODS.find(m => m.id === template.payment_method)
    const lines = [
      `💳 **Payment Details**`,
      ``,
      `**Method:** ${method?.icon || '💳'} ${method?.label || template.payment_method}${template.bank_name ? ` (${template.bank_name})` : ''}`,
      `**Account Name:** ${template.account_name}`,
      `**Account Number:** ${template.account_number}`,
    ]
    
    if (template.additional_notes) {
      lines.push(``, `📝 ${template.additional_notes}`)
    }
    
    lines.push(``, `Please send a receipt screenshot after payment.`)
    
    return lines.join('\n')
  }

  const insertTemplate = (template: PaymentTemplate) => {
    const message = formatTemplateMessage(template)
    setValue(prev => prev?.trim() ? prev + '\n\n' + message : message)
    setShowTemplateModal(false)
    handleTyping()
  }

  const insertDefaultTemplate = () => {
    const defaultTemplate = templates.find(t => t.is_default)
    if (defaultTemplate) {
      insertTemplate(defaultTemplate)
    } else if (templates.length > 0) {
      insertTemplate(templates[0])
    } else {
      setShowTemplateModal(true)
    }
  }

  return (
    <>
      <div className="border-t border-slate-200 bg-gradient-to-t from-slate-50 to-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
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
          
          {/* Action buttons */}
          <div className="shrink-0 flex flex-col gap-1">
            {/* Attachment button */}
            <button
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading || sending}
              title="Attach file"
              aria-label="Attach file"
            >
              <FaPaperclip className="w-4 h-4 text-slate-600" />
            </button>

            {/* Owner: Payment Template button */}
            {(participantRole === 'owner' || participantRole === 'admin') && (
              <div className="relative">
                <button
                  className="p-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                  onClick={insertDefaultTemplate}
                  disabled={disabled || sending || uploading}
                  title={templates.length > 0 ? "Send payment details" : "Create payment template"}
                  aria-label="Send payment details"
                >
                  <FiCreditCard className="w-4 h-4" />
                </button>
                
                {/* Dropdown arrow for template selection */}
                {templates.length > 1 && (
                  <button
                    className="absolute -right-1 -bottom-1 w-4 h-4 bg-amber-500 text-white rounded-full flex items-center justify-center hover:bg-amber-600 transition-colors"
                    onClick={(e) => { e.stopPropagation(); setShowTemplateModal(true) }}
                    title="Select template"
                  >
                    <FiChevronDown className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* Guest: Submit Payment button */}
            {participantRole === 'guest' && onOpenPaymentModal && (
              <button
                className="p-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                onClick={onOpenPaymentModal}
                disabled={disabled || sending || uploading}
                title="Submit payment proof"
                aria-label="Submit payment proof"
              >
                <FiCamera className="w-4 h-4" />
              </button>
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

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div 
            className="relative w-full max-w-md max-h-[80vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-white border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">Payment Templates</h2>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4">
              {templates.length > 0 ? (
                <div className="space-y-2 mb-4">
                  <p className="text-sm text-slate-500 mb-3">Select a template to send:</p>
                  {templates.map(template => {
                    const method = PAYMENT_METHODS.find(m => m.id === template.payment_method)
                    return (
                      <button
                        key={template.id}
                        onClick={() => insertTemplate(template)}
                        className="w-full text-left p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-cyan-400 hover:bg-cyan-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{method?.icon || '💳'}</span>
                          <span className="font-medium text-slate-800">{template.name}</span>
                          {template.is_default && (
                            <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full">Default</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          {template.account_name} • {template.account_number}
                        </p>
                      </button>
                    )
                  })}
                </div>
              ) : null}
              
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-slate-500">Manage your templates:</p>
                  <Link 
                    href="/owner/payment-settings" 
                    className="inline-flex items-center gap-1.5 text-xs text-cyan-600 hover:text-cyan-700 font-medium"
                    onClick={() => setShowTemplateModal(false)}
                  >
                    <FiSettings className="w-3.5 h-3.5" />
                    Payment Settings
                  </Link>
                </div>
                <PaymentTemplateManager onSelectTemplate={insertTemplate} selectionMode={false} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
