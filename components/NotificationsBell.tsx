"use client"
import React, { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'
import { listNotifications, markAllRead, deleteAllNotifications } from '../lib/notifications'

export default function NotificationsBell(){
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [unread, setUnread] = useState(0)
  const [soundOn, setSoundOn] = useState<boolean>(true) // Default to true, will sync from localStorage in useEffect
  const [toast, setToast] = useState<{ title: string; body?: string; link?: string } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Sync soundOn from localStorage on mount (client-side only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('notif_sound')
      if (stored !== null) {
        setSoundOn(stored === 'on')
      }
    } catch {}
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  useEffect(() => {
    let mounted = true
    async function load(){
      const data = await listNotifications(10)
      if (!mounted) return
      setItems(data)
      setUnread((data || []).filter((n: any) => !n.read_at).length)
    }
    load()

    const channel = supabase
      .channel('notifications_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, async (payload: any) => {
        await load()
        try {
          const row = payload?.new
          if (row && row.user_id) {
            setToast({ title: row.title, body: row.body, link: row.link })
            if (soundOn) beep()
            setTimeout(() => setToast(null), 5000)
          }
        } catch {}
      })
      .subscribe()

    return () => { channel.unsubscribe(); mounted = false }
  }, [])

  async function toggleOpen(){
    setOpen(prev => !prev)
    if (!open && unread > 0) {
      await markAllRead()
      const data = await listNotifications(10)
      setItems(data)
      setUnread((data || []).filter((n: any) => !n.read_at).length)
    }
  }

  function beep(){
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = 880
      o.connect(g)
      g.connect(ctx.destination)
      g.gain.setValueAtTime(0.001, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.1, ctx.currentTime + 0.01)
      o.start()
      setTimeout(() => { g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2); o.stop(ctx.currentTime + 0.2) }, 150)
    } catch {}
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleOpen}
        className="relative p-2 rounded-full hover:bg-slate-100 transition"
        aria-label="Notifications"
      >
        <span className="sr-only">Notifications</span>
        <svg className="w-6 h-6 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full border border-white">{unread}</span>
        )}
      </button>
      {open && (
        <div className="fixed sm:absolute inset-x-4 sm:inset-x-auto sm:right-0 top-16 sm:top-auto sm:mt-2 w-auto sm:w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50">
          <div className="px-3 sm:px-4 py-2 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <label className="flex items-center gap-1 text-xs text-slate-600">
                <input type="checkbox" className="w-4 h-4" checked={soundOn} onChange={(e) => { setSoundOn(e.target.checked); try { localStorage.setItem('notif_sound', e.target.checked ? 'on' : 'off') } catch {} }} />
                Sound
              </label>
              <button onClick={async () => { await markAllRead(); const data = await listNotifications(10); setItems(data); setUnread(0); }} className="text-xs text-slate-600 hover:text-slate-900">Mark read</button>
              <button onClick={async () => { await deleteAllNotifications(); const data = await listNotifications(10); setItems(data); setUnread(0); }} className="text-xs text-red-600 hover:text-red-700">Clear</button>
            </div>
          </div>
          <div className="max-h-[60vh] sm:max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-6 text-center text-slate-600 text-sm">No notifications</div>
            ) : items.map((n: any) => (
              <div key={n.id} className={`px-4 py-3 border-b border-slate-100 ${!n.read_at ? 'bg-slate-50' : ''}`}>
                <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                {n.body && (<p className="text-xs text-slate-700 mt-0.5">{n.body}</p>)}
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">{new Date(n.created_at).toLocaleString()}</span>
                  {n.link ? (
                    <Link href={n.link} className="text-[11px] text-resort-600 font-semibold">Open</Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {toast && (
        <div className="fixed top-16 sm:top-20 left-4 right-4 sm:left-auto sm:right-4 z-[70] bg-white border border-slate-200 shadow-2xl rounded-xl p-3 sm:p-4 sm:w-80 max-w-[calc(100vw-2rem)] animate-in slide-in-from-top-2 duration-200">
          <p className="text-sm font-semibold text-slate-900 pr-6 line-clamp-2">{toast.title}</p>
          {toast.body && (<p className="text-xs text-slate-700 mt-0.5 line-clamp-2">{toast.body}</p>)}
          <div className="mt-2 flex items-center justify-end gap-2">
            <button onClick={() => setToast(null)} className="text-xs text-slate-600 hover:text-slate-900 px-2 py-1">Dismiss</button>
            {toast.link && (<Link href={toast.link} className="text-xs text-resort-600 font-semibold px-2 py-1 bg-resort-50 rounded-lg">Open</Link>)}
          </div>
          <button 
            onClick={() => setToast(null)} 
            className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            aria-label="Dismiss notification"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
