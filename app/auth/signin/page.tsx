'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Redirect from old signin route to new login route
export default function SignInRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/auth/login')
  }, [router])

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <p className="text-slate-600">Redirecting to login...</p>
    </div>
  )
}
