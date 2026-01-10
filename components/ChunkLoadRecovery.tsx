'use client'

import { useEffect } from 'react'

const STORAGE_KEY = 'resortify_chunk_recovery_v1'

function shouldRecoverOnce(): boolean {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return true
    const parsed = JSON.parse(raw) as { at: number; attempts: number } | null
    const attempts = parsed?.attempts ?? 0
    const at = parsed?.at ?? 0

    // Allow 1 auto-reload per 5 minutes to avoid loops
    const withinWindow = Date.now() - at < 5 * 60 * 1000
    if (!withinWindow) return true
    return attempts < 1
  } catch {
    return true
  }
}

function recordRecoveryAttempt(): void {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as any) : null
    const attempts = (parsed?.attempts ?? 0) + 1
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ at: Date.now(), attempts }))
  } catch {}
}

function isChunkLoadError(err: any): boolean {
  const message = String(err?.message || err || '')
  const name = String(err?.name || '')

  // Common patterns across Next/Webpack and browsers
  return (
    name === 'ChunkLoadError' ||
    /ChunkLoadError/i.test(message) ||
    /Loading chunk [\d]+ failed/i.test(message) ||
    /loading chunk/i.test(message) && /failed/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message)
  )
}

function isLikelyNextChunkUrl(url: string): boolean {
  // Next.js chunk URLs (app router) look like:
  // /_next/static/chunks/(app|pages)/...
  return /\/_next\/static\/chunks\//.test(url) && /\.js(\?|#|$)/.test(url)
}

function clearRuntimeCachesBestEffort(): void {
  // This is best-effort; we can't fully clear browser HTTP cache.
  try {
    // Clear SW caches if any
    if ('caches' in window) {
      ;(window as any).caches
        .keys()
        .then((keys: string[]) => Promise.all(keys.map((k) => (window as any).caches.delete(k))))
        .catch(() => {})
    }
  } catch {}

  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister().catch(() => {}))
      }).catch(() => {})
    }
  } catch {}
}

function showHardReloadBanner(): void {
  if (document.getElementById('chunk-recovery-banner')) return

  const el = document.createElement('div')
  el.id = 'chunk-recovery-banner'
  el.style.position = 'fixed'
  el.style.left = '12px'
  el.style.right = '12px'
  el.style.bottom = '12px'
  el.style.zIndex = '2147483647'
  el.style.background = 'white'
  el.style.border = '1px solid rgba(15,23,42,0.15)'
  el.style.borderRadius = '12px'
  el.style.boxShadow = '0 12px 40px rgba(2,6,23,0.18)'
  el.style.padding = '12px 12px'
  el.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif'

  el.innerHTML = `
    <div style="display:flex; gap:12px; align-items:flex-start;">
      <div style="flex:1; min-width:0;">
        <div style="font-weight:700; color:#0f172a; font-size:14px;">Update available</div>
        <div style="color:#475569; font-size:12px; margin-top:2px; line-height:1.35;">
          Your browser loaded an old cached file after a deploy. Tap reload to refresh the app.
        </div>
      </div>
      <button id="chunk-recovery-reload" style="background:#0ea5e9; color:white; border:none; border-radius:10px; padding:8px 10px; font-weight:700; font-size:12px; cursor:pointer;">Reload</button>
      <button id="chunk-recovery-close" style="background:transparent; color:#64748b; border:none; padding:6px 8px; font-weight:700; font-size:14px; cursor:pointer;">×</button>
    </div>
  `

  document.body.appendChild(el)

  document.getElementById('chunk-recovery-close')?.addEventListener('click', () => {
    el.remove()
  })

  document.getElementById('chunk-recovery-reload')?.addEventListener('click', () => {
    clearRuntimeCachesBestEffort()
    // Add a cache-busting param so the HTML/RSC path changes.
    const url = new URL(window.location.href)
    url.searchParams.set('_refresh', String(Date.now()))
    window.location.replace(url.toString())
  })
}

export default function ChunkLoadRecovery() {
  useEffect(() => {
    const handler = (err: any) => {
      if (!isChunkLoadError(err)) return

      // First time: try a single automatic recovery.
      if (shouldRecoverOnce()) {
        recordRecoveryAttempt()
        clearRuntimeCachesBestEffort()

        const url = new URL(window.location.href)
        url.searchParams.set('_refresh', String(Date.now()))
        window.location.replace(url.toString())
        return
      }

      // If it keeps failing, show UI guidance.
      showHardReloadBanner()
    }

    const onError = (event: Event) => {
      // Script/link resource failures surface as a generic Event with a target.
      // These often show up as MIME type / 404 errors in console, without an
      // unhandled rejection we can catch.
      const anyEvent = event as any
      const target = anyEvent?.target as any

      if (target && typeof target === 'object') {
        const tagName = String(target.tagName || '')
        const src = String(target.src || '')
        if (tagName === 'SCRIPT' && src && isLikelyNextChunkUrl(src)) {
          handler(new Error(`ChunkLoadError: ${src}`))
          return
        }
      }

      // Regular JS errors
      if (event instanceof ErrorEvent) {
        handler(event.error || event.message)
      }
    }
    const onRejection = (event: PromiseRejectionEvent) => handler(event.reason)

    // Use capture so we reliably receive resource load errors.
    window.addEventListener('error', onError, true)
    window.addEventListener('unhandledrejection', onRejection)

    return () => {
      window.removeEventListener('error', onError, true)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return null
}
