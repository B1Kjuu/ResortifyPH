"use client"

import React, { useState } from 'react'
import { toast } from 'sonner'
import supabase from '../lib/supabaseClient'

type Props = {
  chatId?: string
  messageId?: string
  targetUserId?: string
  className?: string
}

export default function ReportButton({ chatId, messageId, targetUserId, className = "" }: Props){
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(){
    try {
      setSubmitting(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) { toast.error('Sign in to report'); setSubmitting(false); return }
      if (!reason.trim()) { toast.error('Please add a brief reason'); setSubmitting(false); return }

      const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        chat_id: chatId ?? null,
        message_id: messageId ?? null,
        target_user_id: targetUserId ?? null,
        reason,
        status: 'open'
      })
      if (error) { toast.error(error.message); setSubmitting(false); return }

      toast.success('Report submitted. Our admins will review.')
      setOpen(false)
      setReason('')
      setSubmitting(false)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to submit report')
      setSubmitting(false)
    }
  }

  return (
    <div className={className}>
      <button
        className="px-2 py-1 text-xs rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
        onClick={() => setOpen(true)}
        title="Report conversation"
      >Report</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-xl border-2 border-slate-200 shadow-xl w-[95%] max-w-md p-4">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Report Chat</h3>
            <p className="text-sm text-slate-600 mb-3">Describe briefly what happened and why this needs moderation.</p>
            <textarea
              className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 text-sm"
              rows={4}
              placeholder="Reason (e.g., spam, harassment, payment scam)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                className="px-3 py-2 text-sm rounded-lg border-2 border-slate-300 bg-white hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >Cancel</button>
              <button
                className="px-3 py-2 text-sm rounded-lg border-2 border-red-500 bg-red-600 text-white disabled:opacity-50"
                onClick={submit}
                disabled={submitting}
              >{submitting ? 'Submitting…' : 'Submit Report'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
