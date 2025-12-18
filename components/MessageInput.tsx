"use client"

import { useState } from 'react'

type Props = {
  onSend: (message: string) => Promise<void> | void
  disabled?: boolean
}

export default function MessageInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState("")
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    const content = value.trim()
    if (!content || sending || disabled) return
    setSending(true)
    try {
      await onSend(content)
      setValue("")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex items-end gap-2 p-2 border-t">
      <textarea
        className="flex-1 resize-none rounded-md border p-2 focus:outline-none"
        rows={2}
        placeholder="Type your message…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
          }
        }}
        disabled={disabled || sending}
      />
      <button
        className="h-10 shrink-0 rounded-md bg-blue-600 px-4 text-white disabled:opacity-50"
        onClick={handleSend}
        disabled={disabled || sending}
      >
        Send
      </button>
    </div>
  )
}
