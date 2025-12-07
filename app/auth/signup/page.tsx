'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Redirect from old signup route to new register route
export default function SignUpRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/auth/register')
  }, [router])

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <p className="text-slate-600">Redirecting to registration...</p>
    </div>
  )
}
