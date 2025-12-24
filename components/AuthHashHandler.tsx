'use client'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function AuthHashHandler(){
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash
    if (!hash) return

    const params = new URLSearchParams(hash.substring(1))
    const type = params.get('type') // signup | recovery
    const error = params.get('error')
    const errorCode = params.get('error_code')

    // Handle expired or invalid link
    if (errorCode === 'otp_expired' || error === 'access_denied') {
      toast.error('Your link is invalid or expired. Request a new one.')
      router.replace('/auth/forgot-password')
      return
    }

    // Ensure recovery flows land on the reset page even if template points to root
    if (type === 'recovery' && pathname !== '/auth/reset-password') {
      router.replace(`/auth/reset-password${hash}`)
      return
    }

    // Ensure signup verification flows land on the verify page
    if (type === 'signup' && pathname !== '/auth/verify-email') {
      router.replace(`/auth/verify-email${hash}`)
      return
    }
  }, [router, pathname])

  return null
}
