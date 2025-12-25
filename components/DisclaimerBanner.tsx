"use client"
import React from 'react'

type DisclaimerBannerProps = {
  title?: string
  className?: string
  children?: React.ReactNode
}

export default function DisclaimerBanner({ title = "Payment & Safety Notice", className = "", children }: DisclaimerBannerProps) {
  return (
    <div className={`rounded-lg border border-amber-200 bg-amber-50 text-amber-900 p-4 flex items-start gap-3 ${className}`} role="note" aria-live="polite">
      <span className="text-xl" aria-hidden>⚠️</span>
      <div className="space-y-1">
        <p className="font-semibold">{title}</p>
        <p className="text-sm">
          ResortifyPH does not process payments. Coordinate payment details directly with the host inside chat. Never send money to unknown accounts or outside agreed methods.
        </p>
        <p className="text-xs text-amber-800">
          If something feels off, report the conversation to admins and verify booking details before paying.
        </p>
        {children && (
          <div className="pt-1 text-sm">{children}</div>
        )}
      </div>
    </div>
  )
}
